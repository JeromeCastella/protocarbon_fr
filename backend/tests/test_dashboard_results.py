"""
Tests for Dashboard Results Tab APIs
Tests: /api/dashboard/summary, /api/dashboard/kpis, /api/dashboard/fiscal-comparison, /api/dashboard/scope-breakdown
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://emission-hub-3.preview.emergentagent.com')

# Test credentials
# credentials from conftest_credentials
# credentials from conftest_credentials


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardSummary:
    """Tests for /api/dashboard/summary endpoint"""
    
    def test_get_summary_returns_200(self, auth_headers):
        """Test that summary endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
    
    def test_summary_has_total_emissions(self, auth_headers):
        """Test that summary contains total_emissions field"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        data = response.json()
        assert "total_emissions" in data
        assert isinstance(data["total_emissions"], (int, float))
    
    def test_summary_has_scope_emissions(self, auth_headers):
        """Test that summary contains scope_emissions breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        data = response.json()
        assert "scope_emissions" in data
        scope_emissions = data["scope_emissions"]
        assert "scope1" in scope_emissions
        assert "scope2" in scope_emissions
        assert "scope3_amont" in scope_emissions
        assert "scope3_aval" in scope_emissions
    
    def test_summary_has_scope_completion(self, auth_headers):
        """Test that summary contains scope_completion for progress tracking"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        data = response.json()
        assert "scope_completion" in data
        for scope in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
            assert scope in data["scope_completion"]
            assert "categories_filled" in data["scope_completion"][scope]
            assert "total_categories" in data["scope_completion"][scope]
            assert "percentage" in data["scope_completion"][scope]
    
    def test_summary_with_fiscal_year_filter(self, auth_headers):
        """Test summary with fiscal_year_id filter"""
        # First get fiscal years
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) > 0:
            fy_id = fiscal_years[0]["id"]
            response = requests.get(f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={fy_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "total_emissions" in data


class TestDashboardKPIs:
    """Tests for /api/dashboard/kpis endpoint - KPI cards data"""
    
    def test_get_kpis_returns_200(self, auth_headers):
        """Test that KPIs endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
    
    def test_kpis_has_current_emissions(self, auth_headers):
        """Test that KPIs contains current_emissions for total emissions KPI card"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        data = response.json()
        assert "current_emissions" in data
    
    def test_kpis_has_emissions_per_revenue(self, auth_headers):
        """Test that KPIs contains emissions_per_revenue for Émissions/kCHF KPI card"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        data = response.json()
        assert "emissions_per_revenue" in data
    
    def test_kpis_has_year_over_year_change(self, auth_headers):
        """Test that KPIs contains year_over_year_change for Variation N-1 KPI card"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        data = response.json()
        assert "year_over_year_change" in data
    
    def test_kpis_has_fiscal_year_info(self, auth_headers):
        """Test that KPIs contains fiscal year information"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        data = response.json()
        assert "current_fiscal_year" in data
        assert "previous_fiscal_year" in data


class TestDashboardFiscalComparison:
    """Tests for /api/dashboard/fiscal-comparison endpoint - Evolution chart data"""
    
    def test_get_fiscal_comparison_returns_200(self, auth_headers):
        """Test that fiscal comparison endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        assert response.status_code == 200
    
    def test_fiscal_comparison_returns_list(self, auth_headers):
        """Test that fiscal comparison returns a list of fiscal years"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        data = response.json()
        assert isinstance(data, list)
    
    def test_fiscal_comparison_has_required_fields(self, auth_headers):
        """Test that each fiscal year entry has required fields for stacked bar chart"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        data = response.json()
        
        if len(data) > 0:
            entry = data[0]
            # Required fields for Evolution chart
            assert "year" in entry  # X-axis label
            assert "scope1" in entry  # Stacked bar segment
            assert "scope2" in entry  # Stacked bar segment
            assert "scope3_amont" in entry  # Stacked bar segment
            assert "scope3_aval" in entry  # Stacked bar segment
            assert "total_emissions" in entry
    
    def test_fiscal_comparison_has_multiple_years(self, auth_headers):
        """Test that fiscal comparison returns data for multiple years"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        data = response.json()
        # Should have at least 2 fiscal years for comparison
        assert len(data) >= 2, "Should have at least 2 fiscal years for evolution chart"


class TestDashboardScopeBreakdown:
    """Tests for /api/dashboard/scope-breakdown/{fiscal_year_id} endpoint - Scope chart data"""
    
    def test_get_scope_breakdown_current_returns_200(self, auth_headers):
        """Test that scope breakdown for 'current' returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        assert response.status_code == 200
    
    def test_scope_breakdown_has_scopes(self, auth_headers):
        """Test that scope breakdown contains scopes data for bar chart"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        data = response.json()
        assert "scopes" in data
        scopes = data["scopes"]
        assert "scope1" in scopes
        assert "scope2" in scopes
        assert "scope3_amont" in scopes
        assert "scope3_aval" in scopes
    
    def test_scope_breakdown_has_categories_for_drilldown(self, auth_headers):
        """Test that each scope has categories for drill-down functionality"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        data = response.json()
        
        for scope_key, scope_data in data["scopes"].items():
            assert "total" in scope_data
            assert "categories" in scope_data
            assert isinstance(scope_data["categories"], dict)
    
    def test_scope_breakdown_with_specific_fiscal_year(self, auth_headers):
        """Test scope breakdown with specific fiscal year ID"""
        # First get fiscal years
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) > 0:
            fy_id = fiscal_years[0]["id"]
            response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/{fy_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "scopes" in data
            assert "fiscal_year" in data
    
    def test_scope_breakdown_has_total(self, auth_headers):
        """Test that scope breakdown includes total emissions"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        data = response.json()
        assert "total" in data
        assert isinstance(data["total"], (int, float))


class TestTop10Subcategories:
    """Tests for Top 10 subcategories data (derived from scope breakdown)"""
    
    def test_scope_breakdown_provides_category_data(self, auth_headers):
        """Test that scope breakdown provides enough data for Top 10 subcategories"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        data = response.json()
        
        # Collect all categories from all scopes
        all_categories = {}
        for scope_key, scope_data in data["scopes"].items():
            for cat_name, cat_value in scope_data.get("categories", {}).items():
                if cat_name in all_categories:
                    all_categories[cat_name] += cat_value
                else:
                    all_categories[cat_name] = cat_value
        
        # Should have some categories for the Top 10 list
        assert len(all_categories) > 0, "Should have at least some categories for Top 10 list"
