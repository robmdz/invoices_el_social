"""
Toteat API Client for registering purchase invoices.
"""

import httpx
import logging
import asyncio
from typing import Any

from app.config import Settings
from app.schemas.invoice import InvoiceProcessingResponse, ProcessedLineItem, ToteatFields

logger = logging.getLogger(__name__)

# Basic in-memory rate limiting lock
_toteat_lock = asyncio.Lock()


class ToteatClient:
    def __init__(
        self,
        api_url: str,
        xir: str,
        xil: str,
        xiu: str,
        xapitoken: str,
    ):
        self.api_url = api_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.params = {
            "xir": xir,
            "xil": xil,
            "xiu": xiu,
            "xapitoken": xapitoken,
        }

    @classmethod
    def from_settings(cls, settings: dict) -> "ToteatClient":
        """Create a client from a user's settings dictionary."""
        return cls(
            api_url=settings.get("api_url", ""),
            xir=settings.get("xir", ""),
            xil=settings.get("xil", ""),
            xiu=settings.get("xiu", ""),
            xapitoken=settings.get("xapitoken", ""),
        )

    def _build_payload(self, toteat_fields: ToteatFields, processed_items: list[ProcessedLineItem]) -> dict:
        """Build the request payload for Toteat."""
        
        line_details = []
        for item in processed_items:
            if not item.product_found or not item.provider_product_id:
                continue
                
            qty = item.converted_quantity if item.converted_quantity is not None else (float(item.quantity) if item.quantity else 1.0)
            unit_cost = item.net_unit_cost or 0.0
            
            taxes = []
            if item.tax_amount and item.tax_rate:
                taxes.append({
                    "name": "IVA",  # Could be parameterized in settings later
                    "amount": item.tax_amount,
                    "value": item.tax_rate
                })

            line_details.append({
                "provider_product_id": item.provider_product_id,
                "quantity": qty,
                "unit": item.catalog_unit or item.invoice_unit or "UN",
                "net_unit_cost": unit_cost,
                "taxes": taxes
            })
            
        payload: dict[str, Any] = {
            "invoice_number": toteat_fields.invoice_number,
            "emission_date": toteat_fields.emission_date,
            "provider_vat": toteat_fields.provider_vat,
            "invoice_type": toteat_fields.invoice_type,
            "line_details": line_details,
            "currency": toteat_fields.currency,
        }
        
        if toteat_fields.reference_number:
            payload["reference_number"] = toteat_fields.reference_number
        if toteat_fields.status:
            payload["status"] = toteat_fields.status
        if toteat_fields.comment:
            payload["comment"] = toteat_fields.comment
        if toteat_fields.due_date:
            payload["due_date"] = toteat_fields.due_date
        if toteat_fields.accounting_date:
            payload["accounting_date"] = toteat_fields.accounting_date
        if toteat_fields.net_amount is not None:
            payload["net_amount"] = toteat_fields.net_amount
        if toteat_fields.taxes_amount is not None:
            payload["taxes_amount"] = toteat_fields.taxes_amount
        if toteat_fields.total_amount is not None:
            payload["total_amount"] = toteat_fields.total_amount
            
        # Global taxes can be added here if needed by Toteat
            
        return payload

    async def register_invoice(self, invoice_data: InvoiceProcessingResponse) -> dict:
        """Register a processed invoice with Toteat."""
        if not self.api_url or not self.params.get("xapitoken"):
            raise ValueError("Toteat API credentials are not fully configured.")
            
        payload = self._build_payload(invoice_data.toteat_fields, invoice_data.processed_line_items)
        
        if not payload.get("line_details"):
            raise ValueError("No valid line items to register (products not found in catalog).")

        # Rate limiting: 1 request per second
        async with _toteat_lock:
            await asyncio.sleep(1.0)
            
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(
                        f"{self.api_url}/v1/purchases/invoices",
                        params=self.params,
                        headers=self.headers,
                        json=payload,
                        timeout=30.0
                    )
                    
                    if response.status_code == 201:
                        return response.json() if response.content else {"status": "success"}
                    
                    if response.status_code == 400:
                        raise ValueError(f"Toteat validation error: {response.text}")
                    elif response.status_code == 404:
                        raise ValueError(f"Toteat resource not found (product/provider): {response.text}")
                    elif response.status_code == 429:
                        raise ValueError("Toteat rate limit exceeded. Try again later.")
                    else:
                        response.raise_for_status()
                        return response.json() if response.content else {"status": f"HTTP {response.status_code}"}
                        
                except httpx.HTTPError as e:
                    logger.error("Toteat API error: %s", e)
                    raise ValueError(f"Failed to communicate with Toteat API: {str(e)}")
