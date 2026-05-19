"""
Pydantic models for invoice upload API request/response contracts.
"""

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str | None = None
    quantity: str | None = None
    unit_price: str | None = None
    amount: str | None = None


class ExtractedField(BaseModel):
    value: str


class InvoiceExtractionResponse(BaseModel):
    """Response from POST /api/invoice/upload."""

    filename: str
    mime_type: str
    fields: dict[str, ExtractedField] = Field(default_factory=dict)
    line_items: list[LineItem] = Field(default_factory=list)
