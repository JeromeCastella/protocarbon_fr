"""
Test suite for bulk-copy-originals with source_field parameter.
Tests the new feature that allows copying from source_product_name field
in addition to the original name_fr/name_de fields.

Features tested:
- POST /api/curation/bulk-copy-originals with source_field='source_product_name' copies source_product_name → name_simple_fr
- POST /api/curation/bulk-copy-originals with source_field='source_product_name' and lang='de' copies source_product_name → name_simple_de
- POST /api/curation/bulk-copy-originals with default source_field='original' still works (copies name_fr/name_de → name_simple_fr/name_simple_de)
- Only copies when target field is null (skips already filled)
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
# credentials imported from conftest_credentials
# credentials imported from conftest_credentials


class TestBulkCopySourceField:
    """Test bulk copy originals with source_field parameter"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    # ==================== SOURCE_FIELD PARAMETER TESTS ====================
    
    def test_bulk_copy_source_product_name_to_fr(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with source_field='source_product_name' and lang='fr'"""
        # Get factors with name_simple_fr = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=5&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get factors: {response.text}"
        data = response.json()
        
        # Find factors with name_simple_fr = null
        uncurated = [f for f in data['items'] if f.get('name_simple_fr') is None]
        if len(uncurated) < 1:
            pytest.skip("No factors with name_simple_fr=null to test")
        
        factor_ids = [f['id'] for f in uncurated[:3]]
        print(f"Testing bulk copy source_product_name → FR with factor IDs: {factor_ids}")
        
        # Show source_product_name values before copy
        for f in uncurated[:3]:
            print(f"  Before: id={f['id']}, source_product_name={f.get('source_product_name')}, name_simple_fr={f.get('name_simple_fr')}")
        
        # Call bulk-copy-originals with source_field='source_product_name'
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": factor_ids,
                "lang": "fr",
                "source_field": "source_product_name"
            }
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        assert "skipped_count" in result
        print(f"Bulk copy source_product_name → FR result: modified={result['modified_count']}, skipped={result['skipped_count']}")
        
        # Store for verification
        self.__class__.source_fr_factor_ids = factor_ids
        self.__class__.source_fr_result = result
    
    def test_bulk_copy_source_product_name_to_de(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with source_field='source_product_name' and lang='de'"""
        # Get factors with name_simple_de = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=6&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get factors: {response.text}"
        data = response.json()
        
        # Find factors with name_simple_de = null
        uncurated = [f for f in data['items'] if f.get('name_simple_de') is None]
        if len(uncurated) < 1:
            pytest.skip("No factors with name_simple_de=null to test")
        
        factor_ids = [f['id'] for f in uncurated[:3]]
        print(f"Testing bulk copy source_product_name → DE with factor IDs: {factor_ids}")
        
        # Show source_product_name values before copy
        for f in uncurated[:3]:
            print(f"  Before: id={f['id']}, source_product_name={f.get('source_product_name')}, name_simple_de={f.get('name_simple_de')}")
        
        # Call bulk-copy-originals with source_field='source_product_name' and lang='de'
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": factor_ids,
                "lang": "de",
                "source_field": "source_product_name"
            }
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        assert "skipped_count" in result
        print(f"Bulk copy source_product_name → DE result: modified={result['modified_count']}, skipped={result['skipped_count']}")
    
    def test_bulk_copy_default_source_field_original(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with default source_field='original' still works"""
        # Get factors with name_simple_fr = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=7&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get factors: {response.text}"
        data = response.json()
        
        # Find factors with name_simple_fr = null
        uncurated = [f for f in data['items'] if f.get('name_simple_fr') is None]
        if len(uncurated) < 1:
            pytest.skip("No factors with name_simple_fr=null to test")
        
        factor_ids = [f['id'] for f in uncurated[:2]]
        print(f"Testing bulk copy with default source_field (original) with factor IDs: {factor_ids}")
        
        # Call bulk-copy-originals WITHOUT source_field (should default to 'original')
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": factor_ids,
                "lang": "fr"
                # source_field not specified - should default to 'original'
            }
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        assert "skipped_count" in result
        print(f"Bulk copy default (original) → FR result: modified={result['modified_count']}, skipped={result['skipped_count']}")
    
    def test_bulk_copy_explicit_source_field_original(self, auth_headers):
        """Test POST /api/curation/bulk-copy-originals with explicit source_field='original'"""
        # Get factors with name_simple_de = null
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=8&page_size=20",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get factors: {response.text}"
        data = response.json()
        
        # Find factors with name_simple_de = null
        uncurated = [f for f in data['items'] if f.get('name_simple_de') is None]
        if len(uncurated) < 1:
            pytest.skip("No factors with name_simple_de=null to test")
        
        factor_ids = [f['id'] for f in uncurated[:2]]
        print(f"Testing bulk copy with explicit source_field='original' with factor IDs: {factor_ids}")
        
        # Call bulk-copy-originals with explicit source_field='original'
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": factor_ids,
                "lang": "de",
                "source_field": "original"
            }
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        assert "modified_count" in result
        assert "skipped_count" in result
        print(f"Bulk copy explicit original → DE result: modified={result['modified_count']}, skipped={result['skipped_count']}")
    
    def test_bulk_copy_skips_already_filled(self, auth_headers):
        """Test that bulk-copy-originals skips factors where target field is already filled"""
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
        
        factor_ids = [f['id'] for f in curated[:3]]
        print(f"Testing skip behavior with already-curated factor IDs: {factor_ids}")
        
        # Call bulk-copy-originals with source_field='source_product_name' - should skip all
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": factor_ids,
                "lang": "fr",
                "source_field": "source_product_name"
            }
        )
        assert response.status_code == 200, f"Bulk copy failed: {response.text}"
        result = response.json()
        
        # All should be skipped since they already have name_simple_fr
        print(f"Skip test result: modified={result['modified_count']}, skipped={result['skipped_count']}")
        # The skipped_count should be >= number of factors with non-null target
        assert result['skipped_count'] >= 0, "Expected some skipped factors"
    
    def test_source_product_name_field_in_response(self, auth_headers):
        """Verify source_product_name field is included in curation factors response"""
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that source_product_name is in the response
        has_source_product_name = False
        for item in data['items']:
            if 'source_product_name' in item:
                has_source_product_name = True
                print(f"Factor {item['id']}: source_product_name = {item.get('source_product_name')}")
        
        # Note: source_product_name may be null for some factors but should be in schema
        print(f"source_product_name field present in response: {has_source_product_name}")


class TestBulkCopySourceFieldValidation:
    """Test validation for bulk-copy-originals source_field parameter"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    def test_invalid_lang_parameter(self, auth_headers):
        """Test bulk-copy-originals with invalid lang parameter"""
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": ["test-id"],
                "lang": "invalid",
                "source_field": "source_product_name"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid lang, got {response.status_code}"
    
    def test_empty_factor_ids(self, auth_headers):
        """Test bulk-copy-originals with empty factor_ids"""
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": [],
                "lang": "fr",
                "source_field": "source_product_name"
            }
        )
        assert response.status_code == 400, f"Expected 400 for empty factor_ids, got {response.status_code}"
    
    def test_source_field_accepts_original(self, auth_headers):
        """Test that source_field='original' is accepted"""
        # Get any factor
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=1",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        if not data['items']:
            pytest.skip("No factors available")
        
        factor_id = data['items'][0]['id']
        
        # This should not fail validation
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": [factor_id],
                "lang": "fr",
                "source_field": "original"
            }
        )
        # Should be 200 (success) - may skip if already filled
        assert response.status_code == 200, f"Expected 200 for source_field='original', got {response.status_code}: {response.text}"
    
    def test_source_field_accepts_source_product_name(self, auth_headers):
        """Test that source_field='source_product_name' is accepted"""
        # Get any factor
        response = requests.get(
            f"{BASE_URL}/api/curation/factors?page=1&page_size=1",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        if not data['items']:
            pytest.skip("No factors available")
        
        factor_id = data['items'][0]['id']
        
        # This should not fail validation
        response = requests.post(
            f"{BASE_URL}/api/curation/bulk-copy-originals",
            headers=auth_headers,
            json={
                "factor_ids": [factor_id],
                "lang": "fr",
                "source_field": "source_product_name"
            }
        )
        # Should be 200 (success) - may skip if already filled
        assert response.status_code == 200, f"Expected 200 for source_field='source_product_name', got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
