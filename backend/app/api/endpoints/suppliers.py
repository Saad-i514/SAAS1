from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.supplier.Supplier])
def read_suppliers(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return (
        db.query(models.Supplier)
        .filter(models.Supplier.company_id == current_user.company_id)
        .order_by(models.Supplier.name)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=schemas.supplier.Supplier)
def create_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_in: schemas.supplier.SupplierCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Duplicate supplier_no check within the same company
    existing = db.query(models.Supplier).filter(
        models.Supplier.company_id == current_user.company_id,
        models.Supplier.supplier_no == supplier_in.supplier_no,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A supplier with number '{supplier_in.supplier_no}' already exists",
        )

    supplier = models.Supplier(
        **supplier_in.model_dump(),
        company_id=current_user.company_id,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=schemas.supplier.Supplier)
def update_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    supplier_in: schemas.supplier.SupplierUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete suppliers")

    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.company_id == current_user.company_id,
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Block delete if supplier has transactions
    tx_count = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id,
        models.Transaction.supplier_id == supplier_id,
    ).count()
    if tx_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete supplier '{supplier.name}' — they have {tx_count} transaction(s). Deactivate instead.",
        )

    db.delete(supplier)
    db.commit()
    return {"ok": True, "deleted": supplier.name}
