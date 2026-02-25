"""
Tests for Unit Conversion Feature
Tests:
1. GET /api/units/dimensions - Returns all 5 dimensions with correct conversion factors
2. POST /api/activities with original_quantity, original_unit, conversion_factor fields
3. End-to-end: Create an entry with MJ unit for an energy factor → verify emissions calculated correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


class TestUnitDimensionsEndpoint:
    """Test the public /api/units/dimensions endpoint"""
    
    def test_get_unit_dimensions_returns_5_dimensions(self):
        """GET /api/units/dimensions should return all 5 dimensions"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Should have exactly 5 dimensions
        expected_dimensions = ["energy", "distance", "mass", "volume", "monetary"]
        assert len(data) == 5, f"Expected 5 dimensions, got {len(data)}"
        
        for dim in expected_dimensions:
            assert dim in data, f"Missing dimension: {dim}"
            
        print(f"✓ All 5 dimensions present: {list(data.keys())}")
    
    def test_energy_dimension_has_correct_units(self):
        """Energy dimension should have kWh, MWh, MJ, GJ, therm"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        assert response.status_code == 200
        
        data = response.json()
        energy = data.get("energy", {})
        
        # Check base unit
        assert energy.get("base_unit") == "kWh", f"Base unit should be kWh"
        
        # Check all energy units present
        units = energy.get("units", {})
        expected_units = ["kWh", "MWh", "MJ", "GJ", "therm"]
        for unit in expected_units:
            assert unit in units, f"Missing energy unit: {unit}"
        
        # Check conversion factors
        assert units["kWh"]["to_base"] == 1
        assert units["MWh"]["to_base"] == 1000
        assert units["MJ"]["to_base"] == 0.2778
        assert units["GJ"]["to_base"] == 277.78
        assert units["therm"]["to_base"] == 29.3
        
        print(f"✓ Energy dimension correct with units: {list(units.keys())}")
    
    def test_distance_dimension_has_correct_units(self):
        """Distance dimension should have km, m, miles"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        assert response.status_code == 200
        
        data = response.json()
        distance = data.get("distance", {})
        
        assert distance.get("base_unit") == "km"
        
        units = distance.get("units", {})
        expected_units = ["km", "m", "miles"]
        for unit in expected_units:
            assert unit in units, f"Missing distance unit: {unit}"
        
        assert units["km"]["to_base"] == 1
        assert units["m"]["to_base"] == 0.001
        assert units["miles"]["to_base"] == 1.60934
        
        print(f"✓ Distance dimension correct with units: {list(units.keys())}")
    
    def test_mass_dimension_has_correct_units(self):
        """Mass dimension should have kg, t, g, lb"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        assert response.status_code == 200
        
        data = response.json()
        mass = data.get("mass", {})
        
        assert mass.get("base_unit") == "kg"
        
        units = mass.get("units", {})
        expected_units = ["kg", "t", "g", "lb"]
        for unit in expected_units:
            assert unit in units, f"Missing mass unit: {unit}"
        
        assert units["kg"]["to_base"] == 1
        assert units["t"]["to_base"] == 1000
        assert units["g"]["to_base"] == 0.001
        assert units["lb"]["to_base"] == 0.453592
        
        print(f"✓ Mass dimension correct with units: {list(units.keys())}")
    
    def test_volume_dimension_has_correct_units(self):
        """Volume dimension should have L, m3, gal"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        assert response.status_code == 200
        
        data = response.json()
        volume = data.get("volume", {})
        
        assert volume.get("base_unit") == "L"
        
        units = volume.get("units", {})
        expected_units = ["L", "m3", "gal"]
        for unit in expected_units:
            assert unit in units, f"Missing volume unit: {unit}"
        
        assert units["L"]["to_base"] == 1
        assert units["m3"]["to_base"] == 1000
        assert units["gal"]["to_base"] == 3.78541
        
        print(f"✓ Volume dimension correct with units: {list(units.keys())}")
    
    def test_monetary_dimension_has_correct_units(self):
        """Monetary dimension should have CHF, kCHF"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        assert response.status_code == 200
        
        data = response.json()
        monetary = data.get("monetary", {})
        
        assert monetary.get("base_unit") == "CHF"
        
        units = monetary.get("units", {})
        expected_units = ["CHF", "kCHF"]
        for unit in expected_units:
            assert unit in units, f"Missing monetary unit: {unit}"
        
        assert units["CHF"]["to_base"] == 1
        assert units["kCHF"]["to_base"] == 1000
        
        print(f"✓ Monetary dimension correct with units: {list(units.keys())}")


class TestActivityWithConversion:
    """Test activity creation with unit conversion fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and fiscal year ID"""
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get or create fiscal year
        fy_response = requests.get(
            f"{BASE_URL}/api/fiscal-years",
            headers=self.headers
        )
        
        if fy_response.status_code == 200 and fy_response.json():
            self.fiscal_year_id = fy_response.json()[0].get("id")
        else:
            # Create one
            create_fy_response = requests.post(
                f"{BASE_URL}/api/fiscal-years",
                headers=self.headers,
                json={"year": 2025}
            )
            if create_fy_response.status_code in [200, 201]:
                self.fiscal_year_id = create_fy_response.json().get("id")
            else:
                self.fiscal_year_id = None
        
        # Get an emission factor for energy (MJ or kWh-based)
        factors_response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe",
            headers=self.headers  # Need auth for this endpoint
        )
        
        self.emission_factor = None
        if factors_response.status_code == 200:
            factors = factors_response.json()
            for f in factors:
                input_units = f.get("input_units", [])
                # Look for energy-based factors (MJ, kWh)
                if any(u in input_units for u in ["MJ", "kWh", "MWh", "GJ"]):
                    self.emission_factor = f
                    break
            # Fallback to first factor
            if not self.emission_factor and factors:
                self.emission_factor = factors[0]
    
    def test_create_activity_with_conversion_fields(self):
        """POST /api/activities should accept and store conversion fields"""
        if not self.emission_factor:
            pytest.skip("No emission factor found for testing")
        
        # Get the factor's native unit
        factor_unit = self.emission_factor.get("default_unit") or self.emission_factor.get("input_units", ["MJ"])[0]
        
        # Create activity with GJ input that converts to MJ (same energy dimension)
        # 1 GJ = 1000 MJ, so 1 GJ * 1000 = 1000 MJ
        # If factor uses MJ: original=1 GJ, converted=1000 MJ
        if factor_unit == "MJ":
            original_qty = 1  # 1 GJ
            original_unit = "GJ"
            conversion_factor = 1000  # GJ to MJ: multiply by 1000
            converted_qty = original_qty * conversion_factor  # 1000 MJ
            converted_unit = "MJ"
        else:
            # Fallback: use same unit (no conversion)
            original_qty = 100
            original_unit = factor_unit
            conversion_factor = 1
            converted_qty = original_qty
            converted_unit = factor_unit
        
        activity_data = {
            "category_id": "combustion_fixe",
            "subcategory_id": "combustibles",
            "scope": "scope1",
            "name": "TEST_Unit_Conversion_Activity",
            "quantity": converted_qty,  # Converted quantity
            "unit": converted_unit,  # Factor's native unit
            "original_quantity": original_qty,  # User input
            "original_unit": original_unit,  # User's selected unit
            "conversion_factor": conversion_factor,
            "emission_factor_id": self.emission_factor["id"],
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe",
            "fiscal_year_id": self.fiscal_year_id,
            "comments": "Testing unit conversion feature"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code in [200, 201], f"Failed to create activity: {response.text}"
        
        data = response.json()
        
        # Check for single activity or group of activities
        if "activities" in data:
            # Multi-impact factor created multiple activities
            activity = data["activities"][0]
        else:
            activity = data
        
        # Verify conversion fields are stored
        assert activity.get("original_quantity") == original_qty, \
            f"original_quantity should be {original_qty}, got {activity.get('original_quantity')}"
        assert activity.get("original_unit") == original_unit, \
            f"original_unit should be {original_unit}, got {activity.get('original_unit')}"
        assert activity.get("conversion_factor") == conversion_factor, \
            f"conversion_factor should be {conversion_factor}, got {activity.get('conversion_factor')}"
        
        # Verify the converted quantity is used for calculations
        assert activity.get("quantity") == converted_qty, \
            f"quantity should be {converted_qty}, got {activity.get('quantity')}"
        
        print(f"✓ Activity created with conversion fields:")
        print(f"  - original_quantity: {activity.get('original_quantity')}")
        print(f"  - original_unit: {activity.get('original_unit')}")
        print(f"  - conversion_factor: {activity.get('conversion_factor')}")
        print(f"  - quantity (converted): {activity.get('quantity')}")
        print(f"  - unit: {activity.get('unit')}")
        
        # Store activity ID for cleanup
        self.created_activity_id = activity.get("id")
        
        # Cleanup
        if self.created_activity_id:
            requests.delete(
                f"{BASE_URL}/api/activities/{self.created_activity_id}",
                headers=self.headers
            )
    
    def test_activity_without_conversion(self):
        """Activity without conversion should set original_quantity = quantity"""
        if not self.emission_factor:
            pytest.skip("No emission factor found for testing")
        
        activity_data = {
            "category_id": "combustion_fixe",
            "subcategory_id": "combustibles",
            "scope": "scope1",
            "name": "TEST_No_Conversion_Activity",
            "quantity": 500,
            "unit": "kWh",
            "emission_factor_id": self.emission_factor["id"],
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe",
            "fiscal_year_id": self.fiscal_year_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code in [200, 201], f"Failed to create activity: {response.text}"
        
        data = response.json()
        activity = data.get("activities", [data])[0] if "activities" in data else data
        
        # When no conversion, original_quantity should equal quantity
        assert activity.get("original_quantity") == activity.get("quantity"), \
            "original_quantity should equal quantity when no conversion"
        assert activity.get("original_unit") == activity.get("unit"), \
            "original_unit should equal unit when no conversion"
        
        print(f"✓ Activity without conversion has matching original/converted values")
        
        # Cleanup
        if activity.get("id"):
            requests.delete(
                f"{BASE_URL}/api/activities/{activity.get('id')}",
                headers=self.headers
            )


class TestEndToEndConversion:
    """End-to-end test: MJ input for kWh-based factor with correct emissions calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and fiscal year"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get fiscal year
        fy_response = requests.get(
            f"{BASE_URL}/api/fiscal-years",
            headers=self.headers
        )
        
        self.fiscal_year_id = None
        if fy_response.status_code == 200 and fy_response.json():
            self.fiscal_year_id = fy_response.json()[0].get("id")
    
    def test_gj_to_mj_emissions_calculation(self):
        """
        Create entry with GJ unit for MJ-based factor
        Verify emissions are calculated correctly based on conversion
        
        Example:
        - User inputs: 1 GJ
        - Conversion: 1 GJ * 1000 = 1000 MJ
        - If factor is 0.05 kgCO2e/MJ → emissions = 1000 * 0.05 = 50 kgCO2e
        
        Note: Multi-impact factors apply GHG business rules which filter impacts.
        For Scope 1 entry: only scope1, scope2, scope3_3 impacts are included.
        """
        # First, find an MJ-based emission factor
        factors_response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe",
            headers=self.headers
        )
        
        if factors_response.status_code != 200:
            pytest.skip("Could not fetch emission factors")
        
        factors = factors_response.json()
        mj_factor = None
        
        for f in factors:
            input_units = f.get("input_units", [])
            if "MJ" in input_units:
                mj_factor = f
                break
        
        if not mj_factor:
            pytest.skip("No MJ-based emission factor found")
        
        # Get the factor's impact value for emission calculation
        impacts = mj_factor.get("impacts", [])
        if not impacts:
            pytest.skip("Factor has no impacts")
        
        # Calculate expected emissions - ONLY for scope1/scope2/scope3_3 impacts
        # (GHG business rules filter out scope3 for Scope 1 entries)
        original_qty_gj = 1  # User enters 1 GJ
        gj_to_mj_factor = 1000  # 1 GJ = 1000 MJ
        converted_qty_mj = original_qty_gj * gj_to_mj_factor  # 1000 MJ
        
        # Apply business rules: for scope1 entry, only include scope1, scope2, scope3_3
        applicable_scopes = ['scope1', 'scope2', 'scope3_3']
        filtered_impact_per_mj = sum(
            impact.get("value", 0) for impact in impacts 
            if impact.get("scope", "").lower() in applicable_scopes
        )
        expected_emissions = converted_qty_mj * filtered_impact_per_mj
        
        # Create activity with GJ input
        activity_data = {
            "category_id": "combustion_fixe",
            "subcategory_id": "combustibles",
            "scope": "scope1",
            "name": "TEST_GJ_to_MJ_Conversion",
            "quantity": converted_qty_mj,  # Pre-converted by frontend
            "unit": "MJ",
            "original_quantity": original_qty_gj,
            "original_unit": "GJ",
            "conversion_factor": gj_to_mj_factor,
            "emission_factor_id": mj_factor["id"],
            "entry_scope": "scope1",
            "entry_category": "combustion_fixe",
            "fiscal_year_id": self.fiscal_year_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/activities",
            headers=self.headers,
            json=activity_data
        )
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        data = response.json()
        
        # Handle multi-impact factors (returns group of activities)
        activities = data.get("activities", [data])
        
        # Sum emissions from all created activities
        total_emissions = sum(a.get("emissions", 0) for a in activities)
        
        # Verify emissions are calculated based on converted MJ value
        # Allow for some floating point tolerance
        assert abs(total_emissions - expected_emissions) < 1.0, \
            f"Emissions mismatch: expected {expected_emissions:.2f}, got {total_emissions:.2f}"
        
        print(f"✓ End-to-end conversion test passed:")
        print(f"  - Original: {original_qty_gj} GJ")
        print(f"  - Converted: {converted_qty_mj:.2f} MJ")
        print(f"  - Impact factor (after business rules): {filtered_impact_per_mj} kgCO2e/MJ")
        print(f"  - Expected emissions: {expected_emissions:.2f} kgCO2e")
        print(f"  - Actual emissions: {total_emissions:.2f} kgCO2e")
        
        # Cleanup - delete all created activities
        if "activities" in data:
            group_id = data.get("group_id")
            if group_id:
                requests.delete(
                    f"{BASE_URL}/api/activities/groups/{group_id}",
                    headers=self.headers
                )
        else:
            activity_id = data.get("id")
            if activity_id:
                requests.delete(
                    f"{BASE_URL}/api/activities/{activity_id}",
                    headers=self.headers
                )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
