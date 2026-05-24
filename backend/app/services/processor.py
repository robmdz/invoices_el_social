"""
Invoice processing pipeline — catalog matching, unit conversion, tax calculation,
total reconciliation, and structured alerts/comments generation.
"""

import csv
import logging
import os
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher

from app.schemas.invoice import (
    ExtractedField,
    InvoiceAlert,
    InvoiceProcessingResponse,
    LineItem,
    ProcessedLineItem,
    ReviewComment,
    ToteatFields,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Product Catalog
# ---------------------------------------------------------------------------

class CatalogProduct:
    """A product from the Toteat ingredient master catalog."""

    def __init__(self, code: str, name: str, cost: float, active: bool, base_unit: str):
        self.code = code
        self.name = name
        self.cost = cost
        self.active = active
        self.base_unit = base_unit  # 'UN', 'kg', 'L'
        self.name_lower = name.lower()

    def __repr__(self) -> str:
        return f"CatalogProduct({self.code}, {self.name}, {self.base_unit})"


_catalog_cache: list[CatalogProduct] | None = None


def load_product_catalog(csv_path: str | None = None) -> list[CatalogProduct]:
    """Load the product catalog from CSV. Caches after first load."""
    global _catalog_cache
    if _catalog_cache is not None:
        return _catalog_cache

    if not csv_path:
        csv_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
            "MaestroIngr_1828467141218060_1_2026-05-24T19_42_41.xlsx - Ingr.csv",
        )

    catalog = []
    if not os.path.exists(csv_path):
        logger.warning("Product catalog CSV not found: %s", csv_path)
        return catalog

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # Skip header
        for row in reader:
            if len(row) < 5:
                continue
            code = row[0].strip()
            name = row[1].strip()
            try:
                cost = float(row[2].strip() or "0")
            except ValueError:
                cost = 0.0
            active = row[3].strip() == "1"
            unit = row[4].strip()
            catalog.append(CatalogProduct(code, name, cost, active, unit))

    _catalog_cache = catalog
    logger.info("Loaded %d products from catalog", len(catalog))
    return catalog


def match_product(
    description: str,
    catalog: list[CatalogProduct],
    llm_match_code: str | None = None,
    llm_confidence: float = 0.0,
) -> tuple[CatalogProduct | None, float]:
    """Match an invoice line item description to the closest catalog product.

    Uses a combination of:
    1. Exact code match (if LLM provided a code)
    2. Exact name match
    3. Fuzzy name matching (SequenceMatcher)

    Returns (matched_product, confidence_score 0-100).
    """
    if not description or not catalog:
        return None, 0.0

    desc_lower = description.lower().strip()

    # 1. If LLM already matched a code, validate it exists
    if llm_match_code:
        for product in catalog:
            if product.code == llm_match_code and product.active:
                return product, max(llm_confidence, 85.0)

    # 2. Exact name match
    for product in catalog:
        if not product.active:
            continue
        if product.name_lower == desc_lower:
            return product, 100.0

    # 3. Check if description contains the product name or vice versa
    best_match = None
    best_score = 0.0

    for product in catalog:
        if not product.active:
            continue

        # Substring containment
        if product.name_lower in desc_lower or desc_lower in product.name_lower:
            score = 80.0
            if score > best_score:
                best_score = score
                best_match = product
            continue

        # Fuzzy match
        ratio = SequenceMatcher(None, desc_lower, product.name_lower).ratio()
        score = ratio * 100.0
        if score > best_score:
            best_score = score
            best_match = product

    # Only return matches above a threshold
    if best_score >= 60.0:
        return best_match, best_score

    return None, best_score


# ---------------------------------------------------------------------------
# Unit Conversion
# ---------------------------------------------------------------------------

