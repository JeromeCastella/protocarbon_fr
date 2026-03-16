"""
Test FEAT-02: Mode Scénario sur les exercices
Tests scenario creation, retrieval, and dashboard integration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


class TestScenarioFeature:
    """Test cases for scenario mode functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token and store it"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")  # API returns 'token' not 'access_token'
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        yield
        
        # Cleanup: Delete any test scenarios created
        # We'll handle cleanup individually in tests
    
    def test_01_login_and_get_fiscal_years(self):
        """Test login works and fiscal years can be fetched"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200, f"Failed to get fiscal years: {response.text}"
        
        fiscal_years = response.json()
        assert isinstance(fiscal_years, list), "Expected list of fiscal years"
        assert len(fiscal_years) > 0, "Expected at least one fiscal year"
        
        # Print available fiscal years for debugging
        print(f"Found {len(fiscal_years)} fiscal years:")
        for fy in fiscal_years:
            fy_type = fy.get('type', 'actual')
            print(f"  - {fy.get('name')} (year={fy.get('year')}, type={fy_type}, status={fy.get('status')})")
    
    def test_02_get_current_fiscal_year_excludes_scenarios(self):
        """Test that /fiscal-years/current excludes scenarios"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years/current")
        assert response.status_code == 200, f"Failed to get current fiscal year: {response.text}"
        
        current_fy = response.json()
        # Verify it's not a scenario
        fy_type = current_fy.get('type', 'actual')
        assert fy_type != 'scenario', f"Current fiscal year should not be a scenario, got type={fy_type}"
        print(f"Current fiscal year: {current_fy.get('name')} (type={fy_type})")
    
    def test_03_create_scenario_via_duplicate(self):
        """Test creating a scenario by duplicating an existing fiscal year"""
        # First get fiscal years to find one to duplicate
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        # Find a suitable fiscal year to duplicate (prefer 2025 closed one)
        source_fy = None
        for fy in fiscal_years:
            if fy.get('type') != 'scenario':
                source_fy = fy
                if fy.get('year') == 2025:
                    break
        
        assert source_fy is not None, "No fiscal year found to duplicate"
        print(f"Source FY for duplication: {source_fy.get('name')} (id={source_fy.get('id')})")
        
        # Create scenario via duplicate endpoint
        scenario_name = "TEST_Plan décarbonation"
        target_year = source_fy.get('year', 2025)  # Same year as source (allowed for scenarios)
        
        duplicate_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": target_year,
                "duplicate_activities": True,
                "activity_ids_to_duplicate": [],
                "is_scenario": True,
                "scenario_name": scenario_name
            }
        )
        
        assert duplicate_response.status_code == 200, f"Failed to create scenario: {duplicate_response.text}"
        
        result = duplicate_response.json()
        assert result.get('type') == 'scenario', f"Expected type='scenario', got {result.get('type')}"
        assert 'id' in result, "Response should contain scenario ID"
        
        print(f"Created scenario: id={result.get('id')}, type={result.get('type')}")
        
        # Store for cleanup
        self.created_scenario_id = result.get('id')
        
        # Verify scenario appears in fiscal years list
        verify_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert verify_response.status_code == 200
        all_fys = verify_response.json()
        
        created_scenario = next((fy for fy in all_fys if fy.get('id') == result.get('id')), None)
        assert created_scenario is not None, "Created scenario not found in fiscal years list"
        assert created_scenario.get('type') == 'scenario'
        assert created_scenario.get('scenario_name') == scenario_name
        
        print(f"Verified scenario in list: {created_scenario.get('name')}, scenario_name={created_scenario.get('scenario_name')}")
        
        # Cleanup: Delete the test scenario
        delete_response = self.session.delete(f"{BASE_URL}/api/fiscal-years/{result.get('id')}")
        assert delete_response.status_code == 200, f"Failed to delete test scenario: {delete_response.text}"
        print("Test scenario cleaned up successfully")
    
    def test_04_scenario_requires_name(self):
        """Test that creating a scenario without a name fails"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario'), None)
        assert source_fy is not None
        
        # Try to create scenario without name
        duplicate_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": 2027,
                "duplicate_activities": False,
                "is_scenario": True,
                "scenario_name": ""  # Empty name
            }
        )
        
        # Should fail with 400
        assert duplicate_response.status_code == 400, f"Expected 400 for scenario without name, got {duplicate_response.status_code}"
        print(f"Correctly rejected scenario without name: {duplicate_response.json()}")
    
    def test_05_get_scenarios_for_year(self):
        """Test GET /api/fiscal-years/scenarios/{year} endpoint"""
        # First create a scenario for a specific year
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario' and fy.get('year')), None)
        assert source_fy is not None
        
        target_year = source_fy.get('year')
        
        # Create test scenario
        create_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": target_year,
                "duplicate_activities": False,
                "is_scenario": True,
                "scenario_name": "TEST_Scenario for year endpoint"
            }
        )
        
        assert create_response.status_code == 200
        scenario_id = create_response.json().get('id')
        
        try:
            # Test the scenarios endpoint
            scenarios_response = self.session.get(f"{BASE_URL}/api/fiscal-years/scenarios/{target_year}")
            assert scenarios_response.status_code == 200, f"Failed to get scenarios: {scenarios_response.text}"
            
            scenarios = scenarios_response.json()
            assert isinstance(scenarios, list), "Expected list of scenarios"
            
            # Find our test scenario
            test_scenario = next((s for s in scenarios if s.get('id') == scenario_id), None)
            assert test_scenario is not None, f"Test scenario not found in scenarios list for year {target_year}"
            
            print(f"Found {len(scenarios)} scenarios for year {target_year}")
            for s in scenarios:
                print(f"  - {s.get('scenario_name')} (id={s.get('id')}, activities={s.get('activities_count')})")
        
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/fiscal-years/{scenario_id}")
            print("Test scenario cleaned up")
    
    def test_06_scenario_dashboard_summary(self):
        """Test dashboard summary works for scenarios"""
        # Get fiscal years
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        # Find a source fiscal year with activities
        source_fy = next((fy for fy in fiscal_years 
                         if fy.get('type') != 'scenario' 
                         and fy.get('activities_count', 0) > 0), None)
        
        if not source_fy:
            pytest.skip("No fiscal year with activities found")
        
        # Create scenario with activities
        create_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": source_fy.get('year'),
                "duplicate_activities": True,
                "is_scenario": True,
                "scenario_name": "TEST_Dashboard test scenario"
            }
        )
        
        assert create_response.status_code == 200
        scenario_id = create_response.json().get('id')
        
        try:
            # Test dashboard summary for scenario
            summary_response = self.session.get(f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={scenario_id}")
            assert summary_response.status_code == 200, f"Failed to get scenario summary: {summary_response.text}"
            
            summary = summary_response.json()
            print(f"Scenario summary: total_emissions={summary.get('total_emissions')}, activities_count={summary.get('activities_count')}")
            
            # Test scope breakdown for scenario
            breakdown_response = self.session.get(f"{BASE_URL}/api/dashboard/scope-breakdown/{scenario_id}")
            assert breakdown_response.status_code == 200, f"Failed to get scope breakdown: {breakdown_response.text}"
            
            breakdown = breakdown_response.json()
            print(f"Scenario breakdown: total={breakdown.get('total_emissions')}, scopes={list(breakdown.get('scopes', {}).keys())}")
            
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/fiscal-years/{scenario_id}")
            print("Test scenario cleaned up")
    
    def test_07_multiple_scenarios_same_year_allowed(self):
        """Test that multiple scenarios can exist for the same year"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario'), None)
        assert source_fy is not None
        
        target_year = source_fy.get('year')
        scenario_ids = []
        
        try:
            # Create first scenario
            response1 = self.session.post(
                f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
                json={
                    "new_year": target_year,
                    "duplicate_activities": False,
                    "is_scenario": True,
                    "scenario_name": "TEST_Scenario A"
                }
            )
            assert response1.status_code == 200
            scenario_ids.append(response1.json().get('id'))
            
            # Create second scenario for same year
            response2 = self.session.post(
                f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
                json={
                    "new_year": target_year,
                    "duplicate_activities": False,
                    "is_scenario": True,
                    "scenario_name": "TEST_Scenario B"
                }
            )
            assert response2.status_code == 200, f"Second scenario creation failed: {response2.text}"
            scenario_ids.append(response2.json().get('id'))
            
            print(f"Successfully created 2 scenarios for year {target_year}")
            
            # Verify both appear in scenarios endpoint
            scenarios_response = self.session.get(f"{BASE_URL}/api/fiscal-years/scenarios/{target_year}")
            assert scenarios_response.status_code == 200
            
            scenarios = scenarios_response.json()
            test_scenarios = [s for s in scenarios if s.get('id') in scenario_ids]
            assert len(test_scenarios) == 2, f"Expected 2 test scenarios, found {len(test_scenarios)}"
            
        finally:
            # Cleanup
            for sid in scenario_ids:
                self.session.delete(f"{BASE_URL}/api/fiscal-years/{sid}")
            print("Test scenarios cleaned up")
    
    def test_08_delete_scenario_does_not_affect_actual(self):
        """Test that deleting a scenario doesn't affect the source exercise"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        source_fy = next((fy for fy in fiscal_years 
                         if fy.get('type') != 'scenario' 
                         and fy.get('activities_count', 0) > 0), None)
        
        if not source_fy:
            pytest.skip("No fiscal year with activities found")
        
        source_id = source_fy.get('id')
        source_activities = source_fy.get('activities_count')
        
        # Create scenario
        create_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_id}/duplicate",
            json={
                "new_year": source_fy.get('year'),
                "duplicate_activities": True,
                "is_scenario": True,
                "scenario_name": "TEST_Scenario to delete"
            }
        )
        
        assert create_response.status_code == 200
        scenario_id = create_response.json().get('id')
        
        # Delete scenario
        delete_response = self.session.delete(f"{BASE_URL}/api/fiscal-years/{scenario_id}")
        assert delete_response.status_code == 200
        
        # Verify source still exists with same activities
        source_check = self.session.get(f"{BASE_URL}/api/fiscal-years/{source_id}")
        assert source_check.status_code == 200, "Source fiscal year should still exist"
        
        # Refresh fiscal years to check activity count
        fy_refresh = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_refresh.status_code == 200
        
        refreshed_source = next((fy for fy in fy_refresh.json() if fy.get('id') == source_id), None)
        assert refreshed_source is not None
        assert refreshed_source.get('activities_count') == source_activities, \
            f"Source activities changed from {source_activities} to {refreshed_source.get('activities_count')}"
        
        print(f"Source fiscal year still has {source_activities} activities after scenario deletion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
