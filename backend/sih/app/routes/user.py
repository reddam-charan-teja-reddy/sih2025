"""
User profile and settings routes
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from bson import ObjectId
from datetime import datetime

from app.schemas import UpdateProfileRequest, UpdateSettingsRequest, UserResponse
from app.database import get_database
from app.utils.auth import get_current_user
from app.utils.validation import normalize_phone

router = APIRouter()


@router.get("/profile", response_model=dict)
async def get_profile(user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    return {
        "id": str(user["_id"]),
        "fullName": user["fullName"],
        "email": user["email"],
        "phone": user.get("phone"),
        "role": user["role"],
        "isVerified": user["isVerified"],
        "isOfficialVerified": user.get("isOfficialVerified", False),
        "language": user.get("language", "en"),
        "profession": user.get("profession", "citizen"),
        "organization": user.get("organization"),
        "officialId": user.get("officialId"),
        "notificationPreferences": user.get("notificationPreferences", {}),
        "lastLogin": user.get("lastLogin"),
        "createdAt": user.get("createdAt"),
        "updatedAt": user.get("updatedAt")
    }


@router.put("/profile")
async def update_profile(
    user: dict = Depends(get_current_user),
    profile_data: UpdateProfileRequest = Body(...)
):
    """Update user profile"""
    db = get_database()
    
    update_data = {"updatedAt": datetime.utcnow()}
    
    if profile_data.fullName:
        update_data["fullName"] = profile_data.fullName.strip()
    if profile_data.phone:
        update_data["phone"] = normalize_phone(profile_data.phone)
    if profile_data.language:
        update_data["language"] = profile_data.language
    if profile_data.profession:
        update_data["profession"] = profile_data.profession
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}


@router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    """Get user settings"""
    return {
        "notificationPreferences": user.get("notificationPreferences", {}),
        "language": user.get("language", "en"),
        "settings": user.get("settings", {})
    }


@router.put("/settings")
async def update_settings(
    user: dict = Depends(get_current_user),
    settings_data: UpdateSettingsRequest = Body(...)
):
    """Update user settings"""
    db = get_database()
    
    update_data = {"updatedAt": datetime.utcnow()}
    
    if settings_data.notificationPreferences:
        update_data["notificationPreferences"] = settings_data.notificationPreferences.dict()
    if settings_data.language:
        update_data["language"] = settings_data.language
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Settings updated successfully"}


@router.get("/reports")
async def get_user_reports(user: dict = Depends(get_current_user)):
    """Get reports submitted by the current user"""
    db = get_database()
    
    reports = await db.reports.find(
        {"reportedBy": user["_id"]}
    ).sort("createdAt", -1).to_list(length=100)
    
    reports_list = []
    for report in reports:
        reports_list.append({
            "id": str(report["_id"]),
            "title": report["title"],
            "hazardType": report["hazardType"],
            "severity": report["severity"],
            "status": report["status"],
            "createdAt": report["createdAt"],
            "updatedAt": report["updatedAt"]
        })
    
    return {"reports": reports_list}


@router.get("/stats")
async def get_user_stats(user: dict = Depends(get_current_user)):
    """Get user statistics"""
    db = get_database()
    
    # Count reports by status
    total_reports = await db.reports.count_documents({"reportedBy": user["_id"]})
    verified_reports = await db.reports.count_documents({
        "reportedBy": user["_id"],
        "status": "verified"
    })
    pending_reports = await db.reports.count_documents({
        "reportedBy": user["_id"],
        "status": "pending"
    })
    resolved_reports = await db.reports.count_documents({
        "reportedBy": user["_id"],
        "status": "resolved"
    })
    
    return {
        "totalReports": total_reports,
        "verifiedReports": verified_reports,
        "pendingReports": pending_reports,
        "resolvedReports": resolved_reports
    }


@router.get("/activity")
async def get_user_activity(
    user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get user activity log"""
    db = get_database()
    
    # Get recent reports as activity
    activities = []
    
    reports = await db.reports.find(
        {"reportedBy": user["_id"]}
    ).sort("createdAt", -1).limit(limit).to_list(length=limit)
    
    for report in reports:
        activities.append({
            "action": "report_created",
            "timestamp": report["createdAt"],
            "details": {
                "reportId": str(report["_id"]),
                "title": report["title"],
                "status": report["status"]
            }
        })
    
    return {"activities": activities}


@router.put("/test-put")
async def test_put(
    data: UpdateProfileRequest,
    user: dict = Depends(get_current_user)
):
    """Test PUT endpoint with auth"""
    return {
        "message": "PUT received",
        "data": data.dict(),
        "user_id": str(user["_id"])
    }


@router.put("/test-put-noauth")
async def test_put_noauth(data: UpdateProfileRequest):
    """Test PUT endpoint without auth"""
    return {
        "message": "PUT received without auth",
        "data": data.dict()
    }
