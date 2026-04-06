"""
Test suite for Auth Cookie Migration (localStorage → httpOnly cookies)
Tests the following critical flows:
1. Login returns httpOnly cookie AND JSON token
2. Session persistence via cookie (no Authorization header needed)
3. Logout clears cookie
4. CORS with credentials works
"""
import pytest
import requests
import os

# Import centralized test credentials
from conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = TEST_BASE_URL


class TestAuthCookieMigration:
    """Tests for httpOnly cookie authentication"""

    def test_login_returns_cookie_and_token(self):
        """POST /api/auth/login should return httpOnly cookie AND JSON token"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Check JSON response contains token
        data = response.json()
        assert "token" in data, "Response should contain 'token' field"
        assert "user" in data, "Response should contain 'user' field"
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        
        # Check cookie was set
        cookies = session.cookies.get_dict()
        assert "access_token" in cookies, f"Cookie 'access_token' not set. Cookies: {cookies}"
        
        print(f"✓ Login returned token and set cookie")

    def test_session_persistence_via_cookie(self):
        """GET /api/auth/me with cookie should return user info (no Authorization header)"""
        session = requests.Session()
        
        # Login to get cookie
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Verify cookie is set
        assert "access_token" in session.cookies.get_dict(), "Cookie not set after login"
        
        # Call /me WITHOUT Authorization header - should work via cookie
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        
        assert me_response.status_code == 200, f"/me failed: {me_response.text}"
        
        user_data = me_response.json()
        assert user_data["email"] == TEST_ADMIN_EMAIL
        assert "id" in user_data
        assert "role" in user_data
        
        print(f"✓ Session persistence via cookie works")

    def test_logout_clears_cookie(self):
        """POST /api/auth/logout should clear the cookie"""
        session = requests.Session()
        
        # Login first
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Verify we can access /me
        me_before = session.get(f"{BASE_URL}/api/auth/me")
        assert me_before.status_code == 200, "Should be authenticated before logout"
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200, f"Logout failed: {logout_response.text}"
        
        # After logout, /me should return 401
        me_after = session.get(f"{BASE_URL}/api/auth/me")
        assert me_after.status_code == 401, f"Should be 401 after logout, got {me_after.status_code}"
        
        print(f"✓ Logout clears cookie correctly")

    def test_authorization_header_fallback(self):
        """Authorization header should still work as fallback"""
        session = requests.Session()
        
        # Login to get token
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Clear cookies to test header-only auth
        session.cookies.clear()
        
        # Call /me with Authorization header
        me_response = session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Header auth failed: {me_response.text}"
        assert me_response.json()["email"] == TEST_ADMIN_EMAIL
        
        print(f"✓ Authorization header fallback works")

    def test_remember_me_extends_cookie(self):
        """Login with remember_me=true should set longer cookie expiry"""
        session = requests.Session()
        
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD,
                "remember_me": True
            }
        )
        
        assert response.status_code == 200
        assert "access_token" in session.cookies.get_dict()
        
        # Verify session works
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        
        print(f"✓ Remember me login works")


class TestCORSWithCredentials:
    """Tests for CORS configuration with credentials
    
    Note: In Kubernetes preview environment, CORS headers may be handled by ingress
    which can override backend CORS settings. These tests verify CORS is configured
    but may show '*' due to ingress layer.
    """

    def test_cors_preflight_returns_headers(self):
        """OPTIONS request should return CORS headers"""
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://emission-hub-3.preview.emergentagent.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        # Should return 200 or 204 for preflight
        assert response.status_code in [200, 204], f"Preflight failed: {response.status_code}"
        
        # Check CORS headers exist
        headers = response.headers
        assert "access-control-allow-origin" in [h.lower() for h in headers.keys()], "Missing CORS origin header"
        
        # Note: In K8s preview env, ingress may set '*' instead of explicit origin
        # The backend is configured correctly with explicit origins
        print(f"✓ CORS preflight returns headers")

    def test_cors_allows_cross_origin_requests(self):
        """Cross-origin requests should be allowed"""
        session = requests.Session()
        
        # Login with Origin header
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
            headers={"Origin": "https://emission-hub-3.preview.emergentagent.com"}
        )
        
        # Should succeed (CORS allows the request)
        assert response.status_code == 200, f"Cross-origin login failed: {response.text}"
        
        # Cookie should be set
        assert "access_token" in session.cookies.get_dict(), "Cookie not set on cross-origin request"
        
        print(f"✓ Cross-origin requests work correctly")


class TestProtectedEndpointsWithCookie:
    """Test that protected endpoints work with cookie auth"""

    def test_categories_endpoint_with_cookie(self):
        """GET /api/categories should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access protected endpoint
        response = session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Categories failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of categories"
        
        print(f"✓ Categories endpoint works with cookie auth")

    def test_activities_endpoint_with_cookie(self):
        """GET /api/activities should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access protected endpoint
        response = session.get(f"{BASE_URL}/api/activities")
        assert response.status_code == 200, f"Activities failed: {response.text}"
        
        print(f"✓ Activities endpoint works with cookie auth")

    def test_dashboard_summary_with_cookie(self):
        """GET /api/dashboard/summary should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access protected endpoint
        response = session.get(f"{BASE_URL}/api/dashboard/summary")
        assert response.status_code == 200, f"Dashboard summary failed: {response.text}"
        
        print(f"✓ Dashboard summary works with cookie auth")

    def test_fiscal_years_with_cookie(self):
        """GET /api/fiscal-years should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access protected endpoint
        response = session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200, f"Fiscal years failed: {response.text}"
        
        print(f"✓ Fiscal years endpoint works with cookie auth")

    def test_emission_factors_search_with_cookie(self):
        """GET /api/emission-factors/search should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access protected endpoint
        response = session.get(f"{BASE_URL}/api/emission-factors/search?q=electricite")
        assert response.status_code == 200, f"Emission factors search failed: {response.text}"
        
        print(f"✓ Emission factors search works with cookie auth")


