"""
Admin Emission Factors V2 API Tests
Tests for the new admin emission factors v2 endpoints with:
- Server-side pagination (page, page_size params)
- is_public filter (true/false for public/expert factors)
- Server-side search
- CRUD operations with is_public field

Expected data: 8978 EFs total (760 public, 8218 expert) from BAFU 2025 migration
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - admin user
ADMIN_EMAIL = "newtest@x.com"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


class TestEmissionFactorsV2Pagination:
    """Test server-side pagination for /api/admin/emission-factors-v2"""
    
    def test_01_pagination_returns_expected_structure(self, admin_token):
        """GET /api/admin/emission-factors-v2 returns pagination structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Verify pagination structure
        assert "items" in data, "Response should have 'items' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert "page_size" in data, "Response should have 'page_size' field"
        assert "total_pages" in data, "Response should have 'total_pages' field"
        
        print(f"Total factors: {data['total']}, Page: {data['page']}/{data['total_pages']}")
    
    def test_02_default_pagination_50_per_page(self, admin_token):
        """Default pagination returns 50 items per page"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert data["page_size"] == 50, f"Expected page_size 50, got {data['page_size']}"
        assert data["page"] == 1, f"Expected page 1, got {data['page']}"
        assert len(data["items"]) <= 50, f"Expected max 50 items, got {len(data['items'])}"
    
    def test_03_total_emission_factors_count_around_8978(self, admin_token):
        """Total emission factors count should be ~8978 from BAFU 2025 migration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # Allow some variance for test data creation/deletion
        assert data["total"] >= 8900, f"Expected ~8978 total, got {data['total']}"
        assert data["total"] <= 10000, f"Total seems too high: {data['total']}"
        
        # Calculate expected pages (ceil(total / 50))
        expected_pages = (data["total"] + 49) // 50
        assert data["total_pages"] == expected_pages, f"Expected {expected_pages} pages, got {data['total_pages']}"
        print(f"✓ Total: {data['total']}, Pages: {data['total_pages']}")
    
    def test_04_page_navigation_works(self, admin_token):
        """Page parameter changes returned items"""
        # Get page 1
        response_page1 = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        page1_data = response_page1.json()
        
        # Get page 2
        response_page2 = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page=2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        page2_data = response_page2.json()
        
        assert page1_data["page"] == 1
        assert page2_data["page"] == 2
        
        # Items should be different
        page1_ids = [f["id"] for f in page1_data["items"]]
        page2_ids = [f["id"] for f in page2_data["items"]]
        assert page1_ids != page2_ids, "Page 1 and Page 2 should have different items"
        print(f"✓ Page 1 has {len(page1_ids)} items, Page 2 has {len(page2_ids)} items")
    
    def test_05_custom_page_size_works(self, admin_token):
        """Custom page_size parameter works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert data["page_size"] == 10, f"Expected page_size 10, got {data['page_size']}"
        assert len(data["items"]) <= 10, f"Expected max 10 items, got {len(data['items'])}"


class TestEmissionFactorsV2IsPublicFilter:
    """Test is_public filter for separating public/expert factors"""
    
    def test_01_filter_is_public_true_returns_public_factors(self, admin_token):
        """is_public=true returns only public factors (~760 expected)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?is_public=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be ~760 public factors
        assert data["total"] >= 700, f"Expected ~760 public factors, got {data['total']}"
        assert data["total"] <= 900, f"Public factors count too high: {data['total']}"
        
        # All returned items should be is_public=true
        for factor in data["items"]:
            assert factor.get("is_public") == True, f"Factor {factor.get('id')} should be public"
        
        print(f"✓ Public factors: {data['total']}")
    
    def test_02_filter_is_public_false_returns_expert_factors(self, admin_token):
        """is_public=false returns only expert factors (~8218 expected)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?is_public=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be ~8218 expert factors
        assert data["total"] >= 8000, f"Expected ~8218 expert factors, got {data['total']}"
        assert data["total"] <= 9000, f"Expert factors count too high: {data['total']}"
        
        # All returned items should be is_public=false
        for factor in data["items"]:
            assert factor.get("is_public") == False, f"Factor {factor.get('id')} should be expert (is_public=false)"
        
        print(f"✓ Expert factors: {data['total']}")
    
    def test_03_no_filter_returns_all_factors(self, admin_token):
        """No is_public filter returns all factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # Get public and expert counts
        public_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?is_public=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        expert_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?is_public=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        public_count = public_response.json()["total"]
        expert_count = expert_response.json()["total"]
        
        # Total should be public + expert
        assert data["total"] == public_count + expert_count, \
            f"Total {data['total']} should equal public({public_count}) + expert({expert_count})"
        
        print(f"✓ All: {data['total']} = Public: {public_count} + Expert: {expert_count}")
    
    def test_04_filter_combined_with_pagination(self, admin_token):
        """is_public filter works with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?is_public=true&page=2&page_size=20",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 2
        assert data["page_size"] == 20
        assert len(data["items"]) <= 20
        
        # All items should still be public
        for factor in data["items"]:
            assert factor.get("is_public") == True


class TestEmissionFactorsV2Search:
    """Test server-side search functionality"""
    
    def test_01_search_diesel_returns_results(self, admin_token):
        """Search for 'diesel' returns matching factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?search=diesel",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] > 0, "Search for 'diesel' should return results"
        print(f"✓ 'diesel' search returned {data['total']} results")
        
        # Verify at least one result contains 'diesel' in name or tags
        found_diesel = False
        for factor in data["items"]:
            name_fr = factor.get("name_fr", "").lower()
            name_de = factor.get("name_de", "").lower()
            tags = [t.lower() for t in factor.get("tags", [])]
            subcategory = factor.get("subcategory", "").lower()
            
            if "diesel" in name_fr or "diesel" in name_de or "diesel" in tags or "diesel" in subcategory:
                found_diesel = True
                break
        
        assert found_diesel, "At least one result should contain 'diesel'"
    
    def test_02_search_combined_with_is_public_filter(self, admin_token):
        """Search works with is_public filter"""
        # Search diesel in public factors only
        public_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?search=diesel&is_public=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        public_data = public_response.json()
        
        # Search diesel in expert factors only
        expert_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?search=diesel&is_public=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        expert_data = expert_response.json()
        
        # Search diesel in all factors
        all_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?search=diesel",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        all_data = all_response.json()
        
        # Total should be public + expert
        assert all_data["total"] == public_data["total"] + expert_data["total"], \
            f"Diesel total {all_data['total']} should equal public({public_data['total']}) + expert({expert_data['total']})"
        
        print(f"✓ 'diesel' search: All={all_data['total']}, Public={public_data['total']}, Expert={expert_data['total']}")
    
    def test_03_search_nonexistent_returns_empty(self, admin_token):
        """Search for nonexistent term returns empty results"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?search=xyznonexistent123",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 0, f"Search for nonexistent term should return 0, got {data['total']}"
        assert len(data["items"]) == 0


class TestEmissionFactorsV2CRUD:
    """Test CRUD operations with is_public field"""
    
    def test_01_create_factor_with_is_public_true(self, admin_token):
        """Create emission factor with is_public=true"""
        unique_name = f"TEST_PublicFactor_{uuid.uuid4().hex[:8]}"
        factor_data = {
            "name_fr": unique_name,
            "name_de": f"{unique_name}_DE",
            "subcategory": "voiture_particuliere",
            "input_units": ["km"],
            "default_unit": "km",
            "impacts": [{
                "scope": "scope1",
                "category": "combustion_mobile",
                "value": 0.15,
                "unit": "kgCO2e/km",
                "type": "direct"
            }],
            "tags": ["test", "public"],
            "source": "TEST",
            "region": "Suisse",
            "year": 2025,
            "is_public": True  # Explicitly public
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=factor_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["name_fr"] == unique_name
        assert data["is_public"] == True, f"Factor should be public, got is_public={data.get('is_public')}"
        assert "id" in data
        
        # Cleanup
        factor_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}/soft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Created public factor {unique_name}")
    
    def test_02_create_factor_with_is_public_false(self, admin_token):
        """Create emission factor with is_public=false (expert factor)"""
        unique_name = f"TEST_ExpertFactor_{uuid.uuid4().hex[:8]}"
        factor_data = {
            "name_fr": unique_name,
            "name_de": f"{unique_name}_DE",
            "subcategory": "voiture_particuliere",
            "input_units": ["km"],
            "default_unit": "km",
            "impacts": [{
                "scope": "scope1",
                "category": "combustion_mobile",
                "value": 0.18,
                "unit": "kgCO2e/km",
                "type": "direct"
            }],
            "tags": ["test", "expert"],
            "source": "TEST",
            "region": "Suisse",
            "year": 2025,
            "is_public": False  # Expert factor
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=factor_data
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["name_fr"] == unique_name
        assert data["is_public"] == False, f"Factor should be expert, got is_public={data.get('is_public')}"
        
        # Cleanup
        factor_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}/soft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Created expert factor {unique_name}")
    
    def test_03_update_factor_is_public_toggle(self, admin_token):
        """Update emission factor to toggle is_public field"""
        # Create a public factor first
        unique_name = f"TEST_ToggleFactor_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name_fr": unique_name,
                "name_de": f"{unique_name}_DE",
                "subcategory": "voiture_particuliere",
                "input_units": ["km"],
                "default_unit": "km",
                "impacts": [{
                    "scope": "scope1",
                    "category": "combustion_mobile",
                    "value": 0.15,
                    "unit": "kgCO2e/km",
                    "type": "direct"
                }],
                "source": "TEST",
                "year": 2025,
                "is_public": True
            }
        )
        assert create_response.status_code == 200
        factor_id = create_response.json()["id"]
        
        # Update to expert (is_public=false)
        update_response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_public": False}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        
        assert updated_data["is_public"] == False, f"Factor should now be expert, got is_public={updated_data.get('is_public')}"
        
        # Update back to public
        revert_response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_public": True}
        )
        assert revert_response.status_code == 200
        reverted_data = revert_response.json()
        
        assert reverted_data["is_public"] == True, f"Factor should be public again"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors-v2/{factor_id}/soft",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Successfully toggled is_public for factor {factor_id}")
    
    def test_04_get_factors_sorted_by_is_public_desc(self, admin_token):
        """Verify factors are sorted by is_public DESC (public first)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page_size=100",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        # Check that public factors come first
        found_expert = False
        for factor in data["items"]:
            if factor.get("is_public") == False:
                found_expert = True
            elif found_expert and factor.get("is_public") == True:
                # Found a public factor after an expert factor - wrong order
                pytest.fail("Factors should be sorted with public (is_public=true) first")
        
        print("✓ Factors correctly sorted by is_public DESC")


class TestEmissionFactorsV2AccessControl:
    """Test access control for emission factors v2 endpoints"""
    
    def test_01_unauthenticated_request_fails(self):
        """Unauthenticated request to /api/admin/emission-factors-v2 fails"""
        response = requests.get(f"{BASE_URL}/api/admin/emission-factors-v2")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_02_regular_user_cannot_access(self, admin_token):
        """Regular user cannot access admin emission factors endpoint"""
        # First create/get a regular user
        user_email = f"test_regular_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": user_email,
            "password": "test123",
            "name": "Regular Test User"
        })
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_email,
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not create regular user")
        
        regular_token = login_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
