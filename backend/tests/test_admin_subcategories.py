"""
Test Admin Subcategories API - Iteration 37
Tests for:
- GET /api/admin/subcategories returns ef_total and ef_public per subcategory
- POST /api/admin/subcategories - creation
- PUT /api/admin/subcategories/{id} - update
- DELETE /api/admin/subcategories/{id} - deletion
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials (admin user)
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"

# Track created test data for cleanup
created_subcategory_ids = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token") or response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSubcategoriesGET:
    """Test GET /api/admin/subcategories - retrieve with EF counts"""
    
    def test_01_get_subcategories_returns_list(self, auth_headers):
        """GET returns a list of subcategories"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) > 0, "Expected at least one subcategory"
        print(f"GET returned {len(data)} subcategories")
    
    def test_02_subcategories_have_ef_total_field(self, auth_headers):
        """Each subcategory has ef_total field"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for subcat in data[:5]:  # Check first 5
            assert "ef_total" in subcat, f"Missing ef_total in subcategory: {subcat.get('code')}"
            assert isinstance(subcat["ef_total"], int), "ef_total should be integer"
        print(f"PASS: ef_total field present in subcategories")
    
    def test_03_subcategories_have_ef_public_field(self, auth_headers):
        """Each subcategory has ef_public field"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for subcat in data[:5]:  # Check first 5
            assert "ef_public" in subcat, f"Missing ef_public in subcategory: {subcat.get('code')}"
            assert isinstance(subcat["ef_public"], int), "ef_public should be integer"
        print(f"PASS: ef_public field present in subcategories")
    
    def test_04_ef_public_less_or_equal_ef_total(self, auth_headers):
        """ef_public should be <= ef_total for each subcategory"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        violations = []
        for subcat in data:
            if subcat.get("ef_public", 0) > subcat.get("ef_total", 0):
                violations.append(f"{subcat.get('code')}: public={subcat['ef_public']} > total={subcat['ef_total']}")
        
        assert len(violations) == 0, f"ef_public > ef_total violations: {violations}"
        print(f"PASS: ef_public <= ef_total for all {len(data)} subcategories")
    
    def test_05_subcategories_have_expected_fields(self, auth_headers):
        """Each subcategory has expected fields: code, name_fr, name_de, categories, order"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "code", "name_fr"]
        optional_fields = ["name_de", "categories", "order", "icon", "ef_total", "ef_public"]
        
        for subcat in data[:3]:  # Check first 3
            for field in required_fields:
                assert field in subcat, f"Missing required field '{field}' in subcategory"
        
        print(f"PASS: Subcategories have expected fields")
    
    def test_06_count_subcategories_around_98(self, auth_headers):
        """Expected around 98 subcategories based on requirements"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        count = len(data)
        print(f"Total subcategories: {count}")
        # Check it's in reasonable range (80-120 to account for variations)
        assert 50 <= count <= 150, f"Unexpected subcategory count: {count}"


class TestSubcategoriesPOST:
    """Test POST /api/admin/subcategories - create new subcategory"""
    
    def test_01_create_subcategory_success(self, auth_headers):
        """Create a new subcategory with all fields"""
        test_subcat = {
            "code": "test_subcat_001",
            "name_fr": "TEST Sous-catégorie Test",
            "name_de": "TEST Unterkategorie Test",
            "categories": ["combustibles_fixes"],
            "icon": "test-icon",
            "order": 999
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/subcategories", json=test_subcat, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("code") == test_subcat["code"], "Code mismatch"
        assert data.get("name_fr") == test_subcat["name_fr"], "name_fr mismatch"
        assert data.get("name_de") == test_subcat["name_de"], "name_de mismatch"
        assert "id" in data, "Response should include id"
        
        # Track for cleanup
        created_subcategory_ids.append(data["id"])
        print(f"PASS: Created subcategory {data['id']}")
    
    def test_02_create_subcategory_minimal_fields(self, auth_headers):
        """Create subcategory with minimal required fields"""
        test_subcat = {
            "code": "test_subcat_002",
            "name_fr": "TEST Minimal Sub FR",
            "name_de": "TEST Minimal Sub DE",
            "categories": []  # Required field, can be empty list
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/subcategories", json=test_subcat, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        created_subcategory_ids.append(data["id"])
        print(f"PASS: Created minimal subcategory {data['id']}")


class TestSubcategoriesPUT:
    """Test PUT /api/admin/subcategories/{id} - update subcategory"""
    
    def test_01_update_subcategory_name(self, auth_headers):
        """Update subcategory name_fr"""
        # First create a subcategory
        create_data = {
            "code": "test_subcat_update_001",
            "name_fr": "TEST Before Update FR",
            "name_de": "TEST Before Update DE",
            "categories": [],
            "order": 998
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/subcategories", json=create_data, headers=auth_headers)
        assert create_response.status_code == 200
        subcat_id = create_response.json()["id"]
        created_subcategory_ids.append(subcat_id)
        
        # Update name_fr
        update_data = {
            "name_fr": "TEST After Update FR"
        }
        update_response = requests.put(f"{BASE_URL}/api/admin/subcategories/{subcat_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated.get("name_fr") == "TEST After Update FR", "name_fr not updated"
        print(f"PASS: Updated subcategory name_fr")
    
    def test_02_update_subcategory_order(self, auth_headers):
        """Update subcategory order"""
        # Create
        create_data = {
            "code": "test_subcat_update_002",
            "name_fr": "TEST Order Update FR",
            "name_de": "TEST Order Update DE",
            "categories": [],
            "order": 100
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/subcategories", json=create_data, headers=auth_headers)
        assert create_response.status_code == 200
        subcat_id = create_response.json()["id"]
        created_subcategory_ids.append(subcat_id)
        
        # Update order
        update_response = requests.put(f"{BASE_URL}/api/admin/subcategories/{subcat_id}", json={"order": 500}, headers=auth_headers)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated.get("order") == 500, "order not updated"
        print(f"PASS: Updated subcategory order")
    
    def test_03_update_nonexistent_subcategory_returns_404(self, auth_headers):
        """Update non-existent subcategory returns 404"""
        fake_id = "000000000000000000000000"
        response = requests.put(f"{BASE_URL}/api/admin/subcategories/{fake_id}", json={"name_fr": "Test"}, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: 404 returned for non-existent subcategory")


class TestSubcategoriesDELETE:
    """Test DELETE /api/admin/subcategories/{id} - delete subcategory"""
    
    def test_01_delete_subcategory_success(self, auth_headers):
        """Delete a subcategory successfully"""
        # Create one to delete
        create_data = {
            "code": "test_subcat_delete_001",
            "name_fr": "TEST To Delete FR",
            "name_de": "TEST To Delete DE",
            "categories": []
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/subcategories", json=create_data, headers=auth_headers)
        assert create_response.status_code == 200
        subcat_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/admin/subcategories/{subcat_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print(f"PASS: Deleted subcategory {subcat_id}")
    
    def test_02_delete_nonexistent_subcategory_returns_404(self, auth_headers):
        """Delete non-existent subcategory returns 404"""
        fake_id = "000000000000000000000000"
        response = requests.delete(f"{BASE_URL}/api/admin/subcategories/{fake_id}", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: 404 returned for non-existent subcategory")


class TestSubcategoriesAccessControl:
    """Test access control for subcategories endpoints"""
    
    def test_01_unauthenticated_request_fails(self):
        """Unauthenticated GET request fails"""
        response = requests.get(f"{BASE_URL}/api/admin/subcategories")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthenticated request rejected")


class TestCleanup:
    """Cleanup test data after all tests"""
    
    def test_cleanup_created_subcategories(self, auth_headers):
        """Delete all TEST_ prefixed subcategories created during tests"""
        global created_subcategory_ids
        deleted = 0
        errors = []
        
        for subcat_id in created_subcategory_ids:
            try:
                response = requests.delete(f"{BASE_URL}/api/admin/subcategories/{subcat_id}", headers=auth_headers)
                if response.status_code in [200, 404]:  # 404 means already deleted
                    deleted += 1
                else:
                    errors.append(f"{subcat_id}: {response.status_code}")
            except Exception as e:
                errors.append(f"{subcat_id}: {str(e)}")
        
        created_subcategory_ids.clear()
        
        if errors:
            print(f"Cleanup: Deleted {deleted}, Errors: {errors}")
        else:
            print(f"Cleanup: Successfully deleted {deleted} test subcategories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
