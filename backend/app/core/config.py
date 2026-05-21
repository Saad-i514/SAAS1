import os
import secrets
import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    if not key:
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Database connection string
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:51900@localhost:5432/SAAS_PROD")

    # CORS - comma-separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = os.getenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000"
    )

    # ── AI Agent API Keys ────────────────────────────────────────────────────
    # Ollama cloud — gpt-oss:120b via OpenAI-compatible /v1 endpoint
    OLLAMA_API_KEY: str = ""
    # Mistral — pixtral-12b-2409 vision model for image scanning
    MISTRAL_API_KEY: str = ""

    # ── Email Notifications ──────────────────────────────────────────────────
    # Resend API key — get free key at resend.com (3000 emails/month free)
    RESEND_API_KEY: str = ""
    # Recipient email for all notifications
    NOTIFY_EMAIL: str = "gulraiz.butt9@gmail.com"
    # Sender address — must be verified in Resend dashboard
    # For testing use: onboarding@resend.dev
    NOTIFY_FROM: str = "onboarding@resend.dev"
    # Secret token to protect the cron endpoint — set any random string
    CRON_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
