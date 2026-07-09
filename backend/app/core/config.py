import os
import secrets
import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict


def _is_production() -> bool:
    """True on a real production deployment (Vercel prod or explicit ENVIRONMENT)."""
    if os.getenv("VERCEL_ENV", "").lower() == "production":
        return True
    if os.getenv("ENVIRONMENT", os.getenv("ENV", "")).lower() in ("production", "prod"):
        return True
    return False


def _get_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    if key:
        return key

    # In production a missing key is fatal: an ephemeral per-instance key would
    # silently invalidate everyone's JWT on every cold start. Fail loudly instead
    # of shipping a broken auth setup. (No database access here — config only.)
    if _is_production():
        raise RuntimeError(
            "SECRET_KEY is not set in this production environment. "
            "Set it in your Vercel (or host) environment variables — generate one with: "
            "python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )

    import logging
    logging.warning(
        "⚠️ SECRET_KEY not set — using a temporary key (dev/preview only). "
        "Tokens will not survive a restart. Set SECRET_KEY for production."
    )
    return secrets.token_urlsafe(32)


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
        "https://bsmanagement.vercel.app,"
        "https://bizmanagement.vercel.app,"
        "https://saas-1-pied.vercel.app,"
        "https://saas-1-qqmz.vercel.app,"
        "https://saas-1-six.vercel.app,"
        "https://saas-1-orcin.vercel.app,"
        "http://localhost:5173,"
        "http://localhost:5174,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:5174,"
        "http://localhost:3000"
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
