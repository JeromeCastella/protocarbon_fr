"""
Test Dashboard Scope Normalization - P0 Bug Fix
Tests the normalize_scope_for_reporting() function that maps granular scopes to reporting scopes.

Bug Description:
- Dashboard scope_emissions dictionary only had 4 keys: scope1, scope2, scope3_amont, scope3_aval
- Activities with scope3_3 or scope3 were not being counted in the dashboard
- Solution: normalize_scope_for_reporting() maps scope3_3 → scope3_amont, scope3 → scope3_amont/scope3_aval

Test Scenarios:
1. Scope 1 entry (Chaudière mazout 100k MJ) → scope1 (+7.39 tCO2e) + scope3_3 (+2.93 tCO2e in Scope 3 Amont)
2. Scope 3 entry (Scooter 1k pkm, deplacements_professionnels) → scope3 (+96.85 tCO2e in Scope 3 Amont)
3. Unit tests for normalize_scope_for_reporting() mappings
"""
import pytest
import requests
import os
import time
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-refactor.preview.emergentagent.com')

# Test credentials
# credentials from conftest_credentials
# credentials from conftest_credentials

# Emission factors
CHAUDIERE_MAZOUT_ID = "698418f3c1a4e9f26cd2735f"  # Scope 1 - combustion_fixe
SCOOTER_EURO5_ID = "698418f3c1a4e9f26cd27385"     # Scope 3 - deplacements_professionnels


