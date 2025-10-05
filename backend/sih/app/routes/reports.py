"""
Report routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId

from app.schemas import CreateReportRequest, VoiceReportRequest, UpdateReportStatusRequest, ReportResponse, PaginationResponse
from app.database import get_database
from app.utils.auth import get_current_user, get_current_user_or_guest, require_official
from app.utils.storage import generate_media_urls
from app.utils.gemini import process_voice_with_images
from app.config import get_settings

settings = get_settings()
router = APIRouter()


@router.post("/", response_model=dict)
async def create_report(
    request: CreateReportRequest,
    user_data: tuple = Depends(get_current_user_or_guest)
):
    """Create a new report"""
    db = get_database()
    user, is_guest = user_data
    
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Calculate priority
    severity_priority = {"low": 4, "medium": 6, "high": 8, "critical": 10}
    priority = severity_priority.get(request.severity, 5)
    if request.peopleAtRisk:
        priority = min(10, priority + 2)
    
    # Create report data
    report_data = {
        "title": request.title.strip(),
        "description": request.description.strip(),
        "hazardType": request.hazardType,
        "severity": request.severity,
        "location": {
            "type": "Point",
            "coordinates": request.location.coordinates
        },
        "address": request.address.strip() if request.address else None,
        "landmark": request.landmark.strip() if request.landmark else None,
        "reportedBy": ObjectId(user["_id"]) if not is_guest and user.get("_id") else None,
        "reporterName": user.get("fullName", "Guest User"),
        "reporterPhone": user.get("phone"),
        "reporterEmail": user.get("email"),
        "peopleAtRisk": request.peopleAtRisk,
        "emergencyContact": request.emergencyContact.dict() if request.emergencyContact else {},
        "images": [img.dict() for img in request.images],
        "videos": [vid.dict() for vid in request.videos],
        "audio": [],  # Form submissions don't have audio (use /voice endpoint instead)
        "tags": [tag.strip().lower() for tag in request.tags if tag.strip()],
        "status": "pending",
        "priority": priority,
        "verificationStatus": {
            "isVerified": False
        },
        "isPublic": True,
        "source": "mobile_app" if is_guest else "web_app",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.reports.insert_one(report_data)
    
    # Get the created report
    report = await db.reports.find_one({"_id": result.inserted_id})
    
    return {
        "message": "Report submitted successfully",
        "report": {
            "id": str(report["_id"]),
            "title": report["title"],
            "description": report["description"],
            "hazardType": report["hazardType"],
            "severity": report["severity"],
            "location": report["location"],
            "status": report["status"],
            "createdAt": report["createdAt"],
            "updatedAt": report["updatedAt"]
        }
    }


@router.post("/voice", response_model=dict)
async def create_voice_report(
    request: VoiceReportRequest,
    user_data: tuple = Depends(get_current_user_or_guest)
):
    """
    Create a report from voice note (instead of form submission)
    
    Flow:
    1. User records voice note explaining the situation
    2. User optionally attaches images/videos for context
    3. Audio is processed through Gemini AI to extract:
       - title, description, hazardType, severity, peopleAtRisk, tags
    4. Both the audio file path AND extracted data are stored
    
    This replaces the form submission - user speaks instead of typing
    """
    db = get_database()
    user, is_guest = user_data
    
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Download audio file from GCS to process with Gemini
        from app.utils.storage import get_gcs_client
        from app.utils.gemini import process_voice_with_images
        
        # Get GCS client and download audio bytes
        client = get_gcs_client()
        bucket = client.bucket(settings.GOOGLE_CLOUD_BUCKET_NAME)
        blob = bucket.blob(request.audio.fileName)
        audio_bytes = blob.download_as_bytes()
        
        # Process audio through Gemini AI with context
        context = {
            "has_images": len(request.images) > 0,
            "has_videos": len(request.videos) > 0,
            "location": request.location.dict() if request.location else None
        }
        
        # Extract structured data from voice note
        image_urls = [img.url for img in request.images] if request.images else []
        extracted_data = await process_voice_with_images(
            audio_file_data=audio_bytes,
            image_urls=image_urls,
            location=request.location.dict() if request.location else None
        )
        
        # Calculate priority based on extracted severity
        severity_priority = {"low": 4, "medium": 6, "high": 8, "critical": 10}
        priority = severity_priority.get(extracted_data["severity"], 5)
        if extracted_data["peopleAtRisk"]:
            priority = min(10, priority + 2)
        
        # Create report with extracted data + original audio
        report_data = {
            "title": extracted_data["title"][:200],
            "description": extracted_data["description"][:2000],
            "hazardType": extracted_data["hazardType"],
            "severity": extracted_data["severity"],
            "location": {
                "type": "Point",
                "coordinates": request.location.coordinates
            },
            "address": request.address,
            "landmark": request.landmark,
            "reportedBy": ObjectId(user["_id"]) if not is_guest and user.get("_id") else None,
            "reporterName": user.get("fullName", "Guest User"),
            "reporterPhone": user.get("phone"),
            "reporterEmail": user.get("email"),
            "peopleAtRisk": extracted_data["peopleAtRisk"],
            "emergencyContact": request.emergencyContact.dict() if request.emergencyContact else {},
            "images": [img.dict() for img in request.images],
            "videos": [vid.dict() for vid in request.videos],
            "audio": [request.audio.dict()],  # Store the original voice note
            "tags": extracted_data.get("tags", []),
            "status": "pending",
            "priority": priority,
            "verificationStatus": {
                "isVerified": False
            },
            "isPublic": True,
            "source": "voice_submission",
            "gemini_processed": False,  # Set to True when actual Gemini processing is implemented
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.reports.insert_one(report_data)
        report = await db.reports.find_one({"_id": result.inserted_id})
        
        return {
            "message": "Voice report submitted successfully",
            "note": "Audio processing through Gemini will be implemented when API key is configured",
            "report": {
                "id": str(report["_id"]),
                "title": report["title"],
                "description": report["description"],
                "hazardType": report["hazardType"],
                "severity": report["severity"],
                "location": report["location"],
                "status": report["status"],
                "audio": report["audio"],
                "images": report.get("images", []),
                "createdAt": report["createdAt"],
                "updatedAt": report["updatedAt"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process voice report: {str(e)}")


@router.get("/", response_model=dict)
async def get_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    hazardType: Optional[str] = None,
    severity: Optional[str] = None,
    reportedBy: Optional[str] = None,
    isVerified: Optional[bool] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: int = Query(10000, ge=100, le=100000),
    sortBy: str = Query("createdAt"),
    sortOrder: str = Query("desc")
):
    """Get reports with filters and pagination"""
    db = get_database()
    
    # Build query
    query = {"isPublic": True}
    
    # Recent data filter (performance optimization) - disabled for testing
    # three_days_ago = datetime.utcnow() - timedelta(days=3)
    # query["createdAt"] = {"$gte": three_days_ago}
    
    if status:
        query["status"] = status
    if hazardType:
        query["hazardType"] = hazardType
    if severity:
        query["severity"] = severity
    if reportedBy:
        query["reportedBy"] = ObjectId(reportedBy)
    if isVerified is not None:
        query["verificationStatus.isVerified"] = isVerified
    
    # Geospatial query
    # Use $geoWithin instead of $near to allow custom sorting
    if lat is not None and lng is not None:
        query["location"] = {
            "$geoWithin": {
                "$centerSphere": [[lng, lat], radius / 6378100]  # radius in radians (Earth radius in meters)
            }
        }
    
    # Pagination
    skip = (page - 1) * limit
    sort_direction = -1 if sortOrder == "desc" else 1
    
    # Get reports with sorting
    cursor = db.reports.find(query).sort(sortBy, sort_direction).skip(skip).limit(limit)
    
    reports = await cursor.to_list(length=limit)
    
    # Get total count
    total = await db.reports.count_documents(query)
    
    # Process reports
    reports_list = []
    for report in reports:
        # Convert ObjectId fields to strings
        report_dict = {
            "id": str(report["_id"]),
            "title": report["title"],
            "description": report["description"],
            "hazardType": report["hazardType"],
            "severity": report["severity"],
            "location": report["location"],
            "address": report.get("address"),
            "landmark": report.get("landmark"),
            "reportedBy": str(report["reportedBy"]) if report.get("reportedBy") else None,
            "reporterName": report["reporterName"],
            "status": report["status"],
            "peopleAtRisk": report.get("peopleAtRisk", False),
            "images": report.get("images", []),
            "videos": report.get("videos", []),
            "audio": report.get("audio", []),
            "createdAt": report["createdAt"].isoformat() if report.get("createdAt") else None,
            "updatedAt": report["updatedAt"].isoformat() if report.get("updatedAt") else None
        }
        reports_list.append(report_dict)
    
    total_pages = (total + limit - 1) // limit
    
    return {
        "reports": reports_list,
        "pagination": {
            "currentPage": page,
            "totalPages": total_pages,
            "totalItems": total,
            "itemsPerPage": limit,
            "hasNext": page < total_pages,
            "hasPrev": page > 1
        }
    }


@router.get("/{report_id}", response_model=dict)
async def get_report(report_id: str):
    """Get a single report by ID"""
    db = get_database()
    
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "id": str(report["_id"]),
        "title": report["title"],
        "description": report["description"],
        "hazardType": report["hazardType"],
        "severity": report["severity"],
        "location": report["location"],
        "address": report.get("address"),
        "landmark": report.get("landmark"),
        "reporterName": report["reporterName"],
        "reporterPhone": report.get("reporterPhone"),
        "reporterEmail": report.get("reporterEmail"),
        "status": report["status"],
        "peopleAtRisk": report.get("peopleAtRisk", False),
        "emergencyContact": report.get("emergencyContact", {}),
        "images": report.get("images", []),
        "videos": report.get("videos", []),
        "audio": report.get("audio", []),
        "tags": report.get("tags", []),
        "priority": report.get("priority"),
        "verificationStatus": report.get("verificationStatus", {}),
        "reportedBy": str(report["reportedBy"]) if report.get("reportedBy") else None,
        "createdAt": report["createdAt"].isoformat() if report.get("createdAt") else None,
        "updatedAt": report["updatedAt"].isoformat() if report.get("updatedAt") else None
    }


@router.put("/{report_id}/status")
async def update_report_status(
    report_id: str,
    request: UpdateReportStatusRequest,
    user: dict = Depends(get_current_user)
):
    """Update report status (officials only)"""
    await require_official(user)
    
    db = get_database()
    
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report
    update_data = {
        "status": request.status,
        "updatedAt": datetime.utcnow()
    }
    
    if request.status in ["verified", "rejected"]:
        update_data["verificationStatus"] = {
            "isVerified": request.status == "verified",
            "verifiedBy": ObjectId(user["_id"]),
            "verifiedAt": datetime.utcnow(),
            "verificationNotes": request.verificationNotes
        }
    
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": update_data}
    )
    
    return {"message": "Report status updated successfully"}


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a report"""
    db = get_database()
    
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if user owns the report or is an official
    if user["role"] != "official" and str(report.get("reportedBy")) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
    
    await db.reports.delete_one({"_id": ObjectId(report_id)})
    
    return {"message": "Report deleted successfully"}
