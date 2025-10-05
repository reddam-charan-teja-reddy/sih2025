"""
Authentication routes
"""
from fastapi import APIRouter, HTTPException, Response, Request, status, Depends
from datetime import datetime, timedelta
import secrets
from bson import ObjectId

from app.schemas import (
    UserRegisterRequest, UserLoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, VerifyAccountRequest, ResendVerificationRequest,
    AuthResponse, UserResponse, MessageResponse
)
from app.database import get_database
from app.utils.auth import (
    hash_password, verify_password, generate_tokens,
    create_guest_token, verify_token
)
from app.utils.validation import (
    validate_credential, validate_registration_data,
    sanitize_user_data, normalize_phone
)
from app.utils.email_service import (
    send_verification_email, send_password_reset_email, send_welcome_email
)

router = APIRouter()


def generate_verification_token() -> tuple[str, datetime]:
    """Generate a verification token and expiry date"""
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=24)
    return token, expires


@router.post("/register", response_model=AuthResponse)
async def register(request: UserRegisterRequest):
    """Register a new user"""
    db = get_database()
    
    # Sanitize and validate data
    data = sanitize_user_data(request.dict())
    validation = validate_registration_data(data)
    
    if not validation["isValid"]:
        raise HTTPException(status_code=400, detail={
            "error": "Validation failed",
            "details": validation["errors"]
        })
    
    # Check if user already exists
    query_conditions = [{"email": data["email"].lower()}]
    
    if data.get("phone"):
        normalized_phone = normalize_phone(data["phone"])
        query_conditions.extend([
            {"phone": data["phone"]},
            {"phone": normalized_phone}
        ])
    
    existing_user = await db.users.find_one({"$or": query_conditions})
    
    if existing_user:
        # If unverified, allow re-registration
        if not existing_user.get("isVerified"):
            # Update existing user
            verification_token, token_expires = generate_verification_token()
            
            update_data = {
                "fullName": data["fullName"],
                "email": data["email"].lower(),
                "password": hash_password(data["password"]),
                "role": data["role"],
                "language": data.get("language", "en"),
                "profession": data.get("profession", "citizen"),
                "verificationToken": verification_token,
                "verificationTokenExpires": token_expires,
                "updatedAt": datetime.utcnow()
            }
            
            if data.get("phone"):
                update_data["phone"] = normalize_phone(data["phone"])
            
            if data["role"] == "official":
                update_data["officialId"] = data.get("officialId")
                update_data["organization"] = data.get("organization")
            
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": update_data}
            )
            
            # Send verification email
            await send_verification_email(
                data["email"],
                verification_token,
                data["fullName"]
            )
            
            user = await db.users.find_one({"_id": existing_user["_id"]})
            
            return {
                "message": "Registration updated successfully. Please check your email for verification.",
                "user": UserResponse(
                    id=str(user["_id"]),
                    fullName=user["fullName"],
                    email=user["email"],
                    phone=user.get("phone"),
                    role=user["role"],
                    isVerified=user["isVerified"],
                    isOfficialVerified=user.get("isOfficialVerified", False),
                    language=user.get("language", "en"),
                    organization=user.get("organization"),
                    lastLogin=user.get("lastLogin")
                ),
                "accessToken": ""
            }
        else:
            raise HTTPException(status_code=400, detail="User already exists with this email or phone")
    
    # Create new user
    verification_token, token_expires = generate_verification_token()
    
    user_data = {
        "fullName": data["fullName"],
        "email": data["email"].lower(),
        "password": hash_password(data["password"]),
        "role": data["role"],
        "language": data.get("language", "en"),
        "profession": data.get("profession", "citizen"),
        "isVerified": False,
        "isOfficialVerified": False,
        "verificationToken": verification_token,
        "verificationTokenExpires": token_expires,
        "loginAttempts": 0,
        "refreshTokens": [],
        "notificationPreferences": {
            "push": True,
            "email": True,
            "sms": False,
            "emergencyAlerts": True,
            "reportUpdates": True,
            "language": data.get("language", "en")
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    if data.get("phone"):
        user_data["phone"] = normalize_phone(data["phone"])
    
    if data["role"] == "official":
        user_data["officialId"] = data.get("officialId")
        user_data["organization"] = data.get("organization")
    
    result = await db.users.insert_one(user_data)
    
    # Send verification email
    await send_verification_email(
        data["email"],
        verification_token,
        data["fullName"]
    )
    
    user = await db.users.find_one({"_id": result.inserted_id})
    
    return {
        "message": "Registration successful. Please check your email for verification.",
        "user": UserResponse(
            id=str(user["_id"]),
            fullName=user["fullName"],
            email=user["email"],
            phone=user.get("phone"),
            role=user["role"],
            isVerified=user["isVerified"],
            isOfficialVerified=user.get("isOfficialVerified", False),
            language=user.get("language", "en"),
            organization=user.get("organization"),
            lastLogin=user.get("lastLogin")
        ),
        "accessToken": ""
    }


@router.post("/login", response_model=AuthResponse)
async def login(request: UserLoginRequest, response: Response):
    """Login a user"""
    db = get_database()
    
    # Validate credential
    credential_validation = validate_credential(request.credential)
    if not credential_validation["isValid"]:
        raise HTTPException(status_code=400, detail=credential_validation["error"])
    
    # Find user
    if credential_validation["type"] == "email":
        query = {"email": credential_validation["value"]}
    else:
        # Try multiple phone formats
        clean_phone = credential_validation["value"]
        query = {"phone": {"$in": [request.credential, clean_phone]}}
    
    user = await db.users.find_one(query)
    
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if verified
    if not user.get("isVerified"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Please verify your account first",
                "requiresVerification": True,
                "userId": str(user["_id"])
            }
        )
    
    # Check official verification
    if user["role"] == "official" and not user.get("isOfficialVerified"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Your official account is pending verification. Please contact your administrator.",
                "requiresOfficialVerification": True
            }
        )
    
    # Generate tokens
    tokens = generate_tokens(user)
    
    # Update user login info
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$push": {
                "refreshTokens": {
                    "$each": [{
                        "token": tokens["refreshToken"],
                        "createdAt": datetime.utcnow()
                    }],
                    "$slice": -5
                }
            },
            "$set": {"lastLogin": datetime.utcnow()}
        }
    )
    
    # Set refresh token cookie
    response.set_cookie(
        key="refreshToken",
        value=tokens["refreshToken"],
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="strict",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        "message": "Login successful",
        "user": UserResponse(
            id=str(user["_id"]),
            fullName=user["fullName"],
            email=user["email"],
            phone=user.get("phone"),
            role=user["role"],
            isVerified=user["isVerified"],
            isOfficialVerified=user.get("isOfficialVerified", False),
            language=user.get("language", "en"),
            organization=user.get("organization"),
            lastLogin=datetime.utcnow()
        ),
        "accessToken": tokens["accessToken"]
    }


