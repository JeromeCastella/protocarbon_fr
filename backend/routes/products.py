"""
Routes pour la gestion des produits
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List
import uuid

import sys
sys.path.append('/app/backend')

from config import (
    products_collection,
    activities_collection,
    emission_factors_collection
)
from models import ProductCreate, ProductCreateEnhanced, ProductSale, ProductSaleUpdate
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
async def get_products(current_user: dict = Depends(get_current_user)):
    """Get all products for the current user"""
    products = list(products_collection.find({"tenant_id": current_user["id"]}))
    return [serialize_doc(p) for p in products]


@router.post("")
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    """Create a simple product"""
    product_doc = product.model_dump()
    product_doc["tenant_id"] = current_user["id"]
    product_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate total emissions per unit
    total_emissions = (
        product.manufacturing_emissions + 
        product.usage_emissions + 
        product.disposal_emissions
    )
    product_doc["total_emissions_per_unit"] = total_emissions
    
    result = products_collection.insert_one(product_doc)
    product_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(product_doc)


@router.post("/enhanced")
async def create_product_enhanced(
    product: ProductCreateEnhanced, 
    current_user: dict = Depends(get_current_user)
):
    """Create a product with detailed lifecycle analysis"""
    product_doc = product.model_dump()
    product_doc["tenant_id"] = current_user["id"]
    product_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate emissions for each lifecycle phase
    manufacturing_emissions = 0
    usage_emissions = 0
    disposal_emissions = 0
    
    # Materials emissions (manufacturing)
    for material in product.materials:
        if material.emission_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(material.emission_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    manufacturing_emissions += material.weight_kg * impact.get("value", 0)
    
    # Transformation emissions (manufacturing)
    if product.transformation:
        trans = product.transformation
        if trans.electricity_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(trans.electricity_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    manufacturing_emissions += trans.electricity_kwh * impact.get("value", 0)
        if trans.fuel_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(trans.fuel_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    manufacturing_emissions += trans.fuel_kwh * impact.get("value", 0)
    
    # Usage phase emissions
    if product.usage:
        usage = product.usage
        cycles_lifetime = usage.cycles_per_year * product.lifespan_years
        
        if usage.electricity_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(usage.electricity_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    usage_emissions += usage.electricity_kwh_per_cycle * cycles_lifetime * impact.get("value", 0)
    
    # End of life emissions
    for material in product.materials:
        if material.treatment_emission_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(material.treatment_emission_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    disposal_emissions += material.weight_kg * impact.get("value", 0)
    
    product_doc["manufacturing_emissions"] = manufacturing_emissions
    product_doc["usage_emissions"] = usage_emissions
    product_doc["disposal_emissions"] = disposal_emissions
    product_doc["total_emissions_per_unit"] = manufacturing_emissions + usage_emissions + disposal_emissions
    
    result = products_collection.insert_one(product_doc)
    product_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(product_doc)


@router.get("/{product_id}")
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific product"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return serialize_doc(product)


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    product: ProductCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a product"""
    existing = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate total emissions
    update_data["total_emissions_per_unit"] = (
        product.manufacturing_emissions + 
        product.usage_emissions + 
        product.disposal_emissions
    )
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    updated = products_collection.find_one({"_id": ObjectId(product_id)})
    return serialize_doc(updated)


