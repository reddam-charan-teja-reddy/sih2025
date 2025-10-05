# 🌊 Samudra Sahayak - Coastal Safety & Emergency Reporting System

A comprehensive platform for coastal safety monitoring, emergency reporting, and community engagement.

---

## 📚 Quick Navigation

### 🚀 Getting Started

- **New to the project?** → [QUICK_START.md](QUICK_START.md) - Start here!
- **Backend setup?** → [backend/GETTING_STARTED.md](backend/GETTING_STARTED.md) - Comprehensive guide
- **Frontend setup?** → [frontend/README.md](frontend/README.md)

### 📖 Documentation

- **API Reference** → [backend/API_REFERENCE.md](backend/API_REFERENCE.md)
- **Test Results** → [backend/COMPLETE_TEST_RESULTS.md](backend/COMPLETE_TEST_RESULTS.md)
- **Testing Guide** → [QUICK_TESTING_GUIDE.md](QUICK_TESTING_GUIDE.md)

### 🔧 Development

- **Backend (Python/FastAPI)** → [backend/](backend/)
- **Frontend (Next.js/React)** → [frontend/](frontend/)
- **Mobile (Flutter)** → [flutter_application/](flutter_application/)

---

## 🎯 Project Overview

**Samudra Sahayak** is a full-stack application designed to help coastal communities report emergencies, receive alerts, and stay informed about coastal safety conditions.

### Key Features

#### 🔐 Authentication & User Management

- Email/phone registration with verification
- JWT-based secure authentication
- Role-based access (Citizen, Official)
- Guest mode for quick reporting
- Password reset via email

#### 📍 Report Management

- Create reports with text, images, audio, and video
- Geospatial queries (find reports near location)
- Real-time status updates
- Category-based filtering (hazards, incidents, requests)
- Severity levels (low, moderate, high, critical)

#### 🚨 Alert System

- Official alerts creation (government officials only)
- Geospatial area-based alerts
- Alert expiration and status tracking
- Push notifications (planned)

#### 🗺️ Interactive Map

- Visualize reports and alerts on map
- Filter by location, type, and severity
- Real-time updates

#### 📊 User Dashboard

- Activity tracking
- Report statistics
- Profile management
- Notification preferences

#### 🎤 AI-Powered Voice Reports

- Voice-to-text transcription
- AI analysis via Gemini API
- Automatic hazard detection
- Sentiment and urgency analysis

---

## 🏗️ Technology Stack

### Backend (FastAPI + Python)

- **Framework:** FastAPI 0.104+
- **Database:** MongoDB Atlas (Cloud)
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Google Cloud Storage
- **Email:** SMTP (Gmail)
- **AI:** Google Gemini API

### Frontend (Next.js + React)

- **Framework:** Next.js 14
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** Redux Toolkit
- **Maps:** Leaflet + React-Leaflet
- **HTTP Client:** Axios

### Mobile (Flutter)

- **Framework:** Flutter 3.x
- **State Management:** Provider/Riverpod
- **Maps:** Google Maps Flutter
- **Storage:** SharedPreferences

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** (for frontend)
- **MongoDB** (local or Atlas account)
- **Google Cloud account** (for file storage)
- **Gmail account** (for email notifications)

### 1. Start Backend Server

```cmd
cd backend
sih\Scripts\activate
cd sih
python main.py
```

✅ Backend will run at: http://localhost:8000  
📖 API docs: http://localhost:8000/docs

**First time?** Follow the [comprehensive setup guide](backend/GETTING_STARTED.md)

### 2. Start Frontend Development Server

```cmd
cd frontend
npm install
npm run dev
```

✅ Frontend will run at: http://localhost:3000

### 3. Run Tests

```cmd
cd backend
python test_api.py
```

✅ Expected: All 8 scenarios passing (100%)

---

## 📁 Project Structure