@router.post("/guest")
async def guest_login(response: Response):
    """Create a guest session"""
    guest_token = create_guest_token()
    
    return {
        "message": "Guest session created",
        "token": f"guest_{guest_token}"
    }


@router.post("/verify", response_model=MessageResponse)
async def verify_account(request: VerifyAccountRequest):
    """Verify user account with token"""
    db = get_database()
    
    user = await db.users.find_one({
        "_id": ObjectId(request.userId),
        "verificationToken": request.token
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check token expiry
    if user.get("verificationTokenExpires") and user["verificationTokenExpires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Update user as verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "isVerified": True,
                "updatedAt": datetime.utcnow()
            },
            "$unset": {
                "verificationToken": "",
                "verificationTokenExpires": ""
            }
        }
    )
    
    # Send welcome email
    await send_welcome_email(user["email"], user["fullName"])
    
    return {"message": "Account verified successfully"}


@router.put("/verify/resend", response_model=MessageResponse)
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification email"""
    db = get_database()
    
    user = await db.users.find_one({"_id": ObjectId(request.userId)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("isVerified"):
        raise HTTPException(status_code=400, detail="Account is already verified")
    
    # Generate new token
    verification_token, token_expires = generate_verification_token()
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "verificationToken": verification_token,
                "verificationTokenExpires": token_expires,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Send verification email
    await send_verification_email(
        user["email"],
        verification_token,
        user["fullName"]
    )
    
    return {"message": "Verification email sent successfully"}


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset"""
    db = get_database()
    
    # Validate credential
    credential_validation = validate_credential(request.credential)
    if not credential_validation["isValid"]:
        raise HTTPException(status_code=400, detail=credential_validation["error"])
    
    # Find user
    if credential_validation["type"] == "email":
        query = {"email": credential_validation["value"]}
    else:
        query = {"phone": credential_validation["value"]}
    
    user = await db.users.find_one(query)
    
    # Always return success to prevent user enumeration
    if not user:
        return {"message": f"If an account exists with this {credential_validation['type']}, a password reset link has been sent."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.utcnow() + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "passwordResetToken": reset_token,
                "passwordResetExpires": reset_expires,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    # Send password reset email
    await send_password_reset_email(
        user["email"],
        reset_token,
        user["fullName"]
    )
    
    return {"message": f"If an account exists with this {credential_validation['type']}, a password reset link has been sent."}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    db = get_database()
    
    user = await db.users.find_one({"passwordResetToken": request.token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check token expiry
    if user.get("passwordResetExpires") and user["passwordResetExpires"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password": hash_password(request.password),
                "updatedAt": datetime.utcnow()
            },
            "$unset": {
                "passwordResetToken": "",
                "passwordResetExpires": ""
            }
        }
    )
    
    return {"message": "Password reset successful"}


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh token"""
    db = get_database()
    
    refresh_token = request.cookies.get("refreshToken")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    try:
        payload = verify_token(refresh_token, "refresh")
        user_id = payload.get("id")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check if refresh token exists in user's tokens
        token_exists = any(t["token"] == refresh_token for t in user.get("refreshTokens", []))
        
        if not token_exists:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Generate new tokens
        tokens = generate_tokens(user)
        
        # Update refresh tokens
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$pull": {"refreshTokens": {"token": refresh_token}},
            }
        )
        
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$push": {
                    "refreshTokens": {
                        "$each": [{
                            "token": tokens["refreshToken"],
                            "createdAt": datetime.utcnow()
                        }],
                        "$slice": -5
                    }
                }
            }
        )
        
        # Set new refresh token cookie
        response.set_cookie(
            key="refreshToken",
            value=tokens["refreshToken"],
            httponly=True,
            secure=False,
            samesite="strict",
            max_age=7 * 24 * 60 * 60
        )
        
        return {
            "message": "Token refreshed successfully",
            "user": UserResponse(
                id=str(user["_id"]),
                fullName=user["fullName"],
                email=user["email"],
                phone=user.get("phone"),
                role=user["role"],
                isVerified=user["isVerified"],
                isOfficialVerified=user.get("isOfficialVerified", False),
                language=user.get("language", "en"),
                organization=user.get("organization"),
                lastLogin=user.get("lastLogin")
            ),
            "accessToken": tokens["accessToken"]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response):
    """Logout user"""
    db = get_database()
    
    refresh_token = request.cookies.get("refreshToken")
    
    if refresh_token:
        try:
            payload = verify_token(refresh_token, "refresh")
            user_id = payload.get("id")
            
            # Remove refresh token from database
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"refreshTokens": {"token": refresh_token}}}
            )
        except:
            pass
    
    # Clear cookie
    response.delete_cookie("refreshToken")
    
    return {"message": "Logout successful"}
