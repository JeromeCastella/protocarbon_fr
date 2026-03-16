"""
Test backend validation: Duplicate scenario_id + year should fail with 400
Tests the new validation that prevents creating a scenario fiscal year
if the same scenario entity already has a fiscal year for that year.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


class TestScenarioDuplicateValidation:
    """Test duplicate scenario_id + year validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        yield
    
    def test_01_duplicate_scenario_year_returns_400(self):
        """Test that creating a scenario fiscal year with same scenario_id+year returns 400"""
        # 'Stratégie climat' already has a fiscal year for 2028 and 2029
        # Scenario entity ID: 69b861116d78410dcf24a3a8
        # Try to create another one for 2028 - should fail
        
        # Get fiscal years to find a source to duplicate from
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        # Find the existing Stratégie climat 2028 fiscal year to get its ID
        source_fy = None
        for fy in fiscal_years:
            if fy.get('type') != 'scenario' and fy.get('year') == 2029:
                source_fy = fy
                break
        
        if not source_fy:
            source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario'), None)
        
        assert source_fy is not None, "No source fiscal year found"
        print(f"Source FY: {source_fy.get('name')} (id={source_fy.get('id')})")
        
        # Try to create a scenario for 'Stratégie climat' for year 2028 (already exists)
        duplicate_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": 2028,  # Already exists for 'Stratégie climat'
                "duplicate_activities": False,
                "is_scenario": True,
                "scenario_id": "69b861116d78410dcf24a3a8"  # Stratégie climat entity ID
            }
        )
        
        # Should return 400 because 'Stratégie climat' already has 2028
        assert duplicate_response.status_code == 400, f"Expected 400, got {duplicate_response.status_code}: {duplicate_response.text}"
        
        error_detail = duplicate_response.json().get('detail', '')
        print(f"Correctly rejected with error: {error_detail}")
        assert "déjà un exercice pour l'année" in error_detail or "already" in error_detail.lower(), \
            f"Error message should mention year already exists, got: {error_detail}"
    
    def test_02_same_scenario_different_year_succeeds(self):
        """Test that creating a scenario with same scenario_id but different year succeeds"""
        # 'Plan de transition' only has 2030 (scenario_id=69b861126d78410dcf24a3a9)
        # Create one for 2031 - should succeed
        
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        fiscal_years = fy_response.json()
        
        source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario'), None)
        assert source_fy is not None
        
        # Create scenario for 'Plan de transition' for year 2035 (doesn't exist yet)
        create_response = self.session.post(
            f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate",
            json={
                "new_year": 2035,  # New year for this scenario
                "duplicate_activities": False,
                "is_scenario": True,
                "scenario_id": "69b861126d78410dcf24a3a9"  # Plan de transition entity ID
            }
        )
        
        assert create_response.status_code == 200, f"Expected 200, got {create_response.status_code}: {create_response.text}"
        
        result = create_response.json()
        created_id = result.get('id')
        print(f"Successfully created scenario: {result.get('name')} (id={created_id})")
        
        # Verify it was created with type scenario
        assert result.get('type') == 'scenario', f"Expected type=scenario, got {result.get('type')}"
        
        # Verify the created fiscal year has correct scenario_id by fetching it
        if created_id:
            fy_detail = self.session.get(f"{BASE_URL}/api/fiscal-years/{created_id}")
            if fy_detail.status_code == 200:
                fy_data = fy_detail.json()
                assert fy_data.get('scenario_id') == "69b861126d78410dcf24a3a9", f"Wrong scenario_id: {fy_data.get('scenario_id')}"
                assert fy_data.get('year') == 2035, f"Wrong year: {fy_data.get('year')}"
        
        # Cleanup: Delete the created scenario
        if created_id:
            delete_response = self.session.delete(f"{BASE_URL}/api/fiscal-years/{created_id}")
            assert delete_response.status_code == 200, f"Failed to cleanup: {delete_response.text}"
            print("Cleaned up test scenario")
    
    def test_03_scenario_entity_dropdown_shows_entities_not_fiscal_years(self):
        """Test that scenarios endpoint returns scenario entities, not fiscal year names"""
        response = self.session.get(f"{BASE_URL}/api/scenarios")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        scenarios = response.json()
        assert isinstance(scenarios, list), "Expected list of scenarios"
        
        print(f"Found {len(scenarios)} scenario entities:")
        for s in scenarios:
            print(f"  - {s.get('name')} (id={s.get('id')})")
        
        # Check that these are entity names, not fiscal year names
        entity_names = [s.get('name') for s in scenarios]
        
        # Should have entity names like "Stratégie climat", NOT fiscal year names like "Scénario 2028 — Stratégie climat"
        for name in entity_names:
            assert not name.startswith("Scénario 20"), f"Found fiscal year name instead of entity: {name}"
        
        # Should find our test entities
        assert "Stratégie climat" in entity_names, "Missing 'Stratégie climat' entity"
        assert "Plan de transition" in entity_names, "Missing 'Plan de transition' entity"
        
    def test_04_verify_strategie_climat_has_two_periods(self):
        """Verify 'Stratégie climat' entity has fiscal years for both 2028 and 2029"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        
        fiscal_years = fy_response.json()
        
        # Filter by scenario_id for 'Stratégie climat'
        strategie_climat_id = "69b861116d78410dcf24a3a8"
        strategie_fys = [
            fy for fy in fiscal_years 
            if fy.get('scenario_id') == strategie_climat_id and fy.get('type') == 'scenario'
        ]
        
        print(f"Stratégie climat has {len(strategie_fys)} fiscal years:")
        years = []
        for fy in strategie_fys:
            print(f"  - {fy.get('name')} (year={fy.get('year')})")
            years.append(fy.get('year'))
        
        # Should have exactly 2 periods: 2028 and 2029
        assert len(strategie_fys) == 2, f"Expected 2 fiscal years, found {len(strategie_fys)}"
        assert 2028 in years, "Missing year 2028"
        assert 2029 in years, "Missing year 2029"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
