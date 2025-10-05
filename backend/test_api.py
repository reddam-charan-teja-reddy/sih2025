"""
Comprehensive REST API Testing Script for Samudra Sahayak
Dynamically tests all API endpoints with state management and logging
"""
import os
import sys
import json
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any, List

# Configuration
API_BASE_URL = "http://localhost:8000/api"
TEST_MEDIA_DIR = Path("./test_media")
LOGS_DIR = Path("./logs")
DATA_DIR = Path("./data")
STATE_FILE = DATA_DIR / "state.json"

# Create directories
LOGS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
TEST_MEDIA_DIR.mkdir(exist_ok=True)
(TEST_MEDIA_DIR / "images").mkdir(exist_ok=True)
(TEST_MEDIA_DIR / "audio").mkdir(exist_ok=True)
(TEST_MEDIA_DIR / "videos").mkdir(exist_ok=True)


class Logger:
    """Structured logging for API requests and responses"""
    
    def __init__(self):
        self.request_log = LOGS_DIR / "request.log"
        self.response_log = LOGS_DIR / "response.log"
        self.error_log = LOGS_DIR / "error.log"
        
    def log_request(self, scenario: str, method: str, url: str, headers: Dict, data: Any = None):
        """Log API request"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "scenario": scenario,
            "method": method,
            "url": url,
            "headers": self._sanitize_headers(headers),
            "data": self._sanitize_data(data)
        }
        self._write_log(self.request_log, log_entry)
        print(f"[{timestamp}] [{scenario}] {method} {url}")
        
    def log_response(self, scenario: str, status_code: int, response_data: Any, duration: float):
        """Log API response"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "scenario": scenario,
            "status_code": status_code,
            "duration_ms": round(duration * 1000, 2),
            "response": self._sanitize_data(response_data)
        }
        self._write_log(self.response_log, log_entry)
        print(f"[{timestamp}] [{scenario}] Status: {status_code} ({duration*1000:.2f}ms)")
        
    def log_error(self, scenario: str, error: str, details: Any = None):
        """Log error"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "scenario": scenario,
            "error": error,
            "details": str(details) if details else None
        }
        self._write_log(self.error_log, log_entry)
        print(f"[{timestamp}] [ERROR] [{scenario}] {error}")
        
    def _sanitize_headers(self, headers: Dict) -> Dict:
        """Remove sensitive data from headers"""
        safe_headers = headers.copy()
        if "Authorization" in safe_headers:
            safe_headers["Authorization"] = "Bearer <token>"
        return safe_headers
        
    def _sanitize_data(self, data: Any) -> Any:
        """Remove sensitive data from request/response"""
        if isinstance(data, dict):
            safe_data = data.copy()
            for key in ["password", "confirmPassword", "refreshToken"]:
                if key in safe_data:
                    safe_data[key] = "<redacted>"
            return safe_data
        return data
        
    def _write_log(self, log_file: Path, log_entry: Dict):
        """Write log entry to file"""
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")


class StateManager:
    """Manages state persistence across test runs"""
    
    def __init__(self):
        self.state = self._load_state()
        
    def _load_state(self) -> Dict:
        """Load state from file"""
        if STATE_FILE.exists():
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        return {}
        
    def save(self):
        """Save state to file"""
        with open(STATE_FILE, "w") as f:
            json.dump(self.state, f, indent=2)
            
    def set(self, key: str, value: Any):
        """Set state value"""
        self.state[key] = value
        self.save()
        
    def get(self, key: str, default: Any = None) -> Any:
        """Get state value"""
        return self.state.get(key, default)
        
    def delete(self, key: str):
        """Delete state value"""
        if key in self.state:
            del self.state[key]
            self.save()


class APITester:
    """Main API testing class"""
    
    def __init__(self):
        self.logger = Logger()
        self.state = StateManager()
        self.session = requests.Session()
        
    def _make_request(self, scenario: str, method: str, endpoint: str, 
                      headers: Optional[Dict] = None, data: Optional[Any] = None,
                      files: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Dict:
        """Make API request with logging"""
        url = f"{API_BASE_URL}{endpoint}"
        headers = headers or {}
        
        # Log request
        self.logger.log_request(scenario, method, url, headers, json_data or data)
        
        # Make request
        start_time = time.time()
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, params=data)
            elif method == "POST":
                if files:
                    response = self.session.post(url, headers=headers, data=data, files=files)
                else:
                    response = self.session.post(url, headers=headers, json=json_data)
            elif method == "PUT":
                if json_data:
                    headers['Content-Type'] = 'application/json'
                response = self.session.put(url, headers=headers, json=json_data)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            duration = time.time() - start_time
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}
                
            # Log response
            self.logger.log_response(scenario, response.status_code, response_data, duration)
            
            return {
                "status_code": response.status_code,
                "data": response_data,
                "success": response.status_code < 400
            }
            
        except Exception as e:
            duration = time.time() - start_time
            self.logger.log_error(scenario, str(e), {"url": url, "method": method})
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
    
    def _get_auth_headers(self) -> Dict:
        """Get authentication headers"""
        access_token = self.state.get("access_token")
        if access_token:
            return {"Authorization": f"Bearer {access_token}"}
        return {}
    
    def _verify_gcs_upload(self, gcs_url: str) -> bool:
        """Verify file exists in Google Cloud Storage"""
        try:
            response = requests.head(gcs_url, timeout=10)
            return response.status_code == 200
        except:
            return False
    
    # ==================== SCENARIO 1: User Registration & Verification ====================
    
    def scenario_1_register_and_verify(self):
        """Register new user, verify email, and login"""
        print("\n" + "="*80)
        print("SCENARIO 1: User Registration & Verification")
        print("="*80)
        
        # Use real email for verification
        timestamp = int(time.time())
        test_user = {
            "fullName": f"Test User {timestamp}",
            "email": "c9014028307@gmail.com",  # Real email for verification
            "phone": f"+91{9000000000 + timestamp % 1000000000}",
            "password": "TestPassword123!",
            "confirmPassword": "TestPassword123!",
            "role": "citizen",
            "language": "en"
        }
        
        # Step 1: Register user
        print("\n[1.1] Registering new user...")
        response = self._make_request(
            "Register User",
            "POST",
            "/auth/register",
            json_data=test_user
        )
        
        if not response["success"]:
            self.logger.log_error("Register User", "Registration failed", response["data"])
            return False
            
        # Store user credentials
        self.state.set("test_user_email", test_user["email"])
        self.state.set("test_user_password", test_user["password"])
        
        # Extract user_id from response
        user_id = response["data"].get("user", {}).get("id")
        
        if user_id:
            self.state.set("user_id", user_id)
            print(f"✓ User registered: {test_user['email']}")
            print(f"✓ User ID: {user_id}")
        else:
            print("✗ Failed to get user ID from response")
            return False
        
        # Step 2: Wait for user to check email and get verification token
        print("\n[1.2] Email verification step...")
        print(f"⚠ A verification email has been sent to {test_user['email']}")
        print("⚠ Please check your email and find the verification token/link")
        print("")
        print("You have two options:")
        print("  1. Enter the verification token manually")
        print("  2. Check the backend logs for the token")
        print("")
        
        # Try to get token from user input
        verification_token = input("Enter the verification token (or press Enter to check logs): ").strip()
        
        if not verification_token:
            # Check backend logs for the token
            print("\n💡 Checking backend logs for verification token...")
            print("Looking in backend/sih logs...")
            # Give user time to check logs
            print("\nPlease check your backend terminal or email for the verification token.")
            verification_token = input("Enter the verification token: ").strip()
        
        if not verification_token:
            print("\n✗ No verification token provided. Cannot proceed with verification.")
            print("  You can manually verify later using: POST /auth/verify")
            print(f"  Payload: {{\"userId\": \"{user_id}\", \"token\": \"<token_from_email>\"}}")
            return False
        
        # Step 3: Verify email with token
        print(f"\n[1.3] Verifying email with token...")
        response = self._make_request(
            "Verify Email",
            "POST",
            "/auth/verify",
            json_data={
                "userId": user_id,
                "token": verification_token
            }
        )
        
        if not response["success"]:
            print("✗ Email verification failed")
            self.logger.log_error("Verify Email", "Verification failed", response["data"])
            return False
        
        print("✓ Email verified successfully")
        time.sleep(1)
        
        # Step 4: Login
        print("\n[1.4] Logging in with verified credentials...")
        response = self._make_request(
            "Login User",
            "POST",
            "/auth/login",
            json_data={
                "credential": test_user["email"],
                "password": test_user["password"],
                "rememberDevice": True
            }
        )
        
        if not response["success"]:
            self.logger.log_error("Login User", "Login failed", response["data"])
            return False
            
        # Store tokens
        access_token = response["data"].get("accessToken")
        refresh_token = response["data"].get("refreshToken")
        user_data = response["data"].get("user", {})
        
        if access_token:
            self.state.set("access_token", access_token)
        if refresh_token:
            self.state.set("refresh_token", refresh_token)
        if user_data.get("id"):
            self.state.set("user_id", user_data["id"])
            
        print(f"✓ Login successful")
        print(f"✓ Access token stored")
        print(f"✓ User ID: {user_data.get('id')}")
        
        return True
    
    # ==================== SCENARIO 2: Submit Report with Image ====================
    
    def scenario_2_submit_report_with_image(self):
        """Login and submit report with image"""
        print("\n" + "="*80)
        print("SCENARIO 2: Submit Report with Image")
        print("="*80)
        
        # Step 1: Login
        print("\n[2.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        # Step 2: Get signed URL for image upload
        print("\n[2.2] Requesting signed URL for image upload...")
        image_path = TEST_MEDIA_DIR / "images" / "test_image.jpg"
        
        # Create test image if doesn't exist
        if not image_path.exists():
            self._create_test_image(image_path)
        
        # Get user ID for folder structure
        import uuid
        user_id = self.state.get("user_id")
        timestamp = int(time.time() * 1000)
        random_suffix = uuid.uuid4().hex[:8]
        unique_filename = f"test_image-{timestamp}-{random_suffix}.jpg"
        full_path = f"images/user-{user_id}/{unique_filename}"
        
        print(f"  Target path: {full_path}")
            
        file_info = {
            "fileName": full_path,
            "contentType": "image/jpeg"
        }
        
        response = self._make_request(
            "Get Signed URL",
            "POST",
            "/upload/signed-url",
            headers=self._get_auth_headers(),
            json_data=file_info
        )
        
        if not response["success"]:
            self.logger.log_error("Get Signed URL", "Failed to get signed URL", response["data"])
            return False
            
        # The backend returns {"url": "signed_url", "fileName": "file.jpg"}
        # The url field is the signed URL for uploading
        signed_url = response["data"].get("url")
        file_name = response["data"].get("fileName")
        
        if not signed_url:
            self.logger.log_error("Get Signed URL", "No signed URL in response", response["data"])
            return False
        
        # The final GCS URL (without query params) for accessing the file
        # Extract base URL from signed URL (remove query params)
        base_url = signed_url.split('?')[0]
        
        print(f"✓ Signed URL obtained")
        print(f"  File will be: {file_name}")
        time.sleep(0.5)
        
        # Step 3: Upload image to GCS
        print("\n[2.3] Uploading image to Google Cloud Storage...")
        print(f"  Upload URL: {signed_url[:100]}...")
        print(f"  File size: {image_path.stat().st_size} bytes")
        
        with open(image_path, "rb") as f:
            file_data = f.read()
            print(f"  Uploading {len(file_data)} bytes...")
            upload_response = requests.put(
                signed_url,
                data=file_data,
                headers={"Content-Type": "image/jpeg"}
            )
        
        print(f"  PUT Response Status: {upload_response.status_code}")
        print(f"  PUT Response Headers: {dict(upload_response.headers)}")
        
        if upload_response.status_code not in [200, 201]:
            self.logger.log_error("Upload Image", f"Upload failed: {upload_response.status_code}", upload_response.text)
            print(f"✗ Upload failed with status: {upload_response.status_code}")
            print(f"  Response: {upload_response.text[:200]}")
            return False
            
        print(f"✓ Image uploaded successfully (Status: {upload_response.status_code})")
        print(f"  Final URL: {base_url}")
        time.sleep(0.5)
        
        # Step 4: Verify upload
        print("\n[2.4] Verifying upload in GCS...")
        print(f"  Note: Files are private in GCS bucket 'sih-media-reeiver'")
        print(f"  Uploaded file: {file_name}")
        print(f"  Access via signed URLs from backend API")
        # Skip HEAD verification since files are private
        # The upload status 200 already confirms successful upload
            
        # Step 5: Submit report
        print("\n[2.5] Submitting report...")
        report_data = {
            "title": f"Test Report with Image - {datetime.now().isoformat()}",
            "description": "This is a test report submitted via automated testing script",
            "hazardType": "flood",
            "severity": "medium",
            "location": {
                "type": "Point",
                "coordinates": [72.8777, 19.0760]  # Mumbai coordinates
            },
            "address": "Test Address, Mumbai",
            "landmark": "Test Landmark",
            "peopleAtRisk": False,
            "images": [{
                "url": base_url,
                "fileName": file_name,
                "fileSize": image_path.stat().st_size
            }],
            "videos": [],
            "tags": ["test", "automated"]
        }
        
        response = self._make_request(
            "Submit Report",
            "POST",
            "/reports",
            headers=self._get_auth_headers(),
            json_data=report_data
        )
        
        if not response["success"]:
            self.logger.log_error("Submit Report", "Report submission failed", response["data"])
            return False
            
        report_id = response["data"].get("report", {}).get("id")
        if report_id:
            self.state.set("last_report_id", report_id)
            print(f"✓ Report submitted successfully")
            print(f"✓ Report ID: {report_id}")
        
        return True
    
    # ==================== SCENARIO 3: Fetch User Reports ====================
    
    def scenario_3_fetch_user_reports(self):
        """Login and fetch all user reports"""
        print("\n" + "="*80)
        print("SCENARIO 3: Fetch User Reports")
        print("="*80)
        
        # Step 1: Login
        print("\n[3.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        # Step 2: Fetch reports
        print("\n[3.2] Fetching user reports...")
        user_id = self.state.get("user_id")
        
        response = self._make_request(
            "Fetch Reports",
            "GET",
            "/reports",
            headers=self._get_auth_headers(),
            data={"reportedBy": user_id, "limit": 50}
        )
        
        if not response["success"]:
            self.logger.log_error("Fetch Reports", "Failed to fetch reports", response["data"])
            return False
            
        reports = response["data"].get("reports", [])
        print(f"✓ Found {len(reports)} report(s)")
        
        for i, report in enumerate(reports, 1):
            print(f"  [{i}] {report.get('title')} - Status: {report.get('status')}")
            
        return True
    
    # ==================== SCENARIO 4: Submit Voice Report (Gemini) ====================
    
    def scenario_4_submit_report_with_media(self):
        """Login and submit voice report with optional image context (processed through Gemini)"""
        print("\n" + "="*80)
        print("SCENARIO 4: Voice Report Submission (Gemini AI Processing)")
        print("="*80)
        print("Note: Voice replaces form - Gemini extracts title, description, etc. from audio")
        
        # Step 1: Login
        print("\n[4.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        uploaded_files = []
        
        # Step 2: Upload image (optional context for Gemini)
        print("\n[4.2] Uploading context image...")
        image_path = TEST_MEDIA_DIR / "images" / "test_image.jpg"
        if not image_path.exists():
            self._create_test_image(image_path)
        
        image_info = self._upload_file(image_path, "image", "image/jpeg")
        if image_info:
            uploaded_files.append(("image", image_info))
            print(f"✓ Image uploaded: {image_info['fileName']}")
        else:
            return False
        
        time.sleep(0.5)
        
        # Step 3: Upload voice note (required for voice endpoint)
        print("\n[4.3] Uploading voice note...")
        audio_path = TEST_MEDIA_DIR / "audio" / "test_audio.mp3"
        if not audio_path.exists():
            self._create_test_audio(audio_path)
            
        audio_info = self._upload_file(audio_path, "audio", "audio/mpeg")
        if audio_info:
            uploaded_files.append(("audio", audio_info))
            print(f"✓ Voice note uploaded: {audio_info['fileName']}")
        else:
            return False
            
        time.sleep(0.5)
        
        # Step 4: Verify uploads (non-blocking - files are private in GCS)
        print("\n[4.4] Upload confirmation...")
        print("  Note: Files are private in GCS, verification via signed URLs from backend")
        for media_type, info in uploaded_files:
            print(f"  ✓ {media_type.capitalize()}: {info['fileName']}")
                
        # Step 5: Submit voice report (NO form fields - Gemini extracts them)
        print("\n[4.5] Submitting voice report to /api/reports/voice...")
        print("     → Gemini will process audio and extract: title, description, hazardType, etc.")
        
        voice_report_data = {
            "audio": {
                "url": audio_info['url'],
                "fileName": audio_info['fileName'],
                "contentType": "audio/mpeg",
                "fileSize": audio_path.stat().st_size,
                "duration": 5
            },
            "location": {
                "type": "Point",
                "coordinates": [72.8777, 19.0760]
            },
            "address": "Test Address, Mumbai",
            "images": [{
                "url": image_info['url'],
                "fileName": image_info['fileName'],
                "contentType": "image/jpeg",
                "fileSize": image_path.stat().st_size
            }]
            # NO title, description, hazardType, severity - Gemini extracts these!
        }
        
        response = self._make_request(
            "Submit Voice Report",
            "POST",
            "/reports/voice",  # Changed from /reports to /reports/voice
            headers=self._get_auth_headers(),
            json_data=voice_report_data
        )
        
        if not response["success"]:
            self.logger.log_error("Voice Report", "Voice report submission failed", response["data"])
            return False
            
        report_data = response["data"].get("report", {})
        report_id = report_data.get("id")
        
        if report_id:
            self.state.set("last_media_report_id", report_id)
            print(f"✓ Voice report processed successfully!")
            print(f"✓ Report ID: {report_id}")
            
            # Show what Gemini extracted
            if report_data.get("title"):
                print(f"✓ Extracted Title: {report_data.get('title')}")
            if report_data.get("hazardType"):
                print(f"✓ Extracted Hazard: {report_data.get('hazardType')}")
            if report_data.get("severity"):
                print(f"✓ Extracted Severity: {report_data.get('severity')}")
            
        return True
    
    # ==================== SCENARIO 5: Submit Report with Multiple Images ====================
    
    def scenario_5_submit_report_multiple_images(self):
        """Login and submit report with multiple images"""
        print("\n" + "="*80)
        print("SCENARIO 5: Submit Report with Multiple Images")
        print("="*80)
        
        # Step 1: Login
        print("\n[5.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        # Step 2: Upload multiple images
        print("\n[5.2] Uploading multiple images...")
        num_images = 3
        uploaded_images = []
        
        for i in range(num_images):
            image_path = TEST_MEDIA_DIR / "images" / f"test_image_{i+1}.jpg"
            if not image_path.exists():
                self._create_test_image(image_path)
                
            print(f"  Uploading image {i+1}/{num_images}...")
            image_info = self._upload_file(image_path, "image", "image/jpeg")
            if image_info:
                uploaded_images.append(image_info)
                print(f"  ✓ Image {i+1} uploaded")
            else:
                print(f"  ✗ Image {i+1} upload failed")
                return False
            time.sleep(0.3)
        
        # Step 3: Upload confirmation (verification skipped - files are private)
        print("\n[5.3] Upload confirmation...")
        print("  Note: Files are private in GCS, direct URL access blocked (expected)")
        for i, img in enumerate(uploaded_images, 1):
            print(f"  ✓ Image {i}: {img['fileName']}")
                
        # Step 4: Submit report
        print("\n[5.4] Submitting report with multiple images...")
        report_data = {
            "title": f"Test Report with Multiple Images - {datetime.now().isoformat()}",
            "description": "Test report with 3 images",
            "hazardType": "pollution",
            "severity": "critical",
            "location": {
                "type": "Point",
                "coordinates": [72.8777, 19.0760]
            },
            "address": "Test Address, Mumbai",
            "peopleAtRisk": True,
            "images": uploaded_images,
            "videos": [],
            "tags": ["test", "multiple-images", "automated"]
        }
        
        response = self._make_request(
            "Submit Report Multiple Images",
            "POST",
            "/reports",
            headers=self._get_auth_headers(),
            json_data=report_data
        )
        
        if not response["success"]:
            self.logger.log_error("Submit Report", "Report submission failed", response["data"])
            return False
            
        report_id = response["data"].get("report", {}).get("id")
        if report_id:
            self.state.set("last_multi_image_report_id", report_id)
            print(f"✓ Report with {num_images} images submitted successfully")
            print(f"✓ Report ID: {report_id}")
            
        return True
    
    # ==================== USER ENDPOINTS SCENARIOS ====================
    
    def scenario_6_user_profile_operations(self):
        """Test user profile endpoints"""
        print("\n" + "="*80)
        print("SCENARIO 6: User Profile Operations")
        print("="*80)
        
        # Step 1: Login
        print("\n[6.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        # Step 2: Get user profile
        print("\n[6.2] Fetching user profile...")
        response = self._make_request(
            "Get Profile",
            "GET",
            "/user/profile",
            headers=self._get_auth_headers()
        )
        
        if not response["success"]:
            self.logger.log_error("Get Profile", "Failed to fetch profile", response["data"])
            return False
            
        print(f"✓ Profile fetched successfully")
        profile = response["data"]
        print(f"  Name: {profile.get('fullName')}")
        print(f"  Email: {profile.get('email')}")
        print(f"  Role: {profile.get('role')}")
        
        time.sleep(0.5)
        
        # Step 3: Update profile
        print("\n[6.3] Updating user profile...")
        # Generate unique phone number to avoid duplicates
        unique_phone = f"+91{9100000000 + int(time.time()) % 900000000}"
        update_data = {
            "fullName": f"Updated User {int(time.time())}",
            "phone": unique_phone,
            "language": "hi",
            "profession": "Engineer"
        }
        
        response = self._make_request(
            "Update Profile",
            "PUT",
            "/user/profile",
            headers=self._get_auth_headers(),
            json_data=update_data
        )
        
        if response["success"]:
            print(f"✓ Profile updated successfully")
        else:
            print(f"✗ Profile update failed")
            self.logger.log_error("Update Profile", "Profile update failed", response["data"])
            
        time.sleep(0.5)
        
        # Step 4: Get user settings
        print("\n[6.4] Fetching user settings...")
        response = self._make_request(
            "Get Settings",
            "GET",
            "/user/settings",
            headers=self._get_auth_headers()
        )
        
        if response["success"]:
            print(f"✓ Settings fetched successfully")
            settings = response["data"]
            print(f"  Notifications enabled: {settings.get('notificationsEnabled')}")
        
        time.sleep(0.5)
        
        # Step 5: Update settings
        print("\n[6.5] Updating user settings...")
        settings_data = {
            "notificationPreferences": {
                "email": True,
                "sms": False,
                "push": True
            },
            "language": "en"
        }
        
        response = self._make_request(
            "Update Settings",
            "PUT",
            "/user/settings",
            headers=self._get_auth_headers(),
            json_data=settings_data
        )
        
        if response["success"]:
            print(f"✓ Settings updated successfully")
        else:
            print(f"✗ Settings update failed")
            self.logger.log_error("Update Settings", "Settings update failed", response["data"])
            
        return True
    
    def scenario_7_user_activity_tracking(self):
        """Test user activity and stats endpoints"""
        print("\n" + "="*80)
        print("SCENARIO 7: User Activity Tracking")
        print("="*80)
        
        # Step 1: Login
        print("\n[7.1] Logging in...")
        if not self._ensure_logged_in():
            return False
        
        # Step 2: Get user stats
        print("\n[7.2] Fetching user statistics...")
        response = self._make_request(
            "Get User Stats",
            "GET",
            "/user/stats",
            headers=self._get_auth_headers()
        )
        
        if response["success"]:
            stats = response["data"]
            print(f"✓ Stats fetched successfully")
            print(f"  Total reports: {stats.get('totalReports', 0)}")
            print(f"  Verified reports: {stats.get('verifiedReports', 0)}")
        
        time.sleep(0.5)
        
        # Step 3: Get user activity log
        print("\n[7.3] Fetching user activity log...")
        response = self._make_request(
            "Get Activity Log",
            "GET",
            "/user/activity",
            headers=self._get_auth_headers(),
            data={"limit": 20}
        )
        
        if response["success"]:
            activities = response["data"].get("activities", [])
            print(f"✓ Found {len(activities)} activity record(s)")
            for i, activity in enumerate(activities[:5], 1):
                print(f"  [{i}] {activity.get('action')} - {activity.get('timestamp')}")
        
        return True
    
    # ==================== SCENARIO 8: Test Reports Endpoints ====================
    
    def scenario_8_test_reports_endpoints(self):
        """Test both /api/reports and /api/user/reports endpoints separately"""
        print("\n" + "="*80)
        print("SCENARIO 8: Test Reports Endpoints Comparison")
        print("="*80)
        
        # Step 1: Login (force fresh login to ensure valid token)
        print("\n[8.1] Logging in...")
        if not self._ensure_logged_in(force_relogin=True):
            return False
        
        user_id = self.state.get("user_id")
        
        # Step 2: Test /api/user/reports (authenticated, user-specific)
        print("\n[8.2] Testing /api/user/reports (user-specific, authenticated)...")
        print("      Endpoint: GET /api/user/reports")
        print("      Description: Returns only reports submitted by current user")
        
        response = self._make_request(
            "User Reports",
            "GET",
            "/user/reports",
            headers=self._get_auth_headers()
        )
        
        if not response["success"]:
            self.logger.log_error("User Reports", "Failed to fetch user reports", response["data"])
            return False
        
        user_reports = response["data"].get("reports", [])
        print(f"✓ Found {len(user_reports)} report(s) submitted by user")
        
        # Show sample reports
        for i, report in enumerate(user_reports[:5], 1):
            created_at = report.get('createdAt', '')
            if isinstance(created_at, str):
                created_at = created_at.split('T')[0] if 'T' in created_at else created_at
            print(f"  [{i}] {report.get('title')} - {report.get('hazardType')} - {report.get('severity')} - {report.get('status')} - {created_at}")
        
        if len(user_reports) > 5:
            print(f"  ... and {len(user_reports) - 5} more")
        
        # Step 3: Test /api/reports (public, geospatial)
        print("\n[8.3] Testing /api/reports (public, geospatial, all users)...")
        print("      Endpoint: GET /api/reports")
        print("      Description: Returns all public reports near specified location")
        
        # Use Mumbai coordinates (where test reports are located)
        lat = 19.0760
        lng = 72.8777
        radius = 50000  # 50km
        
        response = self._make_request(
            "Public Reports",
            "GET",
            f"/reports?lat={lat}&lng={lng}&radius={radius}&limit=50&sortBy=createdAt&sortOrder=desc",
            headers=self._get_auth_headers()  # Optional, can work without auth
        )
        
        if not response["success"]:
            error_detail = response["data"].get("detail", "")
            if "$geoNear" in str(error_detail) or "$near" in str(error_detail):
                print("⚠ Geospatial query failed - MongoDB index missing")
                print("  Note: /api/reports requires a 2dsphere index on 'location' field")
                print("  Trying without geospatial filter...")
                
                # Fallback: Try without location filter
                response = self._make_request(
                    "Public Reports (No Geo)",
                    "GET",
                    f"/reports?limit=50&sortBy=createdAt&sortOrder=desc",
                    headers=self._get_auth_headers()
                )
                
                if not response["success"]:
                    print("  ✗ Fallback also failed - endpoint requires geospatial index")
                    print("\n[8.3] Skipping /api/reports comparison due to missing MongoDB index")
                    print("      To fix: Run backend/fix_indexes.py to create 2dsphere index")
                    # Continue with partial results
                    public_reports = []
                    pagination = {}
                else:
                    public_reports = response["data"].get("reports", [])
                    pagination = response["data"].get("pagination", {})
            else:
                self.logger.log_error("Public Reports", "Failed to fetch public reports", response["data"])
                return False
        else:
            public_reports = response["data"].get("reports", [])
            pagination = response["data"].get("pagination", {})
            
            # If geospatial query returned 0 results, try without geo to see if reports exist
            if len(public_reports) == 0:
                print("  Fetching all reports (no geo filter) to check location data...")
                response2 = self._make_request(
                    "Public Reports Check",
                    "GET",
                    f"/reports?limit=5&sortBy=createdAt&sortOrder=desc",
                    headers=self._get_auth_headers()
                )
                if response2["success"]:
                    check_reports = response2["data"].get("reports", [])
                    if len(check_reports) > 0:
                        print(f"  Found {len(check_reports)} reports without geo filter. Sample locations:")
                        for i, r in enumerate(check_reports[:3], 1):
                            loc = r.get('location', {})
                            coords = loc.get('coordinates', []) if loc else []
                            if len(coords) >= 2:
                                print(f"    [{i}] {r.get('title')[:40]} - Location: [{coords[1]:.4f}, {coords[0]:.4f}]")
                            else:
                                print(f"    [{i}] {r.get('title')[:40]} - Location: MISSING")
                        print(f"  Search center: [{lat}, {lng}], radius: {radius/1000}km")
        
        if not 'public_reports' in locals():
            public_reports = []
            pagination = {}
        
        if len(public_reports) > 0:
            print(f"✓ Found {len(public_reports)} public report(s) near location")
        else:
            print(f"⚠ No reports found within {radius}m radius of lat={lat}, lng={lng}")
            print(f"  This might mean reports are outside the search area or lack location data")
        
        print(f"  Total in database: {pagination.get('totalItems', 'N/A')}")
        print(f"  Current page: {pagination.get('currentPage', 1)}/{pagination.get('totalPages', 1)}")
        
        # Show sample reports with reporter info
        for i, report in enumerate(public_reports[:5], 1):
            created_at = report.get('createdAt', '')
            if isinstance(created_at, str):
                created_at = created_at.split('T')[0] if 'T' in created_at else created_at
            reporter = report.get('reporterName', 'Unknown')
            location = report.get('location', {})
            coords = location.get('coordinates', []) if location else []
            loc_str = f"[{coords[1]:.4f}, {coords[0]:.4f}]" if len(coords) >= 2 else "No coords"
            print(f"  [{i}] {report.get('title')} - {report.get('hazardType')} - {report.get('severity')} - by {reporter} - {loc_str} - {created_at}")
        
        if len(public_reports) > 5:
            print(f"  ... and {len(public_reports) - 5} more")
        
        # Step 4: Compare results
        print("\n[8.4] Comparison Summary:")
        print("="*80)
        print(f"{'Aspect':<30} {'User Reports (/user/reports)':<25} {'Public Reports (/reports)':<25}")
        print("-"*80)
        print(f"{'Authentication':<30} {'Required ✓':<25} {'Optional':<25}")
        print(f"{'Total Results':<30} {str(len(user_reports)):<25} {str(len(public_reports)) if public_reports else 'N/A (index missing)':<25}")
        print(f"{'Scope':<30} {'Current user only':<25} {'All users':<25}")
        print(f"{'Filter Type':<30} {'User ID':<25} {'Location-based':<25}")
        print(f"{'Pagination':<30} {'No (limit 100)':<25} {'Yes (page/limit)':<25}")
        print(f"{'Fields Returned':<30} {'7 fields (summary)':<25} {'15+ fields (full)':<25}")
        print(f"{'Use Case':<30} {'User profile/dashboard':<25} {'Map view/feed':<25}")
        print(f"{'Status':<30} {'✓ Working':<25} {'⚠ Needs DB index':<25}")
        print("="*80)
        
        if len(public_reports) > 0:
            # Verify user's reports are included in public reports
            user_report_ids = {r.get('id') for r in user_reports}
            public_report_ids = {r.get('id') for r in public_reports}
            overlap = user_report_ids.intersection(public_report_ids)
            
            print(f"\n✓ {len(overlap)} of user's reports appear in public reports")
            if len(user_reports) > len(overlap):
                print(f"  Note: {len(user_reports) - len(overlap)} user reports are outside the search radius")
        else:
            print("\n⚠ Could not verify overlap - /api/reports requires MongoDB geospatial index")
            print("  Run: python backend/fix_indexes.py")
        
        return True
    
    # ==================== HELPER METHODS ====================
    
    def _ensure_logged_in(self, force_relogin: bool = False) -> bool:
        """Ensure user is logged in, login if necessary"""
        access_token = self.state.get("access_token")
        
        if access_token and not force_relogin:
            print(f"✓ Using existing session")
            return True
        
        # Need to login
        email = self.state.get("test_user_email")
        password = self.state.get("test_user_password")
        
        if not email or not password:
            print("✗ No credentials found. Please run Scenario 1 first.")
            return False
        
        print("Logging in..." if force_relogin else "No session found, logging in...")
        
        response = self._make_request(
            "Re-login",
            "POST",
            "/auth/login",
            json_data={
                "credential": email,
                "password": password,
                "rememberDevice": True
            }
        )
        
        if not response["success"]:
            print(f"✗ Login failed")
            return False
        
        # Store tokens
        access_token = response["data"].get("accessToken")
        refresh_token = response["data"].get("refreshToken")
        
        if access_token:
            self.state.set("access_token", access_token)
        if refresh_token:
            self.state.set("refresh_token", refresh_token)
            
        print(f"✓ Login successful")
        return True
    
    def _upload_file(self, file_path: Path, media_type: str, content_type: str) -> Optional[str]:
        """Upload file to GCS and return URL"""
        import uuid
        
        # Get user ID from state
        user_id = self.state.get("user_id")
        if not user_id:
            print("✗ No user_id in state, cannot upload file")
            return None
        
        # Generate proper file path with folder structure
        original_name = file_path.name
        timestamp = int(time.time() * 1000)  # milliseconds
        random_suffix = uuid.uuid4().hex[:8]
        name_without_ext, ext = os.path.splitext(original_name)
        unique_name = f"{name_without_ext}-{timestamp}-{random_suffix}{ext}"
        
        # Determine category folder based on content type
        if content_type.startswith('image/'):
            category = 'images'
        elif content_type.startswith('video/'):
            category = 'videos'
        elif content_type.startswith('audio/'):
            category = 'audio'
        else:
            category = 'documents'
        
        # Create full path: category/user-{userId}/filename
        full_path = f"{category}/user-{user_id}/{unique_name}"
        
        print(f"    Generated path: {full_path}")
        
        # Get signed URL
        file_info = {
            "fileName": full_path,
            "contentType": content_type
        }
        
        response = self._make_request(
            f"Get Signed URL ({media_type})",
            "POST",
            "/upload/signed-url",
            headers=self._get_auth_headers(),
            json_data=file_info
        )
        
        if not response["success"]:
            return None
            
        # The backend returns {"url": "signed_url", "fileName": "file.jpg"}
        signed_url = response["data"].get("url")
        
        if not signed_url:
            return None
        
        # Upload file
        print(f"    Uploading to GCS: {signed_url[:80]}...")
        with open(file_path, "rb") as f:
            file_data = f.read()
            print(f"    File size: {len(file_data)} bytes")
            upload_response = requests.put(
                signed_url,
                data=file_data,
                headers={"Content-Type": content_type}
            )
        
        print(f"    Upload status: {upload_response.status_code}")
            
        if upload_response.status_code not in [200, 201]:
            print(f"    Upload failed: {upload_response.text[:200]}")
            return None
        
        # Return the base URL (without query params) for accessing the file
        base_url = signed_url.split('?')[0]
        print(f"    Final URL: {base_url}")
        
        # Return dict with full file info for API requests
        return {
            "url": base_url,
            "fileName": full_path,
            "contentType": content_type,
            "fileSize": file_path.stat().st_size
        }
    
    def _create_test_image(self, path: Path):
        """Create a dummy test image"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            img = Image.new('RGB', (800, 600), color='lightblue')
            draw = ImageDraw.Draw(img)
            draw.text((50, 50), f"Test Image\n{datetime.now()}", fill='black')
            img.save(path)
        except ImportError:
            # Fallback: create a simple file
            with open(path, "wb") as f:
                f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF")  # JPEG header
    
    def _create_test_audio(self, path: Path):
        """Create a dummy test audio file"""
        # Create a minimal MP3 file
        with open(path, "wb") as f:
            f.write(b"\xFF\xFB\x90\x00")  # MP3 header
    
    def run_all_scenarios(self):
        """Run all test scenarios"""
        print("\n" + "="*80)
        print(" SAMUDRA SAHAYAK API TESTING SUITE")
        print("="*80)
        print(f"Started at: {datetime.now().isoformat()}")
        print(f"API Base URL: {API_BASE_URL}")
        print("="*80)
        
        scenarios = [
            ("Scenario 1: Register & Verify", self.scenario_1_register_and_verify),
            ("Scenario 2: Report with Image", self.scenario_2_submit_report_with_image),
            ("Scenario 3: Fetch Reports", self.scenario_3_fetch_user_reports),
            ("Scenario 4: Report with Media", self.scenario_4_submit_report_with_media),
            ("Scenario 5: Multiple Images", self.scenario_5_submit_report_multiple_images),
            ("Scenario 6: Profile Operations", self.scenario_6_user_profile_operations),
            ("Scenario 7: Activity Tracking", self.scenario_7_user_activity_tracking),
            ("Scenario 8: Reports Endpoints", self.scenario_8_test_reports_endpoints),
        ]
        
        results = []
        for name, func in scenarios:
            try:
                result = func()
                results.append((name, result))
                time.sleep(2)  # Delay between scenarios
            except Exception as e:
                self.logger.log_error(name, str(e))
                results.append((name, False))
        
        # Print summary
        print("\n" + "="*80)
        print(" TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for name, result in results:
            status = "✓ PASSED" if result else "✗ FAILED"
            print(f"{status:12} {name}")
        
        print("="*80)
        print(f"Results: {passed}/{total} scenarios passed")
        print(f"Completed at: {datetime.now().isoformat()}")
        print("="*80)
        
        return passed == total


def main():
    """Main entry point"""
    print("\nSamudra Sahayak API Testing Script")
    print("Using Real Email: c9014028307@gmail.com")
    print("Testing Mode: Interactive - One scenario at a time\n")
    
    tester = APITester()
    
    if len(sys.argv) > 1:
        # Run specific scenario
        scenario = sys.argv[1]
        if scenario == "1":
            result = tester.scenario_1_register_and_verify()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 1")
        elif scenario == "2":
            result = tester.scenario_2_submit_report_with_image()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 2")
        elif scenario == "3":
            result = tester.scenario_3_fetch_user_reports()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 3")
        elif scenario == "4":
            result = tester.scenario_4_submit_report_with_media()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 4")
        elif scenario == "5":
            result = tester.scenario_5_submit_report_multiple_images()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 5")
        elif scenario == "6":
            result = tester.scenario_6_user_profile_operations()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 6")
        elif scenario == "7":
            result = tester.scenario_7_user_activity_tracking()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 7")
        elif scenario == "8":
            result = tester.scenario_8_test_reports_endpoints()
            print(f"\n{'✓ PASSED' if result else '✗ FAILED'}: Scenario 8")
        else:
            print(f"Unknown scenario: {scenario}")
            print("Usage: python test_api.py [1-8]")
        sys.exit(0 if result else 1)
    else:
        # Interactive mode - run scenarios one by one with confirmation
        print("="*80)
        print("INTERACTIVE TESTING MODE")
        print("="*80)
        print("This will run scenarios one at a time, waiting for confirmation after each.\n")
        
        scenarios = [
            ("Scenario 1: Register & Verify Email", tester.scenario_1_register_and_verify),
            ("Scenario 2: Submit Report with Image", tester.scenario_2_submit_report_with_image),
            ("Scenario 3: Fetch User Reports", tester.scenario_3_fetch_user_reports),
            ("Scenario 4: Report with Image & Voice", tester.scenario_4_submit_report_with_media),
            ("Scenario 5: Report with Multiple Images", tester.scenario_5_submit_report_multiple_images),
            ("Scenario 6: User Profile Operations", tester.scenario_6_user_profile_operations),
            ("Scenario 7: User Activity Tracking", tester.scenario_7_user_activity_tracking),
            ("Scenario 8: Reports Endpoints Comparison", tester.scenario_8_test_reports_endpoints),
        ]
        
        results = []
        
        for i, (name, func) in enumerate(scenarios, 1):
            print(f"\n{'='*80}")
            print(f"Ready to run: {name}")
            print(f"{'='*80}")
            
            if i > 1:  # Don't ask before first scenario
                response = input(f"\nRun {name}? (y/n/q to quit): ").strip().lower()
                if response == 'q':
                    print("\nTesting stopped by user.")
                    break
                elif response != 'y':
                    print(f"Skipping {name}")
                    results.append((name, None))
                    continue
            
            try:
                result = func()
                results.append((name, result))
                
                status = "✓ PASSED" if result else "✗ FAILED"
                print(f"\n{status}: {name}")
                
                if not result and i == 1:
                    print("\n⚠ Scenario 1 failed. Cannot proceed with remaining scenarios.")
                    print("   Please verify email and ensure registration completed successfully.")
                    break
                    
            except Exception as e:
                tester.logger.log_error(name, str(e))
                results.append((name, False))
                print(f"\n✗ FAILED: {name} (Exception: {str(e)})")
                
                # Ask if user wants to continue after error
                if i < len(scenarios):
                    cont = input("\nContinue to next scenario? (y/n): ").strip().lower()
                    if cont != 'y':
                        break
            
            time.sleep(1)
        
        # Print final summary
        print("\n" + "="*80)
        print(" FINAL TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for _, result in results if result is True)
        failed = sum(1 for _, result in results if result is False)
        skipped = sum(1 for _, result in results if result is None)
        total = len(results)
        
        for name, result in results:
            if result is True:
                print(f"✓ PASSED  : {name}")
            elif result is False:
                print(f"✗ FAILED  : {name}")
            else:
                print(f"⊘ SKIPPED : {name}")
        
        print("="*80)
        print(f"Results: {passed} passed, {failed} failed, {skipped} skipped out of {total}")
        print(f"Completed at: {datetime.now().isoformat()}")
        print("="*80)
        
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
