"""
Test GHG Protocol Business Rules - Specific Factors
Tests the P0 bug fix for multi-impacts with specific emission factors:
- Chaudière mazout (Scope 1 combustion_fixe)
- Gaz naturel (Scope 2 electricite)
- Scooter EURO-5 (Scope 3 deplacements_professionnels)

Business Rules:
- Scope 1/2 entry → create scope1/scope2 + scope3_3 (amont énergie)
- Scope 3 entry → create scope3 only
- scope3_3 activities must have category_id='activites_combustibles_energie'
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-refactor.preview.emergentagent.com')

# Test credentials
# credentials from conftest_credentials
# credentials from conftest_credentials

# Specific emission factors from the request
CHAUDIERE_MAZOUT_ID = "698418f3c1a4e9f26cd2735f"  # Scope 1 - combustion_fixe
GAZ_NATUREL_ID = "698418f3c1a4e9f26cd2715d"       # Scope 2 - electricite
SCOOTER_EURO5_ID = "698418f3c1a4e9f26cd27385"     # Scope 3 - deplacements_professionnels


class TestGHGProtocolRulesWithSpecificFactors:
    """Test GHG Protocol business rules with specific emission factors"""
    
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
                    if activity.get("name", "").startswith("TEST_GHG_"):
                        if activity.get("group_id"):
                            requests.delete(
                                f"{BASE_URL}/api/activities/groups/{activity['group_id']}",
                                headers=self.headers
                            )
                        else:
                            requests.delete(
                                f"{BASE_URL}/api/activities/{activity['id']}",
                                headers=self.headers
                            )
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ==================== FACTOR VERIFICATION ====================
    
    def test_chaudiere_mazout_factor_structure(self):
        """Verify Chaudière mazout factor has expected multi-impacts structure"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{CHAUDIERE_MAZOUT_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get factor: {response.text}"
        
        factor = response.json()
        assert factor["name_fr"] == "Chaudière, mazout EL"
        
        impacts = factor.get("impacts", [])
        assert len(impacts) == 3, f"Expected 3 impacts, got {len(impacts)}"
        
        # Verify impact scopes
        impact_scopes = {i["scope"] for i in impacts}
        assert "scope1" in impact_scopes, "Missing scope1 impact"
        assert "scope3_3" in impact_scopes, "Missing scope3_3 impact"
        assert "scope3" in impact_scopes, "Missing scope3 impact"
        
        # Verify impact values
        for impact in impacts:
            if impact["scope"] == "scope1":
                assert impact["value"] == 0.0739
            elif impact["scope"] == "scope3_3":
                assert impact["value"] == 0.0293
            elif impact["scope"] == "scope3":
                assert impact["value"] == 0.0293
    
    def test_gaz_naturel_factor_structure(self):
        """Verify Gaz naturel factor has expected multi-impacts structure"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{GAZ_NATUREL_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get factor: {response.text}"
        
        factor = response.json()
        assert factor["name_fr"] == "Gaz naturel"
        
        impacts = factor.get("impacts", [])
        assert len(impacts) == 3, f"Expected 3 impacts, got {len(impacts)}"
        
        # Verify impact scopes
        impact_scopes = {i["scope"] for i in impacts}
        assert "scope2" in impact_scopes, "Missing scope2 impact"
        assert "scope3_3" in impact_scopes, "Missing scope3_3 impact"
        assert "scope3" in impact_scopes, "Missing scope3 impact"
    
    def test_scooter_euro5_factor_structure(self):
        """Verify Scooter EURO-5 factor has expected multi-impacts structure"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{SCOOTER_EURO5_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get factor: {response.text}"
        
        factor = response.json()
        assert "Scooter" in factor["name_fr"]
        
        impacts = factor.get("impacts", [])
        assert len(impacts) == 4, f"Expected 4 impacts, got {len(impacts)}"
        
        # Verify impact scopes
        impact_scopes = {i["scope"] for i in impacts}
        assert "scope1" in impact_scopes, "Missing scope1 impact"
        assert "scope2" in impact_scopes, "Missing scope2 impact (value=0)"
        assert "scope3_3" in impact_scopes, "Missing scope3_3 impact"
        assert "scope3" in impact_scopes, "Missing scope3 impact"
        
        # Verify scope2 has value 0 (should be excluded by business rules)
        for impact in impacts:
            if impact["scope"] == "scope2":
                assert impact["value"] == 0, "Scooter scope2 should be 0"
    
    # ==================== SCOPE 1 ENTRY TESTS ====================
    
    def test_scope1_entry_chaudiere_mazout_creates_scope1_and_scope3_3(self):
        """
        Test: Scope 1 entry (combustion_fixe) with Chaudière mazout
        Expected: Creates scope1 (cat=combustion_fixe) + scope3_3 (cat=activites_combustibles_energie)
        
        Business Rule: Scope 1 entry → include scope1, scope2, scope3_3 impacts
        """
        activity_data = {
            "category_id": "combustion_fixe",
            "subcategory_id": "combustibles",
            "scope": "scope1",
            "name": "TEST_GHG_Scope1_Chaudiere",
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
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # Should return a group with 2 activities (scope1 + scope3_3)
        # scope3 is excluded because it's not in [scope1, scope2, scope3_3] for Scope 1 entry
        assert "group_id" in result, "Expected multi-activity response for Scope 1 entry"
        
        activities = result.get("activities", [])
        assert len(activities) == 2, f"Expected 2 activities for Scope 1 entry, got {len(activities)}"
        
        scopes_created = {a["scope"] for a in activities}
        assert "scope1" in scopes_created, "Missing scope1 activity"
        assert "scope3_3" in scopes_created, "Missing scope3_3 activity"
        assert "scope3" not in scopes_created, "scope3 should NOT be created for Scope 1 entry"
        
        # Verify category assignments
        for activity in activities:
            if activity["scope"] == "scope1":
                assert activity["category_id"] == "combustion_fixe", \
                    f"Scope1 activity should have category_id=combustion_fixe, got {activity['category_id']}"
            elif activity["scope"] == "scope3_3":
                assert activity["category_id"] == "activites_combustibles_energie", \
                    f"Scope3_3 activity should have category_id=activites_combustibles_energie, got {activity['category_id']}"
        
        # Verify emissions calculation
        for activity in activities:
            if activity["scope"] == "scope1":
                expected_emissions = 100 * 0.0739
                assert abs(activity["emissions"] - expected_emissions) < 0.001, \
                    f"Scope1 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
            elif activity["scope"] == "scope3_3":
                expected_emissions = 100 * 0.0293
                assert abs(activity["emissions"] - expected_emissions) < 0.001, \
                    f"Scope3_3 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
        
        # Cleanup
        group_id = result["group_id"]
        requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
    
    # ==================== SCOPE 2 ENTRY TESTS ====================
    
    def test_scope2_entry_gaz_naturel_creates_scope2_and_scope3_3(self):
        """
        Test: Scope 2 entry (electricite) with Gaz naturel
        Expected: Creates scope2 (cat=electricite) + scope3_3 (cat=activites_combustibles_energie)
        
        Business Rule: Scope 2 entry → include scope1, scope2, scope3_3 impacts
        """
        activity_data = {
            "category_id": "electricite",
            "subcategory_id": "electricite",
            "scope": "scope2",
            "name": "TEST_GHG_Scope2_GazNaturel",
            "quantity": 1000,
            "unit": "kWh",
            "emission_factor_id": GAZ_NATUREL_ID,
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
        assert "group_id" in result, "Expected multi-activity response for Scope 2 entry"
        
        activities = result.get("activities", [])
        assert len(activities) == 2, f"Expected 2 activities for Scope 2 entry, got {len(activities)}"
        
        scopes_created = {a["scope"] for a in activities}
        assert "scope2" in scopes_created, "Missing scope2 activity"
        assert "scope3_3" in scopes_created, "Missing scope3_3 activity"
        assert "scope3" not in scopes_created, "scope3 should NOT be created for Scope 2 entry"
        
        # Verify category assignments
        for activity in activities:
            if activity["scope"] == "scope2":
                assert activity["category_id"] == "electricite", \
                    f"Scope2 activity should have category_id=electricite, got {activity['category_id']}"
            elif activity["scope"] == "scope3_3":
                assert activity["category_id"] == "activites_combustibles_energie", \
                    f"Scope3_3 activity should have category_id=activites_combustibles_energie, got {activity['category_id']}"
        
        # Verify emissions calculation
        for activity in activities:
            if activity["scope"] == "scope2":
                expected_emissions = 1000 * 0.43273224
                assert abs(activity["emissions"] - expected_emissions) < 0.01, \
                    f"Scope2 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
            elif activity["scope"] == "scope3_3":
                expected_emissions = 1000 * 0.14371469
                assert abs(activity["emissions"] - expected_emissions) < 0.01, \
                    f"Scope3_3 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
        
        # Cleanup
        group_id = result["group_id"]
        requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)
    
    # ==================== SCOPE 3 ENTRY TESTS ====================
    
    def test_scope3_entry_scooter_creates_only_scope3(self):
        """
        Test: Scope 3 entry (deplacements_professionnels) with Scooter EURO-5
        Expected: Creates scope3 only (cat=deplacements_professionnels)
        
        Business Rule: Scope 3 entry (other categories) → include only scope3 impacts
        Note: scope2 has value=0 so it's excluded anyway
        """
        activity_data = {
            "category_id": "deplacements_professionnels",
            "subcategory_id": "route",
            "scope": "scope3_amont",
            "name": "TEST_GHG_Scope3_Scooter",
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
        
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        result = response.json()
        
        # Should return a single activity (scope3 only)
        # When only 1 activity is created, API returns single activity object
        if "activities" in result:
            activities = result.get("activities", [])
            assert len(activities) == 1, f"Expected 1 activity for Scope 3 entry, got {len(activities)}"
            activity = activities[0]
        else:
            activity = result
        
        assert activity["scope"] == "scope3", f"Expected scope3, got {activity['scope']}"
        assert activity["category_id"] == "deplacements_professionnels", \
            f"Scope3 activity should have category_id=deplacements_professionnels, got {activity['category_id']}"
        
        # Verify emissions calculation
        expected_emissions = 10 * 96.8524504
        assert abs(activity["emissions"] - expected_emissions) < 0.01, \
            f"Scope3 emissions mismatch: {activity['emissions']} vs {expected_emissions}"
        
        # Cleanup
        if result.get("group_id"):
            requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
        else:
            requests.delete(f"{BASE_URL}/api/activities/{activity['id']}", headers=self.headers)
    
    # ==================== SCOPE 3.3 CATEGORY ASSIGNMENT TESTS ====================
    
    def test_scope3_3_activity_has_correct_category_for_display(self):
        """
        Test: Verify scope3_3 activities are assigned to 'activites_combustibles_energie' category
        This ensures they appear in the correct UI section (Scope 3 Amont - Activités liées aux combustibles)
        """
        # Create a Scope 1 entry which will generate a scope3_3 activity
        activity_data = {
            "category_id": "combustion_fixe",
            "subcategory_id": "combustibles",
            "scope": "scope1",
            "name": "TEST_GHG_Scope3_3_Category",
            "quantity": 50,
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
        
        assert "group_id" in result, "Expected multi-activity response"
        
        # Find the scope3_3 activity
        scope3_3_activity = None
        for activity in result.get("activities", []):
            if activity["scope"] == "scope3_3":
                scope3_3_activity = activity
                break
        
        assert scope3_3_activity is not None, "scope3_3 activity not found"
        
        # Verify category_id is set to 'activites_combustibles_energie'
        assert scope3_3_activity["category_id"] == "activites_combustibles_energie", \
            f"scope3_3 activity should have category_id='activites_combustibles_energie', got '{scope3_3_activity['category_id']}'"
        
        # Verify entry_scope and entry_category are preserved
        assert scope3_3_activity["entry_scope"] == "scope1", \
            f"entry_scope should be 'scope1', got '{scope3_3_activity['entry_scope']}'"
        assert scope3_3_activity["entry_category"] == "combustion_fixe", \
            f"entry_category should be 'combustion_fixe', got '{scope3_3_activity['entry_category']}'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
    
    def test_scope3_3_appears_in_correct_table_view_filter(self):
        """
        Test: Verify scope3_3 activities can be retrieved with category filter
        This ensures they appear in TableView under 'Activités liées aux combustibles et à l'énergie'
        """
        # Create a Scope 2 entry which will generate a scope3_3 activity
        activity_data = {
            "category_id": "electricite",
            "subcategory_id": "electricite",
            "scope": "scope2",
            "name": "TEST_GHG_TableView_Filter",
            "quantity": 500,
            "unit": "kWh",
            "emission_factor_id": GAZ_NATUREL_ID,
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
        group_id = result.get("group_id")
        
        # Query activities with category filter for 'activites_combustibles_energie'
        filter_response = requests.get(
            f"{BASE_URL}/api/activities?category_id=activites_combustibles_energie",
            headers=self.headers
        )
        
        assert filter_response.status_code == 200
        filtered_activities = filter_response.json().get("data", [])
        
        # Find our test activity
        test_activity = None
        for activity in filtered_activities:
            if activity.get("name") == "TEST_GHG_TableView_Filter" and activity.get("scope") == "scope3_3":
                test_activity = activity
                break
        
        assert test_activity is not None, \
            "scope3_3 activity should appear when filtering by category_id='activites_combustibles_energie'"
        
        # Cleanup
        if group_id:
            requests.delete(f"{BASE_URL}/api/activities/groups/{group_id}", headers=self.headers)


class TestZeroValueImpactExclusion:
    """Test that impacts with value=0 are excluded"""
    
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
    
    def test_scooter_scope2_zero_value_excluded(self):
        """
        Test: Scooter EURO-5 has scope2=0, which should be excluded
        Even for Scope 1 entry, scope2 should not create an activity because value=0
        """
        # Use Scope 1 entry to test (which would normally include scope2)
        activity_data = {
            "category_id": "combustion_mobile",
            "subcategory_id": "route",
            "scope": "scope1",
            "name": "TEST_GHG_ZeroValue_Scooter",
            "quantity": 5,
            "unit": "pkm",
            "emission_factor_id": SCOOTER_EURO5_ID,
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
        
        # Get all activities created
        if "activities" in result:
            activities = result.get("activities", [])
        else:
            activities = [result]
        
        # Verify no scope2 activity was created (because value=0)
        scopes_created = {a["scope"] for a in activities}
        assert "scope2" not in scopes_created, \
            "scope2 activity should NOT be created when impact value=0"
        
        # Should have scope1 and scope3_3 (both have non-zero values)
        assert "scope1" in scopes_created, "scope1 should be created (value=96.85)"
        assert "scope3_3" in scopes_created, "scope3_3 should be created (value=25.37)"
        
        # Cleanup
        if result.get("group_id"):
            requests.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}", headers=self.headers)
        else:
            requests.delete(f"{BASE_URL}/api/activities/{result['id']}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
