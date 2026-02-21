from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app import models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[schemas.dynamic_column.DynamicColumn])
def read_dynamic_columns(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
    table_name: str = None
) -> Any:
    """
    Get all dynamic columns for the current company's tables.
    """
    query = db.query(models.DynamicColumn).filter(
        models.DynamicColumn.company_id == current_user.company_id
    )
    if table_name:
        query = query.filter(models.DynamicColumn.table_name == table_name)
    return query.all()

@router.post("/", response_model=schemas.dynamic_column.DynamicColumn)
def create_dynamic_column(
    *,
    db: Session = Depends(deps.get_db),
    column_in: schemas.dynamic_column.DynamicColumnCreate,
    current_admin: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    """
    Add a dynamic column to a specific table. Only Admins can do this.
    We leverage PostgreSQL ALTER TABLE.
    """
    # 1. Check if column metadata already exists
    existing = db.query(models.DynamicColumn).filter(
        models.DynamicColumn.company_id == current_admin.company_id,
        models.DynamicColumn.table_name == column_in.table_name,
        models.DynamicColumn.column_name == column_in.column_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Column already exists for this table")

    # 2. Add to actual PostgreSQL schema using a JSONB column on all target tables.
    # Note: A true physical ALTER TABLE (e.g., `ALTER TABLE products ADD COLUMN ...`) breaks 
    # multi-tenancy because other companies would suddenly see the column unless we do complex schema-per-tenant.
    # INSTEAD: We will store the dynamic data in a `dynamic_data` JSONB column which we will add to the models now.
    
    # 3. Save metadata
    new_column = models.DynamicColumn(
        company_id=current_admin.company_id,
        table_name=column_in.table_name,
        column_name=column_in.column_name,
        data_type=column_in.data_type
    )
    db.add(new_column)
    db.commit()
    db.refresh(new_column)
    
    return new_column

@router.delete("/{column_id}")
def delete_dynamic_column(
    *,
    db: Session = Depends(deps.get_db),
    column_id: int,
    current_admin: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    column = db.query(models.DynamicColumn).filter(
        models.DynamicColumn.id == column_id,
        models.DynamicColumn.company_id == current_admin.company_id
    ).first()
    
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
        
    db.delete(column)
    db.commit()
    return {"ok": True}
