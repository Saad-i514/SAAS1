from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/company-admin", response_model=schemas.user.User)
def create_company_and_admin(
    user_in: schemas.user.UserCreate,
    db: Session = Depends(deps.get_db),
    current_super_admin: models.User = Depends(deps.get_current_super_admin),
):
    """
    Onboard a new Company and its first Admin. Only a Super Admin can do this.
    """
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    company_name = user_in.company_name
    if not company_name:
        raise HTTPException(status_code=400, detail="Company name is required")

    # Create Company
    company = models.Company(name=company_name)
    db.add(company)
    db.flush() # flush to get company.id
    
    user_obj = models.User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=models.RoleEnum.ADMIN,
        company_id=company.id
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

@router.post("/", response_model=schemas.user.User)
def create_operator(
    user_in: schemas.user.UserCreate,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Create an Operator. Only an Admin can create operators for their own company.
    """
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    
    user_obj = models.User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=models.RoleEnum.OPERATOR,
        company_id=current_admin.company_id # Assigned to admin's company
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    return user_obj

@router.get("/me", response_model=schemas.user.User)
def read_current_user(
    current_user: models.User = Depends(deps.get_current_active_user),
):
    return current_user
