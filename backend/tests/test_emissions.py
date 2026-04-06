"""
Tests unitaires pour les services d'émissions
"""
import pytest
import sys
sys.path.insert(0, '/app/backend')

from services.emissions import (
    calculate_emissions_for_activity,
    create_factor_snapshot
)
from utils import format_emissions, validate_scope, serialize_doc


class TestEmissionsCalculation:
    """Tests for emission calculation functions"""
    
    def test_calculate_emissions_simple(self):
        """Test basic emission calculation"""
        factor = {
            "default_unit": "L",
            "impacts": [
                {"scope": "scope1", "category": "combustion_mobile", "value": 2.31, "type": "direct"}
            ],
            "unit_conversions": {}
        }
        
        result = calculate_emissions_for_activity(
            quantity=100,
            unit="L",
            emission_factor=factor
        )
        
        assert result["total_emissions"] == 231.0
        assert result["emissions_by_scope"]["scope1"] == 231.0
    
    def test_calculate_emissions_multiple_impacts(self):
        """Test calculation with multiple impacts (scope 1 + scope 3.3)"""
        factor = {
            "default_unit": "L",
            "impacts": [
                {"scope": "scope1", "category": "combustion_mobile", "value": 2.31, "type": "direct"},
                {"scope": "scope3_amont", "category": "energie_amont", "value": 0.58, "type": "indirect"}
            ],
            "unit_conversions": {}
        }
        
        result = calculate_emissions_for_activity(
            quantity=100,
            unit="L",
            emission_factor=factor
        )
        
        # 231 + 58 = 289
        assert abs(result["total_emissions"] - 289.0) < 0.01
        assert abs(result["emissions_by_scope"]["scope1"] - 231.0) < 0.01
        assert abs(result["emissions_by_scope"]["scope3_amont"] - 58.0) < 0.01
    
    def test_calculate_emissions_with_unit_conversion(self):
        """Test calculation with unit conversion (km to L)"""
        factor = {
            "default_unit": "L",
            "impacts": [
                {"scope": "scope1", "category": "combustion_mobile", "value": 2.31, "type": "direct"}
            ],
            "unit_conversions": {"km_to_L": 0.08}
        }
        
        result = calculate_emissions_for_activity(
            quantity=1000,  # 1000 km
            unit="km",
            emission_factor=factor
        )
        
        # 1000 km * 0.08 L/km = 80 L * 2.31 = 184.8
        assert abs(result["total_emissions"] - 184.8) < 0.01
    
    def test_calculate_emissions_no_factor(self):
        """Test calculation with no emission factor"""
        result = calculate_emissions_for_activity(
            quantity=100,
            unit="L",
            emission_factor=None
        )
        
        assert result["total_emissions"] == 0
        assert result["emissions_by_scope"] == {}
    
    def test_calculate_emissions_scope_filter(self):
        """Test calculation with scope filter"""
        factor = {
            "default_unit": "L",
            "impacts": [
                {"scope": "scope1", "category": "combustion_mobile", "value": 2.31, "type": "direct"},
                {"scope": "scope3_amont", "category": "energie_amont", "value": 0.58, "type": "indirect"}
            ],
            "unit_conversions": {}
        }
        
        result = calculate_emissions_for_activity(
            quantity=100,
            unit="L",
            emission_factor=factor,
            target_scope="scope1"
        )
        
        assert result["total_emissions"] == 231.0
        assert "scope3_amont" not in result["emissions_by_scope"]


class TestFactorSnapshot:
    """Tests for factor snapshot creation"""
    
    def test_create_snapshot(self):
        """Test creating a factor snapshot"""
        factor = {
            "_id": "test_id_123",
            "version": 2,
            "name_fr": "Essence",
            "name_de": "Benzin",
            "subcategory": "vehicules_thermiques",
            "impacts": [{"scope": "scope1", "value": 2.31}],
            "source": "OFEV",
            "year": 2024,
            "valid_from_year": 2024
        }
        
        snapshot = create_factor_snapshot(factor)
        
        assert snapshot["factor_id"] == "test_id_123"
        assert snapshot["factor_version"] == 2
        assert snapshot["name_fr"] == "Essence"
        assert snapshot["source"] == "OFEV"
        assert "captured_at" in snapshot


class TestFormatEmissions:
    """Tests for emission formatting"""
    
    def test_format_kg(self):
        """Test formatting small values (kgCO2e)"""
        result = format_emissions(500)
        assert result["value"] == 500
        assert result["unit"] == "kgCO₂e"
    
    def test_format_tonnes(self):
        """Test formatting medium values (tCO2e)"""
        result = format_emissions(5000)
        assert result["value"] == 5.0
        assert result["unit"] == "tCO₂e"
    
    def test_format_kilotonnes(self):
        """Test formatting large values (ktCO2e)"""
        result = format_emissions(5000000)
        assert result["value"] == 5.0
        assert result["unit"] == "ktCO₂e"
    
    def test_format_megatonnes(self):
        """Test formatting very large values (MtCO2e)"""
        result = format_emissions(5000000000)
        assert result["value"] == 5.0
        assert result["unit"] == "MtCO₂e"


class TestValidateScope:
    """Tests for scope validation"""
    
    def test_valid_scopes(self):
        """Test valid scope values"""
        assert validate_scope("scope1") == True
        assert validate_scope("scope2") == True
        assert validate_scope("scope3_amont") == True
        assert validate_scope("scope3_aval") == True
    
    def test_invalid_scopes(self):
        """Test invalid scope values"""
        assert validate_scope("scope3") == False
        assert validate_scope("scope4") == False
        assert validate_scope("") == False
        assert validate_scope("invalid") == False


class TestSerializeDoc:
    """Tests for MongoDB document serialization"""
    
    def test_serialize_simple_doc(self):
        """Test serializing a simple document"""
        from bson import ObjectId
        
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "name": "Test",
            "value": 123
        }
        
        result = serialize_doc(doc)
        
        assert result["id"] == "507f1f77bcf86cd799439011"
        assert "_id" not in result
        assert result["name"] == "Test"
        assert result["value"] == 123
    
    def test_serialize_nested_objectid(self):
        """Test serializing document with nested ObjectId"""
        from bson import ObjectId
        
        doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "reference_id": ObjectId("507f1f77bcf86cd799439012")
        }
        
        result = serialize_doc(doc)
        
        assert result["reference_id"] == "507f1f77bcf86cd799439012"
    
    def test_serialize_none(self):
        """Test serializing None"""
        assert serialize_doc(None) is None
