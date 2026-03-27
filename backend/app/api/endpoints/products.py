from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps

router = APIRouter()


def _validate_prices(product_price: float, sale_price: float):
    if product_price < 0:
        raise HTTPException(status_code=400, detail="Purchase price cannot be negative")
    if sale_price < 0:
        raise HTTPException(status_code=400, detail="Sale price cannot be negative")


@router.get("/", response_model=List[schemas.product.Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    return (
        db.query(models.Product)
        .filter(models.Product.company_id == current_user.company_id)
        .order_by(models.Product.name)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=schemas.product.Product)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: schemas.product.ProductCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    # Validate prices
    _validate_prices(product_in.product_price, product_in.sale_price)

    # Validate in_hand_qty
    if product_in.in_hand_qty is not None and product_in.in_hand_qty < 0:
        raise HTTPException(status_code=400, detail="In-hand quantity cannot be negative")

    # Duplicate article_no check within the same company
    existing = db.query(models.Product).filter(
        models.Product.company_id == current_user.company_id,
        models.Product.article_no == product_in.article_no,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A product with article no '{product_in.article_no}' already exists",
        )

    product = models.Product(
        **product_in.model_dump(),
        company_id=current_user.company_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.product.Product)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: schemas.product.ProductUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)

    # Validate prices if being updated
    new_pp = update_data.get("product_price", product.product_price)
    new_sp = update_data.get("sale_price", product.sale_price)
    _validate_prices(new_pp or 0, new_sp or 0)

    if "in_hand_qty" in update_data and update_data["in_hand_qty"] is not None:
        if update_data["in_hand_qty"] < 0:
            raise HTTPException(status_code=400, detail="In-hand quantity cannot be negative")

    for field, value in update_data.items():
        setattr(product, field, value)

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    if current_user.role not in [models.RoleEnum.ADMIN, models.RoleEnum.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete products")

    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Warn if product has transactions (soft-check — still allow delete)
    tx_count = db.query(models.Transaction).filter(
        models.Transaction.company_id == current_user.company_id,
        models.Transaction.product_name == product.name,
    ).count()
    if tx_count > 0:
        # Don't block, but the caller should be aware
        pass

    db.delete(product)
    db.commit()
    return {"ok": True, "deleted": product.name}
