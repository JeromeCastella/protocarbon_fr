"""
Test reporting_view parameter support across Dashboard and Objectives APIs.
Bug fix: Toggle market/location wasn't being passed to all dashboard APIs.
Now all endpoints accept reporting_view param: summary, kpis, scope-breakdown, fiscal-comparison, trajectory.
"""
import pytest
import requests
import os

from conftest_credentials import TEST_BASE_URL as BASE_URL, TEST_ADMIN_EMAIL as TEST_EMAIL, TEST_ADMIN_PASSWORD as TEST_PASSWORD


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardSummaryReportingView:
    """Test /api/dashboard/summary accepts reporting_view param"""
    
    def test_summary_without_reporting_view(self, auth_headers):
        """Summary endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_emissions" in data
        assert "scope_emissions" in data
        assert "has_market_based" in data
        # Default should be 'market'
        assert data.get("reporting_view") == "market"
    
    def test_summary_with_market_view(self, auth_headers):
        """Summary endpoint accepts reporting_view=market"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary?reporting_view=market", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("reporting_view") == "market"
    
    def test_summary_with_location_view(self, auth_headers):
        """Summary endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("reporting_view") == "location"


class TestDashboardKpisReportingView:
    """Test /api/dashboard/kpis accepts reporting_view param (NEW)"""
    
    def test_kpis_without_reporting_view(self, auth_headers):
        """KPIs endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "current_emissions" in data
        assert "activities_count" in data
    
    def test_kpis_with_market_view(self, auth_headers):
        """KPIs endpoint accepts reporting_view=market"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?reporting_view=market", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "current_emissions" in data
    
    def test_kpis_with_location_view(self, auth_headers):
        """KPIs endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "current_emissions" in data


class TestDashboardScopeBreakdownReportingView:
    """Test /api/dashboard/scope-breakdown/{id} accepts reporting_view param (NEW)"""
    
    def test_scope_breakdown_current_without_reporting_view(self, auth_headers):
        """Scope breakdown endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scopes" in data
        assert "total" in data
    
    def test_scope_breakdown_current_with_market_view(self, auth_headers):
        """Scope breakdown endpoint accepts reporting_view=market"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current?reporting_view=market", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scopes" in data
    
    def test_scope_breakdown_current_with_location_view(self, auth_headers):
        """Scope breakdown endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/dashboard/scope-breakdown/current?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scopes" in data


class TestDashboardFiscalComparisonReportingView:
    """Test /api/dashboard/fiscal-comparison accepts reporting_view param (NEW)"""
    
    def test_fiscal_comparison_without_reporting_view(self, auth_headers):
        """Fiscal comparison endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Returns a list of fiscal years with emissions
        assert isinstance(data, list)
    
    def test_fiscal_comparison_with_market_view(self, auth_headers):
        """Fiscal comparison endpoint accepts reporting_view=market"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison?reporting_view=market", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_fiscal_comparison_with_location_view(self, auth_headers):
        """Fiscal comparison endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/dashboard/fiscal-comparison?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestObjectivesTrajectoryReportingView:
    """Test /api/objectives/trajectory accepts reporting_view param (NEW)"""
    
    def test_trajectory_without_reporting_view(self, auth_headers):
        """Trajectory endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trajectory" in data
        assert "actuals" in data
    
    def test_trajectory_with_market_view(self, auth_headers):
        """Trajectory endpoint accepts reporting_view=market"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory?reporting_view=market", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trajectory" in data
        assert "actuals" in data
    
    def test_trajectory_with_location_view(self, auth_headers):
        """Trajectory endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trajectory" in data
        assert "actuals" in data


class TestCategoryStatsReportingView:
    """Test /api/dashboard/category-stats accepts reporting_view param"""
    
    def test_category_stats_without_reporting_view(self, auth_headers):
        """Category stats endpoint works without reporting_view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_category_stats_with_location_view(self, auth_headers):
        """Category stats endpoint accepts reporting_view=location"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats?reporting_view=location", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestCombinedParams:
    """Test reporting_view works with other params like fiscal_year_id"""
    
    def test_summary_with_fiscal_year_and_reporting_view(self, auth_headers):
        """Summary accepts both fiscal_year_id and reporting_view"""
        # First get fiscal years
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        if fiscal_years:
            fy_id = fiscal_years[0].get("id")
            response = requests.get(
                f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={fy_id}&reporting_view=location",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("reporting_view") == "location"
    
    def test_kpis_with_fiscal_year_and_reporting_view(self, auth_headers):
        """KPIs accepts both fiscal_year_id and reporting_view"""
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=auth_headers)
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        if fiscal_years:
            fy_id = fiscal_years[0].get("id")
            response = requests.get(
                f"{BASE_URL}/api/dashboard/kpis?fiscal_year_id={fy_id}&reporting_view=location",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "current_emissions" in data