# Common unit aliases
UNIT_ALIASES = {
    "und": "UN", "un": "UN", "unidad": "UN", "unidades": "UN", "pz": "UN", "pieza": "UN",
    "kg": "kg", "kilo": "kg", "kilos": "kg", "kilogramo": "kg", "kilogramos": "kg",
    "g": "g", "gr": "g", "gramo": "g", "gramos": "g",
    "l": "L", "lt": "L", "ltr": "L", "litro": "L", "litros": "L",
    "ml": "ml", "mililitro": "ml", "mililitros": "ml",
    "lb": "lb", "libra": "lb", "libras": "lb",
    "caja": "CAJA", "paquete": "PAQ", "paq": "PAQ",
}


def normalize_unit(unit_str: str) -> str:
    """Normalize a unit string to a canonical form."""
    if not unit_str:
        return "UN"
    cleaned = unit_str.strip().lower().rstrip(".")
    return UNIT_ALIASES.get(cleaned, unit_str.strip())


def _extract_weight_from_name(product_name: str) -> tuple[float | None, str | None]:
    """Extract weight/volume from product name like '150GR', '750ML', '300GR'.

    Returns (value_in_base_unit, base_unit) e.g. (0.15, 'kg') for '150GR'.
    """
    name_upper = product_name.upper()

    # Match patterns like "150GR", "150 GR", "300G", "250 G"
    g_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:GR|G)\b", name_upper)
    if g_match:
        grams = float(g_match.group(1))
        return grams / 1000.0, "kg"

    # Match patterns like "750ML", "750 ML", "600ML"
    ml_match = re.search(r"(\d+(?:\.\d+)?)\s*ML\b", name_upper)
    if ml_match:
        ml = float(ml_match.group(1))
        return ml / 1000.0, "L"

    # Match patterns like "1.5L", "2L", "1,5 L"
    l_match = re.search(r"(\d+(?:[.,]\d+)?)\s*L\b", name_upper)
    if l_match:
        liters = float(l_match.group(1).replace(",", "."))
        return liters, "L"

    # Match patterns like "2KG", "1.5 KG"
    kg_match = re.search(r"(\d+(?:[.,]\d+)?)\s*KG\b", name_upper)
    if kg_match:
        kg = float(kg_match.group(1).replace(",", "."))
        return kg, "kg"

    return None, None


def convert_unit(
    quantity: float,
    from_unit: str,
    to_unit: str,
    product_name: str = "",
) -> tuple[float | None, str]:
    """Convert quantity from invoice unit to catalog unit.

    Returns (converted_quantity, conversion_description) or (None, error_message).
    """
    from_norm = normalize_unit(from_unit)
    to_norm = normalize_unit(to_unit)

    # Same unit — no conversion needed
    if from_norm == to_norm:
        return quantity, f"No conversion needed ({from_norm})"

    # Direct conversions
    if from_norm == "g" and to_norm == "kg":
        converted = quantity / 1000.0
        return converted, f"{quantity}g → {converted}kg"

    if from_norm == "kg" and to_norm == "g":
        converted = quantity * 1000.0
        return converted, f"{quantity}kg → {converted}g"

    if from_norm == "ml" and to_norm == "L":
        converted = quantity / 1000.0
        return converted, f"{quantity}ml → {converted}L"

    if from_norm == "L" and to_norm == "ml":
        converted = quantity * 1000.0
        return converted, f"{quantity}L → {converted}ml"

    if from_norm == "lb" and to_norm == "kg":
        converted = quantity * 0.453592
        return converted, f"{quantity}lb → {converted:.4f}kg"

    # UN → weight/volume: use product name to determine per-unit weight
    if from_norm == "UN" and to_norm in ("kg", "L"):
        per_unit_value, per_unit_type = _extract_weight_from_name(product_name)
        if per_unit_value and per_unit_type == to_norm:
            converted = quantity * per_unit_value
            return converted, f"{quantity} UN × {per_unit_value}{to_norm}/unit = {converted}{to_norm} (from product name)"
        elif per_unit_value and per_unit_type != to_norm:
            return None, f"Product name weight is in {per_unit_type} but catalog unit is {to_norm}"
        else:
            return None, f"Cannot determine per-unit {to_norm} value from product name '{product_name}'"

    # Weight/volume → UN: reverse of above
    if from_norm in ("kg", "L") and to_norm == "UN":
        per_unit_value, per_unit_type = _extract_weight_from_name(product_name)
        if per_unit_value and per_unit_type == from_norm:
            converted = quantity / per_unit_value
            return converted, f"{quantity}{from_norm} ÷ {per_unit_value}{from_norm}/unit = {converted} UN (from product name)"
        else:
            return None, f"Cannot convert {from_norm} to UN without per-unit weight"

    return None, f"No conversion rule for {from_norm} → {to_norm}"


