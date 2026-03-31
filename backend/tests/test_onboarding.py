"""
FEAT-01: Onboarding guided tutorial - Backend API tests
Tests for onboarding completion and reset endpoints
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOnboardingAPIs:
    """Test onboarding endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_me_has_onboarding_field(self, auth_headers):
        """GET /api/auth/me should return onboarding_completed field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify onboarding_completed field exists
        assert "onboarding_completed" in data, "onboarding_completed field missing from /api/auth/me"
        assert isinstance(data["onboarding_completed"], bool), "onboarding_completed should be boolean"
        
        # Verify other expected fields
        assert "id" in data
        assert "email" in data
        assert "name" in data
    
    def test_onboarding_reset(self, auth_headers):
        """POST /api/auth/onboarding/reset should set onboarding_completed=false"""
        # Reset onboarding
        response = requests.post(f"{BASE_URL}/api/auth/onboarding/reset", headers=auth_headers)
        assert response.status_code == 200
        assert response.json().get("status") == "ok"
        
        # Verify reset via GET /me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert me_response.status_code == 200
        assert me_response.json()["onboarding_completed"] == False, "onboarding_completed should be False after reset"
    
    def test_onboarding_complete(self, auth_headers):
        """POST /api/auth/onboarding/complete should set onboarding_completed=true"""
        # Complete onboarding
        response = requests.post(f"{BASE_URL}/api/auth/onboarding/complete", headers=auth_headers)
        assert response.status_code == 200
        assert response.json().get("status") == "ok"
        
        # Verify completion via GET /me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert me_response.status_code == 200
        assert me_response.json()["onboarding_completed"] == True, "onboarding_completed should be True after complete"
    
    def test_onboarding_toggle_flow(self, auth_headers):
        """Test full toggle flow: reset -> verify false -> complete -> verify true"""
        # Reset
        reset_response = requests.post(f"{BASE_URL}/api/auth/onboarding/reset", headers=auth_headers)
        assert reset_response.status_code == 200
        
        # Verify false
        me1 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert me1.json()["onboarding_completed"] == False
        
        # Complete
        complete_response = requests.post(f"{BASE_URL}/api/auth/onboarding/complete", headers=auth_headers)
        assert complete_response.status_code == 200
        
        # Verify true
        me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert me2.json()["onboarding_completed"] == True
    
    def test_onboarding_endpoints_require_auth(self):
        """Onboarding endpoints should require authentication"""
        # Test without auth
        reset_response = requests.post(f"{BASE_URL}/api/auth/onboarding/reset")
        assert reset_response.status_code in [401, 403], "Reset endpoint should require auth"
        
        complete_response = requests.post(f"{BASE_URL}/api/auth/onboarding/complete")
        assert complete_response.status_code in [401, 403], "Complete endpoint should require auth"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
