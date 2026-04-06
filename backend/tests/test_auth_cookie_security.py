"""
Security Token Storage Migration Tests
Tests for httpOnly cookie-based authentication (migrated from localStorage/sessionStorage)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


class TestCookieBasedAuth:
    """Test httpOnly cookie authentication flow"""
    
    def test_login_sets_httponly_cookie(self):
        """SECURITY: Login should set httpOnly cookie"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Check that cookie was set
        cookies = session.cookies.get_dict()
        assert "access_token" in cookies, "access_token cookie not set"
        
        # Verify response contains user data
        data = response.json()
        assert "user" in data, "Response should contain user data"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login sets httpOnly cookie: access_token present")
    
    def test_api_calls_work_with_cookie_only(self):
        """SECURITY: API calls should work with cookie (no Authorization header)"""
        session = requests.Session()
        
        # Login to get cookie
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Make API call WITHOUT Authorization header - cookie should be sent automatically
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"API call with cookie failed: {me_response.text}"
        
        user_data = me_response.json()
        assert user_data["email"] == TEST_EMAIL
        print(f"✓ API calls work with cookie-only auth (no Authorization header)")
    
    def test_logout_clears_cookie(self):
        """SECURITY: Logout should clear the auth cookie"""
        session = requests.Session()
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Verify cookie is set
        assert "access_token" in session.cookies.get_dict()
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        
        # After logout, /api/auth/me should fail
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 401, "Should be unauthorized after logout"
        print(f"✓ Logout clears cookie and invalidates session")
    
    def test_session_persists_across_requests(self):
        """SECURITY: Cookie should persist across multiple requests (page refresh simulation)"""
        session = requests.Session()
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Multiple API calls (simulating page refresh/navigation)
        for i in range(3):
            me_response = session.get(f"{BASE_URL}/api/auth/me")
            assert me_response.status_code == 200, f"Request {i+1} failed"
        
        print(f"✓ Session persists across multiple requests")
    
    def test_unauthenticated_request_fails(self):
        """SECURITY: Requests without cookie should fail with 401"""
        session = requests.Session()  # Fresh session, no cookie
        
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, "Should be unauthorized without cookie"
        print(f"✓ Unauthenticated requests correctly return 401")


class TestProtectedEndpointsWithCookie:
    """Test that all protected endpoints work with cookie auth"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Login and create authenticated session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        yield
        # Cleanup: logout
        self.session.post(f"{BASE_URL}/api/auth/logout")
    
    def test_dashboard_summary(self):
        """Dashboard summary API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/summary")
        assert response.status_code == 200, f"Dashboard summary failed: {response.text}"
        print(f"✓ /api/dashboard/summary works with cookie auth")
    
    def test_activities(self):
        """Activities API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/activities?limit=10")
        assert response.status_code == 200, f"Activities failed: {response.text}"
        print(f"✓ /api/activities works with cookie auth")
    
    def test_products(self):
        """Products API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Products failed: {response.text}"
        print(f"✓ /api/products works with cookie auth")
    
    def test_emission_factors(self):
        """Emission factors API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/emission-factors?limit=10")
        assert response.status_code == 200, f"Emission factors failed: {response.text}"
        print(f"✓ /api/emission-factors works with cookie auth")
    
    def test_fiscal_years(self):
        """Fiscal years API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200, f"Fiscal years failed: {response.text}"
        print(f"✓ /api/fiscal-years works with cookie auth")
    
    def test_categories(self):
        """Categories API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Categories failed: {response.text}"
        print(f"✓ /api/categories works with cookie auth")
    
    def test_companies(self):
        """Companies API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/companies")
        assert response.status_code == 200, f"Companies failed: {response.text}"
        print(f"✓ /api/companies works with cookie auth")
    
    def test_objectives(self):
        """Objectives API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/objectives")
        assert response.status_code == 200, f"Objectives failed: {response.text}"
        print(f"✓ /api/objectives works with cookie auth")
    
    def test_scenarios(self):
        """Scenarios API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/scenarios")
        assert response.status_code == 200, f"Scenarios failed: {response.text}"
        print(f"✓ /api/scenarios works with cookie auth")
    
    def test_admin_emission_factors(self):
        """Admin emission factors API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/admin/emission-factors-v2?page=1&page_size=10")
        assert response.status_code == 200, f"Admin emission factors failed: {response.text}"
        print(f"✓ /api/admin/emission-factors-v2 works with cookie auth")
    
    def test_export_mongodump_info(self):
        """Export mongodump info API works with cookie auth"""
        response = self.session.get(f"{BASE_URL}/api/export/mongodump/info")
        assert response.status_code == 200, f"Export mongodump info failed: {response.text}"
        print(f"✓ /api/export/mongodump/info works with cookie auth")


class TestRememberMeFeature:
    """Test remember_me cookie expiry behavior"""
    
    def test_login_with_remember_me(self):
        """Login with remember_me should set longer cookie expiry"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember_me": True
        })
        
        assert response.status_code == 200
        assert "access_token" in session.cookies.get_dict()
        print(f"✓ Login with remember_me=True works")
    
    def test_login_without_remember_me(self):
        """Login without remember_me should set shorter cookie expiry"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "remember_me": False
        })
        
        assert response.status_code == 200
        assert "access_token" in session.cookies.get_dict()
        print(f"✓ Login with remember_me=False works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
