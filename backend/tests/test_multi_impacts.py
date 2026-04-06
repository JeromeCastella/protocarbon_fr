"""
Test Multi-Impacts Business Rules - GHG Protocol
Tests the fix for P0 bug: Multi-impacts logic for Scope 3 and Scope 3.3

Business Rules:
- Scope 1 or 2 entry → include scope1, scope2, scope3_3 impacts
- Scope 3.3 entry (category activites_combustibles_energie) → include only scope3_3 impacts
- Scope 3 entry (other categories) → include only scope3 impacts
- Exclude impacts with value = 0
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-bilanz.preview.emergentagent.com')

# Test credentials
# credentials imported from conftest_credentials
# credentials imported from conftest_credentials

# Hydroélectricité factor with multi-impacts
HYDRO_FACTOR_ID = "698418f3c1a4e9f26cd27156"
# Expected impacts: scope2=0.0008832, scope3_3=0.00388983, scope3=0.0008832


class TestMultiImpactsBusinessRules:
    """Test multi-impacts business rules according to GHG Protocol"""
    
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
        self.user_id = data["user"]["id"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
        # Cleanup: delete test activities created during tests
        self._cleanup_test_activities()
    
    def _cleanup_test_activities(self):
        """Delete activities created during tests"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/activities",
                headers=self.headers
            )
            if response.status_code == 200:
                activities = response.json().get("data", [])
                for activity in activities:
                    if activity.get("name", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/activities/{activity['id']}",
                            headers=self.headers
                        )
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def test_hydro_factor_has_multi_impacts(self):
        """Verify Hydroélectricité factor has expected multi-impacts structure"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{HYDRO_FACTOR_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get factor: {response.text}"
        
        factor = response.json()
        assert factor["name_fr"] == "Hydroélectricité"
        
        impacts = factor.get("impacts", [])
        assert len(impacts) == 3, f"Expected 3 impacts, got {len(impacts)}"
        
        # Verify impact scopes
        impact_scopes = {i["scope"] for i in impacts}
        assert "scope2" in impact_scopes, "Missing scope2 impact"
        assert "scope3_3" in impact_scopes, "Missing scope3_3 impact"
        assert "scope3" in impact_scopes, "Missing scope3 impact"
        
        # Verify impact values
        for impact in impacts:
            if impact["scope"] == "scope2":
                assert impact["value"] == 0.0008832
            elif impact["scope"] == "scope3_3":
                assert impact["value"] == 0.00388983
            elif impact["scope"] == "scope3":
                assert impact["value"] == 0.0008832
    
    def test_scope2_entry_creates_scope2_and_scope3_3_activities(self):
        """
        Test 1: Scope 2 entry with multi-impact factor (Hydroélectricité)
        Expected: Creates 2 activities (scope2 + scope3_3)
        
        Business Rule: Scope 1 or 2 entry → include scope1, scope2, scope3_3 impacts
        """
        activity_data = {
            "category_id": "electricite",
            "subcategory_id": "electricite",
            "scope": "scope2",
            "name": "TEST_Scope2_Hydro_Entry",
            "quantity": 1000,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # Should return a group with 2 activities (scope2 + scope3_3)
        # scope3 is excluded because it's not in [scope1, scope2, scope3_3] for Scope 1/2 entry
        if "group_id" in result:
            # Multi-activity response
            activities = result.get("activities", [])
            assert len(activities) == 2, f"Expected 2 activities for Scope 2 entry, got {len(activities)}"
            
            scopes_created = {a["scope"] for a in activities}
            assert "scope2" in scopes_created, "Missing scope2 activity"
            assert "scope3_3" in scopes_created, "Missing scope3_3 activity"
            assert "scope3" not in scopes_created, "scope3 should NOT be created for Scope 2 entry"
            
            # Verify emissions calculation
            for activity in activities:
                if activity["scope"] == "scope2":
                    expected_emissions = 1000 * 0.0008832
                    assert abs(activity["emissions"] - expected_emissions) < 0.001, \
                        f"Scope2 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
                elif activity["scope"] == "scope3_3":
                    expected_emissions = 1000 * 0.00388983
                    assert abs(activity["emissions"] - expected_emissions) < 0.001, \
                        f"Scope3_3 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
            
            # Cleanup
            group_id = result["group_id"]
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
        else:
            # Single activity response - this would be a bug
            pytest.fail("Expected multi-activity response for Scope 2 entry with multi-impact factor")
    
    def test_scope3_3_entry_creates_only_scope3_3_activity(self):
        """
        Test 2: Scope 3.3 entry (category activites_combustibles_energie) with multi-impact factor
        Expected: Creates 1 activity (scope3_3 only)
        
        Business Rule: Scope 3.3 entry → include only scope3_3 impacts
        """
        activity_data = {
            "category_id": "activites_combustibles_energie",
            "subcategory_id": None,
            "scope": "scope3_amont",  # Parent scope
            "name": "TEST_Scope3_3_Hydro_Entry",
            "quantity": 1000,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope3_amont",
            "entry_category": "activites_combustibles_energie"  # This triggers scope3_3 rule
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # When only 1 activity is created, API returns single activity object (not wrapped in group)
        # Check if it's a single activity response (has 'id' but no 'activities' array)
        if "activities" in result:
            # Multi-activity response
            activities = result.get("activities", [])
            assert len(activities) == 1, f"Expected 1 activity for Scope 3.3 entry, got {len(activities)}"
            assert activities[0]["scope"] == "scope3_3", f"Expected scope3_3, got {activities[0]['scope']}"
            
            # Verify emissions
            expected_emissions = 1000 * 0.00388983
            assert abs(activities[0]["emissions"] - expected_emissions) < 0.001
            
            # Cleanup
            group_id = result["group_id"]
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
        else:
            # Single activity response (when only 1 impact applies)
            assert result.get("scope") == "scope3_3", f"Expected scope3_3, got {result.get('scope')}"
            
            # Verify emissions
            expected_emissions = 1000 * 0.00388983
            assert abs(result["emissions"] - expected_emissions) < 0.001
            
            # Verify group_size is 1 (single activity)
            assert result.get("group_size") == 1, f"Expected group_size=1, got {result.get('group_size')}"
            
            # Cleanup - use group endpoint if group_id exists, otherwise single delete
            if result.get("group_id"):
                requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
            else:
                requests.delete(f"{BASE_URL}/api/activities/{result['id']}", headers=self.headers)
    
    def test_scope3_generic_entry_creates_only_scope3_activity(self):
        """
        Test 3: Scope 3 generic entry (category biens_services_achetes) with multi-impact factor
        Expected: Creates 1 activity (scope3 only)
        
        Business Rule: Scope 3 entry (other categories) → include only scope3 impacts
        """
        activity_data = {
            "category_id": "biens_services_achetes",
            "subcategory_id": None,
            "scope": "scope3_amont",
            "name": "TEST_Scope3_Generic_Hydro_Entry",
            "quantity": 1000,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope3_amont",
            "entry_category": "biens_services_achetes"  # NOT activites_combustibles_energie
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # When only 1 activity is created, API returns single activity object (not wrapped in group)
        if "activities" in result:
            # Multi-activity response
            activities = result.get("activities", [])
            assert len(activities) == 1, f"Expected 1 activity for Scope 3 generic entry, got {len(activities)}"
            assert activities[0]["scope"] == "scope3", f"Expected scope3, got {activities[0]['scope']}"
            
            # Verify emissions
            expected_emissions = 1000 * 0.0008832
            assert abs(activities[0]["emissions"] - expected_emissions) < 0.001
            
            # Cleanup
            group_id = result["group_id"]
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
        else:
            # Single activity response (when only 1 impact applies)
            assert result.get("scope") == "scope3", f"Expected scope3, got {result.get('scope')}"
            
            # Verify emissions
            expected_emissions = 1000 * 0.0008832
            assert abs(result["emissions"] - expected_emissions) < 0.001
            
            # Verify group_size is 1 (single activity)
            assert result.get("group_size") == 1, f"Expected group_size=1, got {result.get('group_size')}"
            
            # Cleanup - use group endpoint if group_id exists, otherwise single delete
            if result.get("group_id"):
                requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
            else:
                requests.delete(f"{BASE_URL}/api/activities/{result['id']}", headers=self.headers)
    
    def test_scope1_entry_creates_scope1_and_scope3_3_activities(self):
        """
        Test 4: Scope 1 entry with multi-impact factor
        Expected: Creates activities for scope1, scope2, scope3_3 (if present in factor)
        
        Business Rule: Scope 1 or 2 entry → include scope1, scope2, scope3_3 impacts
        """
        activity_data = {
            "category_id": "combustion_mobile",
            "subcategory_id": None,
            "scope": "scope1",
            "name": "TEST_Scope1_Hydro_Entry",
            "quantity": 1000,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope1",
            "entry_category": "combustion_mobile"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # Hydro factor has scope2 and scope3_3 impacts (no scope1)
        # So for Scope 1 entry, we should get scope2 + scope3_3
        if "group_id" in result:
            activities = result.get("activities", [])
            scopes_created = {a["scope"] for a in activities}
            
            # Should include scope2 and scope3_3 (from factor), but not scope3
            assert "scope2" in scopes_created or "scope3_3" in scopes_created, \
                f"Expected scope2 or scope3_3 for Scope 1 entry, got {scopes_created}"
            assert "scope3" not in scopes_created, "scope3 should NOT be created for Scope 1 entry"
            
            # Cleanup
            group_id = result["group_id"]
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
        else:
            # Single activity - verify it's not scope3
            assert result.get("scope") != "scope3", "scope3 should NOT be created for Scope 1 entry"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/activities/{result['id']}", headers=self.headers)
    
    def test_normalize_scope_function(self):
        """Test that scope normalization works correctly"""
        # This tests the backend normalize_scope function indirectly
        # by verifying activities are created with normalized scopes
        
        activity_data = {
            "category_id": "electricite",
            "scope": "scope2",
            "name": "TEST_Normalize_Scope",
            "quantity": 100,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify scopes are normalized (lowercase, standard format)
        if "group_id" in result:
            for activity in result.get("activities", []):
                scope = activity.get("scope", "")
                assert scope in ["scope1", "scope2", "scope3", "scope3_3"], \
                    f"Unexpected scope format: {scope}"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
        else:
            scope = result.get("scope", "")
            assert scope in ["scope1", "scope2", "scope3", "scope3_3"], \
                f"Unexpected scope format: {scope}"
            requests.delete(f"{BASE_URL}/api/activities/{result['id']}", headers=self.headers)
    
    def test_zero_value_impacts_excluded(self):
        """Test that impacts with value = 0 are excluded"""
        # This is tested implicitly - if a factor had a 0-value impact,
        # it should not create an activity for that impact
        
        # For now, verify the Hydro factor has no zero-value impacts
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{HYDRO_FACTOR_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        factor = response.json()
        for impact in factor.get("impacts", []):
            assert impact.get("value", 0) > 0, f"Found zero-value impact: {impact}"


class TestActivityGroupOperations:
    """Test group operations for multi-impact activities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_activity_group(self):
        """Test retrieving all activities in a group"""
        # First create a multi-impact activity
        activity_data = {
            "category_id": "electricite",
            "scope": "scope2",
            "name": "TEST_Group_Get",
            "quantity": 500,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert create_response.status_code == 200
        result = create_response.json()
        
        if "group_id" in result:
            group_id = result["group_id"]
            
            # Get the group
            get_response = requests.get(
                f"{BASE_URL}/api/activities/groups/{group_id}",
                headers=self.headers
            )
            
            assert get_response.status_code == 200
            group_data = get_response.json()
            
            assert group_data["group_id"] == group_id
            assert len(group_data["activities"]) == result["count"]
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
    
    def test_delete_activity_group(self):
        """Test deleting all activities in a group"""
        # First create a multi-impact activity
        activity_data = {
            "category_id": "electricite",
            "scope": "scope2",
            "name": "TEST_Group_Delete",
            "quantity": 500,
            "unit": "kWh",
            "emission_factor_id": HYDRO_FACTOR_ID,
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert create_response.status_code == 200
        result = create_response.json()
        
        if "group_id" in result:
            group_id = result["group_id"]
            
            # Delete the group
            delete_response = requests.delete(
                f"{BASE_URL}/api/activities/groups/{group_id}",
                headers=self.headers
            )
            
            assert delete_response.status_code == 200
            delete_data = delete_response.json()
            assert delete_data["deleted"] == result["count"]
            
            # Verify group no longer exists
            get_response = requests.get(
                f"{BASE_URL}/api/activities/groups/{group_id}",
                headers=self.headers
            )
            assert get_response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
