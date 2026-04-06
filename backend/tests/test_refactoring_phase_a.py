"""
Test suite for Code Refactoring Phase A validation
Tests all refactored endpoints after helper function extraction:
- fiscal_years.py: _copy_context_fields, _resolve_context_from_source_or_company, _initialize_fy_context, etc.
- dashboard.py: now imports fetch_fy_emissions, get_fiscal_year_context_with_fallback from service
- export.py: simplified serialize_for_export, extracted _collect_export_data, _write_collection_to_zip
- activities.py: extracted _compute_impact_emissions, _get_factor_impacts
- curation.py: added CurationFilters dependency class with 11 query params
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


class TestAuthEndpoint:
    """Test authentication endpoint"""
    
    def test_login_success(self):
        """POST /api/auth/login returns 200 with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in response"
        assert "user" in data, "Missing user in response"


class TestDashboardRefactored:
    """Test dashboard endpoints after refactoring to use dashboard_service.py helpers"""
    
    def test_dashboard_summary_with_scope_breakdown(self, auth_headers):
        """GET /api/dashboard/summary returns 200 with scope breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard summary failed: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_emissions" in data, "Missing total_emissions"
        assert "scope_emissions" in data, "Missing scope_emissions"
        assert "scope_completion" in data, "Missing scope_completion"
        
        # Validate scope_emissions structure (uses calculate_scope_emissions helper)
        scope_emissions = data["scope_emissions"]
        for scope in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
            assert scope in scope_emissions, f"Missing {scope} in scope_emissions"
            assert isinstance(scope_emissions[scope], (int, float)), f"{scope} should be numeric"
    
    def test_dashboard_kpis_with_variation(self, auth_headers):
        """GET /api/dashboard/kpis returns 200 with KPIs (emissions, variation, etc.)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard KPIs failed: {response.text}"
        
        data = response.json()
        # Validate response structure (uses fetch_fy_emissions, calculate_kpi_metrics helpers)
        assert "current_emissions" in data, "Missing current_emissions"
        assert "previous_emissions" in data, "Missing previous_emissions"
        assert "variation_percent" in data, "Missing variation_percent"
        assert "variation_absolute" in data, "Missing variation_absolute"
        
        # Optional KPIs
        if data.get("employees"):
            assert "emissions_per_employee" in data