@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a product"""
    result = products_collection.delete_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}


@router.post("/{product_id}/sales")
async def record_product_sale(
    product_id: str,
    sale: ProductSale,
    current_user: dict = Depends(get_current_user)
):
    """
    Record a product sale and create corresponding linked activities.
    All activities created from this sale are linked via a unique sale_id.
    """
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate unique sale_id to link all activities from this sale
    sale_id = str(uuid.uuid4())
    sale_date = sale.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    emissions_per_unit = product.get("total_emissions_per_unit", 0)
    total_emissions = emissions_per_unit * sale.quantity
    
    created_activity_ids = []
    
    # Create activity for transformation/manufacturing phase (Scope 3.10 - Transformation des produits vendus)
    manufacturing_emissions = product.get("manufacturing_emissions", 0) * sale.quantity
    if manufacturing_emissions > 0:
        manufacturing_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "category_id": "transformation_produits",
            "subcategory_id": "transformation_produits",
            "scope": "scope3_aval",
            "name": f"Transformation - {product.get('name', 'Produit')} (x{sale.quantity})",
            "quantity": sale.quantity,
            "unit": product.get("unit", "unit"),
            "emissions": manufacturing_emissions,
            "calculated_emissions": manufacturing_emissions,
            "date": sale_date,
            "source": "product_sale",
            "product_id": product_id,
            "sale_id": sale_id,
            "sale_phase": "transformation",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(manufacturing_activity)
        created_activity_ids.append(str(result.inserted_id))
    
    # Create activity for usage phase (Scope 3.11 - Utilisation des produits vendus)
    usage_emissions = product.get("usage_emissions", 0) * sale.quantity
    if usage_emissions > 0:
        usage_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "category_id": "utilisation_produits",
            "subcategory_id": "utilisation_produits",
            "scope": "scope3_aval",
            "name": f"Utilisation - {product.get('name', 'Produit')} (x{sale.quantity})",
            "quantity": sale.quantity,
            "unit": product.get("unit", "unit"),
            "emissions": usage_emissions,
            "calculated_emissions": usage_emissions,
            "date": sale_date,
            "source": "product_sale",
            "product_id": product_id,
            "sale_id": sale_id,
            "sale_phase": "usage",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(usage_activity)
        created_activity_ids.append(str(result.inserted_id))
    
    # Create activity for end of life (Scope 3.12 - Fin de vie des produits vendus)
    disposal_emissions = product.get("disposal_emissions", 0) * sale.quantity
    if disposal_emissions > 0:
        disposal_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "category_id": "fin_vie_produits",
            "subcategory_id": "fin_vie_produits",
            "scope": "scope3_aval",
            "name": f"Fin de vie - {product.get('name', 'Produit')} (x{sale.quantity})",
            "quantity": sale.quantity,
            "unit": product.get("unit", "unit"),
            "emissions": disposal_emissions,
            "calculated_emissions": disposal_emissions,
            "date": sale_date,
            "source": "product_sale",
            "product_id": product_id,
            "sale_id": sale_id,
            "sale_phase": "disposal",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(disposal_activity)
        created_activity_ids.append(str(result.inserted_id))
    
    # Update product sales count and history with sale_id
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$inc": {"total_sales": sale.quantity},
            "$push": {
                "sales_history": {
                    "sale_id": sale_id,
                    "quantity": sale.quantity,
                    "date": sale_date,
                    "total_emissions": total_emissions,
                    "manufacturing_emissions": manufacturing_emissions,
                    "usage_emissions": usage_emissions,
                    "disposal_emissions": disposal_emissions,
                    "recorded_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {
        "message": "Sale recorded successfully",
        "sale_id": sale_id,
        "quantity": sale.quantity,
        "total_emissions": total_emissions,
        "manufacturing_emissions": manufacturing_emissions,
        "usage_emissions": usage_emissions,
        "disposal_emissions": disposal_emissions,
        "activity_ids": created_activity_ids
    }


@router.get("/{product_id}/sales")
async def get_product_sales(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all sales for a specific product"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sales_history = product.get("sales_history", [])
    
    # Enrich each sale with its linked activities
    enriched_sales = []
    for sale in sales_history:
        sale_id = sale.get("sale_id")
        if sale_id:
            # Get linked activities
            linked_activities = list(activities_collection.find(
                {"sale_id": sale_id},
                {"_id": 0}
            ))
            sale["linked_activities_count"] = len(linked_activities)
        enriched_sales.append(sale)
    
    return {
        "product_id": product_id,
        "product_name": product.get("name"),
        "total_sales": product.get("total_sales", 0),
        "sales": enriched_sales
    }


@router.get("/{product_id}/sales/{sale_id}")
async def get_sale_details(
    product_id: str,
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific sale including all linked activities"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find the sale in history
    sale_info = None
    for sale in product.get("sales_history", []):
        if sale.get("sale_id") == sale_id:
            sale_info = sale
            break
    
    if not sale_info:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Get all linked activities
    linked_activities = list(activities_collection.find(
        {"sale_id": sale_id, "tenant_id": current_user["id"]}
    ))
    
    return {
        "sale_id": sale_id,
        "product_id": product_id,
        "product_name": product.get("name"),
        "sale_info": sale_info,
        "linked_activities": [serialize_doc(a) for a in linked_activities]
    }


@router.put("/{product_id}/sales/{sale_id}")
async def update_product_sale(
    product_id: str,
    sale_id: str,
    sale_update: ProductSaleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a product sale and all its linked activities.
    This recalculates emissions based on the new quantity.
    """
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find the original sale in history
    original_sale = None
    sales_history = product.get("sales_history", [])
    for idx, sale in enumerate(sales_history):
        if sale.get("sale_id") == sale_id:
            original_sale = sale
            original_sale_idx = idx
            break
    
    if not original_sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    old_quantity = original_sale.get("quantity", 0)
    new_quantity = sale_update.quantity
    new_date = sale_update.date or original_sale.get("date")
    
    # Recalculate emissions per phase
    new_manufacturing_emissions = product.get("manufacturing_emissions", 0) * new_quantity
    new_usage_emissions = product.get("usage_emissions", 0) * new_quantity
    new_disposal_emissions = product.get("disposal_emissions", 0) * new_quantity
    new_total_emissions = new_manufacturing_emissions + new_usage_emissions + new_disposal_emissions
    
    # Update all linked activities
    activities_collection.update_many(
        {"sale_id": sale_id, "sale_phase": "transformation"},
        {"$set": {
            "quantity": new_quantity,
            "name": f"Transformation - {product.get('name', 'Produit')} (x{new_quantity})",
            "emissions": new_manufacturing_emissions,
            "calculated_emissions": new_manufacturing_emissions,
            "date": new_date,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    activities_collection.update_many(
        {"sale_id": sale_id, "sale_phase": "usage"},
        {"$set": {
            "quantity": new_quantity,
            "name": f"Utilisation - {product.get('name', 'Produit')} (x{new_quantity})",
            "emissions": new_usage_emissions,
            "calculated_emissions": new_usage_emissions,
            "date": new_date,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    activities_collection.update_many(
        {"sale_id": sale_id, "sale_phase": "disposal"},
        {"$set": {
            "quantity": new_quantity,
            "name": f"Fin de vie - {product.get('name', 'Produit')} (x{new_quantity})",
            "emissions": new_disposal_emissions,
            "calculated_emissions": new_disposal_emissions,
            "date": new_date,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update sales history in product document
    sales_history[original_sale_idx] = {
        "sale_id": sale_id,
        "quantity": new_quantity,
        "date": new_date,
        "total_emissions": new_total_emissions,
        "manufacturing_emissions": new_manufacturing_emissions,
        "usage_emissions": new_usage_emissions,
        "disposal_emissions": new_disposal_emissions,
        "recorded_at": original_sale.get("recorded_at"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update total_sales count
    quantity_diff = new_quantity - old_quantity
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$set": {"sales_history": sales_history},
            "$inc": {"total_sales": quantity_diff}
        }
    )
    
    return {
        "message": "Sale updated successfully",
        "sale_id": sale_id,
        "old_quantity": old_quantity,
        "new_quantity": new_quantity,
        "total_emissions": new_total_emissions,
        "manufacturing_emissions": new_manufacturing_emissions,
        "usage_emissions": new_usage_emissions,
        "disposal_emissions": new_disposal_emissions
    }


@router.delete("/{product_id}/sales/{sale_id}")
async def delete_product_sale(
    product_id: str,
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a product sale and all its linked activities.
    This removes all activities created from this sale.
    """
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find the sale in history
    sale_to_delete = None
    sales_history = product.get("sales_history", [])
    new_sales_history = []
    
    for sale in sales_history:
        if sale.get("sale_id") == sale_id:
            sale_to_delete = sale
        else:
            new_sales_history.append(sale)
    
    if not sale_to_delete:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    deleted_quantity = sale_to_delete.get("quantity", 0)
    
    # Delete all linked activities
    delete_result = activities_collection.delete_many({
        "sale_id": sale_id,
        "tenant_id": current_user["id"]
    })
    
    # Update product document
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$set": {"sales_history": new_sales_history},
            "$inc": {"total_sales": -deleted_quantity}
        }
    )
    
    return {
        "message": "Sale deleted successfully",
        "sale_id": sale_id,
        "deleted_quantity": deleted_quantity,
        "deleted_activities_count": delete_result.deleted_count
    }
