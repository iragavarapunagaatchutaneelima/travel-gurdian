from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Travel Guardian API"
    API_V1_STR: str = "/api"
    
    # Database setting: default to a local SQLite file in the backend directory.
    # To use MySQL, set the environment variable DATABASE_URL=mysql+pymysql://user:password@host:port/dbname
    DATABASE_URL: str = "sqlite:///./travel_guardian.db"
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
