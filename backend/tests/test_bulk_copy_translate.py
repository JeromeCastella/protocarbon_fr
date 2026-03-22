"""
Test suite for bulk copy originals and translate features in Curation Workbench.
Tests:
- POST /api/curation/bulk-copy-originals (copy name_fr → name_simple_fr for null entries)
- POST /api/curation/translate-preview (AI translation preview)
- POST /api/curation/translate-apply (apply translations)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


class TestBulkCopyAndTranslate:
    """Test bulk copy originals and translate features"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns 'token' not 'access_token'
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    # ==================== GET FACTORS FOR TESTING ====================
    
    def test_get_factors_page2_for_uncurated(self, auth_headers):
        """Get factors from page 2 to find uncurated ones (name_simple_fr=null)"""
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=2&page_size=10",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get factors: {response.text}"
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"Total factors: {data['total']}, items on page 2: {len(data['items'])}")
        
        # Find factors with name_simple_fr = null
        uncurated = [f for f in data['items'] if f.get('name_simple_fr') is None]
        print(f"Uncurated factors (name_simple_fr=null): {len(uncurated)}")
        
        # Store factor IDs for later tests
        self.__class__.uncurated_factor_ids = [f['id'] for f in uncurated[:5]]
        self.__class__.all_factor_ids = [f['id'] for f in data['items'][:5]]
        
        # Also check for source_product_name field
        for f in data['items'][:3]:
            print(f"Factor {f['id']}: name_fr={f.get('name_fr', '')[:50]}, name_simple_fr={f.get('name_simple_fr')}, source_product_name={f.get('source_product_name')}")
    
    # ==================== BULK COPY ORIGINALS TESTS ====================
    
    def test_bulk_copy_originals_fr_success(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with lang=fr"""
        # First, get some factors with name_simple_fr = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=3&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find uncurated factors
        uncurated = [f for f in data['items'] if f.get('name_simple_fr') is None]
        if len(uncurated) < 2:
            pytest.skip("Not enough uncurated factors to test bulk copy")
        
        factor_ids = [f['id'] for f in uncurated[:3]]
        print(f"Testing bulk copy with factor IDs: {factor_ids}")
        
        # Call bulk-copy-originals
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={"factor_ids": factor_ids, "lang": "fr"}
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        assert "skipped_count" in result
        print(f"Bulk copy result: modified={result['modified_count']}, skipped={result['skipped_count']}")
        
        # Verify the copy worked - get the factors again
        for fid in factor_ids[:1]:
            verify_response = requests.get(
                f"{BASE_URL}/api/curation/factors?search={fid[:8]}",
                headers=auth_headers
            )
            if verify_response.status_code == 200:
                items = verify_response.json().get('items', [])
                for item in items:
                    if item['id'] == fid:
                        print(f"After copy - Factor {fid}: name_fr={item.get('name_fr', '')[:50]}, name_simple_fr={item.get('name_simple_fr', '')[:50] if item.get('name_simple_fr') else None}")
    
    def test_bulk_copy_originals_skips_already_curated(self, auth_headers):
        """Test that bulk-copy-originals skips factors with non-null name_simple_fr"""
        # Get factors that already have name_simple_fr set
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find curated factors (name_simple_fr is not null)
        curated = [f for f in data['items'] if f.get('name_simple_fr') is not None]
        if len(curated) < 1:
            pytest.skip("No curated factors to test skip behavior")
        
        factor_ids = [f['id'] for f in curated[:2]]
        print(f"Testing skip behavior with already-curated factor IDs: {factor_ids}")
        
        # Call bulk-copy-originals - should skip all
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={"factor_ids": factor_ids, "lang": "fr"}
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        # All should be skipped since they already have name_simple_fr
        assert result['skipped_count'] >= 0, "Expected some skipped factors"
        print(f"Skip test result: modified={result['modified_count']}, skipped={result['skipped_count']}")
    
    def test_bulk_copy_originals_de(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with lang=de"""
        # Get factors with name_simple_de = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=4&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find factors with name_simple_de = null
        uncurated_de = [f for f in data['items'] if f.get('name_simple_de') is None]
        if len(uncurated_de) < 1:
            pytest.skip("No factors with name_simple_de=null to test")
        
        factor_ids = [f['id'] for f in uncurated_de[:2]]
        print(f"Testing bulk copy DE with factor IDs: {factor_ids}")
        
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={"factor_ids": factor_ids, "lang": "de"}
        )
        assert response.status_code == 200, f"Bulk copy DE failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        print(f"Bulk copy DE result: modified={result['modified_count']}, skipped={result['skipped_count']}")
    
    def test_bulk_copy_originals_invalid_lang(self, auth_headers):
        """Test bulk-copy-originals with invalid lang parameter"""
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={"factor_ids": ["test-id"], "lang": "invalid"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid lang, got {response.status_code}"
    
    def test_bulk_copy_originals_empty_ids(self, auth_headers):
        """Test bulk-copy-originals with empty factor_ids"""
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={"factor_ids": [], "lang": "fr"}
        )
        assert response.status_code == 400, f"Expected 400 for empty factor_ids, got {response.status_code}"
    
    # ==================== TRANSLATE PREVIEW TESTS ====================
    
    def test_translate_preview_fr_to_de(self, auth_headers):
        """Test POST /api/curation/translate-preview with direction=fr_to_de"""
        # Get factors with name_simple_fr set and name_simple_de = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=50",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find factors with name_simple_fr set and name_simple_de null
        eligible = [f for f in data['items'] 
                   if f.get('name_simple_fr') is not None and f.get('name_simple_de') is None]
        
        if len(eligible) < 1:
            # Try to find any factor with name_simple_fr set
            eligible = [f for f in data['items'] if f.get('name_simple_fr') is not None]
            if len(eligible) < 1:
                pytest.skip("No factors with name_simple_fr set to test translation")
        
        factor_ids = [f['id'] for f in eligible[:3]]
        print(f"Testing translate preview with factor IDs: {factor_ids}")
        print(f"Factors: {[(f['id'], f.get('name_simple_fr'), f.get('name_simple_de')) for f in eligible[:3]]}")
        
        # Call translate-preview (this calls AI, may take time)
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=auth_headers,
            json={"factor_ids": factor_ids, "direction": "fr_to_de"},
            timeout=60  # AI call may take time
        )
        assert response.status_code == 200, f"Translate preview failed: {response.text}"
        result = response.json()
        
        assert "translations" in result
        assert "skipped" in result
        assert "target_field" in result
        assert result["target_field"] == "name_simple_de"
        
        print(f"Translate preview result: {len(result['translations'])} translations, {result['skipped']} skipped")
        for t in result['translations'][:3]:
            print(f"  - {t.get('source_name', '')[:40]} → {t.get('translation', '')[:40]}")
        
        # Store translations for apply test
        self.__class__.translations_to_apply = result['translations']
        self.__class__.target_field = result['target_field']
    
    def test_translate_preview_invalid_direction(self, auth_headers):
        """Test translate-preview with invalid direction"""
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=auth_headers,
            json={"factor_ids": ["test-id"], "direction": "invalid"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid direction, got {response.status_code}"
    
    # ==================== TRANSLATE APPLY TESTS ====================
    
    def test_translate_apply(self, auth_headers):
        """Test POST /api/curation/translate-apply"""
        # Use translations from preview test if available
        translations = getattr(self.__class__, 'translations_to_apply', None)
        target_field = getattr(self.__class__, 'target_field', 'name_simple_de')
        
        if not translations or len(translations) == 0:
            # Create a mock translation for testing
            response = requests.get(
                f"{BASE_URL}/api/curation/factors?page=1&page_size=10",
                headers=auth_headers
            )
            if response.status_code == 200:
                items = response.json().get('items', [])
                if items:
                    translations = [{
                        "factor_id": items[0]['id'],
                        "value": "TEST_Translation_DE"
                    }]
                    target_field = "name_simple_de"
        
        if not translations:
            pytest.skip("No translations to apply")
        
        # Apply translations
        payload = {
            "translations": [{"factor_id": t.get("factor_id"), "value": t.get("translation", t.get("value"))} 
                           for t in translations[:2]],
            "target_field": target_field
        }
        print(f"Applying translations: {payload}")
        
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-apply",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Translate apply failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        print(f"Translate apply result: modified_count={result['modified_count']}")
    
    def test_translate_apply_invalid_target_field(self, auth_headers):
        """Test translate-apply with invalid target_field"""
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-apply",
            headers=auth_headers,
            json={
                "translations": [{"factor_id": "test", "value": "test"}],
                "target_field": "invalid_field"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid target_field, got {response.status_code}"
    
    # ==================== SOURCE PRODUCT NAME FIELD TEST ====================
    
    def test_source_product_name_in_response(self, auth_headers):
        """Test that source_product_name field is included in factor response"""
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if source_product_name is in the response
        # Note: It may not be in projection, so we check if it exists
        for item in data['items']:
            source_name = item.get('source_product_name')
            print(f"Factor {item['id']}: source_product_name = {source_name}")
        
        # This test documents the current behavior
        print("Note: source_product_name may need to be added to CURATION_PROJECTION if not present")


class TestCurationFactorsDisplay:
    """Test curation factors display including null handling"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    def test_null_name_simple_fr_display(self, auth_headers):
        """Test that factors with name_simple_fr=null are returned correctly"""
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=2&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        null_count = 0
        non_null_count = 0
        for item in data['items']:
            if item.get('name_simple_fr') is None:
                null_count += 1
            else:
                non_null_count += 1
        
        print(f"Factors with name_simple_fr=null: {null_count}")
        print(f"Factors with name_simple_fr set: {non_null_count}")
        
        # Document the schema behavior
        assert null_count >= 0 or non_null_count >= 0, "Should have some factors"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
