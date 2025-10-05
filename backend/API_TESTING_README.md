# API Testing Script Documentation

## Overview

Comprehensive automated testing script for Samudra Sahayak REST API. Tests all endpoints with dynamic state management, media uploads, and GCS verification.

## Features

✅ **Dynamic State Management**: Automatically stores and reuses tokens, IDs, and URLs
✅ **Structured Logging**: Separate logs for requests, responses, and errors
✅ **Media Upload Testing**: Tests image, audio, and video uploads with GCS verification
✅ **Argon2 Password Hashing**: Uses Argon2 instead of bcrypt to avoid compatibility issues
✅ **Modular Design**: Each scenario is self-contained and can run independently
✅ **Error Handling**: Graceful error handling with detailed logging
✅ **Real-world Simulation**: Includes delays to simulate actual user behavior

## Setup

### 1. Install Dependencies

```bash
cd c:\sih2025\backend
pip install -r test_requirements.txt
```

### 2. Ensure Backend is Running

```bash
cd c:\sih2025\backend\sih
python main.py
```

Expected output:

```
🚀 Starting Samudra Sahayak API...
✅ API is ready to accept requests
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 3. Prepare Test Media

The script will auto-create test files, but you can also provide your own:

```
backend/
  test_media/
    images/
      test_image.jpg
    audio/
      test_audio.mp3
    videos/
      test_video.mp4
```

## Usage

### Run All Scenarios

```bash
cd c:\sih2025\backend
python test_api.py
```

### Run Individual Scenarios

```bash
python test_api.py 1  # Scenario 1: Register & Verify
python test_api.py 2  # Scenario 2: Report with Image
python test_api.py 3  # Scenario 3: Fetch Reports
python test_api.py 4  # Scenario 4: Report with Media
python test_api.py 5  # Scenario 5: Multiple Images
python test_api.py 6  # Scenario 6: Profile Operations
python test_api.py 7  # Scenario 7: Activity Tracking
```

## Scenarios

### Scenario 1: User Registration & Verification

**Tests**: Registration, Email Verification, Login

**Flow**:

1. ✅ Register new user with unique credentials
2. ✅ Extract verification token from response
3. ✅ Verify email using token
4. ✅ Login with verified credentials
5. ✅ Store access token for future use

**State Stored**:

- `test_user_email`
- `test_user_password`
- `access_token`
- `refresh_token`
- `user_id`

---

### Scenario 2: Submit Report with Image

**Tests**: File Upload, GCS Storage, Report Submission

**Flow**:

1. ✅ Login (reuses stored credentials)
2. ✅ Request signed URL for image upload
3. ✅ Upload image to Google Cloud Storage
4. ✅ Verify image exists in GCS
5. ✅ Submit report with image URL

**State Stored**:

- `last_report_id`

---

### Scenario 3: Fetch User Reports

**Tests**: Report Retrieval, Filtering

**Flow**:

1. ✅ Login
2. ✅ Fetch all reports for logged-in user
3. ✅ Display report titles and statuses

---

### Scenario 4: Submit Report with Image & Voice

**Tests**: Multiple File Types, GCS Verification

**Flow**:

1. ✅ Login
2. ✅ Upload image to GCS
3. ✅ Upload voice note to GCS
4. ✅ Verify both uploads in GCS
5. ✅ Submit report with both media files

**State Stored**:

- `last_media_report_id`

---

### Scenario 5: Submit Report with Multiple Images

**Tests**: Bulk Upload, Multiple Files

**Flow**:

1. ✅ Login
2. ✅ Upload 3 images to GCS
3. ✅ Verify all uploads
4. ✅ Submit report with all images

**State Stored**:

- `last_multi_image_report_id`

---

### Scenario 6: User Profile Operations

**Tests**: Profile CRUD, Settings Management

**Flow**:

1. ✅ Login
2. ✅ Fetch user profile
3. ✅ Update profile information
4. ✅ Fetch user settings
5. ✅ Update notification preferences

---

### Scenario 7: User Activity Tracking

**Tests**: Stats, Activity Log

**Flow**:

1. ✅ Login
2. ✅ Fetch user statistics
3. ✅ Fetch activity log

---

## Directory Structure

```
backend/
├── test_api.py                 # Main testing script
├── test_requirements.txt       # Testing dependencies
├── logs/                       # Generated logs
│   ├── request.log            # All API requests
│   ├── response.log           # All API responses
│   └── error.log              # Error logs
├── data/                      # Persistent state
│   └── state.json             # Stored tokens, IDs, URLs
└── test_media/                # Test files
    ├── images/
    ├── audio/
    └── videos/
```

## Log Files

### request.log

Contains all API requests with sanitized data:

```json
{
  "timestamp": "2025-10-05T10:30:00",
  "scenario": "Register User",
  "method": "POST",
  "url": "http://localhost:8000/api/auth/register",
  "headers": { "Content-Type": "application/json" },
  "data": { "email": "...", "password": "<redacted>" }
}
```

### response.log

Contains all API responses:

```json
{
  "timestamp": "2025-10-05T10:30:01",
  "scenario": "Register User",
  "status_code": 201,
  "duration_ms": 245.32,
  "response": {"message": "User registered", "user": {...}}
}
```

### error.log

Contains all errors:

```json
{
  "timestamp": "2025-10-05T10:30:05",
  "scenario": "Upload Image",
  "error": "Failed to get signed URL",
  "details": { "status_code": 401, "message": "Unauthorized" }
}
```

## State Management

### state.json

Persists data between test runs:

```json
{
  "test_user_email": "testuser1696588800@example.com",
  "test_user_password": "TestPassword123!",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user_id": "507f1f77bcf86cd799439011",
  "last_report_id": "507f1f77bcf86cd799439012",
  "verification_token": "abc123..."
}
```

**Benefits**:

- 🔄 Reuse authentication across scenarios
- 📊 Track created resources
- 🔍 Easy debugging and inspection
- ⚡ Faster test execution (no repeated registration)

## Output Example

```
================================================================================
SCENARIO 1: User Registration & Verification
================================================================================

