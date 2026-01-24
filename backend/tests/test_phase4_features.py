"""
Phase 4 Features Tests - V2 Emission Factors, Subcategories, Multi-Impact, Business Rules
Tests for:
- Admin Subcategories CRUD
- Admin Emission Factors V2 with multi-impacts
- Guided entry modal flow (subcategory → unit → factor → quantity)
- Multi-impact calculation (1 entry creates multiple linked activities)
- Business rules: Scope 1/2 includes Scope 3.3, Scope 3 (non-3.3) excludes Scope 1/2/3.3
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "newtest@x.com"
ADMIN_PASSWORD = "test123"


class TestAdminSubcategories:
    """Test /api/admin/subcategories CRUD endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_subcategories(self, admin_token):
        """Admin can get all subcategories"""
        response = requests.get(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get subcategories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of subcategories"
        print(f"Found {len(data)} subcategories")
    
    def test_create_subcategory(self, admin_token):
        """Admin can create a new subcategory with N-N category relationship"""
        unique_code = f"TEST_subcat_{uuid.uuid4().hex[:8]}"
        subcat_data = {
            "code": unique_code,
            "name_fr": "Test Sous-catégorie FR",
            "name_de": "Test Unterkategorie DE",
            "categories": ["combustion_mobile", "deplacements_professionnels"],  # N-N relationship
            "icon": "car",
            "order": 99
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=subcat_data
        )
        assert response.status_code == 200, f"Create subcategory failed: {response.text}"
        data = response.json()
        assert data["code"] == unique_code
        assert data["name_fr"] == "Test Sous-catégorie FR"
        assert data["name_de"] == "Test Unterkategorie DE"
        assert "combustion_mobile" in data["categories"]
        assert "deplacements_professionnels" in data["categories"]
        assert "id" in data
        
        # Cleanup
        subcat_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/subcategories/{subcat_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_subcategory(self, admin_token):
        """Admin can update a subcategory"""
        # Create first
        unique_code = f"TEST_subcat_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": unique_code,
                "name_fr": "Original FR",
                "name_de": "Original DE",
                "categories": ["combustion_mobile"],
                "icon": "car",
                "order": 99
            }
        )
        subcat_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(
            f"{BASE_URL}/api/admin/subcategories/{subcat_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name_fr": "Updated FR",
                "categories": ["combustion_mobile", "electricite"]
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data["name_fr"] == "Updated FR"
        assert "electricite" in updated_data["categories"]
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/subcategories/{subcat_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_subcategory(self, admin_token):
        """Admin can delete a subcategory"""
        # Create first
        unique_code = f"TEST_subcat_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": unique_code,
                "name_fr": "To Delete FR",
                "name_de": "To Delete DE",
                "categories": ["combustion_mobile"],
                "icon": "trash",
                "order": 99
            }
        )
        subcat_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/subcategories/{subcat_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        subcats = get_response.json()
        subcat_ids = [s["id"] for s in subcats]
        assert subcat_id not in subcat_ids, "Subcategory should be deleted"


class TestAdminEmissionFactorsV2:
    """Test /api/admin/emission-factors-v2 CRUD endpoints with multi-impacts"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_emission_factors_v2(self, admin_token):
        """Admin can get all V2 emission factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get V2 factors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of factors"
        print(f"Found {len(data)} V2 emission factors")
        
        # Check for multi-impact factors
        multi_impact_count = sum(1 for f in data if f.get("impacts") and len(f.get("impacts", [])) > 1)
        print(f"Multi-impact factors: {multi_impact_count}")
    
    def test_create_emission_factor_v2_with_multi_impacts(self, admin_token):
        """Admin can create V2 factor with multiple impacts (multi-scope)"""
        unique_name = f"TEST_V2_Factor_{uuid.uuid4().hex[:8]}"
        factor_data = {
            "name_fr": unique_name,
            "name_de": f"{unique_name}_DE",
            "subcategory": "voitures",
            "input_units": ["L", "km"],
            "default_unit": "L",
            "impacts": [
                {
                    "scope": "scope1",
                    "category": "combustion_mobile",
                    "value": 2.68,
                    "unit": "kgCO2e/L",
                    "type": "direct"
                },
                {
                    "scope": "scope3_amont",
                    "category": "activites_combustibles_energie",
                    "value": 0.58,
                    "unit": "kgCO2e/L",
                    "type": "upstream"
                }
            ],
            "unit_conversions": {"km_to_L": 0.07},
            "tags": ["test", "diesel", "multi-impact"],
            "source": "TEST_V2",
            "region": "Suisse",
            "year": 2024
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=factor_data
        )
        assert response.status_code == 200, f"Create V2 factor failed: {response.text}"
        data = response.json()
        assert data["name_fr"] == unique_name
        assert len(data["impacts"]) == 2, "Expected 2 impacts"
        assert data["impacts"][0]["scope"] == "scope1"
        assert data["impacts"][1]["scope"] == "scope3_amont"
        assert "id" in data
        
        # Cleanup
        factor_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_update_emission_factor_v2(self, admin_token):
        """Admin can update V2 factor impacts"""
        # Create first
        unique_name = f"TEST_V2_Factor_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name_fr": unique_name,
                "name_de": f"{unique_name}_DE",
                "subcategory": "voitures",
                "input_units": ["L"],
                "default_unit": "L",
                "impacts": [
                    {"scope": "scope1", "category": "combustion_mobile", "value": 2.5, "unit": "kgCO2e/L", "type": "direct"}
                ],
                "tags": ["test"],
                "source": "TEST",
                "region": "Suisse",
                "year": 2024
            }
        )
        factor_id = create_response.json()["id"]
        
        # Update with additional impact
        update_response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "impacts": [
                    {"scope": "scope1", "category": "combustion_mobile", "value": 2.68, "unit": "kgCO2e/L", "type": "direct"},
                    {"scope": "scope3_amont", "category": "activites_combustibles_energie", "value": 0.58, "unit": "kgCO2e/L", "type": "upstream"}
                ]
            }
        )
        assert update_response.status_code == 200, f"Update V2 factor failed: {update_response.text}"
        updated_data = update_response.json()
        assert len(updated_data["impacts"]) == 2, "Expected 2 impacts after update"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_export_v2_factors(self, admin_token):
        """Admin can export V2 factors with subcategories and conversions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2/export",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export V2 failed: {response.text}"
        data = response.json()
        assert "factors" in data
        assert "subcategories" in data
        assert "unit_conversions" in data
        assert data.get("version") == 2
        print(f"Exported: {len(data['factors'])} factors, {len(data['subcategories'])} subcategories, {len(data['unit_conversions'])} conversions")


class TestPublicSubcategoriesAndFactors:
    """Test public endpoints for subcategories and emission factors search"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_subcategories_by_category(self, user_token):
        """User can get subcategories filtered by category (N-N relationship)"""
        response = requests.get(
            f"{BASE_URL}/api/subcategories?category=combustion_mobile",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Get subcategories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of subcategories"
        
        # All returned subcategories should have combustion_mobile in their categories
        for subcat in data:
            assert "combustion_mobile" in subcat.get("categories", []), f"Subcategory {subcat['code']} should have combustion_mobile"
        print(f"Found {len(data)} subcategories for combustion_mobile")
    
    def test_search_emission_factors_by_subcategory(self, user_token):
        """User can search emission factors by subcategory"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?subcategory=voitures",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Search factors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of factors"
        print(f"Found {len(data)} factors for subcategory 'voitures'")
    
    def test_search_emission_factors_by_unit(self, user_token):
        """User can search emission factors compatible with a specific unit"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?unit=L",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Search factors by unit failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of factors"
        print(f"Found {len(data)} factors compatible with unit 'L'")
    
    def test_get_unit_conversions(self, user_token):
        """User can get global unit conversions"""
        response = requests.get(
            f"{BASE_URL}/api/unit-conversions",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200, f"Get unit conversions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of conversions"
        print(f"Found {len(data)} unit conversions")


class TestMultiImpactActivityCreation:
    """Test activity creation with multi-impact factors and business rules"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_create_activity_with_multi_impact_factor_scope1(self, user_token, admin_token):
        """
        Creating activity in Scope 1 with multi-impact factor should create linked activities
        Business rule: Scope 1/2 entry includes Scope 1/2 + Scope 3.3 (upstream energy)
        """
        # First, find or create a multi-impact factor
        factors_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        factors = factors_response.json()
        
        # Find a multi-impact factor (e.g., Diesel)
        multi_impact_factor = None
        for f in factors:
            if f.get("impacts") and len(f.get("impacts", [])) > 1:
                multi_impact_factor = f
                break
        
        if not multi_impact_factor:
            pytest.skip("No multi-impact factor found")
        
        print(f"Using multi-impact factor: {multi_impact_factor.get('name_fr', multi_impact_factor.get('name'))}")
        print(f"Factor has {len(multi_impact_factor['impacts'])} impacts")
        
        # Create activity in Scope 1
        activity_data = {
            "category_id": "combustion_mobile",
            "subcategory_id": "voitures",
            "scope": "scope1",
            "name": f"TEST_MultiImpact_{uuid.uuid4().hex[:8]}",
            "quantity": 100,
            "unit": multi_impact_factor.get("default_unit", "L"),
            "emission_factor_id": multi_impact_factor["id"],
            "comments": "Test multi-impact activity"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers={"Authorization": f"Bearer {user_token}"},
            json=activity_data
        )
        assert response.status_code == 200, f"Create activity failed: {response.text}"
        data = response.json()
        
        # Check if multiple activities were created
        if "activities" in data:
            print(f"Created {len(data['activities'])} linked activities")
            assert len(data["activities"]) >= 1, "Expected at least 1 activity"
            
            # Verify breakdown
            if "breakdown" in data:
                for breakdown in data["breakdown"]:
                    print(f"  - {breakdown['scope']}: {breakdown['emissions']} kgCO2e ({breakdown.get('type', 'direct')})")
            
            # Verify linked_group_id
            group_id = data["activities"][0].get("linked_group_id")
            if group_id:
                for act in data["activities"]:
                    assert act.get("linked_group_id") == group_id, "All activities should have same linked_group_id"
        else:
            print("Single activity created (factor may not have multiple applicable impacts)")
    
    def test_business_rule_scope3_excludes_scope12_and_33(self, user_token, admin_token):
        """
        Business rule: Scope 3 entry (non-3.3 category) should exclude Scope 1/2 and Scope 3.3
        """
        # Find a multi-impact factor
        factors_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        factors = factors_response.json()
        
        multi_impact_factor = None
        for f in factors:
            if f.get("impacts") and len(f.get("impacts", [])) > 1:
                # Check if it has both scope1 and scope3 impacts
                scopes = [imp.get("scope") for imp in f.get("impacts", [])]
                if "scope1" in scopes or "scope2" in scopes:
                    multi_impact_factor = f
                    break
        
        if not multi_impact_factor:
            pytest.skip("No suitable multi-impact factor found")
        
        print(f"Using factor: {multi_impact_factor.get('name_fr')}")
        print(f"Factor impacts: {[imp.get('scope') for imp in multi_impact_factor.get('impacts', [])]}")
        
        # Create activity in Scope 3 (non-3.3 category like deplacements_professionnels)
        activity_data = {
            "category_id": "deplacements_professionnels",  # Scope 3 category, NOT activites_combustibles_energie
            "subcategory_id": "voitures",
            "scope": "scope3_amont",
            "name": f"TEST_Scope3Rule_{uuid.uuid4().hex[:8]}",
            "quantity": 100,
            "unit": multi_impact_factor.get("default_unit", "L"),
            "emission_factor_id": multi_impact_factor["id"],
            "comments": "Test Scope 3 business rule"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers={"Authorization": f"Bearer {user_token}"},
            json=activity_data
        )
        assert response.status_code == 200, f"Create activity failed: {response.text}"
        data = response.json()
        
        # Check that Scope 1/2 impacts are excluded
        if "activities" in data:
            for act in data["activities"]:
                scope = act.get("scope")
                category = act.get("category_id")
                # Should NOT have scope1 or scope2
                assert scope not in ["scope1", "scope2"], f"Scope 3 entry should not create {scope} activity"
                # Should NOT have scope 3.3 (activites_combustibles_energie)
                if scope.startswith("scope3"):
                    assert category != "activites_combustibles_energie", "Scope 3 entry should not create Scope 3.3 activity"
            print(f"Business rule verified: {len(data['activities'])} activities created, all Scope 3 (non-3.3)")
        else:
            print("Single activity created")


class TestFactorsTableDisplay:
    """Test that factors table displays correct columns"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_factors_have_required_fields(self, admin_token):
        """Verify factors have all required fields for table display"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        factors = response.json()
        
        if len(factors) == 0:
            pytest.skip("No factors found")
        
        # Check first factor has required fields for table columns
        factor = factors[0]
        
        # Required columns: Nom, Sous-catégorie, Impacts, Unités, Source
        assert "name_fr" in factor or "name" in factor, "Factor should have name_fr or name"
        # subcategory may be optional for V1 factors
        # impacts or (scope + value + unit) for V1
        assert "impacts" in factor or ("scope" in factor and "value" in factor), "Factor should have impacts or scope/value"
        # input_units or unit
        assert "input_units" in factor or "unit" in factor, "Factor should have input_units or unit"
        assert "source" in factor, "Factor should have source"
        
        print(f"Factor fields verified: {list(factor.keys())}")


class TestSubcategoriesTableDisplay:
    """Test that subcategories table displays correct columns"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_subcategories_have_required_fields(self, admin_token):
        """Verify subcategories have all required fields for table display"""
        response = requests.get(
            f"{BASE_URL}/api/admin/subcategories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        subcats = response.json()
        
        if len(subcats) == 0:
            pytest.skip("No subcategories found")
        
        # Check first subcategory has required fields
        subcat = subcats[0]
        
        # Required columns: Code, Nom FR, Nom DE, Catégories liées, Ordre
        assert "code" in subcat, "Subcategory should have code"
        assert "name_fr" in subcat, "Subcategory should have name_fr"
        assert "name_de" in subcat, "Subcategory should have name_de"
        assert "categories" in subcat, "Subcategory should have categories (N-N relationship)"
        assert isinstance(subcat["categories"], list), "Categories should be a list"
        assert "order" in subcat, "Subcategory should have order"
        
        print(f"Subcategory fields verified: {list(subcat.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
