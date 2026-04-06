"""
Test suite for Code Refactoring Phase 5 validation
Tests dashboard, curation, and fiscal_years endpoints after refactoring
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment variables
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardEndpoints:
    """Test dashboard endpoints after refactoring to use dashboard_service.py"""
    
    def test_dashboard_summary(self, auth_headers):
        """GET /api/dashboard/summary - uses calculate_scope_emissions, calculate_scope_completion"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard summary failed: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_emissions" in data, "Missing total_emissions"
        assert "scope_emissions" in data, "Missing scope_emissions"
        assert "scope_completion" in data, "Missing scope_completion"
        
        # Validate scope_emissions structure
        scope_emissions = data["scope_emissions"]
        for scope in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
            assert scope in scope_emissions, f"Missing {scope} in scope_emissions"
        
        # Validate scope_completion structure
        scope_completion = data["scope_completion"]
        for scope in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
            assert scope in scope_completion, f"Missing {scope} in scope_completion"
            assert "categories_filled" in scope_completion[scope]
            assert "total_categories" in scope_completion[scope]
            assert "percentage" in scope_completion[scope]
    
    def test_dashboard_kpis(self, auth_headers):
        """GET /api/dashboard/kpis - uses resolve_current_and_previous_fy, calculate_kpi_metrics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard KPIs failed: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "current_emissions" in data, "Missing current_emissions"
        assert "previous_emissions" in data, "Missing previous_emissions"
        assert "variation_percent" in data, "Missing variation_percent"
    
    def test_dashboard_fiscal_comparison(self, auth_headers):
        """GET /api/dashboard/fiscal-comparison - uses calculate_scope_emissions"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard fiscal comparison failed: {response.text}"
        
        data = response.json()
        # Should return a list of fiscal year comparisons
        assert isinstance(data, list), "Expected list response"
    
    def test_dashboard_category_stats(self, auth_headers):
        """GET /api/dashboard/category-stats - uses calculate_category_emissions"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard category stats failed: {response.text}"
        
        data = response.json()
        # Should return a dict of category stats
        assert isinstance(data, dict), "Expected dict response"


class TestCurationEndpoints:
    """Test curation endpoints after refactoring to use curation_service.py"""
    
    def test_curation_stats(self, auth_headers):
        """GET /api/curation/stats - uses enrich_stats_rows from curation_service"""
        response = requests.get(f"{BASE_URL}/api/curation/stats", headers=auth_headers)
        assert response.status_code == 200, f"Curation stats failed: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "global" in data, "Missing global stats"
        assert "by_subcategory" in data, "Missing by_subcategory stats"
        
        # Validate global stats
        global_stats = data["global"]
        assert "total" in global_stats, "Missing total in global stats"
    
    def test_curation_factors_list(self, auth_headers):
        """GET /api/curation/factors - uses build_curation_query, resolve_sort_field"""
        response = requests.get(f"{BASE_URL}/api/curation/factors?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Curation factors list failed: {response.text}"
        
        data = response.json()
        # Validate paginated response structure
        assert "items" in data, "Missing items in response"
        assert "total" in data, "Missing total in response"
        assert isinstance(data["items"], list), "items should be a list"
    
    def test_curation_factors_with_search(self, auth_headers):
        """GET /api/curation/factors?search=diesel - tests build_curation_query search"""
        response = requests.get(f"{BASE_URL}/api/curation/factors?search=diesel&limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Curation factors search failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_curation_factors_with_is_public_filter(self, auth_headers):
        """GET /api/curation/factors?is_public=true - tests build_curation_query is_public filter"""
        response = requests.get(f"{BASE_URL}/api/curation/factors?is_public=true&limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Curation factors is_public filter failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        # All returned items should have is_public=true
        for item in data["items"]:
            assert item.get("is_public") == True, f"Item {item.get('id')} should have is_public=true"
    
    def test_curation_factors_with_reporting_method_filter(self, auth_headers):
        """GET /api/curation/factors?reporting_method=market - tests build_curation_query reporting_method"""
        response = requests.get(f"{BASE_URL}/api/curation/factors?reporting_method=market&limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Curation factors reporting_method filter failed: {response.text}"
        
        data = response.json()
        assert "items" in data


class TestFiscalYearsEndpoints:
    """Test fiscal_years endpoints after import fix (services.scope_mapping)"""
    
    def test_get_fiscal_years(self, auth_headers):
        """GET /api/fiscal-years - validates import from services.scope_mapping works"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert response.status_code == 200, f"Get fiscal years failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # If there are fiscal years, validate structure
        if len(data) > 0:
            fy = data[0]
            assert "id" in fy, "Missing id in fiscal year"
            assert "name" in fy, "Missing name in fiscal year"


class TestGeneralInfoEndpoints:
    """Test endpoints used by GeneralInfo page"""
    
    def test_get_companies(self, auth_headers):
        """GET /api/companies - used by GeneralInfo page (useGeneralInfo hook)"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        assert response.status_code == 200, f"Get companies failed: {response.text}"
        
        data = response.json()
        # Company data should have basic fields
        assert isinstance(data, dict), "Expected dict response"
    
    def test_get_fiscal_year_context(self, auth_headers):
        """GET /api/fiscal-years/{id}/context - used by GeneralInfo page"""
        # First get fiscal years to get an ID
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) > 0:
            fy_id = fiscal_years[0]["id"]
            response = requests.get(f"{BASE_URL}/api/fiscal-years/{fy_id}/context", headers=auth_headers)
            assert response.status_code == 200, f"Get fiscal year context failed: {response.text}"
            
            data = response.json()
            assert "context" in data or isinstance(data, dict), "Expected context in response"


class TestDataEntryEndpoints:
    """Test endpoints used by DataEntry page"""
    
    def test_get_categories(self, auth_headers):
        """GET /api/categories - used by DataEntry page"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) > 0, "Should have categories"
    
    def test_get_activities(self, auth_headers):
        """GET /api/activities - used by DataEntry page"""
        response = requests.get(f"{BASE_URL}/api/activities?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Get activities failed: {response.text}"
        
        data = response.json()
        # Should be paginated response
        assert "data" in data or isinstance(data, list), "Expected paginated or list response"
    
    def test_get_subcategories(self, auth_headers):
        """GET /api/subcategories - used by DataEntry GlobalFactorSearch"""
        response = requests.get(f"{BASE_URL}/api/subcategories", headers=auth_headers)
        assert response.status_code == 200, f"Get subcategories failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
