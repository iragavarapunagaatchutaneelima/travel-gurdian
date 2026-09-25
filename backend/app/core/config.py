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

    # Exotel Emergency Communication Configuration (Server-Side Only)
    # Account Region: Singapore | Subdomain: api.exotel.com | SID: senapathiyaswanth1
    EXOTEL_API_KEY: Optional[str] = None
    EXOTEL_API_TOKEN: Optional[str] = None
    EXOTEL_ACCOUNT_SID: Optional[str] = "senapathiyaswanth1"
    EXOTEL_EXOPHONE: Optional[str] = None
    EXOTEL_SUBDOMAIN: Optional[str] = "api.exotel.com"
    EXOTEL_APP_ID: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = (_env_path, ".env")
        extra = "ignore"

settings = Settings()


