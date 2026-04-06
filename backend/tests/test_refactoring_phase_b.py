"""
Phase B Frontend Complexity Refactoring - Backend API Tests
Tests for DataEntry, AdminExport, ProductVersions, ProductSale functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "newtest@x.com"


class TestDataEntryAPIs:
    """Tests for DataEntry page APIs - used by useDataEntry hook"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_categories(self, auth_headers):
        """Test GET /api/categories - used by DataEntry for category cards"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        cat = data[0]
        assert "code" in cat
        assert "scope" in cat
        assert "name_fr" in cat
    
    def test_get_subcategories(self, auth_headers):
        """Test GET /api/subcategories - used by DataEntry for factor search"""
        response = requests.get(f"{BASE_URL}/api/subcategories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_activities(self, auth_headers):
        """Test GET /api/activities - used by DataEntry for activity list"""
        response = requests.get(f"{BASE_URL}/api/activities?limit=500", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Can be list or dict with data key
        if isinstance(data, dict):
            assert "data" in data or "activities" in data
    
    def test_get_dashboard_summary(self, auth_headers):
        """Test GET /api/dashboard/summary - used by DataEntry sidebar"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_emissions" in data or "scope_emissions" in data
    
    def test_get_category_stats(self, auth_headers):
        """Test GET /api/dashboard/category-stats - used by DataEntry for category counts"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestAdminExportAPIs:
    """Tests for Admin Export tab APIs - used by useAdminExport hook"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_fiscal_years(self, auth_headers):
        """Test GET /api/fiscal-years - used by AdminExport for FY selector"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            fy = data[0]
            assert "id" in fy
            assert "name" in fy
    
    def test_get_mongodump_info(self, auth_headers):
        """Test GET /api/export/mongodump/info - used by AdminExport for DB info"""
        response = requests.get(f"{BASE_URL}/api/export/mongodump/info", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "db_name" in data
        assert "total_collections" in data
        assert "total_documents" in data
    
    def test_export_full(self, auth_headers):
        """Test GET /api/export/full - used by AdminExport for full backup"""
        response = requests.get(f"{BASE_URL}/api/export/full", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Full export should have multiple collections
        assert "export_metadata" in data or "company" in data or "fiscal_years" in data
    
    def test_export_activities(self, auth_headers):
        """Test GET /api/export/activities - used by AdminExport"""
        response = requests.get(f"{BASE_URL}/api/export/activities", headers=auth_headers)
        assert response.status_code == 200
    
    def test_export_products(self, auth_headers):
        """Test GET /api/export/products - used by AdminExport"""
        response = requests.get(f"{BASE_URL}/api/export/products", headers=auth_headers)
        assert response.status_code == 200


class TestProductVersionsAPIs:
    """Tests for ProductVersionsModal APIs - used by useProductVersions hook"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def product_id(self, auth_headers):
        """Get a product ID for testing"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        if response.status_code == 200:
            products = response.json()
            if len(products) > 0:
                return products[0]["id"]
        return None
    
    def test_get_products(self, auth_headers):
        """Test GET /api/products - used by ProductVersionsModal"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_product_emission_profiles(self, auth_headers, product_id):
        """Test GET /api/products/{id}/emission-profiles - used by ProductVersionsModal"""
        if not product_id:
            pytest.skip("No products available for testing")
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/emission-profiles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "default_profile" in data
        assert "profiles" in data


class TestProductSaleAPIs:
    """Tests for ProductSaleModal APIs - used by useProductSale hook"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def product_id(self, auth_headers):
        """Get a product ID for testing"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        if response.status_code == 200:
            products = response.json()
            if len(products) > 0:
                return products[0]["id"]
        return None
    
    def test_get_product_sales(self, auth_headers, product_id):
        """Test GET /api/products/{id}/sales - used by ProductSaleModal"""
        if not product_id:
            pytest.skip("No products available for testing")
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/sales", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Response should have sales array
        assert "sales" in data
        assert isinstance(data["sales"], list)


class TestDashboardAPIs:
    """Tests for Dashboard APIs - general health check"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_summary(self, auth_headers):
        """Test GET /api/dashboard/summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have scope emissions data
        assert "scope_emissions" in data or "total_emissions" in data
    
    def test_dashboard_kpis(self, auth_headers):
        """Test GET /api/dashboard/kpis"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
