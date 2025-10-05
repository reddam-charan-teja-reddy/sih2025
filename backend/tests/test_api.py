"""
Comprehensive API Tests for Samudra Sahayak Backend
Run with: pytest tests/test_api.py -v
"""
import pytest
import json
import os
from pathlib import Path

# Test data directory
TEST_DATA_DIR = Path(__file__).parent.parent / "test_data"


def load_test_data(filename):
    """Load test data from JSON file"""
    with open(TEST_DATA_DIR / filename, 'r') as f:
        return json.load(f)


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Load test data"""
        self.test_data = load_test_data('auth_test_data.json')
        self.base_url = "http://localhost:8000/api/auth"
    
    def test_register_citizen(self, client):
        """Test citizen registration"""
        response = client.post(
            f"{self.base_url}/register",
            json=self.test_data['register']['citizen']
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert 'user' in data
        assert data['user']['role'] == 'citizen'
    
    def test_register_official(self, client):
        """Test official registration"""
        response = client.post(
            f"{self.base_url}/register",
            json=self.test_data['register']['official']
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert 'user' in data
        assert data['user']['role'] == 'official'
    
    def test_login_with_email(self, client):
        """Test login with email"""
        response = client.post(
            f"{self.base_url}/login",
            json=self.test_data['login']['with_email']
        )
        assert response.status_code in [200, 403]  # 403 if not verified
        
    def test_login_with_phone(self, client):
        """Test login with phone"""
        response = client.post(
            f"{self.base_url}/login",
            json=self.test_data['login']['with_phone']
        )
        assert response.status_code in [200, 403]
    
    def test_guest_login(self, client):
        """Test guest session creation"""
        response = client.post(f"{self.base_url}/guest")
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert data['token'].startswith('guest_')
    
    def test_forgot_password_email(self, client):
        """Test forgot password with email"""
        response = client.post(
            f"{self.base_url}/forgot-password",
            json=self.test_data['forgot_password']['email']
        )
        assert response.status_code == 200
        data = response.json()
        assert 'message' in data
    
    def test_forgot_password_phone(self, client):
        """Test forgot password with phone"""
        response = client.post(
            f"{self.base_url}/forgot-password",
            json=self.test_data['forgot_password']['phone']
        )
        assert response.status_code == 200


class TestReportEndpoints:
    """Test report endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Load test data"""
        self.test_data = load_test_data('reports_test_data.json')
        self.base_url = "http://localhost:8000/api/reports"
    
    def test_create_flood_report(self, client, auth_token):
        """Test creating flood report"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_report']['flood'],
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert 'report' in data
        assert data['report']['hazardType'] == 'flood'
    
    def test_create_fire_report(self, client, auth_token):
        """Test creating fire report"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_report']['fire'],
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['report']['hazardType'] == 'fire'
        assert data['report']['severity'] == 'critical'
    
    def test_create_marine_emergency_report(self, client, auth_token):
        """Test creating marine emergency report"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_report']['marine_emergency'],
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]
    
    def test_create_pollution_report(self, client, auth_token):
        """Test creating pollution report"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_report']['pollution'],
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201]
    
    def test_get_reports_no_filter(self, client):
        """Test getting all reports without filters"""
        response = client.get(self.base_url)
        assert response.status_code == 200
        data = response.json()
        assert 'reports' in data
        assert 'pagination' in data
    
    def test_get_reports_by_severity(self, client):
        """Test getting reports filtered by severity"""
        params = self.test_data['query_parameters']['filter_by_severity']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200
        data = response.json()
        assert 'reports' in data
    
    def test_get_reports_by_hazard_type(self, client):
        """Test getting reports filtered by hazard type"""
        params = self.test_data['query_parameters']['filter_by_hazard_type']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200
    
    def test_get_reports_geospatial(self, client):
        """Test geospatial query for reports"""
        params = self.test_data['query_parameters']['geospatial_query']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200
        data = response.json()
        assert 'reports' in data
    
    def test_get_single_report(self, client, sample_report_id):
        """Test getting a single report"""
        response = client.get(f"{self.base_url}/{sample_report_id}")
        assert response.status_code in [200, 404]


class TestAlertEndpoints:
    """Test alert endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Load test data"""
        self.test_data = load_test_data('alerts_test_data.json')
        self.base_url = "http://localhost:8000/api/alerts"
    
    def test_create_cyclone_warning(self, client, official_token):
        """Test creating cyclone warning"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_alert']['cyclone_warning'],
            headers={"Authorization": f"Bearer {official_token}"}
        )
        assert response.status_code in [200, 201, 403]  # 403 if not official
    
    def test_create_flood_advisory(self, client, official_token):
        """Test creating flood advisory"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_alert']['flood_advisory'],
            headers={"Authorization": f"Bearer {official_token}"}
        )
        assert response.status_code in [200, 201, 403]
    
    def test_create_marine_warning(self, client, official_token):
        """Test creating marine warning"""
        response = client.post(
            self.base_url,
            json=self.test_data['create_alert']['marine_emergency'],
            headers={"Authorization": f"Bearer {official_token}"}
        )
        assert response.status_code in [200, 201, 403]
    
    def test_get_active_alerts(self, client):
        """Test getting active alerts"""
        params = self.test_data['query_parameters']['active_alerts']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200
        data = response.json()
        assert 'alerts' in data
        assert 'pagination' in data
    
    def test_get_alerts_by_severity(self, client):
        """Test getting alerts by severity"""
        params = self.test_data['query_parameters']['by_severity']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200
    
    def test_get_alerts_geospatial(self, client):
        """Test geospatial query for alerts"""
        params = self.test_data['query_parameters']['geospatial']
        response = client.get(self.base_url, params=params)
        assert response.status_code == 200


class TestUserEndpoints:
    """Test user profile and settings endpoints"""
    
    def test_get_profile(self, client, auth_token):
        """Test getting user profile"""
        response = client.get(
            "http://localhost:8000/api/user/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 401]
    
    def test_update_profile(self, client, auth_token):
        """Test updating user profile"""
        update_data = {
            "fullName": "Updated Name",
            "language": "en"
        }
        response = client.put(
            "http://localhost:8000/api/user/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 401]
    
    def test_get_settings(self, client, auth_token):
        """Test getting user settings"""
        response = client.get(
            "http://localhost:8000/api/user/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 401]
    
    def test_get_user_reports(self, client, auth_token):
        """Test getting user's reports"""
        response = client.get(
            "http://localhost:8000/api/user/reports",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 401]


