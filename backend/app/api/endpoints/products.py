from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.core import cache
import base64
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _audit(db, user, action, resource_type, resource_id, description, request=None):
    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    db.add(models.AuditLog(
        company_id=user.company_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        description=description,
        ip_address=ip,
    ))


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
    company_id = current_user.company_id
    if company_id is None:
        return []

    # Cache products list for 2 minutes — invalidated on any product write
    cache_key, cached_val = cache.cached(company_id, 120, "products_list", skip, limit)
    if cached_val is not None:
        return cached_val

    result = (
        db.query(models.Product)
        .filter(models.Product.company_id == company_id)
        .order_by(models.Product.name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Serialize to dicts for caching (SQLAlchemy objects can't be pickled safely)
    serialized = [schemas.product.Product.model_validate(p).model_dump() for p in result]
    cache.set_tagged(company_id, cache_key, serialized, ttl=120)
    return result


@router.post("/", response_model=schemas.product.Product)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: schemas.product.ProductCreate,
    request: Request,
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
    db.flush()
    _audit(db, current_user, "CREATE", "product", product.id,
           f"Created product '{product.name}' (#{product.article_no})", request)
    db.commit()
    db.refresh(product)
    cache.invalidate_company(current_user.company_id)
    return product


@router.put("/{product_id}", response_model=schemas.product.Product)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: schemas.product.ProductUpdate,
    request: Request,
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

    _audit(db, current_user, "UPDATE", "product", product_id,
           f"Updated product '{product.name}'", request)
    db.add(product)
    db.commit()
    db.refresh(product)
    cache.invalidate_company(current_user.company_id)
    return product


@router.post("/{product_id}/image", response_model=schemas.product.Product)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Upload a product image. Stores as base64 data URL (suitable for small images <500KB)."""
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, or GIF images are allowed")

    content = await file.read()
    if len(content) > 500 * 1024:  # 500 KB limit
        raise HTTPException(status_code=400, detail="Image must be smaller than 500 KB")

    # Store as base64 data URL
    b64 = base64.b64encode(content).decode("utf-8")
    product.image_url = f"data:{file.content_type};base64,{b64}"

    _audit(db, current_user, "UPDATE", "product", product_id,
           f"Uploaded image for product '{product.name}'", request)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}/image", response_model=schemas.product.Product)
def delete_product_image(
    product_id: int,
    db: Session = Depends(deps.get_db),
    request: Request = None,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.company_id == current_user.company_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.image_url = None
    _audit(db, current_user, "UPDATE", "product", product_id,
           f"Removed image for product '{product.name}'", request)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    request: Request,
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

    _audit(db, current_user, "DELETE", "product", product_id,
           f"Deleted product '{product.name}' (#{product.article_no})", request)
    db.delete(product)
    db.commit()
    cache.invalidate_company(current_user.company_id)
    return {"ok": True, "deleted": product.name}