class TestFiscalYearsRefactored:
    """Test fiscal_years endpoints after helper extraction"""
    
    def test_get_fiscal_years_list(self, auth_headers):
        """GET /api/fiscal-years returns list of fiscal years"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert response.status_code == 200, f"Get fiscal years failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # Validate structure if there are fiscal years
        if len(data) > 0:
            fy = data[0]
            assert "id" in fy, "Missing id in fiscal year"
            assert "name" in fy, "Missing name in fiscal year"
            assert "year" in fy, "Missing year in fiscal year"
    
    def test_create_fiscal_year_2030(self, auth_headers):
        """POST /api/fiscal-years creates a new fiscal year (test year 2030 to avoid conflict)"""
        # First check if 2030 already exists
        response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert response.status_code == 200
        fiscal_years = response.json()
        
        # Check if 2030 exists
        fy_2030 = next((fy for fy in fiscal_years if fy.get("year") == 2030), None)
        
        if fy_2030:
            # Delete it first to test creation
            delete_response = requests.delete(
                f"{BASE_URL}/api/fiscal-years/{fy_2030['id']}", 
                headers=auth_headers
            )
            # May fail if there are activities, that's ok
        
        # Create fiscal year 2030 (uses _initialize_fy_context helper)
        create_response = requests.post(
            f"{BASE_URL}/api/fiscal-years",
            headers=auth_headers,
            json={"year": 2030}
        )
        
        # Either 200/201 for success or 400 if already exists
        assert create_response.status_code in [200, 201, 400], f"Create fiscal year failed: {create_response.text}"
        
        if create_response.status_code in [200, 201]:
            data = create_response.json()
            assert "id" in data, "Missing id in created fiscal year"
            assert data.get("year") == 2030, "Year should be 2030"
            
            # Clean up - delete the created fiscal year
            requests.delete(f"{BASE_URL}/api/fiscal-years/{data['id']}", headers=auth_headers)


class TestCurationFiltersRefactored:
    """Test curation endpoints with CurationFilters dependency class"""
    
    def test_curation_factors_paginated(self, auth_headers):
        """GET /api/curation/factors?page=1&page_size=5 returns paginated factors with CurationFilters dependency"""
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=5", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Curation factors failed: {response.text}"
        
        data = response.json()
        # Validate paginated response structure
        assert "items" in data, "Missing items in response"
        assert "total" in data, "Missing total in response"
        assert "page" in data, "Missing page in response"
        assert "page_size" in data, "Missing page_size in response"
        assert "total_pages" in data, "Missing total_pages in response"
        
        # Validate pagination values
        assert data["page"] == 1, "Page should be 1"
        assert data["page_size"] == 5, "Page size should be 5"
        assert len(data["items"]) <= 5, "Should return at most 5 items"
    
    def test_curation_factors_with_all_filters(self, auth_headers):
        """Test CurationFilters with multiple query params"""
        # Test with search filter
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=10&search=diesel&sort_by=subcategory&sort_order=asc",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Curation factors with filters failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_curation_stats(self, auth_headers):
        """GET /api/curation/stats returns curation stats"""
        response = requests.get(f"{BASE_URL}/api/curation/stats", headers=auth_headers)
        assert response.status_code == 200, f"Curation stats failed: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "global" in data, "Missing global stats"
        assert "by_subcategory" in data, "Missing by_subcategory stats"
        
        # Validate global stats
        global_stats = data["global"]
        assert "total" in global_stats, "Missing total in global stats"


class TestExportRefactored:
    """Test export endpoints after helper extraction"""
    
    def test_export_full_backup(self, auth_headers):
        """GET /api/export/full returns export data with all collections"""
        response = requests.get(f"{BASE_URL}/api/export/full", headers=auth_headers)
        assert response.status_code == 200, f"Export full failed: {response.text}"
        
        data = response.json()
        # Validate response structure (uses _collect_export_data helper)
        assert "export_metadata" in data, "Missing export_metadata"
        assert "company" in data, "Missing company"
        assert "fiscal_years" in data, "Missing fiscal_years"
        assert "activities" in data, "Missing activities"
        assert "products" in data, "Missing products"
        assert "emission_factors" in data, "Missing emission_factors"
        assert "subcategories" in data, "Missing subcategories"
        assert "statistics" in data, "Missing statistics"
        
        # Validate metadata
        metadata = data["export_metadata"]
        assert "exported_at" in metadata, "Missing exported_at in metadata"
        assert "version" in metadata, "Missing version in metadata"


class TestActivitiesRefactored:
    """Test activities endpoints after helper extraction"""
    
    def test_get_activities_list(self, auth_headers):
        """GET /api/activities returns activities list"""
        response = requests.get(f"{BASE_URL}/api/activities?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Get activities failed: {response.text}"
        
        data = response.json()
        # Should be paginated response
        assert "data" in data, "Missing data in response"
        assert "pagination" in data, "Missing pagination in response"
        assert isinstance(data["data"], list), "data should be a list"
    
    def test_create_activity_with_multi_impact(self, auth_headers):
        """POST /api/activities creates a new activity with multi-impact processing"""
        # First get a fiscal year
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) == 0:
            pytest.skip("No fiscal years available for testing")
        
        fiscal_year_id = fiscal_years[0]["id"]
        
        # Create a simple activity (uses _compute_impact_emissions, _get_factor_impacts helpers)
        activity_data = {
            "name": "TEST_Activity_Refactoring_Phase_A",
            "scope": "scope1",
            "category_id": "combustibles_energie",
            "quantity": 100,
            "unit": "kWh",
            "fiscal_year_id": fiscal_year_id,
            "manual_emission_factor": 0.5,
            "comments": "Test activity for refactoring validation"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=auth_headers,
            json=activity_data
        )
        assert response.status_code in [200, 201], f"Create activity failed: {response.text}"
        
        data = response.json()
        
        # Handle both single activity and group response
        if "group_id" in data and data["group_id"] is not None:
            # Multi-impact response
            assert "activities" in data
            activity_id = data["activities"][0]["id"]
        else:
            # Single activity response
            assert "id" in data, "Missing id in created activity"
            activity_id = data["id"]
        
        # Clean up - delete the created activity
        requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
