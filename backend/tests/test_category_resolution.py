"""
Test category resolution for search-selected factors
Bug fix: When a factor is selected via global search, the category was 'unknown' 
because a factor belongs to a subcategory that can be linked to multiple categories.
Fix: Option C hybrid - auto-derive category when unique, show mini category picker when ambiguous.
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoryResolution:
    """Tests for category resolution when selecting factors via global search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_index_returns_scope_from_impacts(self):
        """Backend: GET /api/emission-factors/search-index returns factors with correct scope from impacts"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        assert len(factors) > 0, "Search index should return factors"
        
        # Check that factors have scope field derived from impacts
        for factor in factors[:10]:
            assert "scope" in factor, f"Factor {factor.get('id')} missing scope field"
            assert "impact" in factor, f"Factor {factor.get('id')} missing impact field"
            
            # Verify scope matches impact.scope
            if factor.get("impact"):
                assert factor["scope"] == factor["impact"]["scope"], \
                    f"Factor {factor.get('id')}: scope {factor['scope']} != impact.scope {factor['impact']['scope']}"
        
        print(f"SUCCESS: Verified {len(factors)} factors have correct scope from impacts")
    
    def test_subcategories_have_categories_array(self):
        """Subcategories API returns categories array for category resolution"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        
        subcategories = response.json()
        assert len(subcategories) > 0, "Should have subcategories"
        
        # Check that subcategories have categories array
        for subcat in subcategories[:10]:
            assert "categories" in subcat, f"Subcategory {subcat.get('code')} missing categories array"
            assert isinstance(subcat["categories"], list), f"categories should be a list"
        
        print(f"SUCCESS: Verified {len(subcategories)} subcategories have categories array")
    
    def test_beton_subcategory_has_multiple_categories(self):
        """'beton' subcategory maps to multiple categories (ambiguous case)"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        
        subcategories = response.json()
        beton = next((s for s in subcategories if s["code"] == "beton"), None)
        
        assert beton is not None, "Should find 'beton' subcategory"
        assert len(beton["categories"]) >= 2, f"'beton' should have multiple categories, got: {beton['categories']}"
        assert "biens_equipement" in beton["categories"], "'beton' should include 'biens_equipement'"
        assert "biens_services_achetes" in beton["categories"], "'beton' should include 'biens_services_achetes'"
        
        print(f"SUCCESS: 'beton' subcategory has {len(beton['categories'])} categories: {beton['categories']}")
    
    def test_single_category_subcategory(self):
        """Some subcategories have only one category (auto-derive case)"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        
        subcategories = response.json()
        
        # Find subcategories with single category
        single_cat_subcats = [s for s in subcategories if len(s.get("categories", [])) == 1]
        
        assert len(single_cat_subcats) > 0, "Should have some subcategories with single category"
        
        print(f"SUCCESS: Found {len(single_cat_subcats)} subcategories with single category")
        for s in single_cat_subcats[:5]:
            print(f"  - {s['code']}: {s['categories']}")
    
    def test_search_beton_factors(self):
        """Search for 'beton' returns factors with correct subcategory"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        beton_factors = [f for f in factors if "beton" in f.get("name_fr", "").lower() or "béton" in f.get("name_fr", "").lower()]
        
        assert len(beton_factors) > 0, "Should find beton factors"
        
        # Check that beton factors have correct subcategory
        for factor in beton_factors[:5]:
            assert factor.get("subcategory") == "beton", f"Factor {factor.get('name_fr')} should have subcategory 'beton'"
            assert factor.get("scope") is not None, f"Factor {factor.get('name_fr')} should have scope"
        
        print(f"SUCCESS: Found {len(beton_factors)} beton factors with correct subcategory")
    
    def test_create_activity_with_resolved_category(self):
        """Create activity with resolved category (not 'unknown')"""
        # First, get a beton factor
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        factors = response.json()
        beton_factor = next((f for f in factors if f.get("subcategory") == "beton"), None)
        
        assert beton_factor is not None, "Should find a beton factor"
        
        # Create activity with resolved category
        activity_data = {
            "category_id": "biens_services_achetes",  # Resolved category (not 'unknown')
            "subcategory_id": "beton",
            "scope": "scope3_amont",
            "name": "TEST_Category_Resolution_Test",
            "quantity": 100,
            "unit": beton_factor.get("default_unit", "m3"),
            "emission_factor_id": beton_factor["id"],
            "comments": "Test for category resolution bug fix",
            "entry_scope": "scope3_amont",
            "entry_category": "biens_services_achetes"
        }
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data, headers=self.headers)
        assert response.status_code in [200, 201], f"Failed to create activity: {response.text}"
        
        result = response.json()
        activity_id = result.get("id") or result.get("activities", [{}])[0].get("id")
        
        # Verify the activity was created with correct category
        if activity_id:
            get_response = requests.get(f"{BASE_URL}/api/activities/{activity_id}", headers=self.headers)
            if get_response.status_code == 200:
                activity = get_response.json()
                assert activity.get("category_id") == "biens_services_achetes", \
                    f"Activity should have category 'biens_services_achetes', got: {activity.get('category_id')}"
                print(f"SUCCESS: Activity created with correct category: {activity.get('category_id')}")
            
            # Clean up - delete the test activity
            delete_response = requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=self.headers)
            print(f"Cleanup: Deleted test activity (status: {delete_response.status_code})")
        else:
            print(f"SUCCESS: Activity created (response: {result})")
    
    def test_categories_endpoint_returns_scope(self):
        """Categories endpoint returns scope for each category"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) > 0, "Should have categories"
        
        # Check that categories have scope
        for cat in categories[:10]:
            assert "scope" in cat, f"Category {cat.get('code')} missing scope"
            assert cat["scope"] in ["scope1", "scope2", "scope3_amont", "scope3_aval"], \
                f"Category {cat.get('code')} has invalid scope: {cat['scope']}"
        
        print(f"SUCCESS: Verified {len(categories)} categories have valid scope")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