[1.1] Registering new user...
[2025-10-05T10:30:00] [Register User] POST http://localhost:8000/api/auth/register
[2025-10-05T10:30:00] [Register User] Status: 201 (245.32ms)
✓ User registered: testuser1696588800@example.com

[1.2] Verifying email...
[2025-10-05T10:30:01] [Verify Email] POST http://localhost:8000/api/auth/verify
[2025-10-05T10:30:01] [Verify Email] Status: 200 (89.45ms)
✓ Email verified successfully

[1.3] Logging in with verified credentials...
[2025-10-05T10:30:02] [Login User] POST http://localhost:8000/api/auth/login
[2025-10-05T10:30:02] [Login User] Status: 200 (156.78ms)
✓ Login successful
✓ Access token stored
✓ User ID: 507f1f77bcf86cd799439011
```

## Troubleshooting

### Issue: Backend not running

**Error**: `Connection refused`
**Solution**: Start backend with `python main.py`

### Issue: CORS errors

**Error**: `No 'Access-Control-Allow-Origin' header`
**Solution**: Check backend CORS configuration in `main.py`

### Issue: GCS upload fails

**Error**: `Failed to upload to GCS`
**Solution**:

- Check GCS credentials in backend `.env`
- Verify bucket permissions
- Check signed URL expiration

### Issue: Authentication fails

**Error**: `401 Unauthorized`
**Solution**:

- Check if user is registered (run Scenario 1)
- Verify credentials in `data/state.json`
- Check token expiration

### Issue: ObjectId serialization error

**Error**: `Unable to serialize ObjectId`
**Solution**: This was fixed in OBJECTID_SERIALIZATION_FIX.md

## Advanced Usage

### Custom Test Data

Edit test scenarios to use custom data:

```python
# In scenario_1_register_and_verify()
test_user = {
    "fullName": "Your Name",
    "email": "your.email@example.com",
    "phone": "+919876543210",
    "password": "YourPassword123!",
    # ...
}
```

### Adding New Scenarios

```python
def scenario_8_custom_test(self):
    """Your custom test scenario"""
    print("\n" + "="*80)
    print("SCENARIO 8: Custom Test")
    print("="*80)

    # Step 1: Login
    if not self._ensure_logged_in():
        return False

    # Step 2: Your test logic
    response = self._make_request(
        "Custom Test",
        "GET",
        "/your/endpoint",
        headers=self._get_auth_headers()
    )

    return response["success"]
```

### Continuous Integration

Run in CI/CD pipeline:

```yaml
# .github/workflows/api-tests.yml
- name: Run API Tests
  run: |
    cd backend
    pip install -r test_requirements.txt
    python test_api.py
  env:
    API_BASE_URL: ${{ secrets.API_URL }}
```

## Best Practices

1. **Clean State**: Delete `data/state.json` for fresh tests
2. **Log Analysis**: Review logs after failed tests
3. **Incremental Testing**: Run scenarios individually during development
4. **Production Testing**: Use separate test accounts
5. **Media Cleanup**: Clear `test_media/` after tests

## Security Notes

⚠️ **Important**:

- Never commit `data/state.json` (contains tokens)
- Use test credentials only
- Don't test on production API
- Sanitize logs before sharing

## Performance

**Typical Execution Times**:

- Scenario 1: ~5 seconds
- Scenario 2: ~8 seconds (includes upload)
- Scenario 3: ~3 seconds
- Scenario 4: ~10 seconds (multiple uploads)
- Scenario 5: ~12 seconds (3 images)
- Scenario 6: ~8 seconds
- Scenario 7: ~4 seconds

**Full Suite**: ~50-60 seconds

## Extending the Script

### Add Alert Testing

```python
def scenario_8_create_alert(self):
    """Test alert creation (officials only)"""
    # Requires official role user
    alert_data = {
        "title": "Test Alert",
        "message": "Test alert message",
        "alertType": "warning",
        "hazardType": "storm",
        "severity": "high",
        # ...
    }

    response = self._make_request(
        "Create Alert",
        "POST",
        "/alerts",
        headers=self._get_auth_headers(),
        json_data=alert_data
    )

    return response["success"]
```

### Add Map Data Testing

```python
def scenario_9_fetch_map_data(self):
    """Test map endpoints"""
    response = self._make_request(
        "Get Map Reports",
        "GET",
        "/map/reports",
        headers=self._get_auth_headers(),
        data={
            "lat": 19.0760,
            "lng": 72.8777,
            "radius": 10000
        }
    )

    return response["success"]
```

## Support

For issues or questions:

1. Check logs in `logs/` directory
2. Review error messages
3. Verify backend is running
4. Check state in `data/state.json`

## License

Part of Samudra Sahayak project - Smart India Hackathon 2025
