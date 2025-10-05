"""
Authentication utilities - JWT token generation and validation
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Request, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings
from app.database import get_database
from bson import ObjectId

settings = get_settings()
# Configure bcrypt with truncate_error=False to handle passwords > 72 bytes
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # Match Next.js backend
    bcrypt__truncate_error=False  # Allow automatic truncation to 72 bytes
)
security = HTTPBearer()


# Password hashing
def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Bcrypt automatically truncates passwords to 72 bytes.
    
    Args:
        password: Plain text password (will be automatically truncated to 72 bytes)
    
    Returns:
        Hashed password string
    """
    # Bcrypt has a 72-byte limit. Passlib will automatically truncate if needed.
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    Bcrypt automatically truncates passwords to 72 bytes.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password from database
    
    Returns:
        True if password matches, False otherwise
    """
    # Bcrypt will automatically truncate the plain_password to 72 bytes for comparison
    return pwd_context.verify(plain_password, hashed_password)


# JWT Token generation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_EXPIRES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRES)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_guest_token() -> str:
    """Create a guest session token"""
    import uuid
    data = {
        "jti": str(uuid.uuid4()),
        "type": "guest",
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_GUEST_EXPIRES)
    }
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def generate_tokens(user: dict) -> Dict[str, str]:
    """Generate access and refresh tokens for a user"""
    access_token = create_access_token(data={"id": str(user["_id"]), "role": user["role"]})
    refresh_token = create_refresh_token(data={"id": str(user["_id"])})
    return {"accessToken": access_token, "refreshToken": refresh_token}


# Token verification
def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify and decode a JWT token"""
    try:
        secret = settings.JWT_SECRET if token_type == "access" else settings.JWT_REFRESH_SECRET
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        
        if payload.get("type") != token_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# Authentication middleware
async def get_current_user(authorization: str = Header(None)):
    """
    Dependency to get current authenticated user
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authorization header required")
        token = authorization.replace("Bearer ", "")
        
        payload = verify_token(token, "access")
        user_id = payload.get("id")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("isVerified"):
            raise HTTPException(status_code=403, detail="Please verify your account")
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def get_current_user_or_guest(authorization: str = Header(None)):
    """
    Dependency to get current user or guest session
    Returns: (user_dict, is_guest: bool)
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None, True
    
    token = authorization.replace("Bearer ", "")
    
    # Try to verify as access token first
    try:
        payload = verify_token(token, "access")
        user_id = payload.get("id")
        
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if user and user.get("isVerified"):
            return user, False
    except:
        pass
    
    # Try as guest token
    try:
        payload = jwt.decode(token.replace("guest_", ""), settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") == "guest":
            return {
                "_id": None,
                "fullName": "Guest User",
                "email": "",
                "phone": "",
                "role": "citizen",
                "guestId": payload.get("jti")
            }, True
    except:
        pass
    
    return None, True


# Role-based authorization
async def require_role(user: dict, required_roles: list):
    """Check if user has required role"""
    if user.get("role") not in required_roles:
        raise HTTPException(
            status_code=403,
            detail=f"This action requires one of the following roles: {', '.join(required_roles)}"
        )


async def require_official(user: dict):
    """Check if user is a verified official"""
    if user.get("role") != "official":
        raise HTTPException(status_code=403, detail="This action requires official access")
    
    if not user.get("isOfficialVerified"):
        raise HTTPException(
            status_code=403,
            detail="Your official account is pending verification"
        )
