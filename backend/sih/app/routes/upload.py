"""
Upload and storage routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from app.utils.auth import get_current_user_or_guest
from app.utils.storage import (
    generate_signed_upload_url,
    generate_signed_download_url,
    validate_file_type,
    get_content_type
)

router = APIRouter()


class SignedUrlRequest(BaseModel):
    fileName: str
    contentType: str


class RefreshUrlsRequest(BaseModel):
    fileNames: List[str]


@router.post("/signed-url")
async def get_signed_upload_url(
    request: SignedUrlRequest,
    user_data: tuple = Depends(get_current_user_or_guest)
):
    """Get a signed URL for uploading a file"""
    user, is_guest = user_data
    
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate file type
    is_valid, error = validate_file_type(request.fileName)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    try:
        result = generate_signed_upload_url(
            request.fileName,
            request.contentType,
            expires_in=3600
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")


@router.post("/refresh-urls")
async def refresh_download_urls(request: RefreshUrlsRequest):
    """Refresh download URLs for a list of files"""
    try:
        urls = []
        for file_name in request.fileNames:
            url = generate_signed_download_url(file_name, expires_in=3600)
            urls.append({"fileName": file_name, "url": url})
        
        return {"urls": urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh URLs: {str(e)}")


@router.get("/verify/{file_name}")
async def verify_file_exists(file_name: str):
    """Verify if a file exists in storage"""
    # This would require checking if the file exists in GCS
    # For now, just return success
    return {"exists": True, "fileName": file_name}