# ---------------------------------------------------------------------------
# Total Reconciliation
# ---------------------------------------------------------------------------

def _parse_numeric(value: str | None) -> float | None:
    """Parse a numeric string, handling various formats."""
    if not value:
        return None
    # Remove currency symbols, spaces, and common separators
    cleaned = re.sub(r"[^\d.,\-]", "", value.strip())
    if not cleaned:
        return None
    # Handle comma as decimal separator
    if "," in cleaned and "." in cleaned:
        # e.g. "1.234.567,89" → "1234567.89"
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        parts = cleaned.split(",")
        if len(parts[-1]) <= 2:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def reconcile_totals(
    processed_items: list[ProcessedLineItem],
    invoice_net: float | None,
    invoice_tax: float | None,
    invoice_total: float | None,
    tax_rate: float = 0.19,
) -> tuple[bool, float | None]:
    """Validate that line items reconcile with invoice totals.

    Returns (is_reconciled, difference_amount).
    """
    if invoice_total is None:
        return False, None

    # Sum up line item amounts
    items_sum = 0.0
    for item in processed_items:
        amount = _parse_numeric(item.amount)
        if amount is not None:
            items_sum += amount

    # Check against net amount first, then total
    if invoice_net is not None:
        diff = abs(items_sum - invoice_net)
        tolerance = max(1.0, invoice_net * 0.01)  # 1% tolerance
        if diff <= tolerance:
            return True, diff

    # Check against total (items_sum + tax ≈ total)
    if invoice_tax is not None:
        calculated_total = items_sum + invoice_tax
    else:
        calculated_total = items_sum * (1 + tax_rate)

    diff = abs(calculated_total - invoice_total)
    tolerance = max(1.0, invoice_total * 0.02)  # 2% tolerance for rounding
    return diff <= tolerance, diff


# ---------------------------------------------------------------------------
# Main Processing Pipeline
# ---------------------------------------------------------------------------

