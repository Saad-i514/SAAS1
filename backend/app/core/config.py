import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multi-tenant SaaS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-super-secret-key-here-for-jwt"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Database connection string. Default assumes local postgres with provided credentials
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:51900@localhost:5432/SAAS_PROD")

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
