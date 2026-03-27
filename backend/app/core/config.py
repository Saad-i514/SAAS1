import os
import secrets
import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    if not key:
        # PRODUCTION WARNING: Set SECRET_KEY in Vercel environment variables
        # For now, generate a temporary key to avoid breaking deployment
        import logging
        logging.warning(
            "⚠️ SECRET_KEY not set! Using temporary key. "
            "Set SECRET_KEY in Vercel environment variables for production. "
            "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )
        return secrets.token_urlsafe(32)
    return key


class Settings(BaseSettings):
    PROJECT_NAME: str = "Business Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = _get_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours (reduced from 24)

    # Database connection string
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:51900@localhost:5432/SAAS_PROD")

    # CORS - comma-separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = os.getenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000"
    )

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
