"""
Test suite for the search-index scope derivation bug fix.

Bug: When selecting an emission factor via global search, emissions showed 0.0000 tCO₂e
and save didn't work. The root cause was that the scope field was not correctly derived
from impacts[0].scope in the search-index endpoint.

Fix: Backend aggregation now uses $ifNull to derive scope from impacts[0].scope.
Frontend handleSearchFactorSelect now sets factor.scope correctly.
"""

import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSearchIndexScopeDerivation:
    """Tests for the search-index endpoint scope derivation fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_index_returns_scope_field(self):
        """Verify search-index returns scope field for all factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        assert len(factors) > 0, "No factors returned"
        
        # Check that all factors have a scope field
        factors_with_scope = [f for f in factors if f.get('scope')]
        factors_without_scope = [f for f in factors if not f.get('scope')]
        
        print(f"Total factors: {len(factors)}")
        print(f"Factors with scope: {len(factors_with_scope)}")
        print(f"Factors without scope: {len(factors_without_scope)}")
        
        # All factors should have scope derived from impacts[0].scope
        assert len(factors_without_scope) == 0, f"Found {len(factors_without_scope)} factors without scope"
    
    def test_scope_distribution_includes_all_scopes(self):
        """Verify scope1, scope2, and scope3 are all present in search index"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        scopes = set(f.get('scope') for f in factors if f.get('scope'))
        
        print(f"Scopes found: {scopes}")
        
        # Should have scope1, scope2, and scope3 (or scope3_amont/scope3_aval)
        assert 'scope1' in scopes, "scope1 not found in search index"
        assert 'scope2' in scopes, "scope2 not found in search index"
        assert 'scope3' in scopes or 'scope3_amont' in scopes or 'scope3_aval' in scopes, \
            "No scope3 variant found in search index"
    
    def test_specific_scope3_factor_has_correct_scope(self):
        """Verify the specific factor from bug report has correct scope3"""
        # Factor: Béton de construction — CH (16), id: 096007caa7b64ccbb4655797
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        beton_factor = next((f for f in factors if f.get('id') == '096007caa7b64ccbb4655797'), None)
        
        if beton_factor:
            print(f"Found factor: {beton_factor.get('name_fr')}")
            print(f"Scope: {beton_factor.get('scope')}")
            print(f"Impact scope: {beton_factor.get('impact', {}).get('scope')}")
            
            # Verify scope is correctly derived
            assert beton_factor.get('scope') == 'scope3', \
                f"Expected scope3, got {beton_factor.get('scope')}"
            
            # Verify impact is present with correct scope
            assert beton_factor.get('impact', {}).get('scope') == 'scope3', \
                f"Impact scope mismatch"
        else:
            pytest.skip("Specific test factor not found in database")
    
    def test_scope_matches_impact_scope(self):
        """Verify factor.scope matches factor.impact.scope for all factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        mismatches = []
        
        for f in factors[:100]:  # Check first 100 factors
            factor_scope = f.get('scope')
            impact_scope = f.get('impact', {}).get('scope')
            
            if factor_scope and impact_scope and factor_scope != impact_scope:
                mismatches.append({
                    'id': f.get('id'),
                    'name': f.get('name_fr'),
                    'factor_scope': factor_scope,
                    'impact_scope': impact_scope
                })
        
        if mismatches:
            print(f"Mismatches found: {mismatches[:5]}")
        
        assert len(mismatches) == 0, f"Found {len(mismatches)} scope mismatches"
    
    def test_search_index_has_impact_field(self):
        """Verify search-index returns impact field with value and unit"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        
        # Check first 10 factors have impact with value
        for f in factors[:10]:
            impact = f.get('impact')
            assert impact is not None, f"Factor {f.get('id')} missing impact"
            assert 'value' in impact, f"Factor {f.get('id')} impact missing value"
            assert 'scope' in impact, f"Factor {f.get('id')} impact missing scope"
            
            print(f"Factor: {f.get('name_fr', '')[:50]}, Impact: {impact.get('value')} {impact.get('unit')}, Scope: {impact.get('scope')}")


class TestActivitySubmissionWithSearchFactor:
    """Tests for activity submission when factor is selected via search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and fiscal year for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get fiscal year
        fy_response = requests.get(f"{BASE_URL}/api/fiscal-years", headers=self.headers)
        if fy_response.status_code == 200 and fy_response.json():
            self.fiscal_year_id = fy_response.json()[0].get('id')
        else:
            self.fiscal_year_id = None
    
    def test_create_activity_with_scope3_factor(self):
        """Test creating an activity with a scope3 factor selected via search"""
        if not self.fiscal_year_id:
            pytest.skip("No fiscal year available")
        
        # Use the specific factor from bug report
        factor_id = "096007caa7b64ccbb4655797"  # Béton de construction — CH (16)
        
        # First verify the factor exists and has scope3
        factor_response = requests.get(f"{BASE_URL}/api/emission-factors/{factor_id}", headers=self.headers)
        if factor_response.status_code != 200:
            pytest.skip("Test factor not found")
        
        factor = factor_response.json()
        print(f"Factor: {factor.get('name_fr')}")
        print(f"Impacts: {factor.get('impacts')}")
        
        # Create activity with scope3 (as would happen from search selection)
        activity_data = {
            "category_id": "beton",
            "subcategory_id": "beton",
            "scope": "scope3",  # This is the key - scope3 from the factor
            "name": "TEST_SearchScope_Béton",
            "quantity": 10,
            "unit": "m3",
            "original_quantity": 10,
            "original_unit": "m3",
            "emission_factor_id": factor_id,
            "comments": "Test activity for search scope bug fix",
            "entry_scope": "scope3",
            "entry_category": "beton",
            "fiscal_year_id": self.fiscal_year_id
        }
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data, headers=self.headers)
        print(f"Create response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed to create activity: {response.text}"
        
        result = response.json()
        
        # Verify activity was created with correct emissions
        if 'activities' in result:
            activity = result['activities'][0]
        else:
            activity = result
        
        activity_id = activity.get('id') or result.get('id')
        emissions = activity.get('emissions', 0)
        
        print(f"Created activity ID: {activity_id}")
        print(f"Emissions: {emissions}")
        
        # Emissions should be non-zero (10 m3 * 149.48 kgCO2e/m3 ≈ 1494.8 kgCO2e)
        assert emissions > 0, f"Emissions should be non-zero, got {emissions}"
        assert emissions > 1000, f"Expected ~1494 kgCO2e, got {emissions}"
        
        # Cleanup - delete the test activity
        if activity_id:
            delete_response = requests.delete(f"{BASE_URL}/api/activities/{activity_id}", headers=self.headers)
            print(f"Cleanup: {delete_response.status_code}")
    
    def test_scope3_factor_not_filtered_by_business_rules(self):
        """Verify scope3 factors are not incorrectly filtered when scope3 is passed"""
        # Get a scope3 factor
        response = requests.get(f"{BASE_URL}/api/emission-factors/search-index", headers=self.headers)
        assert response.status_code == 200
        
        factors = response.json()
        scope3_factors = [f for f in factors if f.get('scope') == 'scope3']
        
        assert len(scope3_factors) > 0, "No scope3 factors found"
        
        # Verify scope3 factors have non-zero impact values
        for f in scope3_factors[:5]:
            impact_value = f.get('impact', {}).get('value', 0)
            print(f"Factor: {f.get('name_fr', '')[:40]}, Impact: {impact_value}")
            assert impact_value > 0, f"Factor {f.get('id')} has zero impact value"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
