from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Parse CORS origins from comma-separated string
cors_origins_str = settings.BACKEND_CORS_ORIGINS.strip()

# Check if wildcard is used
if cors_origins_str == "*":
    # For wildcard, we need to disable credentials
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False when using "*"
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info("CORS: Allowing all origins (wildcard)")
else:
    # Parse specific origins
    cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]
    
    # If no origins configured, allow all
    if not cors_origins:
        cors_origins = ["*"]
        allow_creds = False
    else:
        allow_creds = True
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=allow_creds,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info(f"CORS Origins configured: {cors_origins}")

logger.info(f"BACKEND_CORS_ORIGINS env: {settings.BACKEND_CORS_ORIGINS}")

from app.api.api import api_router

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "cors_origins": settings.BACKEND_CORS_ORIGINS}

@app.get("/test-db")
def test_database():
    """Test database connection"""
    try:
        from app.core.database import SessionLocal
        from app.models import User
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        return {"status": "connected", "user_count": user_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

app.include_router(api_router, prefix=settings.API_V1_STR)
