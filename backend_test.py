#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Carbon Footprint Calculator
Tests all endpoints according to GHG Protocol requirements
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CarbonFootprintAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.company_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health endpoint"""
        success, data = self.make_request('GET', 'health')
        self.log_test("Health Check", success and data.get('status') == 'healthy', 
                     f"Response: {data}")

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        user_data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test User",
            "language": "fr"
        }
        
        success, data = self.make_request('POST', 'auth/register', user_data)
        
        if success and 'token' in data and 'user' in data:
            self.token = data['token']
            self.user_id = data['user']['id']
            self.log_test("User Registration", True, f"User ID: {self.user_id}")
        else:
            self.log_test("User Registration", False, f"Response: {data}")

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_id:
            self.log_test("User Login", False, "No user registered for login test")
            return
            
        # Try to login with a test user (we'll use the registered user)
        login_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        # First register a user for login test
        success, data = self.make_request('POST', 'auth/register', {
            "email": "login_test@example.com", 
            "password": "TestPass123!",
            "name": "Login Test User",
            "language": "fr"
        })
        
        if success:
            # Now test login
            login_data = {
                "email": "login_test@example.com",
                "password": "TestPass123!"
            }
            success, data = self.make_request('POST', 'auth/login', login_data)
            self.log_test("User Login", success and 'token' in data, f"Response: {data}")
        else:
            self.log_test("User Login", False, "Failed to create test user for login")

    def test_get_current_user(self):
        """Test get current user info"""
        if not self.token:
            self.log_test("Get Current User", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'auth/me')
        self.log_test("Get Current User", success and 'id' in data, f"Response: {data}")

    def test_update_language(self):
        """Test language update"""
        if not self.token:
            self.log_test("Update Language", False, "No authentication token")
            return
            
        success, data = self.make_request('PUT', 'auth/language', {"language": "de"})
        self.log_test("Update Language", success, f"Response: {data}")

    def test_create_company(self):
        """Test company creation"""
        if not self.token:
            self.log_test("Create Company", False, "No authentication token")
            return
            
        company_data = {
            "name": "Test Company GmbH",
            "location": "Berlin, Germany",
            "sector": "technology",
            "reference_year": 2024,
            "employees": 50,
            "surface_area": 1000.0,
            "revenue": 5000000.0,
            "consolidation_approach": "operational_control",
            "excluded_categories": []
        }
        
        success, data = self.make_request('POST', 'companies', company_data, 200)
        
        if success and 'id' in data:
            self.company_id = data['id']
            self.log_test("Create Company", True, f"Company ID: {self.company_id}")
        else:
            self.log_test("Create Company", False, f"Response: {data}")

    def test_get_company(self):
        """Test get company info"""
        if not self.token:
            self.log_test("Get Company", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'companies')
        self.log_test("Get Company", success, f"Response: {data}")

    def test_update_company(self):
        """Test company update"""
        if not self.token or not self.company_id:
            self.log_test("Update Company", False, "No authentication token or company ID")
            return
            
        update_data = {
            "name": "Updated Test Company GmbH",
            "employees": 75
        }
        
        success, data = self.make_request('PUT', f'companies/{self.company_id}', update_data)
        self.log_test("Update Company", success, f"Response: {data}")

    def test_get_categories(self):
        """Test get emission categories"""
        success, data = self.make_request('GET', 'categories')
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if we have categories for all scopes
            scopes = set(cat.get('scope') for cat in data)
            expected_scopes = {'scope1', 'scope2', 'scope3_amont', 'scope3_aval'}
            has_all_scopes = expected_scopes.issubset(scopes)
            self.log_test("Get Categories", has_all_scopes, 
                         f"Found {len(data)} categories with scopes: {scopes}")
        else:
            self.log_test("Get Categories", False, f"Response: {data}")

    def test_create_activity(self):
        """Test activity creation"""
        if not self.token:
            self.log_test("Create Activity", False, "No authentication token")
            return
            
        activity_data = {
            "category_id": "combustion_mobile",
            "scope": "scope1",
            "name": "Fuel consumption - Company vehicles",
            "description": "Monthly fuel consumption for company fleet",
            "quantity": 500.0,
            "unit": "L",
            "manual_emission_factor": 2.68,
            "date": "2024-01-15",
            "source": "Fuel receipts",
            "comments": "Test activity for API validation"
        }
        
        success, data = self.make_request('POST', 'activities', activity_data, 200)
        self.log_test("Create Activity", success and 'id' in data, f"Response: {data}")
        
        return data.get('id') if success else None

    def test_get_activities(self):
        """Test get activities"""
        if not self.token:
            self.log_test("Get Activities", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'activities')
        self.log_test("Get Activities", success and isinstance(data, list), f"Found {len(data) if isinstance(data, list) else 0} activities")

    def test_create_product(self):
        """Test product creation"""
        if not self.token:
            self.log_test("Create Product", False, "No authentication token")
            return
            
        product_data = {
            "name": "Eco-friendly Widget",
            "description": "Sustainable product with low carbon footprint",
            "manufacturing_emissions": 15.5,
            "usage_emissions": 2.3,
            "disposal_emissions": 1.2,
            "unit": "unit"
        }
        
        success, data = self.make_request('POST', 'products', product_data, 200)
        self.log_test("Create Product", success and 'id' in data, f"Response: {data}")
        
        return data.get('id') if success else None

    def test_get_products(self):
        """Test get products"""
        if not self.token:
            self.log_test("Get Products", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'products')
        self.log_test("Get Products", success and isinstance(data, list), f"Found {len(data) if isinstance(data, list) else 0} products")

    def test_record_product_sale(self):
        """Test recording product sale"""
        if not self.token:
            self.log_test("Record Product Sale", False, "No authentication token")
            return
            
        # First create a product
        product_id = self.test_create_product()
        if not product_id:
            self.log_test("Record Product Sale", False, "Failed to create product for sale test")
            return
            
        sale_data = {
            "product_id": product_id,
            "quantity": 10,
            "date": "2024-01-20"
        }
        
        success, data = self.make_request('POST', f'products/{product_id}/sales', sale_data)
        self.log_test("Record Product Sale", success, f"Response: {data}")

    def test_get_emission_factors(self):
        """Test get emission factors"""
        success, data = self.make_request('GET', 'emission-factors')
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if we have factors for different scopes
            scopes = set(ef.get('scope') for ef in data)
            self.log_test("Get Emission Factors", len(scopes) > 0, 
                         f"Found {len(data)} emission factors with scopes: {scopes}")
        else:
            self.log_test("Get Emission Factors", False, f"Response: {data}")

    def test_create_emission_factor(self):
        """Test create custom emission factor"""
        if not self.token:
            self.log_test("Create Emission Factor", False, "No authentication token")
            return
            
        factor_data = {
            "name": "Custom Test Factor",
            "category": "combustion_mobile",
            "scope": "scope1",
            "value": 3.14,
            "unit": "kgCO2e/L",
            "source": "Test Source",
            "tags": ["test", "custom"],
            "description": "Test emission factor for API validation",
            "region": "Test Region",
            "year": 2024
        }
        
        success, data = self.make_request('POST', 'emission-factors', factor_data, 200)
        self.log_test("Create Emission Factor", success and 'id' in data, f"Response: {data}")

    def test_dashboard_summary(self):
        """Test dashboard summary endpoint"""
        if not self.token:
            self.log_test("Dashboard Summary", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'dashboard/summary')
        
        if success and isinstance(data, dict):
            required_fields = ['total_emissions', 'scope_emissions', 'scope_completion']
            has_required = all(field in data for field in required_fields)
            self.log_test("Dashboard Summary", has_required, 
                         f"Response contains: {list(data.keys())}")
        else:
            self.log_test("Dashboard Summary", False, f"Response: {data}")

    def test_category_stats(self):
        """Test category statistics endpoint"""
        if not self.token:
            self.log_test("Category Stats", False, "No authentication token")
            return
            
        success, data = self.make_request('GET', 'dashboard/category-stats')
        self.log_test("Category Stats", success and isinstance(data, dict), f"Response: {data}")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Carbon Footprint API Test Suite")
        print("=" * 60)
        
        # Basic connectivity
        self.test_health_check()
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        self.test_update_language()
        
        # Company management
        self.test_create_company()
        self.test_get_company()
        self.test_update_company()
        
        # Categories and emission factors
        self.test_get_categories()
        self.test_get_emission_factors()
        self.test_create_emission_factor()
        
        # Activities
        self.test_create_activity()
        self.test_get_activities()
        
        # Products
        self.test_create_product()
        self.test_get_products()
        self.test_record_product_sale()
        
        # Dashboard
        self.test_dashboard_summary()
        self.test_category_stats()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
            # Print failed tests
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['name']}: {result['details']}")
            
            return 1

def main():
    """Main test execution"""
    tester = CarbonFootprintAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())