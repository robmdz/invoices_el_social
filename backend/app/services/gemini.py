"""
Invoice extraction via the Gemini API (PDF/image sent directly to the model).

Enhanced with Toteat field mapping, product catalog context for matching,
unit-of-measure detection, and tax extraction.
"""

import csv
import json
import logging
import os
import re

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import Settings, get_product_catalog_path
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
                    "invoice_unit": {"type": "string"},
                    "tax_amount": {"type": "string"},
                    "tax_rate": {"type": "string"},
                    "matched_product_code": {"type": "string"},
                    "matched_product_name": {"type": "string"},
                    "confidence_score": {"type": "string"},
                },
            },
        },
        "toteat_fields": {
            "type": "object",
            "properties": {
                "invoice_number": {"type": "string"},
                "emission_date": {"type": "string"},
                "provider_vat": {"type": "string"},
                "invoice_type": {"type": "string"},
                "net_amount": {"type": "string"},
                "taxes_amount": {"type": "string"},
                "total_amount": {"type": "string"},
                "currency": {"type": "string"},
                "comment": {"type": "string"},
                "status": {"type": "string"},
            },
        },
    },
    "required": ["fields", "line_items", "toteat_fields"],
}


def _load_product_catalog_for_prompt(settings: Settings) -> str:
    """Load the product catalog CSV and format it as context for the LLM prompt."""
    catalog_path = get_product_catalog_path(settings.product_catalog_csv or None)

    if not os.path.exists(catalog_path):
        logger.warning("Product catalog CSV not found at %s", catalog_path)
        return "PRODUCT CATALOG NOT AVAILABLE"

    lines = []
    try:
        with open(catalog_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            for row in reader:
                if len(row) >= 5:
                    code = row[0].strip()
                    name = row[1].strip()
                    cost = row[2].strip()
                    active = row[3].strip()
                    unit = row[4].strip()
                    if active == "1":
                        lines.append(f"  {code} | {name} | {unit} | ${cost}")
    except Exception as e:
        logger.error("Failed to load product catalog: %s", e)
        return "PRODUCT CATALOG LOAD ERROR"

    return "\n".join(lines)


def _build_extraction_prompt(settings: Settings) -> str:
    """Build the full extraction prompt with product catalog context."""
    catalog_text = _load_product_catalog_for_prompt(settings)

    return f"""You are a specialized invoice processing agent for a restaurant inventory system (Toteat).
Your job is to extract ALL data from supplier invoices and map them to the Toteat API format.

## CORE TASKS

### 1. EXTRACT ALL INVOICE FIELDS
Read the attached invoice document (PDF or image) and extract every available field.
Return JSON matching the schema with:
- "fields": object with these keys (use empty string if not found):
  supplier_name, supplier_address, supplier_email, supplier_phone,
  receiver_name, receiver_address, invoice_id, invoice_date, due_date,
  purchase_order, currency, net_amount, total_tax_amount, total_amount, payment_terms

### 2. MAP TO TOTEAT API FORMAT
Also return "toteat_fields" with:
- invoice_number: the invoice number/ID from the document
- emission_date: invoice date in YYYY-MM-DD format
- provider_vat: the supplier's NIT/RUT/RFC/VAT number (look for "NIT", "RUT", "RFC", "C.C.", tax ID fields)
- invoice_type: "FACTURA" (unless it's clearly a BOLETA, NOTA_CREDITO, etc.)
- net_amount: subtotal before taxes (numeric string)
- taxes_amount: total tax amount (numeric string)
- total_amount: grand total (numeric string)
- currency: "COP" for Colombian Pesos, "USD", "EUR", etc.
- comment: any special notes on the invoice
- status: "PENDIENTE" unless payment status is indicated

### 3. EXTRACT LINE ITEMS WITH PRODUCT MATCHING
For each line item on the invoice:
- description: product name/description exactly as shown on the invoice
- quantity: numeric quantity
- unit_price: price per unit (net, before tax)
- amount: total line amount (before tax if possible, otherwise as shown)
- invoice_unit: the unit of measure on the invoice (e.g., "UND", "UN", "KG", "LT", "GR", "ML", "CAJA", etc.)
- tax_amount: tax amount for this line (if shown, otherwise empty)
- tax_rate: tax rate applied (e.g., "0.19" for 19% IVA)

### 4. MATCH PRODUCTS TO CATALOG
For each line item, try to match the description to the closest product in the catalog below.
Use fuzzy matching — supplier names may differ from catalog names.
Examples of matching logic:
- "CARNE MOLIDA RES" → "CARNE MOLIDA DE RES (TABLA)" (PRO005)
- "BONDIOLA CERDO" → "BONDIOLA DE CERDO" (PRO001)
- "QSO MOZARELLA" → "QUESO MOZARELLA GR" (LAC028)
- "ACEITE OLIVA" → "ACEITE DE OLIVA" (ABA002)

Return for each line:
- matched_product_code: the product code (e.g., "PRO005") or empty if no confident match
- matched_product_name: the catalog product name or empty if no match
- confidence_score: 0-100 how confident you are in the match (0 = no match, 100 = exact)
  Use 0 if you cannot find a reasonable match. Use 80+ only for strong matches.

## PRODUCT CATALOG (Code | Name | Base Unit | Cost)
{catalog_text}

## IMPORTANT RULES
- Use the exact values as shown on the invoice. Do not invent data.
- For dates, always convert to YYYY-MM-DD format.
- For amounts, use numeric strings without currency symbols or thousand separators (e.g., "125000" not "$125.000").
- If a field is not found on the invoice, use empty string "".
- For product matching: when in doubt, leave matched_product_code empty and set confidence_score to "0".
  It is better to flag for human review than to make a wrong match.
- Pay attention to units: some products are sold by weight (kg, g), some by volume (L, ml), some by unit (UN/UND).
  The invoice unit may differ from the catalog unit — that's okay, just report what the invoice says."""


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
    prompt = _build_extraction_prompt(settings)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            prompt,
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


def extract_invoice_full(
    content: bytes,
    mime_type: str,
    settings: Settings,
) -> dict:
    """Send document bytes to Gemini and return the FULL extraction payload.

    Returns the raw parsed dict including fields, line_items (with matching info),
    and toteat_fields. Used by the processing pipeline.
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = _build_extraction_prompt(settings)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=[
            prompt,
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

    return _parse_extraction_payload(raw_text)


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
