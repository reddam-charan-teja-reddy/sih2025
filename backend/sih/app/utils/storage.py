"""
Google Cloud Storage utilities for file uploads
"""
from google.cloud import storage
from google.oauth2 import service_account
from datetime import timedelta
from typing import Optional
import json
from app.config import get_settings

settings = get_settings()


def get_gcs_client():
    """Get authenticated GCS client"""
    credentials_dict = settings.get_gcs_credentials()
    credentials = service_account.Credentials.from_service_account_info(credentials_dict)
    return storage.Client(credentials=credentials, project=settings.GOOGLE_CLOUD_PROJECT_ID)


def generate_signed_upload_url(
    file_name: str,
    content_type: str,
    expires_in: int = 3600
) -> dict:
    """
    Generate a signed URL for uploading a file to GCS
    
    Args:
        file_name: Name of the file
        content_type: MIME type of the file
        expires_in: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        dict with 'url' and 'fileName'
    """
    try:
        client = get_gcs_client()
        bucket = client.bucket(settings.GOOGLE_CLOUD_BUCKET_NAME)
        blob = bucket.blob(file_name)
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expires_in),
            method="PUT",
            content_type=content_type,
        )
        
        return {
            "url": url,
            "fileName": file_name
        }
    except Exception as e:
        print(f"❌ Error generating signed upload URL: {str(e)}")
        raise


def generate_signed_download_url(
    file_name: str,
    expires_in: int = 3600
) -> str:
    """
    Generate a signed URL for downloading a file from GCS
    
    Args:
        file_name: Name of the file
        expires_in: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Signed download URL
    """
    try:
        client = get_gcs_client()
        bucket = client.bucket(settings.GOOGLE_CLOUD_BUCKET_NAME)
        blob = bucket.blob(file_name)
        
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expires_in),
            method="GET",
        )
        
        return url
    except Exception as e:
        print(f"❌ Error generating signed download URL: {str(e)}")
        raise


def generate_media_urls(media_items: list, expires_in: int = 3600) -> list:
    """
    Generate signed download URLs for a list of media items
    
    Args:
        media_items: List of media items with 'fileName' field
        expires_in: URL expiration time in seconds
    
    Returns:
        List of media items with updated 'url' field
    """
    result = []
    for item in media_items:
        try:
            signed_url = generate_signed_download_url(item.get("fileName"), expires_in)
            item_copy = item.copy()
            item_copy["url"] = signed_url
            result.append(item_copy)
        except Exception as e:
            print(f"❌ Error generating URL for {item.get('fileName')}: {str(e)}")
            # Keep original URL if signing fails
            result.append(item)
    
    return result


def validate_file_type(filename: str) -> tuple[bool, Optional[str]]:
    """
    Validate file type based on extension
    
    Returns:
        (is_valid, error_message)
    """
    allowed_extensions = {
        # Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
        # Videos
        'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
        # Audio
        'mp3', 'wav', 'ogg', 'aac', 'm4a',
        # Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'
    }
    
    if not filename or '.' not in filename:
        return False, "Invalid filename"
    
    extension = filename.rsplit('.', 1)[1].lower()
    
    if extension not in allowed_extensions:
        return False, f"File type .{extension} is not allowed"
    
    return True, None


def get_content_type(filename: str) -> str:
    """Get MIME type based on file extension"""
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    content_types = {
        # Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        # Videos
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        # Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4',
        # Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain'
    }
    
    return content_types.get(extension, 'application/octet-stream')
