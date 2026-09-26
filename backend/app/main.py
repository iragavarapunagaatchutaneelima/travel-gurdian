import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models import models
from app.api import alerts, assess, guide, assist, emergency

from contextlib import asynccontextmanager
from app.services import checkin_scheduler

# Create database tables
models.Base.metadata.create_all(bind=engine)

def _ensure_schema_migrations():
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # 1. Migration for emergency_contacts
            res = conn.execute(text("PRAGMA table_info(emergency_contacts)")).fetchall()
            col_names = [r[1] for r in res]
            if "is_enabled" not in col_names and len(col_names) > 0:
                conn.execute(text("ALTER TABLE emergency_contacts ADD COLUMN is_enabled BOOLEAN DEFAULT 1"))
                conn.commit()
            if "is_primary" not in col_names and len(col_names) > 0:
                conn.execute(text("ALTER TABLE emergency_contacts ADD COLUMN is_primary BOOLEAN DEFAULT 0"))
                conn.commit()

            # 1b. One-time cleanup of known demo/placeholder contacts left over
            # from earlier development seeding (e.g. "Sarah Miller" and the
            # shared placeholder number +919876543210 used throughout the test
            # suite). These are never valid real trusted contacts, and leaving
            # them in place risks a real emergency alert going to a stranger's
            # number once Exotel dispatch is enabled.
            demo_deleted = conn.execute(text(
                "DELETE FROM emergency_contacts WHERE name = 'Sarah Miller' OR phone = '+919876543210'"
            ))
            if demo_deleted.rowcount:
                conn.commit()
                logging.getLogger("travel_guardian").warning(
                    f"Removed {demo_deleted.rowcount} known demo/placeholder emergency contact(s) on startup."
                )

            # 1c. Ensure exactly one deterministic primary per user_id: if a
            # user has enabled contacts but none flagged is_primary, promote
            # their lowest-id enabled contact.
            users_without_primary = conn.execute(text(
                "SELECT DISTINCT user_id FROM emergency_contacts "
                "WHERE is_enabled = 1 AND user_id NOT IN "
                "(SELECT user_id FROM emergency_contacts WHERE is_primary = 1)"
            )).fetchall()
            for (uid,) in users_without_primary:
                row = conn.execute(text(
                    "SELECT id FROM emergency_contacts WHERE user_id = :uid AND is_enabled = 1 "
                    "ORDER BY id ASC LIMIT 1"
                ), {"uid": uid}).fetchone()
                if row:
                    conn.execute(text("UPDATE emergency_contacts SET is_primary = 1 WHERE id = :id"), {"id": row[0]})
            if users_without_primary:
                conn.commit()

            # 2. Migration for safe_checkins
            res_chk = conn.execute(text("PRAGMA table_info(safe_checkins)")).fetchall()
            chk_cols = [r[1] for r in res_chk]
            new_chk_cols = [
                ("last_known_latitude", "FLOAT"),
                ("last_known_longitude", "FLOAT"),
                ("last_location_time", "DATETIME"),
                ("escalation_status", "VARCHAR(50) DEFAULT 'pending'"),
                ("dispatched_at", "DATETIME"),
                ("dispatch_sms_sid", "VARCHAR(100)"),
                ("dispatch_call_sid", "VARCHAR(100)"),
                ("dispatch_recipient_name", "VARCHAR(100)"),
                ("dispatch_recipient_phone", "VARCHAR(30)"),
                ("dispatch_error", "VARCHAR(255)"),
                ("idempotency_key", "VARCHAR(100)")
            ]
            for col_name, col_type in new_chk_cols:
                if col_name not in chk_cols and len(chk_cols) > 0:
                    conn.execute(text(f"ALTER TABLE safe_checkins ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
    except Exception as e:
        import logging
        logging.getLogger("travel_guardian").warning(f"Schema migration notice: {e}")

_ensure_schema_migrations()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure migrations and launch the Dead-Man's Switch background scheduler
    _ensure_schema_migrations()
    checkin_scheduler.start_scheduler(poll_interval_seconds=5)
    yield
    # Shutdown: cleanly terminate background worker thread
    checkin_scheduler.stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Travel Guardian API - SENSE • ASSESS • GUIDE • ASSIST • EMERGENCY EXOTEL",
    version="1.1.0",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Feature Routers
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts / SENSE"])
app.include_router(assess.router, prefix=f"{settings.API_V1_STR}/assess", tags=["Assessment / ASSESS"])
app.include_router(guide.router, prefix=f"{settings.API_V1_STR}/guide", tags=["Guidance / GUIDE"])
app.include_router(assist.router, prefix=f"{settings.API_V1_STR}/assist", tags=["Assistance / ASSIST"])
app.include_router(assist.router, prefix="/assist", tags=["Assistance / ASSIST (Root Alias)"], include_in_schema=False)

# Exotel Emergency Routes (both /api/emergency and root /emergency)
app.include_router(emergency.router, prefix=f"{settings.API_V1_STR}/emergency", tags=["Emergency / EXOTEL"])
app.include_router(emergency.router, prefix="/emergency", tags=["Emergency / EXOTEL (Root)"])


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Travel Guardian MVP API",
        "concepts": {
            "SENSE": "Real-time danger mapping and threat feeds",
            "ASSESS": "Algorithmic trip risk calculators",
            "GUIDE": "Local emergency numbers, culture rules, and pre-travel checklists",
            "ASSIST": "Emergency SOS broadcast systems and guardian check-in timers",
            "EXOTEL": "Production emergency SMS and voice calling bridge (Singapore Region)"
        },
        "endpoints": {
            "emergency_sms": ["/emergency/sms", f"{settings.API_V1_STR}/emergency/sms"],
            "emergency_call": ["/emergency/call", f"{settings.API_V1_STR}/emergency/call"],
            "emergency_notify": ["/emergency/notify-trusted-contact", f"{settings.API_V1_STR}/emergency/notify-trusted-contact"],
            "emergency_config": ["/emergency/config-status", f"{settings.API_V1_STR}/emergency/config-status"],
            "emergency_diagnostic": ["/emergency/diagnostic", f"{settings.API_V1_STR}/emergency/diagnostic"]
        }
    }
