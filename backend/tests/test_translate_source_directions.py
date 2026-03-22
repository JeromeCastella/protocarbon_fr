"""
Tests for translate-preview endpoint with new source_to_fr and source_to_de directions.
Tests the feature that translates source_product_name (English ecoinvent names) to simplified French/German.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTranslateSourceDirections:
    """Test translate-preview endpoint with source_to_fr and source_to_de directions"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token):
        """Setup for each test"""
        self.token = auth_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
    
    def test_translate_preview_source_to_fr_returns_200(self, auth_token):
        """Test that source_to_fr direction is accepted and returns 200"""
        # First get some factor IDs with source_product_name
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=5",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        
        # Filter factors that have source_product_name
        factor_ids = [f['id'] for f in factors if f.get('source_product_name')][:3]
        
        if not factor_ids:
            pytest.skip("No factors with source_product_name found")
        
        # Test translate-preview with source_to_fr
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "source_to_fr"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert 'translations' in data
        assert 'skipped' in data
        assert 'target_field' in data
        assert data['target_field'] == 'name_simple_fr'
        
        print(f"source_to_fr: Got {len(data['translations'])} translations, {data['skipped']} skipped")
    
    def test_translate_preview_source_to_de_returns_200(self, auth_token):
        """Test that source_to_de direction is accepted and returns 200"""
        # First get some factor IDs with source_product_name
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=5",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        
        # Filter factors that have source_product_name
        factor_ids = [f['id'] for f in factors if f.get('source_product_name')][:3]
        
        if not factor_ids:
            pytest.skip("No factors with source_product_name found")
        
        # Test translate-preview with source_to_de
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "source_to_de"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert 'translations' in data
        assert 'skipped' in data
        assert 'target_field' in data
        assert data['target_field'] == 'name_simple_de'
        
        print(f"source_to_de: Got {len(data['translations'])} translations, {data['skipped']} skipped")
    
    def test_translate_preview_fr_to_de_backward_compatibility(self, auth_token):
        """Test that existing fr_to_de direction still works"""
        # Get some factor IDs
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=5",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        factor_ids = [f['id'] for f in factors[:3]]
        
        if not factor_ids:
            pytest.skip("No factors found")
        
        # Test translate-preview with fr_to_de
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "fr_to_de"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert 'translations' in data
        assert 'target_field' in data
        assert data['target_field'] == 'name_simple_de'
        
        print(f"fr_to_de (backward compat): Got {len(data['translations'])} translations")
    
    def test_translate_preview_de_to_fr_backward_compatibility(self, auth_token):
        """Test that existing de_to_fr direction still works"""
        # Get some factor IDs
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=5",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        factor_ids = [f['id'] for f in factors[:3]]
        
        if not factor_ids:
            pytest.skip("No factors found")
        
        # Test translate-preview with de_to_fr
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "de_to_fr"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert 'translations' in data
        assert 'target_field' in data
        assert data['target_field'] == 'name_simple_fr'
        
        print(f"de_to_fr (backward compat): Got {len(data['translations'])} translations")
    
    def test_translate_preview_invalid_direction_returns_400(self, auth_token):
        """Test that invalid direction returns 400 error"""
        # Get some factor IDs
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=3",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        factor_ids = [f['id'] for f in factors[:2]]
        
        if not factor_ids:
            pytest.skip("No factors found")
        
        # Test with invalid direction
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "invalid_direction"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"Invalid direction correctly returns 400: {response.json()}")
    
    def test_translate_preview_source_to_fr_uses_source_product_name(self, auth_token):
        """Test that source_to_fr uses source_product_name as source field"""
        # Get factors with source_product_name
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=20",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        
        # Find factors with source_product_name and empty name_simple_fr
        eligible_factors = [
            f for f in factors 
            if f.get('source_product_name') and not f.get('name_simple_fr')
        ][:3]
        
        if not eligible_factors:
            # If no eligible factors, just test that API accepts the direction
            factor_ids = [f['id'] for f in factors if f.get('source_product_name')][:3]
            if not factor_ids:
                pytest.skip("No factors with source_product_name found")
            
            response = requests.post(
                f"{BASE_URL}/api/curation/translate-preview",
                headers=self.headers,
                json={
                    "factor_ids": factor_ids,
                    "direction": "source_to_fr"
                }
            )
            assert response.status_code == 200
            print("API accepts source_to_fr direction (all factors may have been skipped due to filled targets)")
            return
        
        factor_ids = [f['id'] for f in eligible_factors]
        
        response = requests.post(
            f"{BASE_URL}/api/curation/translate-preview",
            headers=self.headers,
            json={
                "factor_ids": factor_ids,
                "direction": "source_to_fr"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If we got translations, verify source_name matches source_product_name
        if data['translations']:
            for t in data['translations']:
                # Find the original factor
                orig_factor = next((f for f in eligible_factors if f['id'] == t['factor_id']), None)
                if orig_factor:
                    assert t['source_name'] == orig_factor['source_product_name'], \
                        f"source_name should be source_product_name"
                    print(f"Verified: source_name '{t['source_name'][:50]}...' matches source_product_name")
    
    def test_all_four_directions_accepted(self, auth_token):
        """Test that all 4 directions are accepted by the API"""
        # Get some factor IDs
        factors_res = requests.get(
            f"{BASE_URL}/api/curation/factors?page_size=3",
            headers=self.headers
        )
        assert factors_res.status_code == 200
        factors = factors_res.json().get('items', [])
        factor_ids = [f['id'] for f in factors[:2]]
        
        if not factor_ids:
            pytest.skip("No factors found")
        
        directions = ['fr_to_de', 'de_to_fr', 'source_to_fr', 'source_to_de']
        expected_targets = {
            'fr_to_de': 'name_simple_de',
            'de_to_fr': 'name_simple_fr',
            'source_to_fr': 'name_simple_fr',
            'source_to_de': 'name_simple_de'
        }
        
        for direction in directions:
            response = requests.post(
                f"{BASE_URL}/api/curation/translate-preview",
                headers=self.headers,
                json={
                    "factor_ids": factor_ids,
                    "direction": direction
                }
            )
            
            assert response.status_code == 200, f"Direction '{direction}' should return 200, got {response.status_code}"
            data = response.json()
            assert data['target_field'] == expected_targets[direction], \
                f"Direction '{direction}' should target '{expected_targets[direction]}', got '{data['target_field']}'"
            print(f"Direction '{direction}' -> target_field '{data['target_field']}' ✓")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "newtest@x.com", "password": "test123"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping tests")
