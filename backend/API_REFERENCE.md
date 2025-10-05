# API Quick Reference Guide

## Base URL

```
http://localhost:8000
```

## Authentication

### Register New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+911234567890",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "citizen",
  "language": "en"
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

  {
    "credential": "john@example.com",
    "password": "SecurePass123!",
    "rememberDevice": true
  }

Response:
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "eyJ..."
}
```

### Guest Session

```bash
POST /api/auth/guest

Response:
{
  "message": "Guest session created",
  "token": "guest_eyJ..."
}
```

### Verify Email

```bash
POST /api/auth/verify
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "token": "verification-token-from-email"
}
```

### Forgot Password

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "credential": "john@example.com"
}
```

### Reset Password

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

### Refresh Token

```bash
POST /api/auth/refresh
Cookie: refreshToken=your_refresh_token

Response:
{
  "message": "Token refreshed successfully",
  "user": { ... },
  "accessToken": "new_eyJ..."
}
```

### Logout

```bash
POST /api/auth/logout
Cookie: refreshToken=your_refresh_token
```

---

## Reports

### Create Report

```bash
POST /api/reports
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "title": "Major Flooding on Coastal Road",
  "description": "Heavy flooding observed...",
  "hazardType": "flood",
  "severity": "high",
  "location": {
    "type": "Point",
    "coordinates": [80.2707, 13.0827]
  },
  "address": "Marina Beach Road, Chennai",
  "landmark": "Near Lighthouse",
  "peopleAtRisk": true,
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "+919876543210",
    "relationship": "Local Authority"
  },
  "images": [
    {
      "url": "https://storage.googleapis.com/...",
      "fileName": "flood1.jpg",
      "caption": "Flooded road view"
    }
  ],
  "videos": [],
  "audio": [],
  "tags": ["flood", "marina", "urgent"]
}
```

### Get Reports (All Filters)

```bash
GET /api/reports?page=1&limit=20&severity=high&status=pending&hazardType=flood&sortBy=createdAt&sortOrder=desc
```

### Get Reports (Geospatial)

```bash
GET /api/reports?lat=13.0827&lng=80.2707&radius=10000
```

### Get Single Report

```bash
GET /api/reports/507f1f77bcf86cd799439011
```

### Update Report Status (Officials Only)

```bash
PUT /api/reports/507f1f77bcf86cd799439011/status
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "status": "verified",
  "verificationNotes": "Report verified by on-ground inspection"
}
```

### Delete Report

```bash
DELETE /api/reports/507f1f77bcf86cd799439011
Authorization: Bearer your_access_token
```

---

## Alerts

### Create Alert (Officials Only)

```bash
POST /api/alerts
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "title": "Cyclone Warning - Severe Weather Alert",
  "message": "A severe cyclone is expected to make landfall...",
  "alertType": "warning",
  "hazardType": "cyclone",
  "severity": "critical",
  "urgency": "immediate",
  "affectedArea": {
    "type": "Circle",
    "coordinates": [80.2707, 13.0827]
  },
  "radius": 50000,
  "affectedLocations": [
    {
      "name": "Chennai Coastal Areas",
      "type": "district",
      "coordinates": [80.2707, 13.0827]
    }
  ],
  "effectiveFrom": "2025-10-03T00:00:00Z",
  "expiresAt": "2025-10-05T00:00:00Z",
  "instructions": [
    {
      "action": "Evacuate immediately",
      "description": "Move to nearest designated shelter",
      "priority": 10
    }
  ],
  "safetyTips": [
    "Stay indoors during the cyclone",
    "Keep away from windows"
  ],
  "emergencyContacts": [
    {
      "name": "Emergency Control Room",
      "role": "Emergency Coordinator",
      "phone": "+911234567890",
      "email": "emergency@coastal.gov.in",
      "isAvailable24x7": true
    }
  ],
  "targetAudience": "all",
  "distributionChannels": ["app_notification", "sms", "email"],
  "language": "all",
  "tags": ["cyclone", "evacuation", "emergency"]
}
```

### Get Alerts (All Filters)

```bash
GET /api/alerts?page=1&limit=20&isActive=true&severity=critical&alertType=emergency
```

### Get Alerts (Geospatial)

```bash
GET /api/alerts?lat=13.0827&lng=80.2707&radius=50000&isActive=true
```

### Get Single Alert

```bash
GET /api/alerts/507f1f77bcf86cd799439011
```

### Update Alert Status (Officials Only)

```bash
PUT /api/alerts/507f1f77bcf86cd799439011/status
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "status": "active"
}
```

### Delete Alert (Officials Only)

```bash
DELETE /api/alerts/507f1f77bcf86cd799439011
Authorization: Bearer your_access_token
```

---

## User Profile

### Get Profile

```bash
GET /api/user/profile
Authorization: Bearer your_access_token
```

### Update Profile

```bash
PUT /api/user/profile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phone": "+911234567890",
  "language": "en",
  "profession": "fisherman"
}
```

### Get Settings

```bash
GET /api/user/settings
Authorization: Bearer your_access_token
```

### Update Settings

