from typing import List
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

@router.get("/list", response_model=List[schemas.user.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Retrieve users. Admins can only retrieve their own company operators. SuperAdmins retrieve all.
    """
    if current_admin.role == models.RoleEnum.SUPER_ADMIN:
        users = db.query(models.User).offset(skip).limit(limit).all()
    else:
        users = db.query(models.User).filter(models.User.company_id == current_admin.company_id).offset(skip).limit(limit).all()
    return users

@router.put("/{user_id}", response_model=schemas.user.User)
def update_user(
    user_id: int,
    user_in: schemas.user.UserUpdate,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Update a user. Useful for setting emails or changing passwords.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_admin.role != models.RoleEnum.SUPER_ADMIN and user.company_id != current_admin.company_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if user_in.email:
        existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = user_in.email
    
    if getattr(user_in, "password", None):
        user.hashed_password = get_password_hash(user_in.password)
        
    if getattr(user_in, "is_active", None) is not None:
        user.is_active = user_in.is_active
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=schemas.user.User)
def delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_admin: models.User = Depends(deps.get_current_active_admin),
):
    """
    Delete a user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_admin.role != models.RoleEnum.SUPER_ADMIN and user.company_id != current_admin.company_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    db.delete(user)
    db.commit()
    return user

@router.get("/me", response_model=schemas.user.User)
def read_current_user(
    current_user: models.User = Depends(deps.get_current_active_user),
):
    return current_user
