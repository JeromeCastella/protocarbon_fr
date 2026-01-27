"""
Routes pour la gestion des produits
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List

import sys
sys.path.append('/app/backend')

from config import (
    products_collection,
    activities_collection,
    emission_factors_collection
)
from models import ProductCreate, ProductCreateEnhanced, ProductSale
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
    """Record a product sale and create corresponding activities"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    emissions_per_unit = product.get("total_emissions_per_unit", 0)
    total_emissions = emissions_per_unit * sale.quantity
    
    # Create activity for usage phase
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
            "date": sale.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source": "product_sale",
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        activities_collection.insert_one(usage_activity)
    
    # Create activity for end of life
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
            "date": sale.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source": "product_sale",
            "product_id": product_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        activities_collection.insert_one(disposal_activity)
    
    # Update product sales count
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$inc": {"total_sales": sale.quantity},
            "$push": {
                "sales_history": {
                    "quantity": sale.quantity,
                    "date": sale.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "total_emissions": total_emissions,
                    "recorded_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {
        "message": "Sale recorded successfully",
        "quantity": sale.quantity,
        "total_emissions": total_emissions,
        "usage_emissions": usage_emissions,
        "disposal_emissions": disposal_emissions
    }
