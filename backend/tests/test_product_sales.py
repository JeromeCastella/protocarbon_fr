"""
Tests pour les ventes de produits avec gestion liée par sale_id
Tests: POST (création), PUT (modification groupée), DELETE (suppression groupée)
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-curation.preview.emergentagent.com').rstrip('/')

# Test credentials
# credentials from conftest_credentials
# credentials from conftest_credentials


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def test_product(auth_token):
    """Create a test product for sale tests"""
    product_data = {
        "name": "TEST_SALES_Product",
        "description": "Product for testing linked sales",
        "manufacturing_emissions": 10.0,
        "usage_emissions": 20.0,
        "disposal_emissions": 5.0,
        "unit": "unit"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=product_data
    )
    assert response.status_code == 200, f"Failed to create test product: {response.text}"
    product = response.json()
    yield product
    
    # Cleanup: delete test product after all tests
    requests.delete(
        f"{BASE_URL}/api/products/{product['id']}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )


class TestProductSaleCreationWithSaleId:
    """Test that sales create linked activities via sale_id"""
    
    def test_create_sale_generates_sale_id(self, auth_token, test_product):
        """Test that creating a sale returns a sale_id"""
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 5,
            "date": "2025-06-15"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        assert response.status_code == 200, f"Failed to create sale: {response.text}"
        data = response.json()
        
        # Verify sale_id is returned
        assert "sale_id" in data, "Response should include sale_id"
        assert data["sale_id"] is not None, "sale_id should not be None"
        assert len(data["sale_id"]) == 36, "sale_id should be a UUID"  # UUID format
        
        # Verify emissions breakdown
        assert data["quantity"] == 5
        assert data["manufacturing_emissions"] == 50.0  # 10 * 5
        assert data["usage_emissions"] == 100.0  # 20 * 5
        assert data["disposal_emissions"] == 25.0  # 5 * 5
        assert data["total_emissions"] == 175.0  # 50 + 100 + 25
        
        # Verify activities were created
        assert "activity_ids" in data
        assert len(data["activity_ids"]) == 3, "Should create 3 activities (transformation, usage, disposal)"
        
        print(f"✓ Sale created with sale_id: {data['sale_id']}")
        print(f"  - Activities created: {len(data['activity_ids'])}")
        
        return data
    
    def test_sale_activities_have_sale_id(self, auth_token, test_product):
        """Test that created activities have the sale_id field"""
        # Create a sale
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 3,
            "date": "2025-07-20"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        assert response.status_code == 200
        sale_result = response.json()
        sale_id = sale_result["sale_id"]
        
        # Get sale details to verify activities have sale_id
        details_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert details_response.status_code == 200
        details = details_response.json()
        
        # Verify all activities have the same sale_id
        assert "linked_activities" in details
        for activity in details["linked_activities"]:
            assert activity.get("sale_id") == sale_id, "Activity should have matching sale_id"
            assert "sale_phase" in activity, "Activity should have sale_phase"
        
        # Verify we have all three phases
        phases = {a["sale_phase"] for a in details["linked_activities"]}
        assert phases == {"transformation", "usage", "disposal"}, f"Expected all three phases, got: {phases}"
        
        print(f"✓ All activities correctly linked with sale_id: {sale_id}")
        print(f"  - Phases: {phases}")
        
        return sale_id


class TestProductSalesList:
    """Test getting sales list for a product"""
    
    def test_get_product_sales_list(self, auth_token, test_product):
        """Test getting list of all sales for a product"""
        response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "product_id" in data
        assert "sales" in data
        assert isinstance(data["sales"], list)
        
        # Each sale should have sale_id
        for sale in data["sales"]:
            assert "sale_id" in sale, "Each sale should have a sale_id"
        
        print(f"✓ Retrieved {len(data['sales'])} sales for product")
        
        return data


class TestProductSaleUpdate:
    """Test updating a sale and its linked activities"""
    
    def test_update_sale_quantity(self, auth_token, test_product):
        """Test that updating a sale updates all linked activities"""
        # First create a sale
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 10,
            "date": "2025-08-01"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        assert create_response.status_code == 200
        created_sale = create_response.json()
        sale_id = created_sale["sale_id"]
        
        # Update the sale
        update_data = {
            "quantity": 15,
            "date": "2025-08-15"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert update_response.status_code == 200, f"Failed to update sale: {update_response.text}"
        updated_sale = update_response.json()
        
        # Verify the update
        assert updated_sale["old_quantity"] == 10
        assert updated_sale["new_quantity"] == 15
        assert updated_sale["manufacturing_emissions"] == 150.0  # 10 * 15
        assert updated_sale["usage_emissions"] == 300.0  # 20 * 15
        assert updated_sale["disposal_emissions"] == 75.0  # 5 * 15
        
        # Verify activities were updated
        details_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert details_response.status_code == 200
        details = details_response.json()
        
        for activity in details["linked_activities"]:
            assert activity["quantity"] == 15, "Activity quantity should be updated"
            assert activity["date"] == "2025-08-15", "Activity date should be updated"
            assert "(x15)" in activity["name"], "Activity name should reflect new quantity"
        
        print(f"✓ Sale {sale_id} updated successfully")
        print(f"  - Old quantity: 10 → New quantity: 15")
        print(f"  - All {len(details['linked_activities'])} activities updated")
        
        return sale_id
    
    def test_update_nonexistent_sale(self, auth_token, test_product):
        """Test updating a sale that doesn't exist"""
        fake_sale_id = "00000000-0000-0000-0000-000000000000"
        
        update_data = {
            "quantity": 5
        }
        
        response = requests.put(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{fake_sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert response.status_code == 404
        print("✓ Correctly returns 404 for nonexistent sale")


class TestProductSaleDeletion:
    """Test deleting a sale and its linked activities"""
    
    def test_delete_sale_removes_all_activities(self, auth_token, test_product):
        """Test that deleting a sale removes all linked activities"""
        # First create a sale
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 7,
            "date": "2025-09-01"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        assert create_response.status_code == 200
        created_sale = create_response.json()
        sale_id = created_sale["sale_id"]
        activity_count = len(created_sale["activity_ids"])
        
        # Verify the sale exists
        details_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert details_response.status_code == 200
        
        # Delete the sale
        delete_response = requests.delete(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Failed to delete sale: {delete_response.text}"
        delete_result = delete_response.json()
        
        # Verify deletion result
        assert delete_result["sale_id"] == sale_id
        assert delete_result["deleted_quantity"] == 7
        assert delete_result["deleted_activities_count"] == activity_count
        
        # Verify the sale no longer exists
        details_after = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert details_after.status_code == 404, "Sale should not exist after deletion"
        
        print(f"✓ Sale {sale_id} deleted successfully")
        print(f"  - Deleted quantity: 7")
        print(f"  - Deleted activities: {activity_count}")
    
    def test_delete_nonexistent_sale(self, auth_token, test_product):
        """Test deleting a sale that doesn't exist"""
        fake_sale_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.delete(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{fake_sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
        print("✓ Correctly returns 404 for nonexistent sale")


class TestProductTotalSalesTracking:
    """Test that total_sales in product is correctly updated"""
    
    def test_total_sales_increments_on_create(self, auth_token, test_product):
        """Test that total_sales increases when creating a sale"""
        # Get current total
        product_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        initial_total = product_response.json().get("total_sales", 0)
        
        # Create a sale
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 20,
            "date": "2025-10-01"
        }
        
        requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        
        # Check total increased
        product_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        new_total = product_response.json().get("total_sales", 0)
        
        assert new_total == initial_total + 20, f"Expected {initial_total + 20}, got {new_total}"
        print(f"✓ total_sales correctly updated: {initial_total} → {new_total}")
    
    def test_total_sales_adjusted_on_update(self, auth_token, test_product):
        """Test that total_sales adjusts when updating a sale quantity"""
        # Create a sale with known quantity
        sale_data = {
            "product_id": test_product["id"],
            "quantity": 10,
            "date": "2025-11-01"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/products/{test_product['id']}/sales",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        sale_id = create_response.json()["sale_id"]
        
        # Get total after create
        product_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        total_after_create = product_response.json().get("total_sales", 0)
        
        # Update quantity from 10 to 25 (difference of +15)
        update_data = {"quantity": 25}
        requests.put(
            f"{BASE_URL}/api/products/{test_product['id']}/sales/{sale_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        
        # Check total is adjusted
        product_response = requests.get(
            f"{BASE_URL}/api/products/{test_product['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        total_after_update = product_response.json().get("total_sales", 0)
        
        expected_total = total_after_create + 15  # 25 - 10 = +15
        assert total_after_update == expected_total, f"Expected {expected_total}, got {total_after_update}"
        print(f"✓ total_sales correctly adjusted after update: {total_after_create} → {total_after_update}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