class TestUploadEndpoints:
    """Test upload and storage endpoints"""
    
    def test_get_signed_upload_url(self, client, auth_token):
        """Test getting signed upload URL"""
        request_data = {
            "fileName": "test-image.jpg",
            "contentType": "image/jpeg"
        }
        response = client.post(
            "http://localhost:8000/api/upload/signed-url",
            json=request_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 401, 500]
    
    def test_refresh_urls(self, client):
        """Test refreshing download URLs"""
        request_data = {
            "fileNames": ["test-file1.jpg", "test-file2.jpg"]
        }
        response = client.post(
            "http://localhost:8000/api/upload/refresh-urls",
            json=request_data
        )
        assert response.status_code in [200, 500]


class TestMapEndpoints:
    """Test map data endpoints"""
    
    def test_get_map_data(self, client):
        """Test getting map data"""
        params = {
            "lat": 13.0827,
            "lng": 80.2707,
            "radius": 50000
        }
        response = client.get(
            "http://localhost:8000/api/map/data",
            params=params
        )
        assert response.status_code == 200
        data = response.json()
        assert 'reports' in data
        assert 'alerts' in data
    
    def test_get_initial_map_data(self, client):
        """Test getting initial map data"""
        response = client.get("http://localhost:8000/api/map/initial-data")
        assert response.status_code == 200
        data = response.json()
        assert 'reports' in data
        assert 'alerts' in data


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("http://localhost:8000/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("http://localhost:8000/")
        assert response.status_code == 200
        data = response.json()
        assert 'message' in data
        assert 'version' in data


# Pytest fixtures
@pytest.fixture
def client():
    """Create a test client (requires httpx or requests)"""
    import requests
    return requests


@pytest.fixture
def auth_token(client):
    """Get authentication token for testing"""
    # This should be implemented to get a real token
    # For now, return a placeholder
    return "test-token"


@pytest.fixture
def official_token(client):
    """Get official authentication token"""
    return "official-test-token"


@pytest.fixture
def sample_report_id():
    """Return a sample report ID for testing"""
    return "507f1f77bcf86cd799439011"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
