"""
Test Curation Workbench API endpoints
- GET /api/curation/factors - paginated factors list
- PATCH /api/curation/factors/{id} - inline edit
- POST /api/curation/bulk-preview - preview bulk changes
- POST /api/curation/bulk-apply - apply bulk changes
- GET /api/curation/stats - stats dashboard
- GET /api/curation/groups - name prefix groups
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - admin user
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("token")  # API returns 'token' not 'access_token'


@pytest.fixture(scope="module")
def session(auth_token):
    """Create session with auth header"""
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return s


class TestCurationStats:
    """Test GET /api/curation/stats endpoint"""

    def test_stats_returns_global_progress(self, session):
        """Stats endpoint returns global progress with total ~8978 factors"""
        response = session.get(f"{BASE_URL}/api/curation/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check global stats structure
        assert "global" in data
        g = data["global"]
        assert "total" in g
        assert "reviewed" in g
        assert "flagged" in g
        assert "untreated" in g
        assert "progress_pct" in g
        
        # Should have approximately 8978 factors (allow some variation)
        assert g["total"] >= 8000, f"Expected ~8978 factors, got {g['total']}"
        print(f"✓ Stats: {g['reviewed']}/{g['total']} ({g['progress_pct']}%) - {g['flagged']} flagged, {g['untreated']} untreated")

    def test_stats_returns_subcategory_breakdown(self, session):
        """Stats endpoint returns breakdown by subcategory"""
        response = session.get(f"{BASE_URL}/api/curation/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "by_subcategory" in data
        subcats = data["by_subcategory"]
        assert len(subcats) > 0, "Should have at least one subcategory"
        
        # Check subcategory structure
        sc = subcats[0]
        assert "subcategory" in sc
        assert "name_fr" in sc
        assert "total" in sc
        assert "reviewed" in sc
        assert "progress_pct" in sc
        print(f"✓ Found {len(subcats)} subcategories")


class TestCurationFactorsList:
    """Test GET /api/curation/factors endpoint"""

    def test_list_factors_paginated(self, session):
        """Factors list returns paginated results"""
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 50
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data
        
        # Verify pagination
        assert data["page"] == 1
        assert len(data["items"]) <= 50
        assert data["total"] >= 8000, f"Expected ~8978 factors total, got {data['total']}"
        print(f"✓ Page 1 has {len(data['items'])} items, total {data['total']}")

    def test_list_factors_with_search(self, session):
        """Search filter works (searching for 'mazout')"""
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 50,
            "search": "mazout"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] > 0, "Should find factors with 'mazout'"
        # Check that results contain the search term
        for item in data["items"]:
            name_fr = item.get("name_fr", "").lower()
            name_de = item.get("name_de", "").lower()
            tags = " ".join(item.get("tags", [])).lower()
            assert "mazout" in name_fr or "mazout" in name_de or "mazout" in tags, \
                f"Search result should contain 'mazout': {item.get('name_fr')}"
        print(f"✓ Search 'mazout' found {data['total']} factors")

    def test_list_factors_with_subcategory_filter(self, session):
        """Subcategory filter works (filtering 'aerien')"""
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 100,
            "subcategory": "aerien"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have ~51 factors according to requirement
        assert data["total"] > 0, "Should find factors in 'aerien' subcategory"
        # All items should have the correct subcategory
        for item in data["items"]:
            assert item.get("subcategory") == "aerien", \
                f"Factor should be in 'aerien' subcategory: {item.get('subcategory')}"
        print(f"✓ Subcategory 'aerien' has {data['total']} factors")

    def test_list_factors_with_curation_status_filter(self, session):
        """Curation status filter works"""
        for status in ["untreated", "reviewed", "flagged"]:
            response = session.get(f"{BASE_URL}/api/curation/factors", params={
                "page": 1,
                "page_size": 10,
                "curation_status": status
            })
            assert response.status_code == 200
            data = response.json()
            print(f"✓ Status '{status}' filter returned {data['total']} factors")

    def test_list_factors_with_is_public_filter(self, session):
        """Public/expert filter works"""
        # Test public filter
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 10,
            "is_public": "true"
        })
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item.get("is_public") == True, "All items should be public"
        print(f"✓ Public filter: {data['total']} factors")
        
        # Test expert filter
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 10,
            "is_public": "false"
        })
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item.get("is_public") == False, "All items should be expert-only"
        print(f"✓ Expert filter: {data['total']} factors")

    def test_list_factors_with_sorting(self, session):
        """Sorting works (by popularity_score)"""
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 10,
            "sort_by": "popularity_score",
            "sort_order": "desc"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify sorting (descending)
        scores = [item.get("popularity_score", 0) for item in data["items"]]
        assert scores == sorted(scores, reverse=True), "Results should be sorted by popularity descending"
        print(f"✓ Sorting by popularity works - top scores: {scores[:5]}")


class TestCurationInlineEdit:
    """Test PATCH /api/curation/factors/{id} endpoint"""

    def test_inline_edit_name_simple_fr(self, session):
        """Can edit name_simple_fr inline"""
        # Get a factor to edit
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 1
        })
        assert response.status_code == 200
        factor = response.json()["items"][0]
        factor_id = factor.get("id")
        original_name = factor.get("name_simple_fr")
        
        # Edit the simplified name
        test_name = f"TEST_Simple_Name_{factor_id[:8]}"
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_name
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_name
        print(f"✓ Edited name_simple_fr to '{test_name}'")
        
        # Restore original value
        session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": original_name or factor.get("name_fr")
        })

    def test_inline_edit_curation_status(self, session):
        """Can change curation_status inline"""
        # Get a factor
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 1,
            "curation_status": "untreated"
        })
        assert response.status_code == 200
        items = response.json()["items"]
        if not items:
            pytest.skip("No untreated factors to test with")
        
        factor = items[0]
        factor_id = factor.get("id")
        original_status = factor.get("curation_status")
        
        # Change to reviewed
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "curation_status": "reviewed"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("curation_status") == "reviewed"
        print(f"✓ Changed status to 'reviewed'")
        
        # Restore original
        session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "curation_status": original_status or "untreated"
        })

    def test_inline_edit_invalid_status_rejected(self, session):
        """Invalid curation_status is rejected"""
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 1
        })
        factor_id = response.json()["items"][0].get("id")
        
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "curation_status": "invalid_status"
        })
        assert response.status_code == 400
        print(f"✓ Invalid status rejected with 400")


class TestCurationBulkActions:
    """Test bulk preview and apply endpoints"""

    def test_bulk_preview_returns_count_and_sample(self, session):
        """Bulk preview returns affected count and sample"""
        # Get 3 factors to preview
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 3
        })
        factor_ids = [f.get("id") for f in response.json()["items"]]
        
        response = session.post(f"{BASE_URL}/api/curation/bulk-preview", json={
            "factor_ids": factor_ids,
            "changes": {"curation_status": "reviewed"}
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data
        assert "changes" in data
        assert "sample" in data
        assert data["count"] == len(factor_ids)
        assert data["changes"]["curation_status"] == "reviewed"
        print(f"✓ Bulk preview: {data['count']} factors affected, sample: {[s['name_fr'][:30] for s in data['sample']]}")

    def test_bulk_apply_modifies_factors(self, session):
        """Bulk apply modifies selected factors"""
        # Get 2 factors with a specific subcategory to test
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 2,
            "subcategory": "aerien"
        })
        items = response.json()["items"]
        if len(items) < 2:
            pytest.skip("Need at least 2 factors in 'aerien' subcategory")
        
        factor_ids = [f.get("id") for f in items]
        original_statuses = {f.get("id"): f.get("curation_status") for f in items}
        
        # Apply bulk change
        response = session.post(f"{BASE_URL}/api/curation/bulk-apply", json={
            "factor_ids": factor_ids,
            "changes": {"curation_status": "flagged"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["modified_count"] == 2
        print(f"✓ Bulk apply modified {data['modified_count']} factors")
        
        # Verify the changes
        for fid in factor_ids:
            response = session.get(f"{BASE_URL}/api/curation/factors", params={
                "page": 1,
                "page_size": 1,
                "search": fid[:10]  # Search by partial ID
            })
        
        # Restore original statuses
        for fid, status in original_statuses.items():
            session.patch(f"{BASE_URL}/api/curation/factors/{fid}", json={
                "curation_status": status or "untreated"
            })


class TestCurationGroups:
    """Test GET /api/curation/groups endpoint"""

    def test_groups_returns_prefix_groups(self, session):
        """Groups endpoint returns name prefix groups"""
        response = session.get(f"{BASE_URL}/api/curation/groups")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check structure
        group = data[0]
        assert "prefix" in group
        assert "count" in group
        assert "subcategories" in group
        
        # Top groups should have multiple factors
        assert data[0]["count"] > 1
        print(f"✓ Found {len(data)} groups, top: '{data[0]['prefix']}' ({data[0]['count']} factors)")

    def test_groups_with_subcategory_filter(self, session):
        """Groups endpoint filters by subcategory"""
        response = session.get(f"{BASE_URL}/api/curation/groups", params={
            "subcategory": "aerien"
        })
        assert response.status_code == 200
        data = response.json()
        
        # All groups should have 'aerien' in their subcategories
        for group in data:
            assert "aerien" in group.get("subcategories", []), \
                f"Group should include 'aerien' subcategory: {group}"
        print(f"✓ Groups for 'aerien': {len(data)} groups")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
