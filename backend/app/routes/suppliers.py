"""
Supplier management API routes.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import create_client, Client

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def get_supabase_client(settings: Annotated[Settings, Depends(get_settings)]) -> Client:
    """Get Supabase client for database operations."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase is not configured on the backend.",
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def get_user_id_from_token(request: Request) -> str:
    """Extract user ID from Supabase JWT token in Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header.")
    
    token = auth_header.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    
    # In a real app, you would verify the JWT token here
    # For now, we'll just decode it to get the user ID
    # This is a simplified approach - in production, use proper JWT verification
    
    try:
        import json
        import base64
        
        # JWT format: header.payload.signature
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="Invalid JWT token format.")
        
        # Decode payload (add padding if needed)
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding and padding != 4:
            payload += "=" * padding
        
        decoded = base64.urlsafe_b64decode(payload)
        payload_json = json.loads(decoded)
        
        user_id = payload_json.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid JWT token: missing user ID.")
        
        return user_id
    except (ValueError, KeyError, json.JSONDecodeError) as e:
        logger.error("Failed to decode JWT: %s", e)
        raise HTTPException(status_code=401, detail="Failed to decode authorization token.")


@router.get("/")
async def list_suppliers(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
):
    """List all suppliers for the authenticated user."""
    user_id = await get_user_id_from_token(request)
    
    try:
        supabase = get_supabase_client(settings)
        response = supabase.table("suppliers").select("*").eq("user_id", user_id).execute()
        
        suppliers = response.data or []
        return {
            "status": "success",
            "suppliers": suppliers,
        }
    except Exception as e:
        logger.error("Failed to fetch suppliers: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_supplier(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
):
    """Create a new supplier for the authenticated user."""
    user_id = await get_user_id_from_token(request)
    body = await request.json()
    
    required_fields = ["supplier_code", "supplier_name"]
    for field in required_fields:
        if field not in body or not body[field]:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    try:
        supabase = get_supabase_client(settings)
        
        supplier_data = {
            "user_id": user_id,
            "supplier_code": body.get("supplier_code"),
            "supplier_name": body.get("supplier_name"),
            "supplier_vat": body.get("supplier_vat", ""),
            "supplier_address": body.get("supplier_address", ""),
            "supplier_email": body.get("supplier_email", ""),
            "supplier_phone": body.get("supplier_phone", ""),
            "active": body.get("active", True),
        }
        
        response = supabase.table("suppliers").insert(supplier_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create supplier.")
        
        return {
            "status": "success",
            "supplier": response.data[0],
        }
    except Exception as e:
        logger.error("Failed to create supplier: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
