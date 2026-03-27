import logging
from datetime import timedelta, datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple in-memory rate limiting (for production, use Redis)
_login_attempts: Dict[str, list] = {}

def check_rate_limit(ip: str, max_attempts: int = 5, window_seconds: int = 300) -> bool:
    """Check if IP has exceeded login rate limit (5 attempts per 5 minutes)"""
    now = datetime.utcnow()
    if ip not in _login_attempts:
        _login_attempts[ip] = []
    
    # Clean old attempts
    _login_attempts[ip] = [t for t in _login_attempts[ip] if (now - t).total_seconds() < window_seconds]
    
    if len(_login_attempts[ip]) >= max_attempts:
        return False
    
    _login_attempts[ip].append(now)
    return True


@router.post("/login/access-token", response_model=schemas.token.Token)
def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """OAuth2 compatible token login — returns an access token."""
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429, 
            detail="Too many login attempts. Please try again in 5 minutes."
        )
    
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {form_data.username} from IP: {client_ip}")
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(user.id, expires_delta=access_token_expires)
    logger.info(f"Successful login: {form_data.username} (role={user.role}) from IP: {client_ip}")
    return {"access_token": token, "token_type": "bearer"}
