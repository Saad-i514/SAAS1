"""
Agent API endpoints — chat, image scan, confirm save, and revert.
All endpoints are scoped to the authenticated user's company (multi-tenant safe).

Models:
  - General chat/DB queries : Ollama cloud gpt-oss:120b via /v1 OpenAI-compatible endpoint
      Endpoint  : https://ollama.com/v1/chat/completions
      Key env   : OLLAMA_API_KEY
  - Image vision/OCR        : Mistral pixtral-12b-2409
      Key env   : MISTRAL_API_KEY
"""
from __future__ import annotations

import base64
import logging
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.api import deps

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# API Keys — loaded from environment variables via settings (never hardcoded)
# Set OLLAMA_API_KEY and MISTRAL_API_KEY in your .env / Vercel environment
# ---------------------------------------------------------------------------
from app.core.config import settings as _settings

MISTRAL_API_KEY = _settings.MISTRAL_API_KEY   # pixtral-12b-2409 vision
OLLAMA_API_KEY  = _settings.OLLAMA_API_KEY    # gpt-oss:120b via /v1

if not OLLAMA_API_KEY:
    logger.warning("⚠️ OLLAMA_API_KEY not set — AI chat will not work. Add it to your .env or Vercel environment variables.")
if not MISTRAL_API_KEY:
    logger.warning("⚠️ MISTRAL_API_KEY not set — Image scanning will not work. Add it to your .env or Vercel environment variables.")

# ---------------------------------------------------------------------------
# In-memory pending records store
# Key: pending_id (str UUID)
# Value: dict with record data + company_id + created_at timestamp
#
# Records expire after PENDING_TTL_SECONDS (30 minutes).
# Expired records are cleaned up on every write operation.
# This prevents memory leaks and stale pending IDs from being used.
# ---------------------------------------------------------------------------
import time as _time

PENDING_TTL_SECONDS = 1800  # 30 minutes

_pending_records: dict[str, dict] = {}


def _cleanup_expired_pending():
    """Remove pending records older than PENDING_TTL_SECONDS."""
    now = _time.time()
    expired = [k for k, v in _pending_records.items()
               if now - v.get("created_at", now) > PENDING_TTL_SECONDS]
    for k in expired:
        del _pending_records[k]
        logger.debug(f"Expired pending record cleaned up: {k}")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str        # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    pending_id: Optional[str] = None
    pending_data: Optional[dict] = None


class ConfirmSaveRequest(BaseModel):
    pending_id: str
    confirmed_data: dict   # User may have edited fields before confirming


class RevertRequest(BaseModel):
    record_id: int
    record_type: str = "transaction"   # "transaction" | "product" | "supplier"


# ---------------------------------------------------------------------------
# Helper: resolve company_id + company_name
# ---------------------------------------------------------------------------

def _resolve_company(current_user: models.User, db: Session) -> tuple[int, str]:
    """Return (company_id, company_name) for the current user."""
    if current_user.company_id is not None:
        company = db.query(models.Company).filter(
            models.Company.id == current_user.company_id
        ).first()
        name = company.name if company else "Your Company"
        return current_user.company_id, name
    # SuperAdmin without a company — use first company
    first = db.query(models.Company).first()
    if first:
        return first.id, first.name
    raise HTTPException(status_code=400, detail="No company found for this account")


