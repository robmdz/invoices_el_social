"""
Invoice processing API routes.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Request

from app.config import Settings, get_settings
from app.schemas.invoice import InvoiceExtractionResponse, InvoiceProcessingResponse
from app.services.gemini import extract_invoice, extract_invoice_full, gemini_error_status
from app.services.processor import process_invoice
from app.services.toteat import ToteatClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoice", tags=["invoice"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_MIME_TYPES: dict[str, set[str]] = {
    "application/pdf": {".pdf"},
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
}


def _extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _validate_upload(file: UploadFile, content: bytes) -> str:
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    declared_type = (file.content_type or "").lower()
    ext = _extension(file.filename)

    if declared_type in ALLOWED_MIME_TYPES:
        allowed_exts = ALLOWED_MIME_TYPES[declared_type]
        if ext and ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"File extension {ext} does not match content type {declared_type}.",
            )
        return declared_type

    for mime, extensions in ALLOWED_MIME_TYPES.items():
        if ext in extensions:
            return mime

    allowed = ", ".join(sorted(ALLOWED_MIME_TYPES.keys()))
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported file type. Allowed types: {allowed}",
    )


@router.post("/upload", response_model=InvoiceExtractionResponse)
async def upload_invoice(
    file: Annotated[UploadFile, File(description="Invoice file (PDF or image)")],
    settings: Annotated[Settings, Depends(get_settings)],
) -> InvoiceExtractionResponse:
    """Accept an invoice file and extract basic structured data with Gemini (Legacy)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    mime_type = _validate_upload(file, content)

    logger.info("Invoice file received: %s", file.filename)

    try:
        fields, line_items = extract_invoice(content, mime_type, settings)
    except Exception as exc:
        status_code, detail = gemini_error_status(exc)
        logger.warning("Gemini extraction failed for %s: %s", file.filename, detail)
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return InvoiceExtractionResponse(
        filename=file.filename,
        mime_type=mime_type,
        fields=fields,
        line_items=line_items,
    )


@router.post("/process", response_model=InvoiceProcessingResponse)
async def process_invoice_route(
    file: Annotated[UploadFile, File(description="Invoice file (PDF or image)")],
    settings: Annotated[Settings, Depends(get_settings)],
) -> InvoiceProcessingResponse:
    """Extract and process invoice data: catalog match, unit conversion, reconciliation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    mime_type = _validate_upload(file, content)

    logger.info("Processing invoice file: %s", file.filename)

    try:
        raw_extraction = extract_invoice_full(content, mime_type, settings)
    except Exception as exc:
        status_code, detail = gemini_error_status(exc)
        logger.warning("Gemini extraction failed for %s: %s", file.filename, detail)
        raise HTTPException(status_code=status_code, detail=detail) from exc

    # Pipeline processing
    try:
        response = process_invoice(raw_extraction)
        response.filename = file.filename
        response.mime_type = mime_type
        return response
    except Exception as exc:
        logger.exception("Failed to process invoice data")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{invoice_id}/register")
async def register_invoice_toteat(
    invoice_id: str,
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
):
    """
    Register a processed invoice with Toteat.
    Expects the InvoiceProcessingResponse body.
    In a real system, this would load the invoice from DB and use user's Toteat credentials.
    """
    body = await request.json()
    invoice_data = InvoiceProcessingResponse(**body)
    
    # In a full app, we would load the user's specific Toteat settings from DB here
    # For now we use the ones from settings/env or rely on the frontend to pass them.
    # Note: We need a way to get the user's toteat_settings.
    # We will simulate this by getting them from settings object, assuming they are set.
    
    client = ToteatClient(
        api_url=settings.toteat_api_url,
        xir=settings.toteat_xir,
        xil=settings.toteat_xil,
        xiu=settings.toteat_xiu,
        xapitoken=settings.toteat_api_token,
    )
    
    try:
        toteat_response = await client.register_invoice(invoice_data)
        return {"status": "success", "response": toteat_response}
    except Exception as e:
        logger.error(f"Failed to register invoice with Toteat: {e}")
        raise HTTPException(status_code=400, detail=str(e))
