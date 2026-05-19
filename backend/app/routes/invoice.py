"""
Invoice upload API routes.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.schemas.invoice import InvoiceExtractionResponse
from app.services.gemini import extract_invoice, gemini_error_status

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
    """Accept an invoice file and extract structured data with Gemini."""
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