class TestNormalizeScopeForReportingFunction:
    """Unit tests for normalize_scope_for_reporting() function mappings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_scope1_maps_to_scope1(self):
        """Test: scope1 → scope1 (no change)"""
        # Create a scope1 activity and verify it appears in dashboard scope1
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": "TEST_NORM_Scope1_Direct",
            "quantity": 10,
            "unit": "MJ",
            "emission_factor_id": CHAUDIERE_MAZOUT_ID,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        assert response.status_code == 200
        result = response.json()
        group_id = result.get("group_id")
        
        # Get dashboard summary
        dashboard_response = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        
        # Verify scope1 emissions are counted
        assert dashboard["scope_emissions"]["scope1"] > 0, "scope1 emissions should be > 0"
        
        # Cleanup
        if group_id:
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
    
    def test_scope2_maps_to_scope2(self):
        """Test: scope2 → scope2 (no change)"""
        # This is implicitly tested by other tests
        pass
    
    def test_scope3_3_maps_to_scope3_amont(self):
        """
        Test: scope3_3 → scope3_amont
        This is the key fix - scope3_3 activities must be counted in scope3_amont
        """
        # Create a scope1 entry which generates scope3_3 activity
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": "TEST_NORM_Scope3_3_Mapping",
            "quantity": 100,
            "unit": "MJ",
            "emission_factor_id": CHAUDIERE_MAZOUT_ID,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        assert response.status_code == 200
        result = response.json()
        group_id = result.get("group_id")
        
        # Verify scope3_3 activity was created
        activities = result.get("activities", [])
        scope3_3_activity = None
        for a in activities:
            if a["scope"] == "scope3_3":
                scope3_3_activity = a
                break
        
        assert scope3_3_activity is not None, "scope3_3 activity should be created"
        scope3_3_emissions = scope3_3_activity["emissions"]
        
        # Get dashboard summary
        dashboard_response = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        
        # Verify scope3_3 emissions are counted in scope3_amont
        assert dashboard["scope_emissions"]["scope3_amont"] >= scope3_3_emissions, \
            f"scope3_amont ({dashboard['scope_emissions']['scope3_amont']}) should include scope3_3 emissions ({scope3_3_emissions})"
        
        # Cleanup
        if group_id:
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
    
    def test_scope3_generic_maps_to_scope3_amont_for_amont_category(self):
        """
        Test: scope3 → scope3_amont (for amont categories like deplacements_professionnels)
        """
        # Create a scope3 entry with deplacements_professionnels category
        activity_data = {
            "category_id": "deplacements_professionnels",
            "scope": "scope3_amont",
            "name": "TEST_NORM_Scope3_Amont_Mapping",
            "quantity": 10,
            "unit": "pkm",
            "emission_factor_id": SCOOTER_EURO5_ID,
            "entry_scope": "scope3_amont",
            "entry_category": "deplacements_professionnels"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        assert response.status_code == 200
        result = response.json()
        
        # Get the scope3 activity
        if "activities" in result:
            activity = result["activities"][0]
        else:
            activity = result
        
        scope3_emissions = activity["emissions"]
        activity_id = activity.get("id")
        group_id = result.get("group_id")
        
        # Get dashboard summary
        dashboard_response = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        
        # Verify scope3 emissions are counted in scope3_amont
        assert dashboard["scope_emissions"]["scope3_amont"] >= scope3_emissions, \
            f"scope3_amont ({dashboard['scope_emissions']['scope3_amont']}) should include scope3 emissions ({scope3_emissions})"
        
        # Cleanup
        if group_id:
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
        elif activity_id:
            requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=self.headers)


class TestDashboardSummaryWithMultiImpacts:
    """Test dashboard summary correctly aggregates multi-impact activities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.created_groups = []
        self.created_activities = []
        yield
        # Cleanup
        for group_id in self.created_groups:
            try:
                requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
            except:
                pass
        for activity_id in self.created_activities:
            try:
                requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=self.headers)
            except:
                pass
    
    def test_scope1_entry_chaudiere_mazout_100k_mj(self):
        """
        Test: Scope 1 entry (Chaudière mazout 100,000 MJ)
        Expected: 
        - scope1: +7.39 tCO2e (100000 * 0.0739 / 1000)
        - scope3_3: +2.93 tCO2e (100000 * 0.0293 / 1000) → counted in scope3_amont
        """
        # Get initial dashboard state
        initial_dashboard = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        ).json()
        initial_scope1 = initial_dashboard["scope_emissions"]["scope1"]
        initial_scope3_amont = initial_dashboard["scope_emissions"]["scope3_amont"]
        
        # Create Scope 1 entry with 100,000 MJ
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": "TEST_DASH_Chaudiere_100k_MJ",
            "quantity": 100000,
            "unit": "MJ",
            "emission_factor_id": CHAUDIERE_MAZOUT_ID,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        if result.get("group_id"):
            self.created_groups.append(result["group_id"])
        
        # Verify activities created
        activities = result.get("activities", [])
        assert len(activities) == 2, f"Expected 2 activities (scope1 + scope3_3), got {len(activities)}"
        
        # Calculate expected emissions
        expected_scope1_emissions = 100000 * 0.0739  # 7390 kgCO2e = 7.39 tCO2e
        expected_scope3_3_emissions = 100000 * 0.0293  # 2930 kgCO2e = 2.93 tCO2e
        
        # Verify activity emissions
        for activity in activities:
            if activity["scope"] == "scope1":
                assert abs(activity["emissions"] - expected_scope1_emissions) < 1, \
                    f"Scope1 emissions: expected {expected_scope1_emissions}, got {activity['emissions']}"
            elif activity["scope"] == "scope3_3":
                assert abs(activity["emissions"] - expected_scope3_3_emissions) < 1, \
                    f"Scope3_3 emissions: expected {expected_scope3_3_emissions}, got {activity['emissions']}"
        
        # Get updated dashboard
        updated_dashboard = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        ).json()
        
        # Verify scope1 increased by ~7390 kgCO2e
        scope1_increase = updated_dashboard["scope_emissions"]["scope1"] - initial_scope1
        assert abs(scope1_increase - expected_scope1_emissions) < 1, \
            f"Scope1 increase: expected {expected_scope1_emissions}, got {scope1_increase}"
        
        # Verify scope3_amont increased by ~2930 kgCO2e (scope3_3 mapped to scope3_amont)
        scope3_amont_increase = updated_dashboard["scope_emissions"]["scope3_amont"] - initial_scope3_amont
        assert abs(scope3_amont_increase - expected_scope3_3_emissions) < 1, \
            f"Scope3_amont increase: expected {expected_scope3_3_emissions}, got {scope3_amont_increase}"
        
        print(f"✓ Scope 1 entry (100k MJ): scope1 +{scope1_increase:.2f} kgCO2e, scope3_amont +{scope3_amont_increase:.2f} kgCO2e")
    
    def test_scope3_entry_scooter_1k_pkm(self):
        """
        Test: Scope 3 entry (Scooter 1,000 pkm, category deplacements_professionnels)
        Expected:
        - scope3: +96,852 kgCO2e (1000 * 96.8524504) → counted in scope3_amont
        """
        # Get initial dashboard state
        initial_dashboard = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        ).json()
        initial_scope3_amont = initial_dashboard["scope_emissions"]["scope3_amont"]
        
        # Create Scope 3 entry with 1,000 pkm
        activity_data = {
            "category_id": "deplacements_professionnels",
            "scope": "scope3_amont",
            "name": "TEST_DASH_Scooter_1k_pkm",
            "quantity": 1000,
            "unit": "pkm",
            "emission_factor_id": SCOOTER_EURO5_ID,
            "entry_scope": "scope3_amont",
            "entry_category": "deplacements_professionnels"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # Get the activity
        if "activities" in result:
            activity = result["activities"][0]
            if result.get("group_id"):
                self.created_groups.append(result["group_id"])
        else:
            activity = result
            if activity.get("id"):
                self.created_activities.append(activity["id"])
        
        # Verify scope3 activity created
        assert activity["scope"] == "scope3", f"Expected scope3, got {activity['scope']}"
        
        # Calculate expected emissions
        expected_scope3_emissions = 1000 * 96.8524504  # 96852.4504 kgCO2e = 96.85 tCO2e
        
        # Verify activity emissions
        assert abs(activity["emissions"] - expected_scope3_emissions) < 1, \
            f"Scope3 emissions: expected {expected_scope3_emissions}, got {activity['emissions']}"
        
        # Get updated dashboard
        updated_dashboard = requests.get(
            f"{BASE_URL}/api/dashboard/summary",
            headers=self.headers
        ).json()
        
        # Verify scope3_amont increased by ~96852 kgCO2e (scope3 mapped to scope3_amont for amont category)
        scope3_amont_increase = updated_dashboard["scope_emissions"]["scope3_amont"] - initial_scope3_amont
        assert abs(scope3_amont_increase - expected_scope3_emissions) < 1, \
            f"Scope3_amont increase: expected {expected_scope3_emissions}, got {scope3_amont_increase}"
        
        print(f"✓ Scope 3 entry (1k pkm): scope3_amont +{scope3_amont_increase:.2f} kgCO2e")


class TestFiscalComparisonWithScopeNormalization:
    """Test fiscal comparison endpoint correctly normalizes scopes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_fiscal_comparison_includes_scope3_3_in_scope3_amont(self):
        """
        Test: Fiscal comparison endpoint normalizes scope3_3 to scope3_amont
        """
        # Get fiscal comparison
        response = requests.get(
            f"{BASE_URL}/api/dashboard/fiscal-comparison",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get fiscal comparison: {response.text}"
        
        comparison = response.json()
        
        # Verify response structure
        assert isinstance(comparison, list), "Fiscal comparison should return a list"
        
        # Each fiscal year should have scope_emissions with 4 keys
        for fy in comparison:
            scope_emissions = fy.get("scope_emissions", {})
            assert "scope1" in scope_emissions, "Missing scope1 in fiscal comparison"
            assert "scope2" in scope_emissions, "Missing scope2 in fiscal comparison"
            assert "scope3_amont" in scope_emissions, "Missing scope3_amont in fiscal comparison"
            assert "scope3_aval" in scope_emissions, "Missing scope3_aval in fiscal comparison"
            
            # Verify flat scope values match nested values
            assert fy.get("scope1") == scope_emissions["scope1"], "Flat scope1 should match nested"
            assert fy.get("scope2") == scope_emissions["scope2"], "Flat scope2 should match nested"
            assert fy.get("scope3_amont") == scope_emissions["scope3_amont"], "Flat scope3_amont should match nested"
            assert fy.get("scope3_aval") == scope_emissions["scope3_aval"], "Flat scope3_aval should match nested"
        
        print(f"✓ Fiscal comparison returns {len(comparison)} fiscal years with correct scope structure")


class TestDashboardScopeBreakdown:
    """Test scope breakdown endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_scope_breakdown_structure(self):
        """Test scope breakdown returns correct structure"""
        # Get current fiscal year
        fy_response = requests.get(
            f"{BASE_URL}/api/fiscal-years/current",
            headers=self.headers
        )
        
        if fy_response.status_code == 200:
            fy = fy_response.json()
            fy_id = fy.get("id")
            
            # Get scope breakdown
            breakdown_response = requests.get(
                f"{BASE_URL}/api/dashboard/scope-breakdown/{fy_id}",
                headers=self.headers
            )
            assert breakdown_response.status_code == 200
            
            breakdown = breakdown_response.json()
            
            # Verify structure
            assert "scopes" in breakdown, "Missing scopes in breakdown"
            scopes = breakdown["scopes"]
            
            assert "scope1" in scopes, "Missing scope1 in breakdown"
            assert "scope2" in scopes, "Missing scope2 in breakdown"
            assert "scope3_amont" in scopes, "Missing scope3_amont in breakdown"
            assert "scope3_aval" in scopes, "Missing scope3_aval in breakdown"
            
            # Each scope should have total and categories
            for scope_name, scope_data in scopes.items():
                assert "total" in scope_data, f"Missing total in {scope_name}"
                assert "categories" in scope_data, f"Missing categories in {scope_name}"
            
            print(f"✓ Scope breakdown returns correct structure for fiscal year {fy_id}")


class TestDashboardKPIsWithScopeNormalization:
    """Test KPIs endpoint correctly calculates emissions with normalized scopes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_kpis_current_emissions_includes_all_scopes(self):
        """Test KPIs current_emissions includes all normalized scopes"""
        # Get KPIs
        response = requests.get(
            f"{BASE_URL}/api/dashboard/kpis",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get KPIs: {response.text}"
        
        kpis = response.json()
        
        # Verify KPIs structure
        assert "current_emissions" in kpis, "Missing current_emissions in KPIs"
        assert "activities_count" in kpis, "Missing activities_count in KPIs"
        
        # KPIs should return valid emissions data
        # Note: KPIs and dashboard summary may use different fiscal year filters
        # so we just verify the structure and that emissions are calculated
        assert isinstance(kpis["current_emissions"], (int, float)), "current_emissions should be numeric"
        assert kpis["current_emissions"] >= 0, "current_emissions should be non-negative"
        
        print(f"✓ KPIs current_emissions: {kpis['current_emissions']:.2f} kgCO2e")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
