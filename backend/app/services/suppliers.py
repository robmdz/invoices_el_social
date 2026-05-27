"""
Supplier matching and management service.

Similar to product matching but for suppliers/vendors from the database.
Matches extracted supplier names from invoices to canonical names in the catalog.
"""

import logging
import re
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class SupplierRecord:
    """A supplier from the database."""

    def __init__(self, supplier_id: str, supplier_code: str, supplier_name: str, 
                 supplier_vat: str = "", supplier_address: str = "", 
                 supplier_email: str = "", supplier_phone: str = ""):
        self.id = supplier_id
        self.code = supplier_code
        self.name = supplier_name
        self.vat = supplier_vat
        self.address = supplier_address
        self.email = supplier_email
        self.phone = supplier_phone
        self.name_lower = supplier_name.lower()

    def __repr__(self) -> str:
        return f"SupplierRecord({self.code}, {self.name})"

    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization."""
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "vat": self.vat,
            "address": self.address,
            "email": self.email,
            "phone": self.phone,
        }


def normalize_supplier_name(name: str) -> str:
    """Normalize a supplier name for robust matching.

    Removes punctuation, collapses whitespace, converts to lowercase.
    Similar to product name normalization.
    """
    if not name:
        return ""

    normalized = name.lower().strip()
    # Remove punctuation by replacing with spaces
    normalized = re.sub(r"[\"'""''.,:;()\[\]/\\-]", " ", normalized)
    # Collapse whitespace
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def match_supplier(
    supplier_name: str,
    suppliers: list[SupplierRecord],
    confidence_threshold: float = 60.0,
) -> tuple[SupplierRecord | None, float]:
    """Match an extracted supplier name to a catalog supplier.

    Uses:
    1. Exact normalized name match
    2. Substring containment
    3. Fuzzy name matching

    Returns (matched_supplier, confidence_score 0-100).
    """
    if not supplier_name or not suppliers:
        return None, 0.0

    name_norm = normalize_supplier_name(supplier_name)

    # 1. Exact normalized name match
    for supplier in suppliers:
        supplier_norm = normalize_supplier_name(supplier.name)
        if supplier_norm == name_norm:
            return supplier, 100.0

    # 2. Check substring containment and fuzzy match
    best_match = None
    best_score = 0.0

    for supplier in suppliers:
        supplier_norm = normalize_supplier_name(supplier.name)

        # Substring containment
        if supplier_norm in name_norm or name_norm in supplier_norm:
            score = 85.0
            if score > best_score:
                best_score = score
                best_match = supplier
            continue

        # Fuzzy match
        ratio = SequenceMatcher(None, name_norm, supplier_norm).ratio()
        score = ratio * 100.0
        if score > best_score:
            best_score = score
            best_match = supplier

    # Only return matches above threshold
    if best_score >= confidence_threshold:
        return best_match, best_score

    return None, best_score


def find_partial_supplier_matches(
    supplier_name: str,
    suppliers: list[SupplierRecord],
) -> list[SupplierRecord]:
    """Return suppliers whose normalized names partially match the extracted name."""
    if not supplier_name:
        return []

    name_norm = normalize_supplier_name(supplier_name)
    candidates: list[SupplierRecord] = []

    for supplier in suppliers:
        supplier_norm = normalize_supplier_name(supplier.name)
        if not supplier_norm:
            continue

        if supplier_norm in name_norm or name_norm in supplier_norm:
            candidates.append(supplier)

    return candidates


def select_best_supplier_candidate(
    supplier_name: str,
    candidates: list[SupplierRecord],
    confidence_threshold: float = 60.0,
) -> tuple[SupplierRecord | None, float]:
    """Select the best supplier from an ambiguous partial-match set."""
    if not candidates:
        return None, 0.0

    best_match = None
    best_score = 0.0
    name_norm = normalize_supplier_name(supplier_name)

    for supplier in candidates:
        supplier_norm = normalize_supplier_name(supplier.name)
        ratio = SequenceMatcher(None, name_norm, supplier_norm).ratio()
        score = ratio * 100.0
        if score > best_score:
            best_score = score
            best_match = supplier

    if best_score >= confidence_threshold:
        return best_match, best_score

    return best_match, best_score or 0.0