# ---------------------------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def agent_chat(
    request: ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Send a message to the AI agent and get a response.
    Uses Ollama cloud qwen3:30b for general queries and DB tool-calling.
    """
    try:
        from langchain_core.messages import HumanMessage, AIMessage
        from app.agent.graph import build_agent

        company_id, company_name = _resolve_company(current_user, db)
        user_role = current_user.role.value if current_user.role else "Operator"

        agent = build_agent(
            ollama_api_key=OLLAMA_API_KEY,
            mistral_api_key=MISTRAL_API_KEY,
            company_id=company_id,
            company_name=company_name,
            user_role=user_role,
        )

        # Convert history to LangChain messages (keep last 10 for context window)
        lc_messages = []
        for msg in request.history[-10:]:
            if msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                lc_messages.append(AIMessage(content=msg.content))

        lc_messages.append(HumanMessage(content=request.message))

        result = agent.invoke({
            "messages": lc_messages,
            "company_id": company_id,
            "company_name": company_name,
            "user_role": user_role,
        })

        last_message = result["messages"][-1]
        reply = last_message.content if hasattr(last_message, "content") else str(last_message)

        return ChatResponse(reply=reply)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="The AI assistant encountered an error. Please try again.",
        )


# ---------------------------------------------------------------------------
# Image scan endpoint
# ---------------------------------------------------------------------------

@router.post("/scan-image")
async def scan_image(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload an image (invoice, receipt, product label) for AI extraction.
    Uses Mistral pixtral-12b-2409 vision model.
    Returns extracted data with missing fields highlighted.
    Does NOT save anything — returns a pending_id for user confirmation.
    """
    try:
        # Validate file type
        allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
        content_type = file.content_type or "image/jpeg"
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{content_type}'. Please upload JPEG, PNG, or WebP images.",
            )

        # Validate file size (max 10 MB)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Image too large. Maximum size is 10 MB.",
            )

        image_base64 = base64.b64encode(contents).decode("utf-8")

        from app.agent.vision import extract_data_from_image, validate_extracted_data

        extraction_result = await extract_data_from_image(
            image_base64=image_base64,
            image_mime=content_type,
            mistral_api_key=MISTRAL_API_KEY,
        )

        if not extraction_result.get("success"):
            return {
                "success": False,
                "message": extraction_result.get(
                    "error",
                    "Could not extract data from image. Please try a clearer image.",
                ),
            }

        validated = validate_extracted_data(extraction_result["data"])

        # Handle reports/screenshots — not an error, just wrong image type
        if validated["record_type"] == "report_or_unknown":
            return {
                "success": False,
                "is_wrong_type": True,
                "message": validated["user_message"],
            }

        if not validated["fields"]:
            return {
                "success": False,
                "message": (
                    "No business data could be extracted from this image. "
                    "Please try a clearer image of an invoice, receipt, or product label."
                ),
            }

        # Store as pending — NOT saved yet
        company_id, _ = _resolve_company(current_user, db)
        pending_id = str(uuid.uuid4())
        _cleanup_expired_pending()  # housekeeping on every scan
        _pending_records[pending_id] = {
            "company_id": company_id,
            "user_id": current_user.id,
            "record_type": validated["record_type"],
            "fields": validated["fields"],
            "original_extraction": extraction_result["data"],
            "created_at": _time.time(),  # TTL tracking
        }

        missing = validated["missing_fields"]
        confidence = validated["confidence"]

        # Build a user-friendly message
        parts = [f"I extracted the following **{validated['record_type']}** data from your image:"]
        if confidence == "low":
            parts.append("⚠️ **Low confidence** — please review carefully before saving.")
        elif confidence == "medium":
            parts.append("Some fields may need verification.")
        if missing:
            parts.append(f"\n⚠️ **Missing required fields**: {', '.join(missing)}")
            parts.append("Please fill in the missing fields before saving.")
        if validated["notes"]:
            parts.append(f"\n📝 Note: {validated['notes']}")
        parts.append("\n\n**Please review the fields below and click Confirm & Save when ready.**")

        return {
            "success": True,
            "pending_id": pending_id,
            "record_type": validated["record_type"],
            "fields": validated["fields"],
            "missing_fields": missing,
            "confidence": confidence,
            "can_save": validated["can_save"],
            "message": " ".join(parts),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image scan error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Image scanning failed. Please try again with a clearer image.",
        )


# ---------------------------------------------------------------------------
# Confirm save endpoint  (requires explicit user confirmation)
# ---------------------------------------------------------------------------

