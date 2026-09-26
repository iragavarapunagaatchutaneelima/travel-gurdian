import os
from pydantic_settings import BaseSettings
from typing import List, Optional

# Locate .env whether invoked from backend/ directory or repository root
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_env_path = os.path.join(_backend_dir, ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Travel Guardian API"
    API_V1_STR: str = "/api"
    
    # Database setting: default to a local SQLite file in the backend directory.
    DATABASE_URL: str = "sqlite:///./travel_guardian.db"
    
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

    class Config:
        case_sensitive = True
        env_file = (_env_path, ".env")
        extra = "ignore"

settings = Settings()


