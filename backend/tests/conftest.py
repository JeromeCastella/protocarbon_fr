"""
Configuration des tests pytest
"""
import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, '/app/backend')

from fastapi.testclient import TestClient
from pymongo import MongoClient

# Test database configuration
TEST_DB_NAME = "carbon_tracker_test"


@pytest.fixture(scope="session")
def mongo_client():
    """Create MongoDB client for tests"""
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = MongoClient(mongo_url)
    yield client
    client.close()


@pytest.fixture(scope="function")
def test_db(mongo_client):
    """Create a fresh test database for each test"""
    db = mongo_client[TEST_DB_NAME]
    yield db
    # Cleanup after test
    mongo_client.drop_database(TEST_DB_NAME)


@pytest.fixture(scope="session")
def api_client():
    """Create API test client"""
    from server import app
    return TestClient(app)


@pytest.fixture
def test_user_data():
    """Sample user data for tests"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "name": "Test User",
        "language": "fr",
        "role": "user"
    }


@pytest.fixture
def test_admin_data():
    """Sample admin user data for tests"""
    return {
        "email": "admin@example.com",
        "password": "adminpassword123",
        "name": "Admin User",
        "language": "fr",
        "role": "admin"
    }


@pytest.fixture
def test_company_data():
    """Sample company data for tests"""
    return {
        "name": "Test Company SA",
        "location": "Genève, Suisse",
        "sector": "Services",
        "entity_type": "private_company",
        "employees": 50,
        "surface_area": 1000.0,
        "revenue": 5000000.0,
        "fiscal_year_start_month": 1
    }


@pytest.fixture
def test_activity_data():
    """Sample activity data for tests"""
    return {
        "category_id": "combustion_mobile",
        "scope": "scope1",
        "name": "Carburant véhicules",
        "description": "Consommation essence flotte",
        "quantity": 1000,
        "unit": "L",
        "date": "2024-06-15"
    }


@pytest.fixture
def test_emission_factor():
    """Sample emission factor data for tests"""
    return {
        "name_fr": "Essence",
        "name_de": "Benzin",
        "subcategory": "vehicules_thermiques",
        "input_units": ["L", "km"],
        "default_unit": "L",
        "impacts": [
            {"scope": "scope1", "category": "combustion_mobile", "value": 2.31, "unit": "kgCO2e/L", "type": "direct"},
            {"scope": "scope3_amont", "category": "energie_amont", "value": 0.58, "unit": "kgCO2e/L", "type": "indirect"}
        ],
        "unit_conversions": {"km_to_L": 0.08},
        "source": "OFEV",
        "region": "Suisse",
        "year": 2024
    }