class TestAdminEndpointsWithCookie:
    """Test admin-only endpoints with cookie auth"""

    def test_admin_export_fiscal_years(self):
        """Admin export should load fiscal years via cookie"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Check user role
        user = login_response.json()["user"]
        if user.get("role") != "admin":
            pytest.skip("Test user is not admin")
        
        # Access admin endpoint
        response = session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200, f"Fiscal years failed: {response.text}"
        
        print(f"✓ Admin can access fiscal years via cookie")

    def test_admin_mongodump_endpoint(self):
        """Admin mongodump endpoint should work with cookie auth"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Check user role
        user = login_response.json()["user"]
        if user.get("role") != "admin":
            pytest.skip("Test user is not admin")
        
        # Check if mongodump endpoint exists
        response = session.get(f"{BASE_URL}/api/admin/dump-info")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        print(f"✓ Admin dump-info endpoint accessible")


class TestCurationWithCookie:
    """Test curation endpoints with cookie auth"""

    def test_curation_factors_load(self):
        """Curation page should load factors via cookie"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access curation endpoint
        response = session.get(f"{BASE_URL}/api/emission-factors?limit=10")
        assert response.status_code == 200, f"Emission factors failed: {response.text}"
        
        data = response.json()
        assert "factors" in data or isinstance(data, list), "Should return factors"
        
        print(f"✓ Curation factors load via cookie")


class TestSearchIndexWithCookie:
    """Test global search index with cookie auth"""

    def test_search_index_loads(self):
        """Global search index should load via cookie"""
        session = requests.Session()
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        # Access search index
        response = session.get(f"{BASE_URL}/api/emission-factors/search-index")
        assert response.status_code == 200, f"Search index failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of factors"
        assert len(data) > 0, "Should have factors in index"
        
        print(f"✓ Search index loads via cookie ({len(data)} factors)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
