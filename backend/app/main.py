from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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

# ── Security Headers Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── CORS ─────────────────────────────────────────────────────────────────────
# Load CORS origins from environment variable with fallback for existing deployments
cors_origins_str = settings.BACKEND_CORS_ORIGINS
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

# Fallback: If no origins configured, use existing Vercel domains (backward compatibility)
if not cors_origins or cors_origins == ['']:
    cors_origins = [
        "https://bsmanagement.vercel.app",
        "https://bizmanagement.vercel.app",
        "https://saas-1-pied.vercel.app",
        "https://saas-1-qqmz.vercel.app",
        "https://saas-1-six.vercel.app",
        "https://saas-1-orcin.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
    ]
    logger.warning("⚠️ BACKEND_CORS_ORIGINS not set, using default Vercel domains")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Type"],
    max_age=3600,
)

logger.info(f"CORS configured for {len(cors_origins)} origins")

# ── Routes ────────────────────────────────────────────────────────────────────
from app.api.api import api_router  # noqa: E402 (import after app creation)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/test-db")
def test_database():
    try:
        from app.core.database import SessionLocal
        from app.models import User
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        return {"status": "connected", "user_count": user_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}
