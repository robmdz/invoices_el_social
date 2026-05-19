"""
Invoice extraction via the Gemini API (PDF/image sent directly to the model).
"""

import json
import logging
import re

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import Settings
from app.schemas.invoice import ExtractedField, LineItem

logger = logging.getLogger(__name__)

INVOICE_FIELD_KEYS = [
    "supplier_name",
    "supplier_address",
    "supplier_email",
    "supplier_phone",
    "receiver_name",
    "receiver_address",
    "invoice_id",
    "invoice_date",
    "due_date",
    "purchase_order",
    "currency",
    "net_amount",
    "total_tax_amount",
    "total_amount",
    "payment_terms",
]

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "fields": {
            "type": "object",
            "properties": {
                key: {"type": "string"} for key in INVOICE_FIELD_KEYS
            },
        },
        "line_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "quantity": {"type": "string"},
                    "unit_price": {"type": "string"},
                    "amount": {"type": "string"},
                },
            },
        },
    },
    "required": ["fields", "line_items"],
}

EXTRACTION_PROMPT = """You are an invoice data extraction assistant.
Read the attached invoice document (PDF or image) and extract all available data.

Return JSON matching the schema with:
- "fields": object with these keys (use empty string if not found):
  supplier_name, supplier_address, supplier_email, supplier_phone,
  receiver_name, receiver_address, invoice_id, invoice_date, due_date,
  purchase_order, currency, net_amount, total_tax_amount, total_amount, payment_terms
- "line_items": array of rows with description, quantity, unit_price, amount (strings; empty string if missing)

Use the exact values as shown on the invoice. Do not invent data."""


def _parse_extraction_payload(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _normalize_fields(raw_fields: dict | None) -> dict[str, ExtractedField]:
    source = raw_fields or {}
    return {
        key: ExtractedField(value=str(source.get(key) or "").strip())
        for key in INVOICE_FIELD_KEYS
    }


def _normalize_line_items(raw_items: list | None) -> list[LineItem]:
    items = []
    for row in raw_items or []:
        if not isinstance(row, dict):
            continue
        items.append(
            LineItem(
                description=str(row.get("description") or "").strip() or None,
                quantity=str(row.get("quantity") or "").strip() or None,
                unit_price=str(row.get("unit_price") or "").strip() or None,
                amount=str(row.get("amount") or "").strip() or None,
            )
        )
    return items


def extract_invoice(
    content: bytes,
    mime_type: str,
    settings: Settings,
) -> tuple[dict[str, ExtractedField], list[LineItem]]:
    """Send document bytes to Gemini and return structured invoice fields."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=settings.gemini_api_key)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            EXTRACTION_PROMPT,
            types.Part.from_bytes(data=content, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=EXTRACTION_SCHEMA,
        ),
    )

    raw_text = response.text
    if not raw_text:
        raise ValueError("Gemini returned an empty response.")

    payload = _parse_extraction_payload(raw_text)
    return _normalize_fields(payload.get("fields")), _normalize_line_items(
        payload.get("line_items")
    )


def gemini_error_status(exc: Exception) -> tuple[int, str]:
    """Map Gemini SDK errors to HTTP status and user-facing message."""
    if isinstance(exc, genai_errors.ClientError):
        code = getattr(exc, "code", 502) or 502
        message = getattr(exc, "message", None) or str(exc)

        lowered = message.lower()
        if code in (401, 403) or "api key" in lowered or "api_key" in lowered:
            return 401, message
        if code == 404 or "not found" in lowered and "model" in lowered:
            return 404, f"Modelo Gemini no válido: {message}"
        if code == 429 or "rate" in lowered or "quota" in lowered:
            return 429, "Límite de uso de Gemini alcanzado. Intenta de nuevo más tarde."

        return code if 400 <= code < 600 else 502, message

    if isinstance(exc, json.JSONDecodeError):
        return 502, "No se pudo interpretar la respuesta de Gemini."

    if isinstance(exc, ValueError):
        return 500, str(exc)

    logger.exception("Unexpected error during invoice extraction")
    return 502, "Error al extraer datos de la factura con Gemini."
