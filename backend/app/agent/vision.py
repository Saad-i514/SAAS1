"""
Vision tool: uses Mistral pixtral model to extract structured data from images.
Model: pixtral-12b-2409 via Mistral API (key loaded from MISTRAL_API_KEY env var).
Returns structured data with confidence flags and missing field markers.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

VISION_EXTRACTION_PROMPT = """You are a precise data extraction assistant for a business management system.
Analyze this image carefully and extract structured business data.

For each field:
- If clearly visible and readable: provide the exact value
- If partially visible or unclear: provide your best reading with "(uncertain)" appended
- If completely absent: use null

Return ONLY this exact JSON structure, no markdown, no explanation:
{
  "record_type": "product | supplier | transaction | unknown",
  "product": {
    "article_no": null,
    "name": null,
    "category": null,
    "purchase_price": null,
    "sale_price": null,
    "quantity": null
  },
  "supplier": {
    "supplier_no": null,
    "name": null,
    "email": null,
    "phone": null
  },
  "transaction": {
    "type": "sale | purchase | null",
    "product_name": null,
    "quantity": null,
    "unit_price": null,
    "discount": null,
    "customer_name": null,
    "order_no": null,
    "payment_term": "Cash | Credit | null"
  },
  "missing_required_fields": [],
  "confidence": "high | medium | low",
  "notes": null
}

CRITICAL RULES:
1. NEVER invent or hallucinate data. Only extract what is clearly visible in the image.
2. For prices/numbers: extract exact values shown, do not round or estimate.
3. List ALL fields that are missing but required in "missing_required_fields".
4. Required fields for product: name, purchase_price, sale_price, article_no
5. Required fields for supplier: name, supplier_no
6. Required fields for transaction: type, product_name, quantity, unit_price
7. Return ONLY valid JSON — no markdown code fences, no explanation text.
"""


async def extract_data_from_image(
    image_base64: str,
    image_mime: str,
    mistral_api_key: str,
) -> dict:
    """
    Send image to Mistral pixtral vision model and extract structured business data.
    API key is passed in from the caller (loaded from MISTRAL_API_KEY env var).
    """
    import json
    try:
        from mistralai import Mistral

        client = Mistral(api_key=mistral_api_key)

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": f"data:{image_mime};base64,{image_base64}",
                    },
                    {
                        "type": "text",
                        "text": VISION_EXTRACTION_PROMPT,
                    },
                ],
            }
        ]

        response = client.chat.complete(
            model="pixtral-12b-2409",
            messages=messages,
            temperature=0.0,  # Zero temperature = deterministic, no hallucination
            max_tokens=1024,
        )

        raw_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if model wraps in them anyway
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            # Remove first line (```json) and last line (```)
            raw_text = "\n".join(lines[1:-1]) if len(lines) > 2 else raw_text

        parsed = json.loads(raw_text)
        return {"success": True, "data": parsed}

    except json.JSONDecodeError as e:
        logger.error(f"Vision JSON parse error: {e}")
        return {
            "success": False,
            "error": "Could not parse the extracted data. Please try a clearer image.",
        }
    except Exception as e:
        err_str = str(e).lower()
        logger.error(f"Vision extraction error: {e}", exc_info=True)
        if "401" in err_str or "unauthorized" in err_str:
            return {"success": False, "error": "Vision API authentication failed. Please contact support."}
        elif "429" in err_str or "rate_limit" in err_str:
            return {"success": False, "error": "Too many requests. Please wait a moment and try again."}
        elif "timeout" in err_str:
            return {"success": False, "error": "Image analysis timed out. Please try again with a smaller image."}
        return {
            "success": False,
            "error": f"Image analysis failed. Please try a clearer image of an invoice, receipt, or product label.",
        }


def validate_extracted_data(data: dict) -> dict:
    """
    Validate extracted data and return a structured result with:
    - confirmed fields (non-null)
    - missing required fields
    - confidence level
    - whether it can be saved as-is
    """
    record_type = data.get("record_type", "unknown")
    missing = data.get("missing_required_fields", [])
    confidence = data.get("confidence", "low")
    notes = data.get("notes")

    result = {
        "record_type": record_type,
        "confidence": confidence,
        "missing_fields": missing,
        "notes": notes,
        "fields": {},
        "can_save": len(missing) == 0,
    }

    if record_type == "product":
        product = data.get("product", {})
        result["fields"] = {k: v for k, v in product.items() if v is not None}
    elif record_type == "supplier":
        supplier = data.get("supplier", {})
        result["fields"] = {k: v for k, v in supplier.items() if v is not None}
    elif record_type == "transaction":
        transaction = data.get("transaction", {})
        result["fields"] = {k: v for k, v in transaction.items() if v is not None}
    else:
        # Unknown type — collect any non-null fields from all sections
        for section in ["product", "supplier", "transaction"]:
            section_data = data.get(section, {})
            for k, v in section_data.items():
                if v is not None:
                    result["fields"][k] = v

    return result