```
sih2025/
│
├── backend/                      # Python FastAPI backend
│   ├── sih/                      # Virtual environment & app code
│   │   ├── app/
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── utils/           # Helper functions
│   │   │   ├── config.py        # Configuration
│   │   │   ├── database.py      # MongoDB connection
│   │   │   └── schemas.py       # Pydantic models
│   │   └── main.py              # Application entry point
│   │
│   ├── test_api.py              # Comprehensive test suite
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (not in git)
│   │
│   └── 📖 Documentation:
│       ├── GETTING_STARTED.md   # Setup guide
│       ├── README.md            # Backend overview
│       ├── API_REFERENCE.md     # API documentation
│       └── COMPLETE_TEST_RESULTS.md
│
├── frontend/                     # Next.js React frontend
│   ├── src/
│   │   ├── app/                 # Next.js app router pages
│   │   ├── components/          # React components
│   │   ├── store/               # Redux store
│   │   └── lib/                 # Utilities
│   │
│   ├── public/                  # Static assets
│   ├── package.json             # Node dependencies
│   └── README.md                # Frontend docs
│
├── flutter_application/          # Flutter mobile app
│   ├── lib/                     # Flutter source code
│   ├── android/                 # Android config
│   ├── ios/                     # iOS config
│   ├── pubspec.yaml             # Flutter dependencies
│   └── README.md                # Mobile docs
│
├── test_media/                   # Test files for uploads
│   ├── images/
│   ├── audio/
│   └── videos/
│
└── 📖 Root Documentation:
    ├── QUICK_START.md           # Quick reference guide
    ├── QUICK_TESTING_GUIDE.md   # Testing instructions
    └── .gitignore               # Git ignore rules
```

---

## 🧪 Testing

### Backend Test Suite

The backend includes a comprehensive test suite covering all functionality:

```cmd
cd backend
python test_api.py
```

**Test Scenarios:**

1. ✅ User Registration & Email Verification
2. ✅ Report Submission (Text + Image Upload)
3. ✅ Report Fetching (Geospatial Queries)
4. ✅ User Login (Email & Phone)
5. ✅ Alert Creation (Official Role)
6. ✅ Profile & Settings Updates
7. ✅ Activity Tracking
8. ✅ Reports Endpoint Comparison

**Current Status:** All 8 scenarios passing ✅ (100% success rate)

See [COMPLETE_TEST_RESULTS.md](backend/COMPLETE_TEST_RESULTS.md) for detailed results.

---

## 🔐 Environment Configuration

### Backend Environment Variables

Required in `backend/.env` and `backend/sih/.env`:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sih

# JWT Secrets
JWT_SECRET=your_secret_key_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_32_chars_minimum

# Email (Gmail with App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEYFILE={"type":"service_account",...}

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

**⚠️ Important:** `.env` files are excluded from git. Never commit credentials!

---

## 📊 API Endpoints Overview

### Authentication (9 endpoints)

- Register, login, logout
- Email verification
- Password reset
- Guest mode
- Token refresh

### Reports (5 endpoints)

- Create, read, update, delete
- Geospatial filtering
- User-specific reports

### Alerts (5 endpoints)

- Create, read, update, delete (officials only)
- Area-based geospatial queries

### User Profile (6 endpoints)

- Profile CRUD
- Settings management
- Activity tracking
- User statistics

### File Uploads (3 endpoints)

- Signed URL generation
- File verification
- URL refresh

### Map Data (2 endpoints)

- Combined reports + alerts
- Geospatial data for visualization

**Total:** 30+ documented endpoints

See [API_REFERENCE.md](backend/API_REFERENCE.md) for complete documentation.

---

## 🗺️ Features in Detail

### Geospatial Queries

The system supports location-based queries using MongoDB's geospatial operators:

```javascript
// Find reports within 50km of a location
GET /api/reports?lat=19.076&lng=72.8777&radius=50000

// Find active alerts affecting an area
GET /api/alerts?lat=19.076&lng=72.8777&radius=100000&isActive=true
```

**Implementation:**

- Uses `$geoWithin` with `$centerSphere` for radius searches
- 2dsphere indexes on `location` and `affectedArea` fields
- Supports custom sorting (by date, severity, etc.)

### File Upload System

Secure file uploads via signed URLs:

1. Client requests signed URL from backend
2. Backend generates GCS signed URL (valid for 1 hour)
3. Client uploads directly to Google Cloud Storage
4. File URL stored in database with expiration tracking
5. Download URLs auto-refresh when expired

**Supported file types:**

