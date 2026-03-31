"""
Tests for the Global Factor Search Index endpoint
Tests the /api/emission-factors/search-index endpoint used by the GlobalFactorSearch component
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGlobalSearchIndex:
    """Tests for the search-index endpoint that powers the global factor search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "newtest@x.com", "password": "test123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_index_returns_all_factors(self):
        """Test that search-index endpoint returns all factors with minimal fields"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search-index",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return ~8978 factors
        assert len(data) > 8000, f"Expected ~8978 factors, got {len(data)}"
        
        # Check first factor has required fields for Fuse.js search
        first_factor = data[0]
        required_fields = ['id', 'name_fr', 'is_public', 'default_unit']
        for field in required_fields:
            assert field in first_factor, f"Missing required field: {field}"
        
        # Check impact field is present (first impact from impacts array)
        assert 'impact' in first_factor, "Missing impact field"
    
    def test_search_index_has_public_and_expert_factors(self):
        """Test that search-index returns both public and expert (is_public=false) factors"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search-index",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        public_factors = [f for f in data if f.get('is_public') == True]
        expert_factors = [f for f in data if f.get('is_public') == False]
        
        # Should have ~761 public and ~8217 expert factors
        assert len(public_factors) > 700, f"Expected ~761 public factors, got {len(public_factors)}"
        assert len(expert_factors) > 8000, f"Expected ~8217 expert factors, got {len(expert_factors)}"
    
    def test_search_index_has_metal_factors(self):
        """Test that search-index includes factors with 'metal' in name"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search-index",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find factors with 'metal' in name
        metal_factors = [
            f for f in data 
            if 'metal' in (f.get('name_fr') or '').lower() 
            or 'metal' in (f.get('name_de') or '').lower()
            or 'metal' in (f.get('source_product_name') or '').lower()
        ]
        
        assert len(metal_factors) > 100, f"Expected >100 metal factors, got {len(metal_factors)}"
        
        # Most metal factors should be expert (is_public=false)
        metal_expert = [f for f in metal_factors if f.get('is_public') == False]
        assert len(metal_expert) > 100, f"Expected >100 expert metal factors, got {len(metal_expert)}"
    
    def test_search_index_minimal_fields_for_performance(self):
        """Test that search-index returns minimal fields for performance (no full impacts array)"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search-index",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check that we have the core search-relevant fields
        first_factor = data[0]
        required_fields = [
            'id', 'name_fr', 'is_public', 'default_unit', 'impact'
        ]
        
        for field in required_fields:
            assert field in first_factor, f"Missing required field: {field}"
        
        # Optional fields that may be present
        optional_fields = ['name_de', 'name_simple_fr', 'name_simple_de', 
                          'source_product_name', 'subcategory', 'popularity_score', 
                          'tags', 'category', 'scope']
        
        # Should NOT have full 'impacts' array (only single 'impact')
        assert 'impacts' not in first_factor, "Should not have full impacts array for performance"
    
    def test_search_index_requires_authentication(self):
        """Test that search-index endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index")
        assert response.status_code == 401 or response.status_code == 403


class TestEmissionFactorById:
    """Tests for fetching individual emission factor by ID"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "newtest@x.com", "password": "test123"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_factor_by_id(self):
        """Test fetching a specific emission factor by ID"""
        # First get a factor ID from the search index
        index_response = requests.get(
            f"{BASE_URL}/api/emission-factors/search-index",
            headers=self.headers
        )
        assert index_response.status_code == 200
        factors = index_response.json()
        assert len(factors) > 0
        
        factor_id = factors[0]['id']
        
        # Now fetch the full factor by ID
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/{factor_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        factor = response.json()
        assert factor['id'] == factor_id
        # Full factor should have impacts array
        assert 'impacts' in factor or 'impact' in factor
