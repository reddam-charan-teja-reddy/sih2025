"""
Validation utilities
"""
import re
from typing import Dict, Tuple


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    # Remove common formatting characters
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it matches international format
    pattern = r'^\+?[1-9]\d{1,14}$'
    return bool(re.match(pattern, clean_phone))


def normalize_phone(phone: str) -> str:
    """Normalize phone number to consistent format"""
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    if not clean_phone.startswith('+'):
        clean_phone = f'+{clean_phone}'
    return clean_phone


def validate_credential(credential: str) -> Dict:
    """
    Validate and identify credential type (email or phone)
    Returns: {"isValid": bool, "type": str, "value": str, "error": str}
    """
    credential = credential.strip()
    
    if validate_email(credential):
        return {
            "isValid": True,
            "type": "email",
            "value": credential.lower(),
            "error": None
        }
    elif validate_phone(credential):
        return {
            "isValid": True,
            "type": "phone",
            "value": normalize_phone(credential),
            "error": None
        }
    else:
        return {
            "isValid": False,
            "type": None,
            "value": None,
            "error": "Please provide a valid email address or phone number"
        }


def sanitize_input(text: str) -> str:
    """Sanitize user input"""
    if not text:
        return ""
    return text.strip()


def validate_registration_data(data: dict) -> Dict:
    """
    Validate registration data
    Returns: {"isValid": bool, "errors": dict}
    """
    errors = {}
    
    # Full name validation
    if not data.get("fullName") or len(data["fullName"].strip()) < 1:
        errors["fullName"] = "Full name is required"
    elif len(data["fullName"]) > 100:
        errors["fullName"] = "Full name cannot exceed 100 characters"
    
    # Email validation
    if not data.get("email"):
        errors["email"] = "Email is required"
    elif not validate_email(data["email"]):
        errors["email"] = "Please provide a valid email address"
    
    # Phone validation (optional)
    if data.get("phone"):
        if not validate_phone(data["phone"]):
            errors["phone"] = "Please provide a valid phone number"
    
    # Password validation
    if not data.get("password"):
        errors["password"] = "Password is required"
    elif len(data["password"]) < 8:
        errors["password"] = "Password must be at least 8 characters long"
    
    # Confirm password
    if data.get("password") != data.get("confirmPassword"):
        errors["confirmPassword"] = "Passwords do not match"
    
    # Role validation
    if data.get("role") not in ["citizen", "official"]:
        errors["role"] = "Invalid role"
    
    # Official-specific validation
    if data.get("role") == "official":
        if not data.get("officialId"):
            errors["officialId"] = "Official ID is required for official accounts"
        if not data.get("organization"):
            errors["organization"] = "Organization is required for official accounts"
    
    return {
        "isValid": len(errors) == 0,
        "errors": errors
    }


def sanitize_user_data(data: dict) -> dict:
    """Sanitize user registration data"""
    sanitized = {}
    
    if "fullName" in data:
        sanitized["fullName"] = sanitize_input(data["fullName"])
    if "email" in data:
        sanitized["email"] = sanitize_input(data["email"]).lower()
    if "phone" in data and data["phone"]:
        sanitized["phone"] = normalize_phone(sanitize_input(data["phone"]))
    if "password" in data:
        sanitized["password"] = data["password"]
    if "confirmPassword" in data:
        sanitized["confirmPassword"] = data["confirmPassword"]
    if "role" in data:
        sanitized["role"] = data["role"]
    if "officialId" in data:
        sanitized["officialId"] = sanitize_input(data.get("officialId", ""))
    if "organization" in data:
        sanitized["organization"] = sanitize_input(data.get("organization", ""))
    if "language" in data:
        sanitized["language"] = data.get("language", "en")
    if "profession" in data:
        sanitized["profession"] = data.get("profession", "citizen")
    
    return sanitized


def validate_file(filename: str, allowed_types: list = None) -> Tuple[bool, str]:
    """
    Validate file type
    Returns: (is_valid, error_message)
    """
    if allowed_types is None:
        allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mov', 'mp3', 'wav', 'pdf', 'doc', 'docx']
    
    if not filename:
        return False, "Filename is required"
    
    # Get file extension
    if '.' not in filename:
        return False, "File must have an extension"
    
    ext = filename.rsplit('.', 1)[1].lower()
    
    if ext not in allowed_types:
        return False, f"File type '.{ext}' is not allowed"
    
    return True, None
