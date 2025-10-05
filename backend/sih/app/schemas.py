"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, validator, field_validator
from typing import Optional, List, Literal, Any
from datetime import datetime
from bson import ObjectId


# Custom ObjectId validator
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}


# ==================== Auth Schemas ====================

class UserRegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)
    confirmPassword: str
    role: Literal["citizen", "official"] = "citizen"
    officialId: Optional[str] = None
    organization: Optional[str] = None
    language: Literal["en", "te", "hi"] = "en"
    profession: Optional[str] = "citizen"
    
    @field_validator('password')
    def validate_password_length(cls, v):
        # Bcrypt has a 72-byte limit, so we warn but allow truncation in hash_password
        if len(v.encode('utf-8')) > 72:
            # The password will be automatically truncated in hash_password
            # This validator just ensures we don't reject it
            pass
        return v
    
    @field_validator('confirmPassword')
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v


class UserLoginRequest(BaseModel):
    credential: str  # email or phone
    password: str
    rememberDevice: bool = False


class ForgotPasswordRequest(BaseModel):
    credential: str  # email or phone


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)
    confirmPassword: str
    
    @field_validator('password')
    def validate_password_length(cls, v):
        # Bcrypt has a 72-byte limit, password will be truncated in hash_password if needed
        if len(v.encode('utf-8')) > 72:
            pass
        return v
    
    @field_validator('confirmPassword')
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v


class VerifyAccountRequest(BaseModel):
    userId: str
    token: str


class ResendVerificationRequest(BaseModel):
    userId: str


class UserResponse(BaseModel):
    id: str
    fullName: str
    email: str
    phone: Optional[str] = None
    role: str
    isVerified: bool
    isOfficialVerified: bool
    language: str
    organization: Optional[str] = None
    lastLogin: Optional[datetime] = None


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    accessToken: str


# ==================== Report Schemas ====================

class LocationSchema(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float]  # [longitude, latitude]
    
    @field_validator('coordinates')
    def validate_coordinates(cls, v):
        if len(v) != 2:
            raise ValueError('Coordinates must be [longitude, latitude]')
        if v[0] < -180 or v[0] > 180:
            raise ValueError('Longitude must be between -180 and 180')
        if v[1] < -90 or v[1] > 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v


class MediaFileSchema(BaseModel):
    url: str
    fileName: str
    caption: Optional[str] = None


class EmergencyContactSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None


class CreateReportRequest(BaseModel):
    """Standard form-based report submission (no audio)"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    hazardType: Literal[
        "flood", "fire", "landslide", "storm", "roadblock", 
        "accident", "medical", "marine_emergency", "pollution", 
        "infrastructure", "other"
    ]
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    location: LocationSchema
    address: Optional[str] = Field(None, max_length=500)
    landmark: Optional[str] = Field(None, max_length=200)
    peopleAtRisk: bool = False
    emergencyContact: Optional[EmergencyContactSchema] = None
    images: List[MediaFileSchema] = []
    videos: List[MediaFileSchema] = []
    tags: List[str] = []


class VoiceReportRequest(BaseModel):
    """Voice-based report submission (audio processed through Gemini)"""
    audio: MediaFileSchema = Field(..., description="Voice note file (required)")
    location: LocationSchema = Field(..., description="GPS location (required)")
    images: List[MediaFileSchema] = Field(default=[], description="Optional images for context")
    videos: List[MediaFileSchema] = Field(default=[], description="Optional videos for context")
    address: Optional[str] = Field(None, max_length=500)
    landmark: Optional[str] = Field(None, max_length=200)
    emergencyContact: Optional[EmergencyContactSchema] = None


class UpdateReportStatusRequest(BaseModel):
    status: Literal["pending", "verified", "rejected", "resolved", "archived"]
    verificationNotes: Optional[str] = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    id: str
    title: str
    description: str
    hazardType: str
    severity: str
    location: dict
    address: Optional[str] = None
    landmark: Optional[str] = None
    reportedBy: Optional[str] = None
    reporterName: str
    reporterPhone: Optional[str] = None
    reporterEmail: Optional[str] = None
    status: str
    peopleAtRisk: bool
    images: List[dict] = []
    videos: List[dict] = []
    audio: List[dict] = []
    createdAt: datetime
    updatedAt: datetime


# ==================== Alert Schemas ====================

class AffectedAreaSchema(BaseModel):
    type: Literal["Polygon", "Circle", "Point"]
    coordinates: Any  # Can be different formats based on type


class AffectedLocationSchema(BaseModel):
    name: str
    type: Literal["city", "district", "area", "landmark", "coordinates"]
    coordinates: Optional[List[float]] = None


class InstructionSchema(BaseModel):
    action: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    priority: int = Field(5, ge=1, le=10)


class EmergencyContactDetailSchema(BaseModel):
    name: str
    role: str
    phone: str
    email: Optional[str] = None
    isAvailable24x7: bool = False


class ExternalReferenceSchema(BaseModel):
    source: str
    url: Optional[str] = None
    description: Optional[str] = None


class CreateAlertRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    alertType: Literal["emergency", "warning", "advisory", "all_clear", "update"]
    hazardType: Literal[
        "flood", "fire", "landslide", "storm", "tsunami", "cyclone",
        "earthquake", "pollution", "infrastructure", "marine_emergency",
        "weather", "traffic", "security", "other"
    ]
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    urgency: Literal["immediate", "expected", "future", "past"] = "expected"
    affectedArea: AffectedAreaSchema
    radius: Optional[int] = Field(None, ge=100, le=100000)
    affectedLocations: List[AffectedLocationSchema] = []
    effectiveFrom: datetime
    expiresAt: datetime
    instructions: List[InstructionSchema] = []
    safetyTips: List[str] = []
    images: List[MediaFileSchema] = []
    attachments: List[MediaFileSchema] = []
    emergencyContacts: List[EmergencyContactDetailSchema] = []
    targetAudience: str = "all"
    distributionChannels: List[str] = ["app_notification"]
    language: str = "all"
    tags: List[str] = []
    category: Optional[str] = None
    externalReferences: List[ExternalReferenceSchema] = []
    
    @field_validator('expiresAt')
    def expires_after_effective(cls, v, info):
        if 'effectiveFrom' in info.data and v <= info.data['effectiveFrom']:
            raise ValueError('Expiry date must be after effective date')
        return v


class UpdateAlertStatusRequest(BaseModel):
    status: Literal["draft", "active", "updated", "expired", "cancelled", "archived"]


class AlertResponse(BaseModel):
    id: str
    title: str
    message: str
    alertType: str
    hazardType: str
    severity: str
    urgency: str
    issuedBy: str
    issuerName: str
    organization: str
    affectedArea: dict
    status: str
    isActive: bool
    effectiveFrom: datetime
    expiresAt: datetime
    createdAt: datetime
    updatedAt: datetime


# ==================== User Profile Schemas ====================

class NotificationPreferencesSchema(BaseModel):
    email: bool = True
    sms: bool = False
    push: bool = True


class UpdateProfileRequest(BaseModel):
    fullName: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None
    language: Literal["en", "te", "hi"]
    profession: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    notificationPreferences: NotificationPreferencesSchema
    language: Literal["en", "te", "hi"]


# ==================== Common Schemas ====================

class ErrorResponse(BaseModel):
    error: str
    details: Optional[Any] = None


class MessageResponse(BaseModel):
    message: str


class PaginationResponse(BaseModel):
    currentPage: int
    totalPages: int
    totalItems: int
    itemsPerPage: int
    hasNext: bool
    hasPrev: bool