@router.post("/confirm-save")
async def confirm_save(
    request: ConfirmSaveRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Confirm and save a pending scanned record to the database.
    User MUST explicitly call this after reviewing the extracted data.
    Returns the saved record ID so the user can revert if needed.
    """
    try:
        pending = _pending_records.get(request.pending_id)
        if not pending:
            raise HTTPException(
                status_code=404,
                detail="Pending record not found or already processed. Please scan the image again.",
            )

        # Check TTL — reject if expired
        age = _time.time() - pending.get("created_at", 0)
        if age > PENDING_TTL_SECONDS:
            del _pending_records[request.pending_id]
            raise HTTPException(
                status_code=410,
                detail="This scan has expired (30 minute limit). Please scan the image again.",
            )

        # Security: ensure the pending record belongs to this user's company
        company_id, _ = _resolve_company(current_user, db)
        if pending["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        record_type = pending["record_type"]
        data = request.confirmed_data

        saved_id = None
        if record_type == "product":
            saved_id = _save_product(db, data, company_id, current_user)
        elif record_type == "supplier":
            saved_id = _save_supplier(db, data, company_id, current_user)
        elif record_type == "transaction":
            saved_id = _save_transaction(db, data, company_id, current_user)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown record type '{record_type}'. Cannot save.",
            )

        # Remove from pending store after successful save
        del _pending_records[request.pending_id]

        return {
            "success": True,
            "saved_type": record_type,
            "saved_id": saved_id,
            "message": (
                f"✅ {record_type.capitalize()} saved successfully! "
                f"You can revert this action if needed (ID: {saved_id})."
            ),
            "revert_available": True,
            "revert_id": saved_id,
            "revert_type": record_type,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Confirm save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save record: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Revert endpoint
# ---------------------------------------------------------------------------

@router.post("/revert")
async def revert_saved_record(
    request: RevertRequest,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Revert (delete) a recently saved record by its ID and type.
    Only the record owner's company can revert.
    Supports: transactions (with stock restoration), products, suppliers.
    """
    try:
        company_id, _ = _resolve_company(current_user, db)

        if request.record_type == "transaction":
            record = db.query(models.Transaction).filter(
                models.Transaction.id == request.record_id,
                models.Transaction.company_id == company_id,
            ).first()

            if not record:
                raise HTTPException(
                    status_code=404,
                    detail=f"Transaction #{request.record_id} not found or already deleted.",
                )

            # Safety guard: only allow reverting bot-scanned records (order_no starts with SCAN-)
            # and records created within the last 24 hours.
            from datetime import datetime, timedelta
            is_scan_record = record.order_no and record.order_no.startswith("SCAN-")
            is_recent = record.date and record.date >= datetime.utcnow() - timedelta(hours=24)
            if not (is_scan_record and is_recent):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only bot-scanned records created within the last 24 hours can be reverted here. "
                        "To delete other transactions, use the Transactions page."
                    ),
                )

            # Restore inventory if applicable
            if record.product_name and record.quantity:
                product = db.query(models.Product).filter(
                    models.Product.name == record.product_name,
                    models.Product.company_id == company_id,
                ).first()
                if product:
                    if record.type == models.TransactionTypeEnum.SALE:
                        product.in_hand_qty += record.quantity   # restore stock
                    elif record.type == models.TransactionTypeEnum.PURCHASE:
                        product.in_hand_qty = max(0, product.in_hand_qty - record.quantity)
                    db.add(product)

            db.delete(record)
            db.commit()
            return {
                "success": True,
                "message": f"✅ Transaction #{request.record_id} has been reverted and stock restored.",
            }

        elif request.record_type == "product":
            record = db.query(models.Product).filter(
                models.Product.id == request.record_id,
                models.Product.company_id == company_id,
            ).first()
            if not record:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product #{request.record_id} not found or already deleted.",
                )
            # Safety guard: only allow reverting records created within the last 24 hours
            from datetime import datetime, timedelta
            if not (record.created_at and record.created_at >= datetime.utcnow() - timedelta(hours=24)):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only records created within the last 24 hours can be reverted here. "
                        "To delete older products, use the Products page."
                    ),
                )
            db.delete(record)
            db.commit()
            return {
                "success": True,
                "message": f"✅ Product '{record.name}' has been removed.",
            }

        elif request.record_type == "supplier":
            record = db.query(models.Supplier).filter(
                models.Supplier.id == request.record_id,
                models.Supplier.company_id == company_id,
            ).first()
            if not record:
                raise HTTPException(
                    status_code=404,
                    detail=f"Supplier #{request.record_id} not found or already deleted.",
                )
            # Safety guard: only allow reverting records created within the last 24 hours
            from datetime import datetime, timedelta
            if not (record.created_at and record.created_at >= datetime.utcnow() - timedelta(hours=24)):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only records created within the last 24 hours can be reverted here. "
                        "To delete older suppliers, use the Suppliers page."
                    ),
                )
            db.delete(record)
            db.commit()
            return {
                "success": True,
                "message": f"✅ Supplier '{record.name}' has been removed.",
            }

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown record type '{request.record_type}'.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revert error: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Revert failed: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Discard pending endpoint
# ---------------------------------------------------------------------------

