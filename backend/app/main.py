from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models import models
from app.api import alerts, assess, guide, assist

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Travel Guardian API - SENSE • ASSESS • GUIDE • ASSIST",
    version="1.0.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts / SENSE"])
app.include_router(assess.router, prefix=f"{settings.API_V1_STR}/assess", tags=["Assessment / ASSESS"])
app.include_router(guide.router, prefix=f"{settings.API_V1_STR}/guide", tags=["Guidance / GUIDE"])
app.include_router(assist.router, prefix=f"{settings.API_V1_STR}/assist", tags=["Assistance / ASSIST"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Travel Guardian MVP API",
        "concepts": {
            "SENSE": "Real-time danger mapping and threat feeds",
            "ASSESS": "Algorithmic trip risk calculators",
            "GUIDE": "Local emergency numbers, culture rules, and pre-travel checklists",
            "ASSIST": "Emergency SOS broadcast systems and guardian check-in timers"
        }
    }
