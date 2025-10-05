# 🚀 Samudra Sahayak - Quick Start Guide

This is a quick reference for starting the project. For detailed setup instructions, see the individual folder documentation.

---

## Backend (FastAPI + Python)

### Start the Backend Server

```cmd
cd c:\sih2025\backend
sih\Scripts\activate
cd sih
python main.py
```

✅ **Backend running at:** http://localhost:8000  
📖 **API Docs:** http://localhost:8000/docs

**First time?** Read [backend/GETTING_STARTED.md](backend/GETTING_STARTED.md)

---

## Frontend (Next.js + React)

### Start the Frontend Development Server

```cmd
cd c:\sih2025\frontend
npm install
npm run dev
```

✅ **Frontend running at:** http://localhost:3000

**Note:** Frontend requires backend to be running on port 8000

---

## Testing

### Test Backend API

```cmd
cd c:\sih2025\backend
python test_api.py
```

**Expected:** All 8 scenarios should pass ✅

---

## Common Issues

### Issue: Port already in use

**Backend (port 8000):**

```cmd
netstat -ano | findstr :8000
taskkill /PID <process_id> /F
```

**Frontend (port 3000):**

```cmd
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Issue: Module not found

**Backend:**

```cmd
cd c:\sih2025\backend
sih\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**

```cmd
cd c:\sih2025\frontend
npm install
```

### Issue: MongoDB connection failed

Check `backend\.env` file:

- Verify `MONGODB_URI` is correct
- Ensure IP is whitelisted (for MongoDB Atlas)
- Test connection: `python backend\check_geo.py`

---

## Project Structure

```
sih2025/
├── backend/              # FastAPI Python backend
│   ├── GETTING_STARTED.md   # 📖 Detailed setup guide
│   ├── README.md            # Backend documentation
│   ├── test_api.py          # Comprehensive test suite
│   └── sih/                 # Virtual environment & app
│
├── frontend/             # Next.js React frontend
│   ├── README.md           # Frontend documentation
│   ├── src/                # Source code
│   └── package.json        # Dependencies
│
└── flutter_application/  # Flutter mobile app
    └── README.md           # Flutter documentation
```

---

## Useful URLs

| Service           | URL                        | Description            |
| ----------------- | -------------------------- | ---------------------- |
| Backend API       | http://localhost:8000      | REST API endpoints     |
| API Documentation | http://localhost:8000/docs | Interactive Swagger UI |
| Frontend App      | http://localhost:3000      | Web application        |

---

## Git Commands

### Restore frontend changes (undo modifications)

```cmd
git restore frontend/
```

### Commit backend changes only

```cmd
git add backend/ .gitignore
git commit -m "feat: Complete backend implementation with all endpoints"
git push
```

### Check what's changed

```cmd
git status
git diff
```

---

## Documentation

- **Backend Setup:** [backend/GETTING_STARTED.md](backend/GETTING_STARTED.md)
- **API Reference:** [backend/API_REFERENCE.md](backend/API_REFERENCE.md)
- **Test Results:** [backend/COMPLETE_TEST_RESULTS.md](backend/COMPLETE_TEST_RESULTS.md)
- **Frontend Setup:** [frontend/README.md](frontend/README.md)

---

## Quick Health Check

### Backend Health

```cmd
curl http://localhost:8000/
```

Expected response:

```json
{
  "message": "Samudra Sahayak Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

### Test User Registration

```cmd
curl -X POST "http://localhost:8000/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test123!\",\"confirmPassword\":\"Test123!\",\"role\":\"citizen\"}"
```

---

## Need Help?

1. **Check logs:** `backend/logs/error.log`
2. **Read troubleshooting:** [backend/GETTING_STARTED.md#troubleshooting](backend/GETTING_STARTED.md#troubleshooting)
3. **Test API interactively:** http://localhost:8000/docs
4. **Run test suite:** `python backend/test_api.py`

---

**Status:** ✅ Backend Ready | ⏳ Frontend Pending Integration  
**Last Updated:** 2025-01-28
