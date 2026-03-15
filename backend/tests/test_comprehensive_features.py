"""
Comprehensive tests for Carbon Tracker GHG Protocol application
Tests: Auth, Dashboard, Activities, Products, Emission Factors, Admin, Export
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://emissions-tracker-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
    
    def test_get_current_user(self, auth_headers):
        """Test getting current user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL


class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_get_dashboard_summary(self, auth_headers):
        """Test dashboard summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_emissions" in data
        assert "scope_completion" in data
        assert "activities_count" in data
    
    def test_get_dashboard_kpis(self, auth_headers):
        """Test dashboard KPIs endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # KPIs should have emissions per employee, per revenue, etc.
        assert isinstance(data, dict)
    
    def test_get_fiscal_comparison(self, auth_headers):
        """Test fiscal year comparison endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_scope_breakdown(self, auth_headers):
        """Test scope breakdown endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scopes" in data


class TestActivities:
    """Activities CRUD tests"""
    
    def test_get_activities(self, auth_headers):
        """Test getting activities list"""
        response = requests.get(f"{BASE_URL}/api/activities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should return paginated data
        assert "data" in data or isinstance(data, list)
    
    def test_get_activities_with_pagination(self, auth_headers):
        """Test activities pagination"""
        response = requests.get(f"{BASE_URL}/api/activities?limit=10&skip=0", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert "total" in data["pagination"]


class TestProducts:
    """Products CRUD tests"""
    
    def test_get_products(self, auth_headers):
        """Test getting products list"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_product_details(self, auth_headers):
        """Test getting product details"""
        # First get list of products
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "name" in data
            assert "manufacturing_emissions" in data or "total_emissions_per_unit" in data


class TestEmissionFactors:
    """Emission factors tests"""
    
    def test_get_emission_factors(self, auth_headers):
        """Test getting emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_emission_factors(self, auth_headers):
        """Test searching emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search?q=diesel", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_factors_by_category(self, auth_headers):
        """Test getting factors by category"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/combustion_mobile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestReferenceData:
    """Reference data tests (categories, subcategories)"""
    
    def test_get_categories(self):
        """Test getting categories (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_get_subcategories(self):
        """Test getting subcategories (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_get_subcategories_by_category(self):
        """Test getting subcategories filtered by category"""
        response = requests.get(f"{BASE_URL}/api/subcategories?category=combustion_mobile")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestFiscalYears:
    """Fiscal years tests"""
    
    def test_get_fiscal_years(self, auth_headers):
        """Test getting fiscal years"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have fiscal years 2024-2029
        if len(data) > 0:
            assert "name" in data[0]
            assert "start_date" in data[0]
            assert "end_date" in data[0]


class TestAdminPanel:
    """Admin panel tests (requires admin role)"""
    
    def test_get_admin_users(self, auth_headers):
        """Test getting users list (admin only)"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check user structure
        assert "email" in data[0]
        assert "role" in data[0]
    
    def test_get_admin_subcategories(self, auth_headers):
        """Test getting admin subcategories"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 89  # Should have 89 subcategories
    
    def test_get_admin_emission_factors_v2(self, auth_headers):
        """Test getting V2 emission factors"""
        response = requests.get(f"{BASE_URL}/api/admin/emission-factors-v2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have 1190 factors
        assert len(data) >= 1000


class TestExport:
    """Export functionality tests"""
    
    def test_export_full_backup(self, auth_headers):
        """Test exporting full backup"""
        response = requests.get(f"{BASE_URL}/api/export/full", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Export should contain various data types
        assert isinstance(data, dict)
        assert "export_metadata" in data
        assert "activities" in data
        assert "products" in data
    
    def test_export_emission_factors(self, auth_headers):
        """Test exporting emission factors"""
        response = requests.get(f"{BASE_URL}/api/export/emission-factors", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "emission_factors" in data
    
    def test_export_reference_data(self, auth_headers):
        """Test exporting reference data"""
        response = requests.get(f"{BASE_URL}/api/export/reference-data", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "emission_factors" in data
        assert "subcategories" in data


class TestObjectives:
    """Objectives (SBTi) tests"""
    
    def test_get_objectives(self, auth_headers):
        """Test getting objectives"""
        response = requests.get(f"{BASE_URL}/api/objectives", headers=auth_headers)
        # May return 200 with data or 404 if no objective set
        assert response.status_code in [200, 404]
    
    def test_get_trajectory(self, auth_headers):
        """Test getting trajectory data"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trajectory" in data
        assert "actuals" in data
    
    def test_get_recommendations(self, auth_headers):
        """Test getting recommendations"""
        response = requests.get(f"{BASE_URL}/api/objectives/recommendations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data


class TestProductSales:
    """Product sales tests"""
    
    def test_get_product_sales(self, auth_headers):
        """Test getting product sales"""
        # First get a product
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/sales", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "sales" in data
    
    def test_get_product_emission_profiles(self, auth_headers):
        """Test getting product emission profiles"""
        # First get a product
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/emission-profiles", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "default_profile" in data
            assert "profiles" in data
