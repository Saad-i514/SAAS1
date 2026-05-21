"""Audit Log endpoint — read-only view of who did what and when."""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.AuditLogEntry])
def list_audit_logs(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = Query(None, description="Filter by action: CREATE, UPDATE, DELETE, PAYMENT"),
    resource_type: Optional[str] = Query(None, description="Filter by resource: transaction, product, supplier, customer"),
    user_email: Optional[str] = Query(None),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Only admins and super admins can view audit logs
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only admins can view audit logs")

    company_id = current_user.company_id
    if company_id is None:
        first = db.query(models.Company).first()
        if not first:
            return []
        company_id = first.id

    q = db.query(models.AuditLog).filter(models.AuditLog.company_id == company_id)

    if action:
        q = q.filter(models.AuditLog.action == action.upper())
    if resource_type:
        q = q.filter(models.AuditLog.resource_type == resource_type.lower())
    if user_email:
        q = q.filter(models.AuditLog.user_email.ilike(f"%{user_email}%"))

    return q.order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()