def process_invoice(
    extraction_payload: dict,
    catalog: list[CatalogProduct] | None = None,
    tax_rate: float = 0.19,
) -> InvoiceProcessingResponse:
    """Process an extracted invoice through the full pipeline.

    Steps:
    1. Parse extracted fields
    2. For each line item: catalog lookup, unit conversion, tax calculation
    3. Reconcile totals
    4. Generate alerts and review comments
    """
    if catalog is None:
        catalog = load_product_catalog()

    now_iso = datetime.now(timezone.utc).isoformat()

    # Parse fields
    raw_fields = extraction_payload.get("fields", {})
    fields = {
        key: ExtractedField(value=str(raw_fields.get(key) or "").strip())
        for key in [
            "supplier_name", "supplier_address", "supplier_email", "supplier_phone",
            "receiver_name", "receiver_address", "invoice_id", "invoice_date",
            "due_date", "purchase_order", "currency", "net_amount",
            "total_tax_amount", "total_amount", "payment_terms",
        ]
    }

    invoice_number = fields.get("invoice_id", ExtractedField(value="")).value

    # Parse Toteat fields
    raw_toteat = extraction_payload.get("toteat_fields", {})
    toteat_fields = ToteatFields(
        invoice_number=str(raw_toteat.get("invoice_number") or invoice_number or ""),
        emission_date=str(raw_toteat.get("emission_date") or fields.get("invoice_date", ExtractedField(value="")).value or ""),
        provider_vat=str(raw_toteat.get("provider_vat") or ""),
        invoice_type=str(raw_toteat.get("invoice_type") or "FACTURA"),
        currency=str(raw_toteat.get("currency") or fields.get("currency", ExtractedField(value="COP")).value or "COP"),
        comment=str(raw_toteat.get("comment") or ""),
        status=str(raw_toteat.get("status") or "PENDIENTE"),
        net_amount=_parse_numeric(str(raw_toteat.get("net_amount") or "")),
        taxes_amount=_parse_numeric(str(raw_toteat.get("taxes_amount") or "")),
        total_amount=_parse_numeric(str(raw_toteat.get("total_amount") or "")),
    )

    # Build basic line items
    raw_line_items = extraction_payload.get("line_items", [])
    line_items = []
    for row in raw_line_items:
        if not isinstance(row, dict):
            continue
        line_items.append(LineItem(
            description=str(row.get("description") or "").strip() or None,
            quantity=str(row.get("quantity") or "").strip() or None,
            unit_price=str(row.get("unit_price") or "").strip() or None,
            amount=str(row.get("amount") or "").strip() or None,
        ))

    # Process each line item
    processed_items: list[ProcessedLineItem] = []
    alerts: list[InvoiceAlert] = []
    comments: list[ReviewComment] = []

    for idx, raw_item in enumerate(raw_line_items):
        if not isinstance(raw_item, dict):
            continue

        desc = str(raw_item.get("description") or "").strip()
        qty_str = str(raw_item.get("quantity") or "").strip()
        price_str = str(raw_item.get("unit_price") or "").strip()
        amount_str = str(raw_item.get("amount") or "").strip()
        invoice_unit_str = str(raw_item.get("invoice_unit") or "UN").strip()
        llm_code = str(raw_item.get("matched_product_code") or "").strip() or None
        llm_name = str(raw_item.get("matched_product_name") or "").strip() or None
        llm_confidence = _parse_numeric(str(raw_item.get("confidence_score") or "0")) or 0.0
        line_tax_str = str(raw_item.get("tax_amount") or "").strip()
        line_tax_rate_str = str(raw_item.get("tax_rate") or "").strip()

        quantity = _parse_numeric(qty_str)
        unit_price = _parse_numeric(price_str)
        amount = _parse_numeric(amount_str)
        line_tax = _parse_numeric(line_tax_str)
        line_tax_rate = _parse_numeric(line_tax_rate_str)

        # --- Catalog lookup ---
        matched, confidence = match_product(desc, catalog, llm_code, llm_confidence)

        processed = ProcessedLineItem(
            description=desc or None,
            quantity=qty_str or None,
            unit_price=price_str or None,
            amount=amount_str or None,
            invoice_unit=invoice_unit_str,
            tax_amount=line_tax,
            tax_rate=line_tax_rate if line_tax_rate else tax_rate,
            net_unit_cost=unit_price,
        )

        if matched:
            processed.matched_product_code = matched.code
            processed.matched_product_name = matched.name
            processed.catalog_unit = matched.base_unit
            processed.confidence_score = confidence
            processed.product_found = True
            processed.provider_product_id = matched.code
            processed.status = "matched"

            comments.append(ReviewComment(
                comment_type="catalog_match",
                invoice_number=invoice_number,
                product_name=desc,
                issue=f"Matched to catalog: {matched.code} - {matched.name} (confidence: {confidence:.0f}%)",
                action_taken=f"Auto-matched with confidence {confidence:.0f}%",
                next_step="Verify match is correct" if confidence < 90 else "No action needed",
            ))

            # --- Unit conversion ---
            invoice_unit_norm = normalize_unit(invoice_unit_str)
            if invoice_unit_norm != matched.base_unit and quantity is not None:
                converted_qty, conversion_desc = convert_unit(
                    quantity, invoice_unit_str, matched.base_unit, matched.name
                )
                if converted_qty is not None:
                    processed.converted_quantity = converted_qty
                    processed.conversion_applied = conversion_desc
                    processed.status = "converted"

                    comments.append(ReviewComment(
                        comment_type="conversion_applied",
                        invoice_number=invoice_number,
                        product_name=desc,
                        issue=f"Unit conversion: {conversion_desc}",
                        action_taken=f"Converted {quantity} {invoice_unit_str} → {converted_qty:.4f} {matched.base_unit}",
                        next_step="Verify converted quantity is reasonable",
                    ))
                else:
                    processed.status = "error"
                    processed.error_message = conversion_desc

                    alerts.append(InvoiceAlert(
                        alert_type="conversion_error",
                        severity="error",
                        title=f"Unit conversion failed: {desc}",
                        description=f"Cannot convert {invoice_unit_str} → {matched.base_unit}. {conversion_desc}",
                        product_name=desc,
                        line_item_index=idx,
                    ))

                    comments.append(ReviewComment(
                        comment_type="review_required",
                        invoice_number=invoice_number,
                        product_name=desc,
                        issue=f"Unit conversion failed: {conversion_desc}",
                        action_taken="Line item flagged for manual review",
                        next_step=f"Manually convert {quantity} {invoice_unit_str} to {matched.base_unit} and update quantity",
                    ))
            elif quantity is not None:
                processed.converted_quantity = quantity
                processed.conversion_applied = f"No conversion needed ({invoice_unit_norm})"

        else:
            # Product NOT found in catalog
            processed.product_found = False
            processed.status = "error"
            processed.error_message = f"Product '{desc}' not found in system catalog"
            processed.confidence_score = confidence

            alerts.append(InvoiceAlert(
                alert_type="product_not_found",
                severity="error",
                title=f"Product not found: {desc}",
                description=(
                    f"Product '{desc}' not found in system catalog (products_catalog.csv). "
                    f"This is the likely cause of any total discrepancy on this invoice. "
                    f"Manual review required before registration."
                ),
                product_name=desc,
                line_item_index=idx,
            ))

            comments.append(ReviewComment(
                comment_type="review_required",
                invoice_number=invoice_number,
                product_name=desc,
                issue=f"Product '{desc}' not found in system catalog. Best match score: {confidence:.0f}%",
                action_taken="Line item excluded from Toteat registration",
                next_step="Add product to catalog or manually map to existing product, then re-process",
            ))

        processed_items.append(processed)

    # --- Total reconciliation ---
    invoice_net = _parse_numeric(fields.get("net_amount", ExtractedField(value="")).value)
    invoice_tax = _parse_numeric(fields.get("total_tax_amount", ExtractedField(value="")).value)
    invoice_total = _parse_numeric(fields.get("total_amount", ExtractedField(value="")).value)

    reconciled, diff = reconcile_totals(
        processed_items, invoice_net, invoice_tax, invoice_total, tax_rate
    )

    if not reconciled and invoice_total is not None:
        alerts.append(InvoiceAlert(
            alert_type="total_mismatch",
            severity="warning",
            title="Total does not reconcile",
            description=(
                f"Sum of line items does not match invoice total. "
                f"Difference: {diff:.2f if diff else 'unknown'}. "
                f"This may be due to unmatched products, rounding, or missing line items."
            ),
        ))

        comments.append(ReviewComment(
            comment_type="review_required",
            invoice_number=invoice_number,
            product_name=None,
            issue=f"Invoice total mismatch. Difference: {diff:.2f if diff else 'unknown'}",
            action_taken="Flagged for manual reconciliation",
            next_step="Check for missing line items, unmatched products, or tax calculation differences",
        ))

    # Determine overall status
    has_errors = any(a.severity == "error" for a in alerts)
    processing_status = "processed" if not has_errors else "partial"

    return InvoiceProcessingResponse(
        filename="",  # Set by caller
        mime_type="",  # Set by caller
        fields=fields,
        line_items=line_items,
        toteat_fields=toteat_fields,
        processed_line_items=processed_items,
        alerts=alerts,
        comments=comments,
        processing_status=processing_status,
        total_reconciled=reconciled,
        reconciliation_diff=diff,
    )
