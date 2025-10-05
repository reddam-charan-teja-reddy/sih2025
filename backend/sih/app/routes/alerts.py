"""
Alert routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.schemas import CreateAlertRequest, UpdateAlertStatusRequest, AlertResponse
from app.database import get_database
from app.utils.auth import get_current_user, require_official

router = APIRouter()


@router.post("/", response_model=dict)
async def create_alert(
    request: CreateAlertRequest,
    user: dict = Depends(get_current_user)
):
    """Create a new alert (officials only)"""
    await require_official(user)
    
    db = get_database()
    
    # Create alert data
    alert_data = {
        "title": request.title.strip(),
        "message": request.message.strip(),
        "alertType": request.alertType,
        "hazardType": request.hazardType,
        "severity": request.severity,
        "urgency": request.urgency,
        "issuedBy": ObjectId(user["_id"]),
        "issuerName": user["fullName"],
        "organization": user.get("organization", "Government Authority"),
        "contactInfo": {
            "phone": user.get("phone"),
            "email": user["email"]
        },
        "affectedArea": request.affectedArea.dict(),
        "radius": request.radius,
        "affectedLocations": [loc.dict() for loc in request.affectedLocations],
        "effectiveFrom": request.effectiveFrom,
        "expiresAt": request.expiresAt,
        "instructions": [inst.dict() for inst in request.instructions],
        "safetyTips": request.safetyTips,
        "images": [img.dict() for img in request.images],
        "attachments": [att.dict() for att in request.attachments],
        "emergencyContacts": [contact.dict() for contact in request.emergencyContacts],
        "targetAudience": request.targetAudience,
        "distributionChannels": request.distributionChannels,
        "language": request.language,
        "tags": [tag.strip().lower() for tag in request.tags if tag.strip()],
        "category": request.category,
        "externalReferences": [ref.dict() for ref in request.externalReferences],
        "status": "draft",
        "isActive": False,
        "source": "web_dashboard",
        "issuedAt": datetime.utcnow(),
        "lastUpdated": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.alerts.insert_one(alert_data)
    
    # Get the created alert
    alert = await db.alerts.find_one({"_id": result.inserted_id})
    
    return {
        "message": "Alert created successfully",
        "alert": {
            "id": str(alert["_id"]),
            "title": alert["title"],
            "message": alert["message"],
            "alertType": alert["alertType"],
            "hazardType": alert["hazardType"],
            "severity": alert["severity"],
            "status": alert["status"],
            "createdAt": alert["createdAt"]
        }
    }


@router.get("/", response_model=dict)
async def get_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    alertType: Optional[str] = None,
    hazardType: Optional[str] = None,
    severity: Optional[str] = None,
    isActive: Optional[bool] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: int = Query(50000, ge=100, le=500000),
    sortBy: str = Query("createdAt"),
    sortOrder: str = Query("desc")
):
    """Get alerts with filters and pagination"""
    db = get_database()
    
    # Build query
    query = {}
    
    if status:
        query["status"] = status
    if alertType:
        query["alertType"] = alertType
    if hazardType:
        query["hazardType"] = hazardType
    if severity:
        query["severity"] = severity
    if isActive is not None:
        query["isActive"] = isActive
    
    # Filter active alerts
    if isActive is None or isActive:
        now = datetime.utcnow()
        query["$or"] = [
            {"expiresAt": {"$gte": now}},
            {"status": "active"}
        ]
    
    # Geospatial query
    # Use $geoWithin instead of $near to allow custom sorting
    if lat is not None and lng is not None:
        query["affectedArea"] = {
            "$geoWithin": {
                "$centerSphere": [[lng, lat], radius / 6378100]  # radius in radians (Earth radius in meters)
            }
        }
    
    # Pagination
    skip = (page - 1) * limit
    sort_direction = -1 if sortOrder == "desc" else 1
    
    # Get alerts with sorting
    cursor = db.alerts.find(query).sort(sortBy, sort_direction).skip(skip).limit(limit)
    
    alerts = await cursor.to_list(length=limit)
    
    # Get total count
    total = await db.alerts.count_documents(query)
    
    # Process alerts
    alerts_list = []
    for alert in alerts:
        alerts_list.append({
            "id": str(alert["_id"]),
            "title": alert["title"],
            "message": alert["message"],
            "alertType": alert["alertType"],
            "hazardType": alert["hazardType"],
            "severity": alert["severity"],
            "urgency": alert["urgency"],
            "issuerName": alert["issuerName"],
            "organization": alert["organization"],
            "affectedArea": alert["affectedArea"],
            "status": alert["status"],
            "isActive": alert["isActive"],
            "issuedBy": str(alert["issuedBy"]) if alert.get("issuedBy") else None,
            "effectiveFrom": alert["effectiveFrom"].isoformat() if alert.get("effectiveFrom") else None,
            "expiresAt": alert["expiresAt"].isoformat() if alert.get("expiresAt") else None,
            "issuedAt": alert["issuedAt"].isoformat() if alert.get("issuedAt") else None,
            "createdAt": alert["createdAt"].isoformat() if alert.get("createdAt") else None,
            "updatedAt": alert["updatedAt"].isoformat() if alert.get("updatedAt") else None
        })
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "alerts": alerts_list,
        "pagination": {
            "currentPage": page,
            "totalPages": total_pages,
            "totalItems": total,
            "itemsPerPage": limit,
            "hasNext": page < total_pages,
            "hasPrev": page > 1
        }
    }


@router.get("/{alert_id}", response_model=dict)
async def get_alert(alert_id: str):
    """Get a single alert by ID"""
    db = get_database()
    
    try:
        alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "id": str(alert["_id"]),
        "title": alert["title"],
        "message": alert["message"],
        "alertType": alert["alertType"],
        "hazardType": alert["hazardType"],
        "severity": alert["severity"],
        "urgency": alert["urgency"],
        "issuerName": alert["issuerName"],
        "organization": alert["organization"],
        "contactInfo": alert.get("contactInfo", {}),
        "affectedArea": alert["affectedArea"],
        "affectedLocations": alert.get("affectedLocations", []),
        "status": alert["status"],
        "isActive": alert["isActive"],
        "effectiveFrom": alert["effectiveFrom"],
        "expiresAt": alert["expiresAt"],
        "instructions": alert.get("instructions", []),
        "safetyTips": alert.get("safetyTips", []),
        "images": alert.get("images", []),
        "attachments": alert.get("attachments", []),
        "emergencyContacts": alert.get("emergencyContacts", []),
        "targetAudience": alert.get("targetAudience", "all"),
        "distributionChannels": alert.get("distributionChannels", []),
        "language": alert.get("language", "all"),
        "tags": alert.get("tags", []),
        "category": alert.get("category"),
        "externalReferences": alert.get("externalReferences", []),
        "createdAt": alert["createdAt"],
        "updatedAt": alert["updatedAt"]
    }


@router.put("/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    request: UpdateAlertStatusRequest,
    user: dict = Depends(get_current_user)
):
    """Update alert status (officials only)"""
    await require_official(user)
    
    db = get_database()
    
    try:
        alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Update alert
    update_data = {
        "status": request.status,
        "isActive": request.status == "active",
        "lastUpdated": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": update_data}
    )
    
    return {"message": "Alert status updated successfully"}


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an alert (officials only)"""
    await require_official(user)
    
    db = get_database()
    
    try:
        alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.alerts.delete_one({"_id": ObjectId(alert_id)})
    
    return {"message": "Alert deleted successfully"}
