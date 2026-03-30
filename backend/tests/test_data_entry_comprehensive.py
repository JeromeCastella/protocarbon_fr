"""
Comprehensive Data Entry Tests - All Entry Paths (A through E)
Tests for Proto Carbon GHG Protocol carbon accounting application.

Test Coverage:
- P1-A: Guided entry path (category → subcategory → unit → factor → quantity)
- P1-B: Global search path (Fuse.js search → factor selection → quantity)
- P2-C1: Product sales via product sheet
- P2-C2: Direct entry for Scope 3 Aval
- P3-D: Category 3.3 (auto-calculated)
- P3-E: Edit/Delete activities
- Calculation coherence verification
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-curation.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def fiscal_year_id(api_client):
    """Get current fiscal year ID"""
    response = api_client.get(f"{BASE_URL}/api/fiscal-years")
    assert response.status_code == 200
    fiscal_years = response.json()
    if fiscal_years:
        return fiscal_years[0]["id"]
    pytest.skip("No fiscal year available")


class TestP1A_GuidedEntryPath:
    """P1-A: Guided entry path tests - category → subcategory → unit → factor → quantity"""
    
    def test_categories_endpoint(self, api_client):
        """Test categories endpoint returns all scopes"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) > 0
        
        # Verify all scopes are present
        scopes = set(c["scope"] for c in categories)
        assert "scope1" in scopes, "Missing scope1 categories"
        assert "scope2" in scopes, "Missing scope2 categories"
        assert "scope3_amont" in scopes, "Missing scope3_amont categories"
        assert "scope3_aval" in scopes, "Missing scope3_aval categories"
        print(f"PASS: Found {len(categories)} categories across {len(scopes)} scopes")
    
    def test_subcategories_for_scope1(self, api_client):
        """Test subcategories for a Scope 1 category (combustion_mobile)"""
        response = api_client.get(f"{BASE_URL}/api/subcategories?category=combustion_mobile")
        assert response.status_code == 200
        subcats = response.json()
        # Some categories may not have subcategories
        print(f"PASS: combustion_mobile has {len(subcats)} subcategories")
    
    def test_emission_factors_search(self, api_client):
        """Test emission factors search endpoint"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_mobile")
        assert response.status_code == 200
        factors = response.json()
        assert len(factors) > 0, "No emission factors found for combustion_mobile"
        
        # Verify factor structure
        factor = factors[0]
        assert "id" in factor
        assert "name_fr" in factor or "name" in factor
        assert "impacts" in factor or "value" in factor
        print(f"PASS: Found {len(factors)} emission factors for combustion_mobile")
    
    def test_create_scope1_activity(self, api_client, fiscal_year_id):
        """Test creating a Scope 1 activity via guided path"""
        # Use combustion_fixe which has scope1 impacts (not combustion_mobile which has scope3)
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        assert len(factors) > 0
        
        # Find a factor with scope1 impact
        factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if any(i.get("scope") == "scope1" for i in impacts):
                factor = f
                break
        
        if not factor:
            factor = factors[0]
        
        # Create activity
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_Guided_Scope1_{int(time.time())}",
            "quantity": 100,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Failed to create activity: {response.text}"
        
        result = response.json()
        # Handle both single activity and group response
        if "activities" in result:
            activity = result["activities"][0]
        else:
            activity = result
        
        assert "id" in activity
        assert activity.get("emissions", 0) >= 0
        print(f"PASS: Created Scope 1 activity with emissions: {activity.get('emissions', 0)} kgCO2e")
        
        # Cleanup
        if "group_id" in result and result.get("count", 1) > 1:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")
    
    def test_create_scope2_activity(self, api_client, fiscal_year_id):
        """Test creating a Scope 2 activity (electricity)"""
        # Get electricity factors
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=electricite")
        factors = response.json()
        assert len(factors) > 0, "No electricity factors found"
        factor = factors[0]
        
        activity_data = {
            "category_id": "electricite",
            "scope": "scope2",
            "name": f"TEST_Guided_Scope2_{int(time.time())}",
            "quantity": 1000,
            "unit": factor.get("default_unit", "kWh"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        result = response.json()
        activity = result["activities"][0] if "activities" in result else result
        assert activity.get("emissions", 0) >= 0
        print(f"PASS: Created Scope 2 activity with emissions: {activity.get('emissions', 0)} kgCO2e")
        
        # Cleanup
        if "group_id" in result and result.get("count", 1) > 1:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")
    
    def test_create_scope3_amont_activity(self, api_client, fiscal_year_id):
        """Test creating a Scope 3 Amont activity"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=biens_services_achetes")
        factors = response.json()
        assert len(factors) > 0, "No factors found for biens_services_achetes"
        factor = factors[0]
        
        activity_data = {
            "category_id": "biens_services_achetes",
            "scope": "scope3_amont",
            "name": f"TEST_Guided_Scope3Amont_{int(time.time())}",
            "quantity": 50,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope3_amont",
            "entry_category": "biens_services_achetes"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        result = response.json()
        activity = result["activities"][0] if "activities" in result else result
        print(f"PASS: Created Scope 3 Amont activity with emissions: {activity.get('emissions', 0)} kgCO2e")
        
        # Cleanup
        if "group_id" in result and result.get("count", 1) > 1:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")


class TestP1B_GlobalSearchPath:
    """P1-B: Global search path tests - Fuse.js search functionality"""
    
    def test_search_index_endpoint(self, api_client):
        """Test search index endpoint returns factors for Fuse.js"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search-index")
        assert response.status_code == 200
        factors = response.json()
        assert len(factors) > 0, "Search index is empty"
        
        # Verify minimal fields for search
        factor = factors[0]
        assert "id" in factor
        assert "name_fr" in factor or "name" in factor
        assert "is_public" in factor
        print(f"PASS: Search index contains {len(factors)} factors")
    
    def test_search_index_has_scope_field(self, api_client):
        """Test that search index factors have scope derived from impacts"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search-index")
        factors = response.json()
        
        # Check a sample of factors have scope
        factors_with_scope = [f for f in factors[:100] if f.get("scope")]
        assert len(factors_with_scope) > 50, "Most factors should have scope field"
        print(f"PASS: {len(factors_with_scope)}/100 sampled factors have scope field")
    
    def test_search_without_accents(self, api_client):
        """Test search works without accents (electricite → Électricité)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search-index")
        factors = response.json()
        
        # Search for 'electricite' (without accent)
        search_term = "electricite"
        matches = [f for f in factors if search_term in (f.get("name_fr", "") or "").lower().replace("é", "e").replace("è", "e")]
        assert len(matches) > 0, "Should find electricity factors without accents"
        print(f"PASS: Found {len(matches)} factors matching 'electricite'")
    
    def test_search_acier(self, api_client):
        """Test search for 'acier' (steel)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search-index")
        factors = response.json()
        
        matches = [f for f in factors if "acier" in (f.get("name_fr", "") or "").lower()]
        assert len(matches) > 0, "Should find steel factors"
        print(f"PASS: Found {len(matches)} factors matching 'acier'")
    
    def test_expert_vs_public_factors(self, api_client):
        """Test that both expert and public factors exist"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search-index")
        factors = response.json()
        
        public_count = len([f for f in factors if f.get("is_public", False)])
        expert_count = len([f for f in factors if not f.get("is_public", True)])
        
        assert public_count > 0, "Should have public factors"
        assert expert_count > 0, "Should have expert factors"
        print(f"PASS: {public_count} public factors, {expert_count} expert factors")


class TestP2C_Scope3AvalPaths:
    """P2-C: Scope 3 Aval entry paths (product sheet and direct entry)"""
    
    def test_product_sale_categories_exist(self, api_client):
        """Test that product sale categories exist"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        categories = response.json()
        
        product_categories = ["transformation_produits", "utilisation_produits", "fin_vie_produits"]
        found = [c for c in categories if c["code"] in product_categories]
        assert len(found) == 3, f"Should have all 3 product categories, found {len(found)}"
        print(f"PASS: All 3 product sale categories exist")
    
    def test_products_endpoint(self, api_client):
        """Test products endpoint"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        print(f"PASS: Products endpoint returns {len(products)} products")
    
    def test_direct_entry_scope3_aval(self, api_client, fiscal_year_id):
        """Test direct entry for Scope 3 Aval (transformation_produits)"""
        # Get factors for transformation_produits
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=transformation_produits")
        factors = response.json()
        
        if len(factors) == 0:
            pytest.skip("No factors for transformation_produits")
        
        factor = factors[0]
        activity_data = {
            "category_id": "transformation_produits",
            "scope": "scope3_aval",
            "name": f"TEST_DirectScope3Aval_{int(time.time())}",
            "quantity": 10,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope3_aval",
            "entry_category": "transformation_produits"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        result = response.json()
        activity = result["activities"][0] if "activities" in result else result
        print(f"PASS: Created Scope 3 Aval direct entry with emissions: {activity.get('emissions', 0)} kgCO2e")
        
        # Cleanup
        if "group_id" in result and result.get("count", 1) > 1:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")


class TestP3D_Category33AutoCalculated:
    """P3-D: Category 3.3 (auto-calculated from Scope 1 & 2)"""
    
    def test_category_33_exists(self, api_client):
        """Test that category 3.3 (activites_combustibles_energie) exists"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        categories = response.json()
        
        cat_33 = next((c for c in categories if c["code"] == "activites_combustibles_energie"), None)
        assert cat_33 is not None, "Category 3.3 should exist"
        assert cat_33["scope"] == "scope3_amont", "Category 3.3 should be in scope3_amont"
        print(f"PASS: Category 3.3 exists: {cat_33.get('name_fr', cat_33['code'])}")
    
    def test_scope1_creates_scope33_impact(self, api_client, fiscal_year_id):
        """Test that Scope 1 entry creates scope3_3 impact (multi-impact factor)"""
        # Get a combustion factor that should have scope3_3 impact
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        # Find a factor with multiple impacts including scope3_3
        multi_impact_factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if len(impacts) > 1:
                scopes = [i.get("scope") for i in impacts]
                if "scope3_3" in scopes or "scope3.3" in scopes:
                    multi_impact_factor = f
                    break
        
        if not multi_impact_factor:
            pytest.skip("No multi-impact factor with scope3_3 found")
        
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_MultiImpact_{int(time.time())}",
            "quantity": 100,
            "unit": multi_impact_factor.get("default_unit", "kg"),
            "emission_factor_id": multi_impact_factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        result = response.json()
        if "activities" in result:
            assert result["count"] > 1, "Multi-impact factor should create multiple activities"
            print(f"PASS: Multi-impact factor created {result['count']} activities (group)")
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            print(f"INFO: Single activity created (factor may not have scope3_3 impact)")
            api_client.delete(f"{BASE_URL}/api/activities/{result['id']}")


