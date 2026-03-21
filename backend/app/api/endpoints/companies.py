from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.user.CompanyBase])
def read_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_super_admin: models.User = Depends(deps.get_current_super_admin),
):
    """
    Retrieve all companies. Only Super Admin can do this.
    """
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    return companies

@router.delete("/{id}", response_model=schemas.user.CompanyBase)
def delete_company(
    id: int,
    db: Session = Depends(deps.get_db),
    current_super_admin: models.User = Depends(deps.get_current_super_admin),
):
    """
    Delete a company and cascading logic will delete its users and data. Only Super Admin can do this.
    """
    company = db.query(models.Company).filter(models.Company.id == id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return company
