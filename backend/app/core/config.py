import os
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Business Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours (reduced from 8 days)
    
    # Database connection string
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:51900@localhost:5432/SAAS_PROD")
    
    # CORS - comma-separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = os.getenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000"
    )

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
