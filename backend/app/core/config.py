import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Community Hero API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./civiclens.db"
    SYNC_DATABASE_URL: str = "sqlite:///./civiclens.db"

    # Security
    SECRET_KEY: str = "changeme-in-production-use-long-random-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # Gemini AI
    GEMINI_API_KEY: str = ""

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "./firebase-service-account.json"
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # Google Cloud Storage
    GCS_BUCKET_NAME: str = "community-hero-media"
    GCS_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = "./gcp-service-account.json"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Google Maps (for reverse geocoding)
    GOOGLE_MAPS_API_KEY: str = ""

    # Duplicate Detection
    DUPLICATE_RADIUS_METERS: float = 100.0
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.8

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