@router.delete("/pending/{pending_id}")
async def discard_pending(
    pending_id: str,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """Discard a pending scanned record without saving."""
    if pending_id in _pending_records:
        del _pending_records[pending_id]
    return {"success": True, "message": "Pending record discarded."}


# ---------------------------------------------------------------------------
# Internal save helpers
# ---------------------------------------------------------------------------

def _save_product(db: Session, data: dict, company_id: int, user: models.User) -> int:
    name = str(data.get("name", "")).strip()
    article_no = str(data.get("article_no", "")).strip()

    if not name:
        raise HTTPException(status_code=400, detail="Product name is required.")
    if not article_no:
        raise HTTPException(status_code=400, detail="Article number is required.")

    existing = db.query(models.Product).filter(
        models.Product.company_id == company_id,
        models.Product.article_no == article_no,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A product with article no '{article_no}' already exists.",
        )

    try:
        purchase_price = float(data.get("purchase_price") or 0)
        sale_price = float(data.get("sale_price") or 0)
        quantity = int(data.get("quantity") or 0)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid numeric value: {e}")

    product = models.Product(
        company_id=company_id,
        article_no=article_no,
        name=name,
        category=data.get("category"),
        product_price=purchase_price,
        sale_price=sale_price,
        in_hand_qty=quantity,
        status="Active",
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product.id


def _save_supplier(db: Session, data: dict, company_id: int, user: models.User) -> int:
    name = str(data.get("name", "")).strip()
    supplier_no = str(data.get("supplier_no", "")).strip()

    if not name:
        raise HTTPException(status_code=400, detail="Supplier name is required.")
    if not supplier_no:
        raise HTTPException(status_code=400, detail="Supplier number is required.")

    existing = db.query(models.Supplier).filter(
        models.Supplier.company_id == company_id,
        models.Supplier.supplier_no == supplier_no,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A supplier with number '{supplier_no}' already exists.",
        )

    supplier = models.Supplier(
        company_id=company_id,
        supplier_no=supplier_no,
        name=name,
        email=data.get("email"),
        phone=data.get("phone"),
        status="Active",
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier.id


def _save_transaction(db: Session, data: dict, company_id: int, user: models.User) -> int:
    from app.api.endpoints.transactions import _resolve_tx_type, _apply_inventory
    import uuid as _uuid

    tx_type_raw = data.get("type", "sale")
    tx_type = _resolve_tx_type(tx_type_raw)

    product_name = str(data.get("product_name", "")).strip()
    if not product_name:
        raise HTTPException(status_code=400, detail="Product name is required for transaction.")

    try:
        quantity = int(data.get("quantity") or 0)
        unit_price = float(data.get("unit_price") or 0)
        discount = float(data.get("discount") or 0)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid numeric value: {e}")

    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")

    debit = round(max(0.0, quantity * unit_price - discount), 2)

    product = db.query(models.Product).filter(
        models.Product.name == product_name,
        models.Product.company_id == company_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product '{product_name}' not found in your inventory.",
        )

    _apply_inventory(db, product, tx_type, quantity, False)
    db.add(product)

    transaction = models.Transaction(
        company_id=company_id,
        type=tx_type,
        product_name=product_name,
        quantity=quantity,
        unit_price=unit_price,
        discount=discount,
        debit=debit,
        customer_name=data.get("customer_name"),
        order_no=data.get("order_no") or f"SCAN-{_uuid.uuid4().hex[:6].upper()}",
        payment_term=data.get("payment_term", "Cash"),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction.id
