from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Configuration - Allow specific origins
# For production, we explicitly list allowed origins
cors_origins = [
    "https://bsmanagement.vercel.app",
    "https://bizmanagement.vercel.app",
    "https://saas-1-pied.vercel.app",
    "https://saas-1-qqmz.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
]

# Also check environment variable
env_origins = settings.BACKEND_CORS_ORIGINS.strip()
if env_origins and env_origins != "*":
    additional_origins = [o.strip() for o in env_origins.split(",") if o.strip()]
    cors_origins.extend(additional_origins)

# Remove duplicates
cors_origins = list(set(cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
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
    return {
        "status": "healthy", 
        "cors_origins": settings.BACKEND_CORS_ORIGINS,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/cors-test")
def cors_test():
    """Test CORS configuration"""
    return {
        "message": "CORS is working!",
        "your_origin": "Check browser console",
        "allowed_origins": [
            "https://bsmanagement.vercel.app",
            "https://bizmanagement.vercel.app",
            "https://saas-1-pied.vercel.app",
            "https://saas-1-qqmz.vercel.app",
        ]
    }

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
