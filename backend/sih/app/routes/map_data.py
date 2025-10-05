"""
Map data routes
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_database

router = APIRouter()


@router.get("/data")
async def get_map_data(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: int = Query(50000, ge=1000, le=500000),
    includeReports: bool = True,
    includeAlerts: bool = True
):
    """Get map data (reports and alerts) for a specific location"""
    db = get_database()
    
    result = {
        "reports": [],
        "alerts": []
    }
    
    # Get recent reports
    if includeReports:
        query = {
            "isPublic": True,
            "status": {"$in": ["pending", "verified"]},
            "createdAt": {"$gte": datetime.utcnow() - timedelta(days=7)}
        }
        
        if lat is not None and lng is not None:
            query["location"] = {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    },
                    "$maxDistance": radius
                }
            }
        
        reports = await db.reports.find(query).limit(100).to_list(length=100)
        
        for report in reports:
            result["reports"].append({
                "id": str(report["_id"]),
                "title": report["title"],
                "hazardType": report["hazardType"],
                "severity": report["severity"],
                "location": report["location"],
                "status": report["status"],
                "createdAt": report["createdAt"]
            })
    
    # Get active alerts
    if includeAlerts:
        query = {
            "isActive": True,
            "expiresAt": {"$gte": datetime.utcnow()}
        }
        
        if lat is not None and lng is not None:
            query["affectedArea"] = {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    },
                    "$maxDistance": radius
                }
            }
        
        alerts = await db.alerts.find(query).limit(50).to_list(length=50)
        
        for alert in alerts:
            result["alerts"].append({
                "id": str(alert["_id"]),
                "title": alert["title"],
                "alertType": alert["alertType"],
                "hazardType": alert["hazardType"],
                "severity": alert["severity"],
                "affectedArea": alert["affectedArea"],
                "effectiveFrom": alert["effectiveFrom"],
                "expiresAt": alert["expiresAt"]
            })
    
    return result


@router.get("/initial-data")
async def get_initial_map_data():
    """Get initial map data for dashboard"""
    db = get_database()
    
    # Get recent reports
    reports = await db.reports.find({
        "isPublic": True,
        "createdAt": {"$gte": datetime.utcnow() - timedelta(days=3)}
    }).sort("createdAt", -1).limit(50).to_list(length=50)
    
    # Get active alerts
    alerts = await db.alerts.find({
        "isActive": True,
        "expiresAt": {"$gte": datetime.utcnow()}
    }).sort("createdAt", -1).limit(20).to_list(length=20)
    
    return {
        "reports": [{
            "id": str(r["_id"]),
            "title": r["title"],
            "hazardType": r["hazardType"],
            "severity": r["severity"],
            "location": r["location"],
            "status": r["status"],
            "createdAt": r["createdAt"]
        } for r in reports],
        "alerts": [{
            "id": str(a["_id"]),
            "title": a["title"],
            "alertType": a["alertType"],
            "hazardType": a["hazardType"],
            "severity": a["severity"],
            "affectedArea": a["affectedArea"],
            "effectiveFrom": a["effectiveFrom"],
            "expiresAt": a["expiresAt"]
        } for a in alerts]
    }
