"""
Tests unitaires pour les modèles Pydantic
"""
import pytest
import sys
sys.path.insert(0, '/app/backend')

from pydantic import ValidationError
from tests.conftest_credentials import TEST_GENERIC_PASSWORD
from models import (
    UserRegister,
    UserLogin,
    ActivityCreate,
    EmissionImpact,
    EmissionFactorV2Create,
    CompanyCreate,
    CarbonObjectiveCreate
)


class TestUserModels:
    """Tests for user models"""
    
    def test_user_register_valid(self):
        """Test valid user registration"""
        user = UserRegister(
            email="test@example.com",
            password=TEST_GENERIC_PASSWORD,
            name="Test User",
            language="fr",
            role="user"
        )
        
        assert user.email == "test@example.com"
        assert user.name == "Test User"
    
    def test_user_register_invalid_email(self):
        """Test invalid email validation"""
        with pytest.raises(ValidationError):
            UserRegister(
                email="invalid-email",
                password=TEST_GENERIC_PASSWORD,
                name="Test User"
            )
    
    def test_user_login_valid(self):
        """Test valid user login"""
        login = UserLogin(
            email="test@example.com",
            password=TEST_GENERIC_PASSWORD
        )
        
        assert login.email == "test@example.com"


class TestActivityModels:
    """Tests for activity models"""
    
    def test_activity_create_valid(self):
        """Test valid activity creation"""
        activity = ActivityCreate(
            category_id="combustion_mobile",
            scope="scope1",
            name="Test Activity",
            quantity=100,
            unit="L"
        )
        
        assert activity.category_id == "combustion_mobile"
        assert activity.quantity == 100
    
    def test_activity_create_with_optional_fields(self):
        """Test activity with optional fields"""
        activity = ActivityCreate(
            category_id="combustion_mobile",
            scope="scope1",
            name="Test Activity",
            quantity=100,
            unit="L",
            description="Description test",
            date="2024-06-15",
            emission_factor_id="factor_123"
        )
        
        assert activity.description == "Description test"
        assert activity.date == "2024-06-15"


class TestEmissionFactorModels:
    """Tests for emission factor models"""
    
    def test_emission_impact_valid(self):
        """Test valid emission impact"""
        impact = EmissionImpact(
            scope="scope1",
            category="combustion_mobile",
            value=2.31,
            unit="kgCO2e/L",
            type="direct"
        )
        
        assert impact.value == 2.31
        assert impact.scope == "scope1"
    
    def test_emission_factor_v2_valid(self):
        """Test valid emission factor v2"""
        factor = EmissionFactorV2Create(
            name_fr="Essence",
            name_de="Benzin",
            subcategory="vehicules_thermiques",
            input_units=["L", "km"],
            default_unit="L",
            impacts=[
                EmissionImpact(
                    scope="scope1",
                    category="combustion_mobile",
                    value=2.31,
                    unit="kgCO2e/L"
                )
            ],
            source="OFEV",
            year=2024
        )
        
        assert factor.name_fr == "Essence"
        assert len(factor.impacts) == 1


class TestCompanyModels:
    """Tests for company models"""
    
    def test_company_create_valid(self):
        """Test valid company creation"""
        company = CompanyCreate(
            name="Test Company SA",
            location="Genève, Suisse",
            sector="Services",
            entity_type="private_company",
            employees=50,
            surface_area=1000.0
        )
        
        assert company.name == "Test Company SA"
        assert company.employees == 50
    
    def test_company_create_with_defaults(self):
        """Test company with default values"""
        company = CompanyCreate(
            name="Test Company",
            location="Zurich",
            sector="IT",
            employees=10,
            surface_area=500.0
        )
        
        assert company.entity_type == "private_company"
        assert company.fiscal_year_start_month == 1
        assert company.excluded_categories == []


class TestObjectiveModels:
    """Tests for carbon objective models"""
    
    def test_objective_create_valid(self):
        """Test valid objective creation"""
        objective = CarbonObjectiveCreate(
            reference_fiscal_year_id="fy_123",
            target_year=2030
        )
        
        assert objective.target_year == 2030
        assert objective.reference_fiscal_year_id == "fy_123"
    
    def test_objective_target_years(self):
        """Test different target years"""
        obj_2030 = CarbonObjectiveCreate(
            reference_fiscal_year_id="fy_123",
            target_year=2030
        )
        obj_2035 = CarbonObjectiveCreate(
            reference_fiscal_year_id="fy_123",
            target_year=2035
        )
        
        assert obj_2030.target_year == 2030
        assert obj_2035.target_year == 2035