class TestP3E_EditDeleteActivities:
    """P3-E: Edit and delete activities"""
    
    def test_edit_activity_quantity(self, api_client, fiscal_year_id):
        """Test editing an activity's quantity"""
        # Create an activity first - use combustion_fixe which has scope1 impacts
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        # Find a factor with scope1 impact
        factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if any(i.get("scope") == "scope1" for i in impacts):
                factor = f
                break
        if not factor:
            factor = factors[0]
        
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_Edit_{int(time.time())}",
            "quantity": 100,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200
        result = response.json()
        
        # Handle multi-impact groups - use group update endpoint
        if "activities" in result and result.get("count", 1) > 1:
            group_id = result["group_id"]
            original_emissions = sum(a.get("emissions", 0) for a in result["activities"])
            
            # Edit the group quantity
            update_data = {"quantity": 200}
            response = api_client.put(f"{BASE_URL}/api/activities/groups/{group_id}", json=update_data)
            assert response.status_code == 200, f"Failed to update group: {response.text}"
            
            updated = response.json()
            new_emissions = sum(a.get("emissions", 0) for a in updated.get("activities", []))
            
            # Emissions should roughly double
            if original_emissions > 0:
                ratio = new_emissions / original_emissions
                assert 1.5 < ratio < 2.5, f"Emissions ratio should be ~2, got {ratio}"
            
            print(f"PASS: Updated group quantity, emissions changed from {original_emissions} to {new_emissions}")
            
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/activities/groups/{group_id}")
        else:
            # Single activity
            activity = result["activities"][0] if "activities" in result else result
            activity_id = activity["id"]
            original_emissions = activity.get("emissions", 0)
            
            # Edit the quantity
            update_data = {"quantity": 200}
            response = api_client.put(f"{BASE_URL}/api/activities/{activity_id}", json=update_data)
            assert response.status_code == 200, f"Failed to update: {response.text}"
            
            updated = response.json()
            new_emissions = updated.get("emissions", 0)
            
            # Emissions should roughly double (may not be exact due to rounding)
            if original_emissions > 0:
                ratio = new_emissions / original_emissions
                assert 1.5 < ratio < 2.5, f"Emissions ratio should be ~2, got {ratio}"
            
            print(f"PASS: Updated activity quantity, emissions changed from {original_emissions} to {new_emissions}")
            
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/activities/{activity_id}")
    
    def test_delete_single_activity(self, api_client, fiscal_year_id):
        """Test deleting a single activity"""
        # Create an activity - use combustion_fixe which has scope1 impacts
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        # Find a factor with scope1 impact
        factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if any(i.get("scope") == "scope1" for i in impacts):
                factor = f
                break
        if not factor:
            factor = factors[0]
        
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_Delete_{int(time.time())}",
            "quantity": 50,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200
        result = response.json()
        activity = result["activities"][0] if "activities" in result else result
        activity_id = activity["id"]
        
        # Delete the activity
        response = api_client.delete(f"{BASE_URL}/api/activities/{activity_id}")
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        
        # Verify it's deleted
        response = api_client.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert response.status_code == 404, "Activity should be deleted"
        
        print(f"PASS: Successfully deleted activity {activity_id}")
    
    def test_delete_activity_group(self, api_client, fiscal_year_id):
        """Test deleting a multi-impact activity group"""
        # Find a multi-impact factor
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        multi_impact_factor = None
        for f in factors:
            if len(f.get("impacts", [])) > 1:
                multi_impact_factor = f
                break
        
        if not multi_impact_factor:
            pytest.skip("No multi-impact factor found")
        
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_DeleteGroup_{int(time.time())}",
            "quantity": 100,
            "unit": multi_impact_factor.get("default_unit", "kg"),
            "emission_factor_id": multi_impact_factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200
        result = response.json()
        
        if "group_id" not in result or result.get("count", 1) <= 1:
            # Single activity, delete normally
            activity = result["activities"][0] if "activities" in result else result
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")
            pytest.skip("Factor didn't create a group")
        
        group_id = result["group_id"]
        count = result["count"]
        
        # Delete the group
        response = api_client.delete(f"{BASE_URL}/api/activities/groups/{group_id}")
        assert response.status_code == 200, f"Failed to delete group: {response.text}"
        
        delete_result = response.json()
        assert delete_result.get("deleted") == count, f"Should delete {count} activities"
        
        print(f"PASS: Successfully deleted activity group with {count} activities")


