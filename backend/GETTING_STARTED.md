# 🚀 Getting Started with Samudra Sahayak Backend

This guide will walk you through setting up and running the Samudra Sahayak backend for the first time.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (TL;DR)](#quick-start-tldr)
3. [Detailed Setup Instructions](#detailed-setup-instructions)
4. [Testing the API](#testing-the-api)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

- **Python 3.10 or higher** - [Download here](https://www.python.org/downloads/)
  - ✅ Verify: Run `python --version` in your terminal
- **MongoDB** (Local or Atlas account)

  - For local: [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - For cloud: [Create free Atlas account](https://www.mongodb.com/cloud/atlas/register)
  - ✅ Verify: MongoDB connection string is available

- **Google Cloud Account** (for file uploads)

  - [Create GCS project](https://console.cloud.google.com/)
  - Create a storage bucket
  - Generate service account credentials
  - ✅ Verify: You have the service account JSON file

- **Gmail Account** (for email notifications)
  - Need to enable 2-Step Verification
  - Generate App Password: [Instructions here](https://support.google.com/accounts/answer/185833)
  - ✅ Verify: You have the 16-character app password

### System Requirements

- **OS**: Windows 10/11, macOS 10.14+, or Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 500MB free space for dependencies
- **Network**: Internet connection required for initial setup

---

## Quick Start (TL;DR)

If you're experienced and just need the commands:

```cmd
:: 1. Navigate to backend directory
cd c:\sih2025\backend

:: 2. Activate virtual environment
sih\Scripts\activate

:: 3. Install dependencies (if not already installed)
pip install -r requirements.txt

:: 4. Verify environment variables
:: Check that backend\.env and backend\sih\.env exist and are configured

:: 5. Start the server
cd sih
python main.py

:: 6. Open browser to test
:: Navigate to http://localhost:8000/docs
```

**That's it!** The server should be running at `http://localhost:8000`

---

## Detailed Setup Instructions

### Step 1: Open Terminal/Command Prompt

**Windows:**

- Press `Win + R`
- Type `cmd` and press Enter
- Navigate to project: `cd c:\sih2025\backend`

**macOS/Linux:**

- Open Terminal application
- Navigate to project: `cd /path/to/sih2025/backend`

### Step 2: Activate Virtual Environment

The project already has a pre-configured virtual environment in the `sih` folder.

```cmd
:: Windows
sih\Scripts\activate

# macOS/Linux
source sih/bin/activate
```

**✅ Success Indicator:** Your terminal prompt will show `(sih)` prefix:

```
(sih) C:\sih2025\backend>
```

### Step 3: Install Python Dependencies

If this is your first time or dependencies are outdated:

```cmd
pip install -r requirements.txt
```

**What this installs:**

- FastAPI - Web framework
- Uvicorn - ASGI server
- PyMongo - MongoDB driver
- PyJWT - JWT authentication
- Passlib - Password hashing
- Google Cloud Storage - File uploads
- And more...

**⏱️ Expected Time:** 2-5 minutes depending on internet speed

**✅ Success Indicator:** You should see messages like:

```
Successfully installed fastapi-0.104.1 uvicorn-0.24.0 ...
```

### Step 4: Verify Environment Variables

The project uses TWO `.env` files for configuration:

1. **`backend\.env`** - Main configuration file
2. **`backend\sih\.env`** - Virtual environment specific (symlinked)

**Check that both files exist:**

```cmd
:: From backend directory
dir .env
dir sih\.env
```

**Important:** These files contain sensitive credentials and should NEVER be committed to git. They're already added to `.gitignore`.

**Sample `.env` structure:**

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEYFILE={"type": "service_account", ...}

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000
```

### Step 5: Verify MongoDB Connection

**Option A: Test connection with Python script**

```cmd
python -c "from pymongo import MongoClient; from dotenv import load_dotenv; import os; load_dotenv(); client = MongoClient(os.getenv('MONGODB_URI')); print('MongoDB Connected:', client.server_info()['version'])"
```

**Option B: Use the provided verification script**

```cmd
cd sih
python check_geo.py
```

**✅ Success Indicator:** You should see MongoDB version number without errors

### Step 6: Create Database Indexes (First Time Only)

For optimal performance, create geospatial indexes:

```cmd
python fix_indexes.py
```

**What this does:**

- Creates `2dsphere` index on `reports.location` for geospatial queries
- Creates `2dsphere` index on `alerts.affectedArea` for area-based alerts
- Verifies existing indexes

**✅ Success Indicator:**

```
Creating indexes for geospatial queries...
✓ Index created on reports.location
✓ Index created on alerts.affectedArea
```

### Step 7: Start the Development Server

```cmd
cd sih
python main.py
```

**Alternative method using Uvicorn directly:**

```cmd
cd sih
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**What each flag means:**

- `--reload` - Auto-restart server on code changes (development only)
- `--host 0.0.0.0` - Accept connections from any network interface
- `--port 8000` - Run on port 8000

**✅ Success Indicator:** You should see output like:

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**🎉 Congratulations!** Your backend is now running!

---

## Testing the API

### Method 1: Interactive API Documentation (Recommended)

FastAPI provides an automatic interactive API documentation interface:

1. **Open your browser**
2. **Navigate to:** `http://localhost:8000/docs`
3. **You'll see the Swagger UI** with all available endpoints

**Features:**

- ✅ Try endpoints directly from the browser
- ✅ See request/response schemas
- ✅ View authentication requirements
- ✅ Test with sample data

**Alternative Documentation:**

- ReDoc style: `http://localhost:8000/redoc`

### Method 2: Run Automated Test Suite

The project includes a comprehensive test suite covering all scenarios:

```cmd
:: From backend directory (with virtual environment activated)
cd c:\sih2025\backend
python test_api.py
```

**What this tests:**

1. ✅ User Registration & Email Verification
2. ✅ Report Submission (Text + Image Upload)
3. ✅ Report Fetching (Geospatial Queries)
4. ✅ User Login (Email & Phone)
5. ✅ Alert Creation (Official Role)
6. ✅ Profile & Settings Updates
7. ✅ Activity Tracking
8. ✅ Reports Endpoint Comparison (User vs Public)

**⏱️ Expected Time:** ~30-60 seconds for full test suite

**✅ Success Indicator:**

```
=== Scenario 1: User Registration & Verification ===
✓ User registration successful
✓ Email verification successful

=== Scenario 2: Submit Report with Image ===
✓ Image upload successful
✓ Report creation successful

... (and so on)

=== TEST SUMMARY ===
Total Tests: 8/8 passed (100%)
```

### Method 3: Quick Health Check

Test if the server is responsive:

```cmd
curl http://localhost:8000/
```

**Expected Response:**

```json
{
  "message": "Samudra Sahayak Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

### Method 4: Test Individual Endpoints

**Example: Register a new user**

```cmd
curl -X POST "http://localhost:8000/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test123!\",\"confirmPassword\":\"Test123!\",\"role\":\"citizen\"}"
```

**Example: Get public reports (no auth required)**

```cmd
curl "http://localhost:8000/api/reports?page=1&limit=10"
```

**Example: Login and get access token**

```cmd
curl -X POST "http://localhost:8000/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"credential\":\"test@example.com\",\"password\":\"Test123!\"}"
```

---

## Troubleshooting

### Issue 1: "python: command not found"

**Problem:** Python is not installed or not in PATH

**Solutions:**

1. Install Python from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add Python to PATH"
3. Restart terminal after installation
4. Verify: `python --version` should show version 3.10+

### Issue 2: "ModuleNotFoundError: No module named 'fastapi'"

**Problem:** Dependencies not installed or wrong virtual environment

**Solutions:**

```cmd
:: Make sure virtual environment is activated
sih\Scripts\activate

:: Install dependencies
pip install -r requirements.txt
```

### Issue 3: "pymongo.errors.ServerSelectionTimeoutError"

**Problem:** Cannot connect to MongoDB

**Solutions:**

1. **Check MongoDB URI** in `.env` file

   - Ensure no typos in connection string
   - Verify username/password are correct
   - Check that IP address is whitelisted (for Atlas)

2. **Test MongoDB connection:**

   ```cmd
   python -c "from pymongo import MongoClient; print(MongoClient('your_mongodb_uri').server_info())"
   ```

3. **Common MongoDB Atlas issues:**
   - Network access: Whitelist your IP address
   - Database user: Ensure user has read/write permissions
   - Connection string: Use the correct format for your MongoDB version

### Issue 4: "Port 8000 is already in use"

**Problem:** Another process is using port 8000

**Solutions:**

1. **Find and kill the process (Windows):**

   ```cmd
   netstat -ano | findstr :8000
   taskkill /PID <process_id> /F
   ```

2. **Or use a different port:**
   ```cmd
   uvicorn main:app --reload --port 8001
   ```

### Issue 5: "google.auth.exceptions.DefaultCredentialsError"

**Problem:** Google Cloud Storage credentials not configured

**Solutions:**

1. **Check `.env` file** has `GOOGLE_CLOUD_KEYFILE` with valid JSON
2. **Verify service account JSON** is properly formatted (no line breaks in .env)
3. **Ensure bucket exists** and service account has permissions

**Temporary workaround:** Comment out GCS-related imports in `app/utils/storage.py` for local testing without file uploads

### Issue 6: Email verification emails not sending

**Problem:** Gmail SMTP configuration issues

**Solutions:**

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate 16-character password
3. **Update `.env`:**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password  # No spaces
   ```

### Issue 7: CORS errors when testing from frontend

**Problem:** Frontend can't access backend due to CORS restrictions

**Solutions:**

1. **Check `FRONTEND_URL` in `.env`:**
   ```env
   FRONTEND_URL=http://localhost:3000
   ```
2. **Ensure CORS middleware is configured** in `main.py` (already done)
3. **Restart server** after changing .env file

### Issue 8: Tests fail with "E11000 duplicate key error"

**Problem:** Test data already exists in database from previous runs

**Solutions:**

1. **Test uses unique identifiers** - This should be automatically handled
2. **If persists, manually change test email** in `test_api.py`:
   ```python
   test_user = {
       "email": "new-unique-email@gmail.com",  # Change this
       ...
   }
   ```

### Issue 9: Geospatial queries return empty results

**Problem:** Missing database indexes or incorrect coordinates

**Solutions:**

1. **Create indexes:**
   ```cmd
   python fix_indexes.py
   ```
2. **Verify index creation:**
   ```cmd
   python check_geo_index.py
   ```
3. **Check coordinates format:**
   - Must be `[longitude, latitude]` (NOT lat, lng)
   - Longitude: -180 to 180
   - Latitude: -90 to 90

### Getting More Help

If you're still stuck:

1. **Check the logs:**

   - `backend/logs/error.log` - Error messages
   - `backend/logs/request.log` - All incoming requests
   - `backend/logs/response.log` - All outgoing responses

2. **Review documentation:**

   - `API_REFERENCE.md` - Complete API endpoint documentation
   - `COMPLETE_TEST_RESULTS.md` - Expected test outcomes
   - `TESTING_FRAMEWORK_SUMMARY.md` - Testing methodology

3. **Inspect the code:**
   - `sih/app/routes/` - All endpoint implementations
   - `sih/app/utils/` - Helper functions and utilities

---

## Next Steps

### ✅ Backend is Running - What Now?

#### 1. Explore the API Documentation

- Open `http://localhost:8000/docs`
- Try the authentication flow:
  1. Register a user
  2. Login to get access token
  3. Use token to access protected endpoints

#### 2. Test Report Submission

- Create a test report with geolocation
- Upload an image file
- Verify it appears in the database

#### 3. Test Geospatial Queries

- Submit multiple reports with different locations
- Query reports within specific radius
- Verify correct results are returned

#### 4. Integrate with Frontend

- Start the Next.js frontend: `cd frontend && npm run dev`
- Configure API base URL in frontend to point to `http://localhost:8000`
- Test full user flow from UI

#### 5. Review Test Results

- Run the complete test suite: `python test_api.py`
- Review `COMPLETE_TEST_RESULTS.md` for expected outcomes
- Ensure all 8 scenarios pass

#### 6. Set Up Production Environment

- Use production-ready MongoDB instance
- Configure proper JWT secrets (strong, unique)
- Set up environment-specific `.env` files
- Disable debug mode and auto-reload
- Set up proper logging and monitoring

### Development Workflow

**Daily Development:**

```cmd
:: 1. Activate virtual environment
cd c:\sih2025\backend
sih\Scripts\activate

:: 2. Start server with auto-reload
cd sih
python main.py

:: 3. Make changes to code
:: Server automatically restarts on file changes

:: 4. Test changes
:: Use Swagger UI at http://localhost:8000/docs
```

**Before Committing Code:**

```cmd
:: 1. Run test suite
python test_api.py

:: 2. Check for errors
:: Review logs in backend/logs/

:: 3. Verify documentation is updated
:: Update README.md or API_REFERENCE.md if endpoints changed
```

### Common Development Tasks

**Add a New Endpoint:**

1. Create route handler in `sih/app/routes/`
2. Define Pydantic models in `sih/app/schemas.py`
3. Update API documentation in `API_REFERENCE.md`
4. Add test case in `test_api.py`

**Update Environment Variables:**

1. Edit `backend\.env`
2. Restart server for changes to take effect
3. Never commit `.env` to version control

**Database Schema Changes:**

1. Update MongoDB collections manually or via migration script
2. Update Pydantic schemas in `sih/app/schemas.py`
3. Update indexes if needed: `python fix_indexes.py`
4. Test with updated test data

**Debug Issues:**

1. Check logs: `backend/logs/error.log`
2. Enable verbose logging in `main.py` (already enabled)
3. Use Swagger UI to test endpoints interactively
4. Run individual test scenarios from `test_api.py`

---

## Environment Configuration Reference

### Required Environment Variables

```env
# ===== DATABASE CONFIGURATION =====
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sih?retryWrites=true&w=majority

# ===== JWT CONFIGURATION =====
JWT_SECRET=your_secret_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_key_minimum_32_characters_long
JWT_ACCESS_EXPIRES=15  # Access token expiry in minutes
JWT_REFRESH_EXPIRES=7  # Refresh token expiry in days

# ===== EMAIL CONFIGURATION =====
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password-16-chars
EMAIL_FROM=Samudra Sahayak <your-email@gmail.com>

# ===== GOOGLE CLOUD STORAGE =====
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEYFILE={"type":"service_account","project_id":"..."}

# ===== APPLICATION CONFIGURATION =====
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
ENVIRONMENT=development  # or production

# ===== OPTIONAL: API KEYS =====
GEMINI_API_KEY=your_gemini_api_key_for_voice_processing  # Optional: For AI features
```

### Security Best Practices

1. **JWT Secrets**

   - Use long, random strings (32+ characters)
   - Generate using: `openssl rand -hex 32`
   - Different secrets for access and refresh tokens

2. **Database Credentials**

   - Create read/write user (not admin)
   - Use strong passwords
   - Rotate credentials regularly

3. **Email Configuration**

   - Use App Passwords, never main password
   - Limit to SMTP access only
   - Monitor for suspicious activity

4. **API Keys**
   - Store in environment variables
   - Never commit to version control
   - Use different keys for dev/prod

---

## Quick Reference Commands

### Starting the Server

```cmd
cd c:\sih2025\backend
sih\Scripts\activate
cd sih
python main.py
```

### Running Tests

```cmd
cd c:\sih2025\backend
sih\Scripts\activate
python test_api.py
```

### Checking Logs

```cmd
type backend\logs\error.log      # View errors
type backend\logs\request.log    # View requests
type backend\logs\response.log   # View responses
```

### Database Index Management

```cmd
python fix_indexes.py       # Create/update indexes
python check_geo_index.py   # Verify geospatial indexes
```

### Google Cloud Storage Verification

```cmd
python verify_gcs_simple.py  # Test GCS connection
python verify_gcs_files.py   # List files in bucket
```

---

## Architecture Overview

### Technology Stack

- **Web Framework:** FastAPI 0.104+
- **Server:** Uvicorn (ASGI)
- **Database:** MongoDB Atlas (Cloud)
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** Passlib with bcrypt
- **File Storage:** Google Cloud Storage
- **Email:** SMTP (Gmail)
- **Validation:** Pydantic v2

### Key Features

✅ **Complete REST API** - 40+ endpoints covering all features
✅ **JWT Authentication** - Secure token-based auth with refresh tokens
✅ **Role-Based Access** - Citizen and Official roles with different permissions
✅ **Guest Mode** - Limited access without registration
✅ **Geospatial Queries** - Location-based report and alert filtering
✅ **File Upload** - Signed URLs for direct GCS uploads
✅ **Email Notifications** - Verification, password reset, welcome emails
✅ **Comprehensive Testing** - 8 test scenarios covering all flows
✅ **Auto Documentation** - Interactive Swagger UI and ReDoc
✅ **Structured Logging** - Request, response, and error logs

### API Endpoints Summary

| Category       | Endpoints | Description                           |
| -------------- | --------- | ------------------------------------- |
| Authentication | 9         | Register, login, verify, reset, etc.  |
| Reports        | 5         | Create, read, update, delete reports  |
| Alerts         | 5         | Create, read, update, delete alerts   |
| User           | 6         | Profile, settings, activity, stats    |
| Map Data       | 2         | Geospatial data for map visualization |
| Uploads        | 3         | Signed URLs, verification, refresh    |

**Total:** 30+ documented endpoints

---

## Resources

### Documentation Files

- **[README.md](README.md)** - Project overview and API reference
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete endpoint documentation
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - This file
- **[COMPLETE_TEST_RESULTS.md](COMPLETE_TEST_RESULTS.md)** - Test scenarios and results
- **[TESTING_FRAMEWORK_SUMMARY.md](TESTING_FRAMEWORK_SUMMARY.md)** - Testing methodology
- **[VOICE_REPORT_IMPLEMENTATION.md](VOICE_REPORT_IMPLEMENTATION.md)** - AI voice feature docs

### Helpful Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Python Driver](https://pymongo.readthedocs.io/)
- [Google Cloud Storage Python](https://cloud.google.com/python/docs/reference/storage/latest)
- [JWT Authentication Guide](https://jwt.io/introduction)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

## Success Checklist

Before considering the setup complete, verify:

- [ ] Virtual environment activates without errors
- [ ] All dependencies install successfully
- [ ] MongoDB connection works (can connect to database)
- [ ] Server starts on port 8000
- [ ] Swagger UI accessible at `http://localhost:8000/docs`
- [ ] Health check endpoint returns 200 OK
- [ ] Can register a new user
- [ ] Email verification token generates (check logs)
- [ ] Can login with credentials
- [ ] Can create a report (with or without image)
- [ ] Geospatial queries return results
- [ ] All 8 test scenarios pass (100% success rate)
- [ ] Logs are being written to `backend/logs/` directory

**When all items are checked:** ✅ **Setup is complete!**

---

## Support and Contact

If you encounter issues not covered in this guide:

1. **Check existing documentation** in the `backend/` folder
2. **Review logs** in `backend/logs/` for error details
3. **Test with Swagger UI** to isolate the issue
4. **Run automated tests** to verify system state
5. **Check MongoDB Atlas dashboard** for connection issues

---

**Last Updated:** 2025-01-28  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