```bash
PUT /api/user/settings
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "notificationPreferences": {
    "push": true,
    "email": true,
    "sms": false,
    "emergencyAlerts": true,
    "reportUpdates": true,
    "language": "en"
  },
  "language": "en"
}
```

### Get User's Reports

```bash
GET /api/user/reports
Authorization: Bearer your_access_token
```

---

## File Upload

### Get Signed Upload URL

```bash
POST /api/upload/signed-url
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "fileName": "my-image.jpg",
  "contentType": "image/jpeg"
}

Response:
{
  "url": "https://storage.googleapis.com/...",
  "fileName": "my-image.jpg"
}
```

### Upload File (Two-Step Process)

```bash
# Step 1: Get signed URL (above)
# Step 2: Upload file to signed URL
PUT <signed_url_from_step_1>
Content-Type: image/jpeg
Body: <file_binary_data>
```

### Refresh Download URLs

```bash
POST /api/upload/refresh-urls
Content-Type: application/json

{
  "fileNames": ["file1.jpg", "file2.jpg", "file3.jpg"]
}

Response:
{
  "urls": [
    {
      "fileName": "file1.jpg",
      "url": "https://storage.googleapis.com/..."
    },
    ...
  ]
}
```

### Verify File Exists

```bash
GET /api/upload/verify/my-file.jpg
```

---

## Map Data

### Get Map Data (Reports + Alerts)

```bash
GET /api/map/data?lat=13.0827&lng=80.2707&radius=50000&includeReports=true&includeAlerts=true

Response:
{
  "reports": [...],
  "alerts": [...]
}
```

### Get Initial Map Data

```bash
GET /api/map/initial-data

Response:
{
  "reports": [...],  // Recent 50 reports
  "alerts": [...]    // Active 20 alerts
}
```

---

## System

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "service": "Samudra Sahayak API",
  "version": "1.0.0"
}
```

### Root

```bash
GET /

Response:
{
  "message": "Welcome to Samudra Sahayak API",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/health"
}
```

---

## Common Query Parameters

### Pagination

```
page=1          # Page number (default: 1)
limit=20        # Items per page (default: 20, max: 100)
```

### Sorting

```
sortBy=createdAt     # Field to sort by
sortOrder=desc       # asc or desc
```

### Filtering

```
status=pending       # Filter by status
severity=critical    # Filter by severity
hazardType=flood     # Filter by hazard type
isActive=true        # Filter active alerts
isVerified=true      # Filter verified reports
```

### Geospatial

```
lat=13.0827          # Latitude
lng=80.2707          # Longitude
radius=10000         # Radius in meters (default: 10000)
```

---

## Data Models

### Hazard Types

```
flood, fire, landslide, storm, roadblock, accident, medical,
marine_emergency, pollution, infrastructure, other
```

### Severity Levels

```
low, medium, high, critical
```

### Report Status

```
pending, verified, rejected, resolved, archived
```

### Alert Types

```
emergency, warning, advisory, all_clear, update
```

### Alert Status

```
draft, active, updated, expired, cancelled, archived
```

### User Roles

```
citizen, official
```

### Languages

```
en (English), te (Telugu), hi (Hindi)
```

---

## HTTP Status Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 201  | Created                                 |
| 400  | Bad Request - Invalid input             |
| 401  | Unauthorized - Missing/invalid token    |
| 403  | Forbidden - Insufficient permissions    |
| 404  | Not Found                               |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

---

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"John Doe\",\"email\":\"john@example.com\",\"password\":\"SecurePass123!\",\"confirmPassword\":\"SecurePass123!\",\"role\":\"citizen\"}"
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"credential\":\"john@example.com\",\"password\":\"SecurePass123!\"}"
```

### Create Report

```bash
curl -X POST http://localhost:8000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Report\",\"description\":\"Test description\",\"hazardType\":\"flood\",\"severity\":\"high\",\"location\":{\"type\":\"Point\",\"coordinates\":[80.2707,13.0827]}}"
```

### Get Reports

```bash
curl http://localhost:8000/api/reports?page=1&limit=20
```

---

## Interactive Documentation

Visit these URLs when server is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Both provide:

- Complete API documentation
- Try-it-out functionality
- Request/response examples
- Schema definitions

---

## Example Workflow

### 1. Register & Verify

```bash
# 1. Register
POST /api/auth/register { ... }

# 2. Check email for verification token

# 3. Verify
POST /api/auth/verify { userId, token }

# 4. Login
POST /api/auth/login { credential, password }
# Save the accessToken
```

### 2. Create Report

```bash
# 1. Get upload URL
POST /api/upload/signed-url { fileName, contentType }
# Returns signed URL

# 2. Upload file to GCS
PUT <signed_url>
# Upload binary data

# 3. Create report with file URL
POST /api/reports {
  title, description, location,
  images: [{ url, fileName }]
}
```

### 3. Query Reports

```bash
# Get nearby reports
GET /api/reports?lat=13.0827&lng=80.2707&radius=10000

# Filter by severity
GET /api/reports?severity=critical&status=pending

# Get user's reports
GET /api/user/reports
```

---

**Pro Tip**: Use the Swagger UI at http://localhost:8000/docs for the easiest way to test all endpoints!
