import os
from pydantic_settings import BaseSettings
from typing import List, Optional

# Canonical config lives in the repository-root /.env.local (shared with the
# frontend; see ENVIRONMENT.md). backend/.env is still read as a legacy
# fallback so existing installs keep working while they migrate. pydantic-
# settings gives LATER files in env_file precedence, so the root file wins.
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_repo_root = os.path.dirname(_backend_dir)
_legacy_env_path = os.path.join(_backend_dir, ".env")
_root_env_path = os.path.join(_repo_root, ".env.local")

# Vercel's Python runtime ships a read-only filesystem outside /tmp, so the
# usual "sqlite:///./travel_guardian.db" (relative to CWD) fails to even
# open on cold start there. When DATABASE_URL isn't explicitly set AND we're
# running on Vercel (its own VERCEL env var), default to /tmp instead, so the
# app can at least boot and serve a request.
#
# IMPORTANT, disclosed rather than hidden: /tmp on Vercel is NOT persistent
# across invocations/instances -- contacts, check-ins and emergency logs
# will not reliably survive a cold start there. This keeps a hackathon demo
# from hard-crashing; it is not a substitute for a real hosted database. Set
# DATABASE_URL to a real Postgres (Vercel Postgres, Neon, Supabase, ...) for
# actual persistence. See ENVIRONMENT.md.
def default_database_url(env: Optional[dict] = None) -> str:
    e = env if env is not None else os.environ
    if e.get("VERCEL") and not e.get("DATABASE_URL"):
        return "sqlite:////tmp/travel_guardian.db"
    return "sqlite:///./travel_guardian.db"


_default_database_url = default_database_url()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Travel Guardian API"
    API_V1_STR: str = "/api"
    # Vercel sets this itself in every one of its runtimes; never something a
    # developer sets locally. Used to disable the in-process Dead-Man's-Switch
    # scheduler thread on serverless (see app/main.py's lifespan).
    IS_VERCEL: bool = bool(os.environ.get("VERCEL"))

    # Database setting: default to a local SQLite file in the backend
    # directory (or /tmp on Vercel -- see _default_database_url above).
    DATABASE_URL: str = _default_database_url
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    # Twilio Emergency Communication Configuration (Server-Side Only).
    # No default account SID is baked in: real credentials must always come
    # from the environment, never from source. Never expose these through
    # NEXT_PUBLIC_* on the frontend.
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # When true (the default), Twilio dispatch is fully simulated: the real
    # request is built and validated but never sent over the network, and the
    # result is reported back as status "dry_run" rather than "sent"/"failed".
    # Production deployments must explicitly set TWILIO_DRY_RUN=false once
    # a real, funded (non-trial, or trial with verified recipients) Twilio
    # account and phone number are provisioned.
    TWILIO_DRY_RUN: bool = True

    # When false (the default), the destructive parts of seed.py (wiping
    # existing contacts/check-ins/reports) are skipped so a container
    # restart or `python seed.py` never silently deletes real user data.
    SEED_RESET: bool = False

    # Set to true in production to disable the public Swagger/ReDoc/OpenAPI
    # endpoints (/docs, /redoc, /openapi.json), which currently expose the
    # full API surface (including emergency/contacts endpoints) to anyone.
    DISABLE_API_DOCS: bool = False

    # Nugen Intelligence (server-side only; never exposed to the browser).
    # Model IDs are recorded here only once the real Nugen workflow has
    # produced them (see docs/NUGEN_INTEGRATION.md) -- never invented.
    NUGEN_API_URL: str = "https://api.nugen.in/api/v3"
    NUGEN_API_KEY: Optional[str] = None
    NUGEN_BASE_MODEL_ID: Optional[str] = None
    NUGEN_ALIGNED_MODEL_ID: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = (_legacy_env_path, _root_env_path)
        extra = "ignore"

settings = Settings()


