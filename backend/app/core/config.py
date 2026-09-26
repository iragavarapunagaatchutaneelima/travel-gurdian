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

    # Exotel Emergency Communication Configuration (Server-Side Only).
    # No default account SID is baked in: real credentials must always come
    # from the environment, never from source.
    EXOTEL_API_KEY: Optional[str] = None
    EXOTEL_API_TOKEN: Optional[str] = None
    EXOTEL_ACCOUNT_SID: Optional[str] = None
    EXOTEL_EXOPHONE: Optional[str] = None
    EXOTEL_SUBDOMAIN: Optional[str] = "api.exotel.com"
    EXOTEL_APP_ID: Optional[str] = None

    # When true (the default), Exotel dispatch is fully simulated: the real
    # request is built and validated but never sent over the network, and the
    # result is reported back as status "dry_run" rather than "sent"/"failed".
    # Production deployments must explicitly set EXOTEL_DRY_RUN=false once
    # KYC, an ExoPhone, and (for calls) an App ID are provisioned.
    EXOTEL_DRY_RUN: bool = True

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