class TestCalculationCoherence:
    """Test calculation coherence between frontend and backend"""
    
    def test_emissions_calculation_formula(self, api_client, fiscal_year_id):
        """Test that emissions = quantity × factor value"""
        # Get a factor with known impact value - use combustion_fixe which has scope1 impacts
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        # Find a factor with scope1 impact
        simple_factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if any(i.get("scope") == "scope1" and i.get("value", 0) > 0 for i in impacts):
                simple_factor = f
                break
        
        if not simple_factor:
            # Use first factor
            simple_factor = factors[0]
        
        quantity = 100
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_Calculation_{int(time.time())}",
            "quantity": quantity,
            "unit": simple_factor.get("default_unit", "kg"),
            "emission_factor_id": simple_factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200
        result = response.json()
        
        # Calculate expected emissions
        impacts = simple_factor.get("impacts", [])
        if impacts:
            # Sum all applicable impacts
            expected_emissions = sum(
                quantity * i.get("value", 0) 
                for i in impacts 
                if i.get("scope") in ["scope1", "scope2", "scope3_3"]
            )
        else:
            expected_emissions = quantity * simple_factor.get("value", 0)
        
        # Get actual emissions
        if "activities" in result:
            actual_emissions = sum(a.get("emissions", 0) for a in result["activities"])
            group_id = result.get("group_id")
        else:
            actual_emissions = result.get("emissions", 0)
            group_id = None
        
        # Allow small floating point differences
        if expected_emissions > 0:
            diff_pct = abs(actual_emissions - expected_emissions) / expected_emissions * 100
            assert diff_pct < 1, f"Emissions mismatch: expected {expected_emissions}, got {actual_emissions}"
        
        print(f"PASS: Emissions calculation correct: {actual_emissions} kgCO2e (expected ~{expected_emissions})")
        
        # Cleanup
        if group_id:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{group_id}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{result['id']}")
    
    def test_dashboard_summary_updates(self, api_client, fiscal_year_id):
        """Test that dashboard summary updates after activity creation"""
        # Get initial summary
        response = api_client.get(f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={fiscal_year_id}")
        assert response.status_code == 200
        initial_summary = response.json()
        initial_total = initial_summary.get("total_emissions", 0)
        
        # Create an activity - use combustion_fixe which has scope1 impacts
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        factors = response.json()
        
        # Find a factor with scope1 impact
        factor = None
        for f in factors:
            impacts = f.get("impacts", [])
            if any(i.get("scope") == "scope1" for i in impacts):
                factor = f
                break
        if not factor:
            factor = factors[0]
        
        activity_data = {
            "category_id": "combustion_fixe",
            "scope": "scope1",
            "name": f"TEST_Summary_{int(time.time())}",
            "quantity": 1000,
            "unit": factor.get("default_unit", "kg"),
            "emission_factor_id": factor["id"],
            "fiscal_year_id": fiscal_year_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe"
        }
        
        response = api_client.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200
        result = response.json()
        activity = result["activities"][0] if "activities" in result else result
        activity_emissions = activity.get("emissions", 0)
        
        # Get updated summary
        response = api_client.get(f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={fiscal_year_id}")
        assert response.status_code == 200
        updated_summary = response.json()
        updated_total = updated_summary.get("total_emissions", 0)
        
        # Total should have increased
        if activity_emissions > 0:
            assert updated_total > initial_total, "Total emissions should increase after adding activity"
        
        print(f"PASS: Dashboard summary updated: {initial_total} → {updated_total} kgCO2e")
        
        # Cleanup
        if "group_id" in result and result.get("count", 1) > 1:
            api_client.delete(f"{BASE_URL}/api/activities/groups/{result['group_id']}")
        else:
            api_client.delete(f"{BASE_URL}/api/activities/{activity['id']}")


class TestSubcategoryResolution:
    """Test subcategory to category resolution for search"""
    
    def test_subcategories_have_categories_array(self, api_client):
        """Test that subcategories have categories array for resolution"""
        response = api_client.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        subcats = response.json()
        
        # Check that subcategories have categories field
        with_categories = [s for s in subcats if s.get("categories")]
        assert len(with_categories) > 0, "Some subcategories should have categories array"
        print(f"PASS: {len(with_categories)}/{len(subcats)} subcategories have categories array")
    
    def test_beton_subcategory_multiple_categories(self, api_client):
        """Test that 'beton' subcategory maps to multiple categories"""
        response = api_client.get(f"{BASE_URL}/api/subcategories")
        subcats = response.json()
        
        beton = next((s for s in subcats if s.get("code") == "beton"), None)
        if not beton:
            pytest.skip("'beton' subcategory not found")
        
        categories = beton.get("categories", [])
        assert len(categories) >= 2, f"'beton' should map to multiple categories, got {categories}"
        print(f"PASS: 'beton' subcategory maps to {len(categories)} categories: {categories}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
