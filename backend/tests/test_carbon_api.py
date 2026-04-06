"""
Backend API Tests for Carbon Footprint Calculator
Tests: Authentication, Activities CRUD, Dashboard, Categories, Emission Factors
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
# credentials imported from conftest_credentials
# credentials imported from conftest_credentials


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ Current user retrieved: {data['name']}")


class TestCategories:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Test getting all emission categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify category structure
        category = data[0]
        assert "scope" in category
        assert "code" in category
        assert "name_fr" in category
        print(f"✓ Retrieved {len(data)} categories")
        
        # Check scopes are present
        scopes = set(c["scope"] for c in data)
        assert "scope1" in scopes
        assert "scope2" in scopes
        print(f"✓ Categories include scopes: {scopes}")


class TestSubcategories:
    """Subcategories endpoint tests"""
    
    def test_get_subcategories(self):
        """Test getting subcategories"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} subcategories")
    
    def test_get_subcategories_by_category(self):
        """Test getting subcategories filtered by category"""
        response = requests.get(f"{BASE_URL}/api/subcategories?category=combustion_mobile")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} subcategories for combustion_mobile")


class TestEmissionFactors:
    """Emission factors endpoint tests"""
    
    def test_get_emission_factors(self):
        """Test getting emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} emission factors")
    
    def test_search_emission_factors(self):
        """Test searching emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_mobile")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search returned {len(data)} emission factors for combustion_mobile")


class TestActivities:
    """Activities CRUD endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_activities(self, auth_token):
        """Test getting all activities"""
        response = requests.get(f"{BASE_URL}/api/activities", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} activities")
        return data
    
    def test_get_activities_by_scope(self, auth_token):
        """Test getting activities filtered by scope"""
        response = requests.get(f"{BASE_URL}/api/activities?scope=scope1", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned activities are scope1
        for activity in data:
            assert activity.get("scope") == "scope1"
        print(f"✓ Retrieved {len(data)} scope1 activities")


class TestDashboard:
    """Dashboard endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_dashboard_summary(self, auth_token):
        """Test getting dashboard summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary structure
        assert "total_emissions" in data
        assert "scope_emissions" in data
        assert "scope_completion" in data
        
        # Verify scope emissions structure
        scope_emissions = data["scope_emissions"]
        assert "scope1" in scope_emissions
        assert "scope2" in scope_emissions
        assert "scope3_amont" in scope_emissions
        assert "scope3_aval" in scope_emissions
        
        print(f"✓ Dashboard summary: Total emissions = {data['total_emissions']} tCO2e")
        print(f"  Scope 1: {scope_emissions['scope1']}, Scope 2: {scope_emissions['scope2']}")
    
    def test_get_category_stats(self, auth_token):
        """Test getting category statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Category stats retrieved: {len(data)} categories with activities")


class TestCompany:
    """Company endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_company(self, auth_token):
        """Test getting company info"""
        response = requests.get(f"{BASE_URL}/api/companies", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        if data:
            assert "name" in data
            print(f"✓ Company retrieved: {data.get('name')}")
        else:
            print("✓ No company found (expected for new users)")


class TestActivityUpdate:
    """Activity update endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_update_activity_endpoint_exists(self, auth_token):
        """Test that PUT /api/activities/{id} endpoint exists"""
        # First get activities to find an ID
        response = requests.get(f"{BASE_URL}/api/activities", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        activities = response.json()
        
        if activities:
            activity_id = activities[0]["id"]
            # Try to update with minimal data
            update_response = requests.put(
                f"{BASE_URL}/api/activities/{activity_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"name": activities[0].get("name", "Test Activity")}
            )
            # Should return 200 (success) or 404 (not found) - not 405 (method not allowed)
            assert update_response.status_code in [200, 404]
            print(f"✓ Activity update endpoint works (status: {update_response.status_code})")
        else:
            print("✓ No activities to test update (skipped)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
