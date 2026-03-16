"""
Test Scenario Entity CRUD + Integration with Fiscal Years Duplication
Tests: GET /api/scenarios, POST /api/scenarios, PUT /api/scenarios/{id}, DELETE /api/scenarios/{id}
Tests: Fiscal year duplicate with scenario_id linking
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


class TestScenarioEntityCRUD:
    """Test CRUD operations for scenario entities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
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
    
    # ===== GET /api/scenarios =====
    def test_01_list_scenarios_returns_existing_scenarios(self):
        """GET /api/scenarios returns list of existing scenarios with id, name, description"""
        response = self.session.get(f"{BASE_URL}/api/scenarios")
        assert response.status_code == 200, f"GET /api/scenarios failed: {response.text}"
        
        scenarios = response.json()
        assert isinstance(scenarios, list), "Expected list of scenarios"
        
        # Should have migrated scenarios
        print(f"Found {len(scenarios)} scenarios")
        for s in scenarios:
            assert "id" in s, "Scenario should have id"
            assert "name" in s, "Scenario should have name"
            assert "description" in s or s.get("description") == "", "Scenario should have description"
            print(f"  - {s.get('name')} (id={s.get('id')})")
        
        # Verify known migrated scenarios
        scenario_names = [s.get('name') for s in scenarios]
        assert any('Stratégie climat' in name for name in scenario_names), "Migrated 'Stratégie climat' not found"
        assert any('Plan de transition' in name for name in scenario_names), "Migrated 'Plan de transition' not found"
        assert any('Net zero' in name for name in scenario_names), "Migrated 'Net zero ma boite' not found"
    
    # ===== POST /api/scenarios =====
    def test_02_create_scenario_entity(self):
        """POST /api/scenarios creates a new scenario entity"""
        scenario_name = "TEST_Scenario_Entity_Create"
        create_response = self.session.post(f"{BASE_URL}/api/scenarios", json={
            "name": scenario_name,
            "description": "Test scenario for entity creation"
        })
        
        assert create_response.status_code == 200, f"POST /api/scenarios failed: {create_response.text}"
        
        created = create_response.json()
        assert "id" in created, "Response should have id"
        assert created.get("name") == scenario_name, f"Name mismatch: {created.get('name')}"
        assert created.get("description") == "Test scenario for entity creation"
        
        print(f"Created scenario entity: id={created.get('id')}, name={created.get('name')}")
        
        # Cleanup
        delete_response = self.session.delete(f"{BASE_URL}/api/scenarios/{created.get('id')}")
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print("Test scenario cleaned up")
    
    def test_03_create_scenario_requires_name(self):
        """POST /api/scenarios requires a name"""
        # Empty name
        response = self.session.post(f"{BASE_URL}/api/scenarios", json={
            "name": "",
            "description": "Test"
        })
        assert response.status_code == 400, f"Expected 400 for empty name, got {response.status_code}"
        
        # Whitespace only name
        response2 = self.session.post(f"{BASE_URL}/api/scenarios", json={
            "name": "   ",
            "description": "Test"
        })
        assert response2.status_code == 400, f"Expected 400 for whitespace name, got {response2.status_code}"
        print("Correctly rejected scenario without name")
    
    # ===== PUT /api/scenarios/{id} =====
    def test_04_update_scenario_name_propagates_to_fiscal_years(self):
        """PUT /api/scenarios/{id} updates scenario name and propagates to linked fiscal years"""
        # Create scenario entity
        scenario_name = "TEST_Scenario_Update_Test"
        create_response = self.session.post(f"{BASE_URL}/api/scenarios", json={
            "name": scenario_name,
            "description": "Original description"
        })
        assert create_response.status_code == 200
        scenario_id = create_response.json().get('id')
        
        try:
            # Get fiscal years to find a source to duplicate
            fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
            assert fy_response.status_code == 200
            fiscal_years = fy_response.json()
            source_fy = next((fy for fy in fiscal_years if fy.get('type') != 'scenario'), None)
            
            if not source_fy:
                pytest.skip("No source fiscal year found")
            
            # Create fiscal year linked to scenario
            dup_response = self.session.post(f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate", json={
                "new_year": 2028,
                "duplicate_activities": False,
                "is_scenario": True,
                "scenario_id": scenario_id
            })
            
            assert dup_response.status_code == 200, f"Duplicate failed: {dup_response.text}"
            linked_fy_id = dup_response.json().get('id')
            
            # Update scenario name
            new_name = "TEST_Updated_Scenario_Name"
            update_response = self.session.put(f"{BASE_URL}/api/scenarios/{scenario_id}", json={
                "name": new_name
            })
            assert update_response.status_code == 200, f"Update failed: {update_response.text}"
            assert update_response.json().get('name') == new_name
            
            # Verify linked fiscal year name was updated
            fy_check = self.session.get(f"{BASE_URL}/api/fiscal-years/{linked_fy_id}")
            assert fy_check.status_code == 200
            updated_fy = fy_check.json()
            assert new_name in updated_fy.get('name', ''), f"FY name not updated: {updated_fy.get('name')}"
            assert updated_fy.get('scenario_name') == new_name, f"scenario_name not updated: {updated_fy.get('scenario_name')}"
            
            print(f"Scenario name propagated to fiscal year: {updated_fy.get('name')}")
            
            # Cleanup fiscal year
            self.session.delete(f"{BASE_URL}/api/fiscal-years/{linked_fy_id}")
            
        finally:
            # Cleanup scenario
            self.session.delete(f"{BASE_URL}/api/scenarios/{scenario_id}")
    
    def test_05_update_scenario_not_found(self):
        """PUT /api/scenarios/{id} returns 404 for non-existent scenario"""
        fake_id = "000000000000000000000000"
        response = self.session.put(f"{BASE_URL}/api/scenarios/{fake_id}", json={
            "name": "Test"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ===== DELETE /api/scenarios/{id} =====
    def test_06_delete_scenario_and_linked_fiscal_years(self):
        """DELETE /api/scenarios/{id} deletes scenario and all linked fiscal years + activities"""
        # Create scenario
        scenario_name = "TEST_Scenario_Delete_Test"
        create_response = self.session.post(f"{BASE_URL}/api/scenarios", json={
            "name": scenario_name
        })
        assert create_response.status_code == 200
        scenario_id = create_response.json().get('id')
        
        # Get source fiscal year
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert fy_response.status_code == 200
        source_fy = next((fy for fy in fy_response.json() if fy.get('type') != 'scenario'), None)
        
        if not source_fy:
            self.session.delete(f"{BASE_URL}/api/scenarios/{scenario_id}")
            pytest.skip("No source fiscal year found")
        
        # Create 2 fiscal years linked to scenario
        linked_fys = []
        for year in [2027, 2028]:
            dup_response = self.session.post(f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate", json={
                "new_year": year,
                "duplicate_activities": True,
                "is_scenario": True,
                "scenario_id": scenario_id
            })
            if dup_response.status_code == 200:
                linked_fys.append(dup_response.json().get('id'))
        
        print(f"Created {len(linked_fys)} linked fiscal years")
        
        # Delete scenario
        delete_response = self.session.delete(f"{BASE_URL}/api/scenarios/{scenario_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        result = delete_response.json()
        assert "deleted_fiscal_years" in result, "Should report deleted fiscal years count"
        assert result.get("deleted_fiscal_years") >= len(linked_fys)
        
        print(f"Deleted scenario with {result.get('deleted_fiscal_years')} fiscal years, {result.get('deleted_activities')} activities")
        
        # Verify fiscal years are gone
        for fy_id in linked_fys:
            check = self.session.get(f"{BASE_URL}/api/fiscal-years/{fy_id}")
            assert check.status_code == 404, f"Linked FY {fy_id} should be deleted"
    
    def test_07_delete_scenario_not_found(self):
        """DELETE /api/scenarios/{id} returns 404 for non-existent scenario"""
        fake_id = "000000000000000000000000"
        response = self.session.delete(f"{BASE_URL}/api/scenarios/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestFiscalYearDuplicateWithScenarioId:
    """Test fiscal year duplicate endpoint with scenario_id linking"""
    
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
            pytest.skip(f"Authentication failed")
        
        yield
    
    def test_08_duplicate_with_existing_scenario_id(self):
        """POST /api/fiscal-years/{id}/duplicate with scenario_id correctly links to scenario entity"""
        # Get existing scenarios
        scenarios_response = self.session.get(f"{BASE_URL}/api/scenarios")
        assert scenarios_response.status_code == 200
        scenarios = scenarios_response.json()
        
        if not scenarios:
            pytest.skip("No existing scenarios")
        
        existing_scenario = scenarios[0]
        scenario_id = existing_scenario.get('id')
        scenario_name = existing_scenario.get('name')
        
        # Get source fiscal year
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        source_fy = next((fy for fy in fy_response.json() if fy.get('type') != 'scenario'), None)
        
        if not source_fy:
            pytest.skip("No source fiscal year")
        
        # Duplicate with existing scenario_id
        dup_response = self.session.post(f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate", json={
            "new_year": 2031,
            "duplicate_activities": False,
            "is_scenario": True,
            "scenario_id": scenario_id
        })
        
        assert dup_response.status_code == 200, f"Duplicate failed: {dup_response.text}"
        
        created_fy = dup_response.json()
        assert created_fy.get('type') == 'scenario'
        
        # Verify by fetching the fiscal year
        fy_check = self.session.get(f"{BASE_URL}/api/fiscal-years/{created_fy.get('id')}")
        assert fy_check.status_code == 200
        
        fy_data = fy_check.json()
        assert fy_data.get('scenario_id') == scenario_id, f"scenario_id mismatch: {fy_data.get('scenario_id')}"
        assert fy_data.get('scenario_name') == scenario_name, f"scenario_name mismatch: {fy_data.get('scenario_name')}"
        
        print(f"Created FY linked to scenario: {fy_data.get('name')}, scenario_id={fy_data.get('scenario_id')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/fiscal-years/{created_fy.get('id')}")
    
    def test_09_duplicate_with_invalid_scenario_id(self):
        """POST /api/fiscal-years/{id}/duplicate with invalid scenario_id returns 404"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        source_fy = next((fy for fy in fy_response.json() if fy.get('type') != 'scenario'), None)
        
        if not source_fy:
            pytest.skip("No source fiscal year")
        
        fake_scenario_id = "000000000000000000000000"
        dup_response = self.session.post(f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate", json={
            "new_year": 2032,
            "duplicate_activities": False,
            "is_scenario": True,
            "scenario_id": fake_scenario_id
        })
        
        assert dup_response.status_code == 404, f"Expected 404 for invalid scenario_id, got {dup_response.status_code}"
        print(f"Correctly rejected invalid scenario_id: {dup_response.json()}")
    
    def test_10_fiscal_years_list_includes_scenario_id(self):
        """GET /api/fiscal-years returns scenario_id for scenario type entries"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200
        
        fiscal_years = response.json()
        scenarios = [fy for fy in fiscal_years if fy.get('type') == 'scenario']
        
        print(f"Found {len(scenarios)} scenario fiscal years")
        
        # Check that scenario FYs with migrated scenario_id have the field
        for fy in scenarios:
            if fy.get('scenario_id'):
                assert isinstance(fy.get('scenario_id'), str)
                print(f"  - {fy.get('name')}: scenario_id={fy.get('scenario_id')}")
    
    def test_11_scenario_requires_scenario_id_or_name(self):
        """POST /api/fiscal-years/{id}/duplicate scenario requires scenario_id or scenario_name"""
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        source_fy = next((fy for fy in fy_response.json() if fy.get('type') != 'scenario'), None)
        
        if not source_fy:
            pytest.skip("No source fiscal year")
        
        # No scenario_id or scenario_name
        dup_response = self.session.post(f"{BASE_URL}/api/fiscal-years/{source_fy['id']}/duplicate", json={
            "new_year": 2033,
            "duplicate_activities": False,
            "is_scenario": True
        })
        
        assert dup_response.status_code == 400, f"Expected 400, got {dup_response.status_code}"
        print(f"Correctly rejected: {dup_response.json()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
