"""
Tests for LocationLinkPanel feature - Dual Reporting (Location/Market based)
Tests the new side panel for linking market-based factors to location-based factors.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLocationLinkPanelBackend:
    """Backend API tests for LocationLinkPanel feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: reset any test factors we modified
        self.session.close()
    
    # ==================== GET /api/curation/factors/search-location ====================
    
    def test_search_location_factors_basic(self):
        """Test basic search for location factors"""
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=10")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 10, "Should respect limit"
        
        # Verify structure of returned factors
        if len(data) > 0:
            factor = data[0]
            assert "id" in factor, "Factor should have id"
            assert "name_fr" in factor, "Factor should have name_fr"
            assert "subcategory" in factor, "Factor should have subcategory"
            print(f"✓ search-location basic: returned {len(data)} factors")
    
    def test_search_location_factors_with_subcategory_filter(self):
        """Test search with subcategory pre-filter"""
        # First get a valid subcategory
        resp = self.session.get(f"{BASE_URL}/api/subcategories")
        assert resp.status_code == 200
        subcats = resp.json()
        if len(subcats) > 0:
            subcat_code = subcats[0].get("code")
            
            resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?subcategory={subcat_code}&limit=20")
            assert resp.status_code == 200, f"Failed: {resp.text}"
            data = resp.json()
            
            # All returned factors should have the same subcategory
            for factor in data:
                assert factor.get("subcategory") == subcat_code, f"Factor {factor.get('id')} has wrong subcategory"
            print(f"✓ search-location with subcategory={subcat_code}: returned {len(data)} factors")
    
    def test_search_location_factors_with_query(self):
        """Test search with text query"""
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?q=elec&limit=20")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        print(f"✓ search-location with q=elec: returned {len(data)} factors")
    
    def test_search_location_factors_only_returns_location_method(self):
        """Verify search only returns location-based factors (not market)"""
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=30")
        assert resp.status_code == 200
        data = resp.json()
        
        for factor in data:
            method = factor.get("reporting_method")
            # Should be None or "location", never "market"
            assert method in [None, "location"], f"Factor {factor.get('id')} has reporting_method={method}, expected location or None"
        print(f"✓ search-location only returns location-based factors")
    
    # ==================== PATCH /api/curation/factors/{id} - Link/Unlink ====================
    
    def test_patch_factor_set_market_method(self):
        """Test changing a factor's reporting_method to market"""
        # Get a factor to modify
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=5")
        assert resp.status_code == 200
        factors = resp.json().get("items", [])
        assert len(factors) > 0, "No factors found"
        
        test_factor = factors[0]
        factor_id = test_factor.get("id")
        original_method = test_factor.get("reporting_method")
        
        # Set to market
        resp = self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "market"
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        updated = resp.json()
        assert updated.get("reporting_method") == "market", "reporting_method should be market"
        
        # Reset to original
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": original_method or "location"
        })
        print(f"✓ PATCH factor reporting_method to market works")
    
    def test_patch_factor_link_location_factor(self):
        """Test linking a market factor to a location factor"""
        # Get a location factor to link to
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=5")
        assert resp.status_code == 200
        location_factors = resp.json()
        assert len(location_factors) > 0, "No location factors found"
        location_factor_id = location_factors[0].get("id")
        
        # Get a factor to modify
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=5")
        assert resp.status_code == 200
        factors = resp.json().get("items", [])
        test_factor = factors[0]
        factor_id = test_factor.get("id")
        original_method = test_factor.get("reporting_method")
        original_link = test_factor.get("location_factor_id")
        
        # Set to market and link
        resp = self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "market",
            "location_factor_id": location_factor_id
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        updated = resp.json()
        assert updated.get("reporting_method") == "market"
        assert updated.get("location_factor_id") == location_factor_id
        # Should also have _locationName resolved
        assert "_locationName" in updated, "Response should include _locationName"
        print(f"✓ PATCH factor with location_factor_id works, _locationName={updated.get('_locationName')}")
        
        # Reset
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": original_method or "location",
            "location_factor_id": original_link
        })
    
    def test_patch_factor_unlink_location_factor(self):
        """Test unlinking a location factor (setting location_factor_id to null)"""
        # First link a factor
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=5")
        location_factors = resp.json()
        location_factor_id = location_factors[0].get("id")
        
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=5")
        factors = resp.json().get("items", [])
        test_factor = factors[0]
        factor_id = test_factor.get("id")
        original_method = test_factor.get("reporting_method")
        original_link = test_factor.get("location_factor_id")
        
        # Link first
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "market",
            "location_factor_id": location_factor_id
        })
        
        # Now unlink by setting to null
        resp = self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "location_factor_id": None
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        updated = resp.json()
        assert updated.get("location_factor_id") is None, "location_factor_id should be null after unlink"
        print(f"✓ PATCH factor with location_factor_id=null (unlink) works")
        
        # Reset
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": original_method or "location",
            "location_factor_id": original_link
        })
    
    def test_patch_factor_switching_to_location_clears_link(self):
        """Test that switching from market to location clears the location_factor_id"""
        # Get factors
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=5")
        location_factors = resp.json()
        location_factor_id = location_factors[0].get("id")
        
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=5")
        factors = resp.json().get("items", [])
        test_factor = factors[0]
        factor_id = test_factor.get("id")
        original_method = test_factor.get("reporting_method")
        original_link = test_factor.get("location_factor_id")
        
        # Set to market with link
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "market",
            "location_factor_id": location_factor_id
        })
        
        # Switch back to location - should clear the link
        resp = self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "location"
        })
        assert resp.status_code == 200, f"Failed: {resp.text}"
        updated = resp.json()
        assert updated.get("reporting_method") == "location"
        assert updated.get("location_factor_id") is None, "Switching to location should clear location_factor_id"
        print(f"✓ Switching to location method clears location_factor_id")
        
        # Reset
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": original_method or "location",
            "location_factor_id": original_link
        })
    
    # ==================== GET /api/curation/factors - Filter by reporting_method ====================
    
    def test_filter_factors_by_reporting_method_market(self):
        """Test filtering factors by reporting_method=market"""
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=50&reporting_method=market")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        for factor in data.get("items", []):
            assert factor.get("reporting_method") == "market", f"Factor {factor.get('id')} should be market"
        print(f"✓ Filter by reporting_method=market: {data.get('total')} factors")
    
    def test_filter_factors_by_reporting_method_location(self):
        """Test filtering factors by reporting_method=location"""
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=50&reporting_method=location")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        for factor in data.get("items", []):
            method = factor.get("reporting_method")
            assert method in [None, "location"], f"Factor {factor.get('id')} should be location or None"
        print(f"✓ Filter by reporting_method=location: {data.get('total')} factors")
    
    # ==================== Verify _locationName resolution in list ====================
    
    def test_factors_list_resolves_location_names(self):
        """Test that the factors list resolves _locationName for linked factors"""
        # First create a linked factor
        resp = self.session.get(f"{BASE_URL}/api/curation/factors/search-location?limit=5")
        location_factors = resp.json()
        if len(location_factors) == 0:
            pytest.skip("No location factors available")
        location_factor = location_factors[0]
        location_factor_id = location_factor.get("id")
        location_factor_name = location_factor.get("name_simple_fr") or location_factor.get("name_fr")
        
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=5")
        factors = resp.json().get("items", [])
        test_factor = factors[0]
        factor_id = test_factor.get("id")
        original_method = test_factor.get("reporting_method")
        original_link = test_factor.get("location_factor_id")
        
        # Link the factor
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": "market",
            "location_factor_id": location_factor_id
        })
        
        # Fetch the list again and verify _locationName is resolved
        resp = self.session.get(f"{BASE_URL}/api/curation/factors?page=1&page_size=50&reporting_method=market")
        assert resp.status_code == 200
        data = resp.json()
        
        # Find our test factor
        found = False
        for f in data.get("items", []):
            if f.get("id") == factor_id:
                found = True
                assert f.get("location_factor_id") == location_factor_id
                assert "_locationName" in f, "Should have _locationName resolved"
                print(f"✓ _locationName resolved in list: {f.get('_locationName')}")
                break
        
        # Reset
        self.session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "reporting_method": original_method or "location",
            "location_factor_id": original_link
        })
        
        if not found:
            print("⚠ Test factor not found in market filter results (may have been on different page)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
