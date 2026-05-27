"""
Pydantic models for invoice upload API request/response contracts.
"""

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str | None = None
    quantity: str | None = None
    unit_price: str | None = None
    amount: str | None = None


class CatalogCandidate(BaseModel):
    code: str
    name: str
    base_unit: str
    confidence_score: float | None = None


class SupplierCandidate(BaseModel):
    id: str
    code: str
    name: str
    vat: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    confidence_score: float | None = None


class ProcessedLineItem(BaseModel):
    """Line item after catalog matching, unit conversion, and tax calculation."""

    description: str | None = None
    quantity: str | None = None
    unit_price: str | None = None
    amount: str | None = None

    # Catalog matching
    matched_product_code: str | None = None
    matched_product_name: str | None = None
    catalog_unit: str | None = None
    confidence_score: float | None = None
    product_found: bool = False

    catalog_candidates: list[CatalogCandidate] = Field(default_factory=list)

    # Unit conversion
    invoice_unit: str | None = None
    converted_quantity: float | None = None
    conversion_applied: str | None = None  # e.g. "UN(150g) → kg: 0.15 × 20 = 3.0"

    # Tax
    tax_rate: float | None = None
    tax_amount: float | None = None
    net_unit_cost: float | None = None

    # Toteat mapping
    provider_product_id: str | None = None

    # Status
    status: str = "pending"  # 'matched', 'converted', 'error', 'pending'
    error_message: str | None = None


class InvoiceAlert(BaseModel):
    """Alert generated during invoice processing."""

    alert_type: str  # 'product_not_found', 'conversion_error', 'total_mismatch', 'api_error'
    severity: str = "error"  # 'warning', 'error', 'info'
    title: str
    description: str
    product_name: str | None = None
    line_item_index: int | None = None


class ReviewComment(BaseModel):
    """Structured review comment for audit trail."""

    comment_type: str  # 'review_required', 'conversion_applied', 'catalog_match', 'manual_override'
    invoice_number: str | None = None
    product_name: str | None = None
    issue: str
    action_taken: str | None = None
    next_step: str | None = None


class ExtractedField(BaseModel):
    value: str


class ToteatFields(BaseModel):
    """Fields mapped to Toteat API schema."""

    invoice_number: str = ""
    emission_date: str = ""
    provider_vat: str = ""
    invoice_type: str = "FACTURA"
    reference_number: str | None = None
    status: str | None = None
    comment: str | None = None
    due_date: str | None = None
    accounting_date: str | None = None
    currency: str = "COP"
    net_amount: float | None = None
    taxes_amount: float | None = None
    total_amount: float | None = None


class InvoiceExtractionResponse(BaseModel):
    """Response from POST /api/invoice/upload."""

    filename: str
    mime_type: str
    fields: dict[str, ExtractedField] = Field(default_factory=dict)
    line_items: list[LineItem] = Field(default_factory=list)


class InvoiceProcessingResponse(BaseModel):
    """Response from POST /api/invoice/process — full pipeline output."""

    filename: str
    mime_type: str
    fields: dict[str, ExtractedField] = Field(default_factory=dict)
    line_items: list[LineItem] = Field(default_factory=list)
    toteat_fields: ToteatFields = Field(default_factory=ToteatFields)
    processed_line_items: list[ProcessedLineItem] = Field(default_factory=list)
    alerts: list[InvoiceAlert] = Field(default_factory=list)
    comments: list[ReviewComment] = Field(default_factory=list)
    processing_status: str = "processed"
    total_reconciled: bool = False
    reconciliation_diff: float | None = None
    
    # Supplier matching
    matched_supplier_id: str | None = None
    matched_supplier_name: str | None = None
    supplier_candidates: list[SupplierCandidate] = Field(default_factory=list)


class ToteatSettingsPayload(BaseModel):
    """Payload for saving Toteat settings."""

    api_url: str = ""
    xir: str = ""
    xil: str = ""
    xiu: str = ""
    xapitoken: str = ""
    default_provider_vat: str | None = None
    default_invoice_type: str = "FACTURA"
    default_currency: str = "COP"
    default_tax_name: str = "IVA"
    default_tax_rate: float = 0.19