- Images: JPEG, PNG, WebP
- Videos: MP4, MOV, AVI
- Audio: MP3, WAV, M4A

### Voice Report Processing

AI-powered voice report analysis:

1. User records audio message
2. Uploaded to Google Cloud Storage
3. Gemini AI transcribes audio to text
4. AI analyzes content for:
   - Hazard type detection
   - Severity assessment
   - Location extraction
   - Urgency level
   - Sentiment analysis
5. Structured report created automatically

---

## 🔄 Development Workflow

1. **Start backend:**

   ```cmd
   cd backend
   sih\Scripts\activate
   cd sih
   python main.py
   ```

2. **Start frontend:**

   ```cmd
   cd frontend
   npm run dev
   ```

3. **Make changes** - Server auto-reloads on file changes

4. **Test changes:**
   - Use Swagger UI: http://localhost:8000/docs
   - Test from frontend: http://localhost:3000
   - Run test suite: `python backend/test_api.py`

### Before Committing

1. **Run tests:**

   ```cmd
   cd backend
   python test_api.py
   ```

2. **Check for errors:**

   - Review `backend/logs/error.log`
   - Check console for warnings

3. **Update documentation** if API changed

4. **Commit with descriptive message:**
   ```cmd
   git add .
   git commit -m "feat: description of changes"
   git push
   ```

---

## 🐛 Common Issues & Solutions

### Issue: Port already in use

```cmd
# Kill process on port 8000 (backend)
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Kill process on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Issue: MongoDB connection failed

1. Check `MONGODB_URI` in `.env` file
2. Verify IP is whitelisted (MongoDB Atlas)
3. Test connection: `python backend/check_geo.py`

### Issue: Module not found (Python)

```cmd
cd backend
sih\Scripts\activate
pip install -r requirements.txt
```

### Issue: Module not found (Node.js)

```cmd
cd frontend
npm install
```

### Issue: Email not sending

1. Enable 2-Step Verification on Gmail
2. Generate App Password (16 characters)
3. Update `EMAIL_PASS` in `.env`
4. Restart backend server

### Issue: File upload failing

1. Verify GCS credentials in `.env`
2. Check bucket permissions
3. Test with: `python backend/verify_gcs_simple.py`

**More troubleshooting:** [backend/GETTING_STARTED.md#troubleshooting](backend/GETTING_STARTED.md#troubleshooting)

---

## 📈 Project Status

### ✅ Completed Features

- [x] Complete authentication system
- [x] JWT token management
- [x] Email verification
- [x] Password reset flow
- [x] Guest mode
- [x] Report CRUD operations
- [x] Alert system (officials)
- [x] Geospatial queries
- [x] File upload (images, audio, video)
- [x] User profile & settings
- [x] Activity tracking
- [x] AI voice report processing
- [x] Comprehensive test suite
- [x] API documentation
- [x] Database indexes optimization

### 🚧 In Progress

- [ ] Frontend-backend integration
- [ ] Real-time notifications
- [ ] Advanced map visualization
- [ ] Mobile app development

### 📋 Planned Features

- [ ] WebSocket support for real-time updates
- [ ] Push notifications (web & mobile)
- [ ] Analytics dashboard
- [ ] Admin panel
- [ ] Report comments & discussions
- [ ] Social sharing
- [ ] Multi-language support

---

## 📄 License

This project is developed as part of Smart India Hackathon 2025.

---

## 📞 Support

For help and support:

1. **Check documentation:**

   - [Quick Start Guide](QUICK_START.md)
   - [Backend Setup Guide](backend/GETTING_STARTED.md)
   - [API Reference](backend/API_REFERENCE.md)

2. **Review test results:**

   - [Complete Test Results](backend/COMPLETE_TEST_RESULTS.md)

3. **Check logs:**

   - `backend/logs/error.log`
   - `backend/logs/request.log`

4. **Test interactively:**
   - http://localhost:8000/docs

---

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Google Cloud Storage Python](https://cloud.google.com/python/docs/reference/storage/latest)

---

**Project Status:** ✅ Backend Complete | 🚧 Frontend In Progress  
**Last Updated:** 2025-01-28  
**Version:** 1.0.0

---

Made with ❤️ for Smart India Hackathon 2025
