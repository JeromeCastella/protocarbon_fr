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
    emission_factors_collection,
    fiscal_years_collection
)
from models import ProductCreate, ProductCreateEnhanced, ProductSale, ProductSaleUpdate, ProductEmissionProfileCreate, ProductEmissionProfileUpdate
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
async def get_products(
    include_archived: bool = False,
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all products for the current user.
    If fiscal_year_id is provided, returns:
    - Emissions from the profile for that fiscal year (or defaults if no profile)
    - Sales filtered to that fiscal year only
    """
    query = {"tenant_id": current_user["id"]}
    if not include_archived:
        query["archived"] = {"$ne": True}
    
    products = list(products_collection.find(query))
    result = []
    
    # Get fiscal year date range if provided
    fy_start_date = None
    fy_end_date = None
    fy_name = None
    if fiscal_year_id:
        try:
            fiscal_year = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
            if fiscal_year:
                fy_start_date = fiscal_year.get("start_date")
                fy_end_date = fiscal_year.get("end_date")
                fy_name = fiscal_year.get("name")
        except:
            pass
    
    for product in products:
        product_data = serialize_doc(product)
        
        if fiscal_year_id:
            # Get the appropriate emission profile for this fiscal year
            profiles = product.get("emission_profiles", [])
            specific_profile = None
            for profile in profiles:
                if profile.get("fiscal_year_id") == fiscal_year_id:
                    specific_profile = profile
                    break
            
            # Use specific profile or defaults
            if specific_profile:
                product_data["active_manufacturing_emissions"] = specific_profile.get("manufacturing_emissions", 0)
                product_data["active_usage_emissions"] = specific_profile.get("usage_emissions", 0)
                product_data["active_disposal_emissions"] = specific_profile.get("disposal_emissions", 0)
                product_data["profile_source"] = "specific"
                product_data["profile_name"] = fy_name
            else:
                product_data["active_manufacturing_emissions"] = product.get("manufacturing_emissions", 0)
                product_data["active_usage_emissions"] = product.get("usage_emissions", 0)
                product_data["active_disposal_emissions"] = product.get("disposal_emissions", 0)
                product_data["profile_source"] = "default"
                product_data["profile_name"] = "Par défaut"
            
            # Calculate active total emissions per unit
            product_data["active_total_emissions_per_unit"] = (
                product_data["active_manufacturing_emissions"] +
                product_data["active_usage_emissions"] +
                product_data["active_disposal_emissions"]
            )
            
            # Filter sales by fiscal year
            sales_history = product.get("sales_history", [])
            filtered_sales = []
            if fy_start_date and fy_end_date:
                for sale in sales_history:
                    sale_date = sale.get("date", "")
                    if fy_start_date <= sale_date <= fy_end_date:
                        filtered_sales.append(sale)
            
            product_data["fiscal_year_sales"] = filtered_sales
            product_data["fiscal_year_sales_quantity"] = sum(s.get("quantity", 0) for s in filtered_sales)
            product_data["fiscal_year_sales_emissions"] = sum(s.get("total_emissions", 0) for s in filtered_sales)
        else:
            # No fiscal year filter - use defaults
            product_data["active_manufacturing_emissions"] = product.get("manufacturing_emissions", 0)
            product_data["active_usage_emissions"] = product.get("usage_emissions", 0)
            product_data["active_disposal_emissions"] = product.get("disposal_emissions", 0)
            product_data["active_total_emissions_per_unit"] = product.get("total_emissions_per_unit", 0)
            product_data["profile_source"] = "default"
        
        result.append(product_data)
    
    return result


@router.get("/archived")
async def get_archived_products(current_user: dict = Depends(get_current_user)):
    """Get all archived products for the current user"""
    products = list(products_collection.find({
        "tenant_id": current_user["id"],
        "archived": True
    }))
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
    """
    Delete or archive a product.
    - If the product has sales on any fiscal year → archive (soft delete)
    - If the product has no sales → delete permanently
    """
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if product has any sales (activities linked to it)
    sales_count = activities_collection.count_documents({
        "product_id": product_id,
        "tenant_id": current_user["id"]
    })
    
    # Also check sales_history in the product document
    sales_history = product.get("sales_history", [])
    
    if sales_count > 0 or len(sales_history) > 0:
        # Archive the product (soft delete)
        products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {
                "$set": {
                    "archived": True,
                    "archived_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {
            "message": "Product archived",
            "archived": True,
            "reason": f"Product has {sales_count} activities and {len(sales_history)} sales records"
        }
    else:
        # No sales, delete permanently
        products_collection.delete_one({"_id": ObjectId(product_id)})
        return {
            "message": "Product deleted",
            "archived": False
        }


@router.put("/{product_id}/restore")
async def restore_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Restore an archived product"""
    result = products_collection.update_one(
        {
            "_id": ObjectId(product_id),
            "tenant_id": current_user["id"],
            "archived": True
        },
        {
            "$set": {"archived": False},
            "$unset": {"archived_at": ""}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Archived product not found")
    
    return {"message": "Product restored"}


# ==================== EMISSION PROFILES ====================

@router.get("/{product_id}/emission-profiles")
async def get_product_emission_profiles(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all emission profiles for a product"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get default values
    default_profile = {
        "fiscal_year_id": "default",
        "fiscal_year_name": "Valeurs par défaut",
        "manufacturing_emissions": product.get("manufacturing_emissions", 0),
        "usage_emissions": product.get("usage_emissions", 0),
        "disposal_emissions": product.get("disposal_emissions", 0),
        "is_default": True
    }
    
    # Get custom profiles
    profiles = product.get("emission_profiles", [])
    
    # Enrich profiles with fiscal year names
    for profile in profiles:
        fy_id = profile.get("fiscal_year_id")
        if fy_id:
            fy = fiscal_years_collection.find_one({"_id": ObjectId(fy_id)})
            if fy:
                profile["fiscal_year_name"] = fy.get("name")
                profile["start_date"] = fy.get("start_date")
                profile["end_date"] = fy.get("end_date")
    
    return {
        "product_id": product_id,
        "product_name": product.get("name"),
        "default_profile": default_profile,
        "profiles": profiles
    }


@router.post("/{product_id}/emission-profiles")
async def create_product_emission_profile(
    product_id: str,
    profile: ProductEmissionProfileCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new emission profile for a specific fiscal year"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify fiscal year exists
    fiscal_year = fiscal_years_collection.find_one({"_id": ObjectId(profile.fiscal_year_id)})
    if not fiscal_year:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Check if profile already exists for this fiscal year
    existing_profiles = product.get("emission_profiles", [])
    for p in existing_profiles:
        if p.get("fiscal_year_id") == profile.fiscal_year_id:
            raise HTTPException(status_code=400, detail="Profile already exists for this fiscal year")
    
    # Create the new profile with values (use defaults if not provided)
    new_profile = {
        "fiscal_year_id": profile.fiscal_year_id,
        "fiscal_year_name": fiscal_year.get("name"),
        "manufacturing_emissions": profile.manufacturing_emissions if profile.manufacturing_emissions is not None else product.get("manufacturing_emissions", 0),
        "usage_emissions": profile.usage_emissions if profile.usage_emissions is not None else product.get("usage_emissions", 0),
        "disposal_emissions": profile.disposal_emissions if profile.disposal_emissions is not None else product.get("disposal_emissions", 0),
        "change_reason": profile.change_reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to product
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$push": {"emission_profiles": new_profile}}
    )
    
    return {
        "message": "Emission profile created",
        "profile": new_profile
    }


@router.put("/{product_id}/emission-profiles/{fiscal_year_id}")
async def update_product_emission_profile(
    product_id: str,
    fiscal_year_id: str,
    profile_update: ProductEmissionProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing emission profile"""
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # If updating default profile
    if fiscal_year_id == "default":
        update_fields = {}
        if profile_update.manufacturing_emissions is not None:
            update_fields["manufacturing_emissions"] = profile_update.manufacturing_emissions
        if profile_update.usage_emissions is not None:
            update_fields["usage_emissions"] = profile_update.usage_emissions
        if profile_update.disposal_emissions is not None:
            update_fields["disposal_emissions"] = profile_update.disposal_emissions
        
        if update_fields:
            # Recalculate total emissions per unit
            new_manufacturing = update_fields.get("manufacturing_emissions", product.get("manufacturing_emissions", 0))
            new_usage = update_fields.get("usage_emissions", product.get("usage_emissions", 0))
            new_disposal = update_fields.get("disposal_emissions", product.get("disposal_emissions", 0))
            update_fields["total_emissions_per_unit"] = new_manufacturing + new_usage + new_disposal
            
            products_collection.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": update_fields}
            )
        
        return {"message": "Default profile updated"}
    
    # Find and update the specific profile
    profiles = product.get("emission_profiles", [])
    profile_found = False
    
    for i, p in enumerate(profiles):
        if p.get("fiscal_year_id") == fiscal_year_id:
            if profile_update.manufacturing_emissions is not None:
                profiles[i]["manufacturing_emissions"] = profile_update.manufacturing_emissions
            if profile_update.usage_emissions is not None:
                profiles[i]["usage_emissions"] = profile_update.usage_emissions
            if profile_update.disposal_emissions is not None:
                profiles[i]["disposal_emissions"] = profile_update.disposal_emissions
            if profile_update.change_reason is not None:
                profiles[i]["change_reason"] = profile_update.change_reason
            profiles[i]["updated_at"] = datetime.now(timezone.utc).isoformat()
            profile_found = True
            break
    
    if not profile_found:
        raise HTTPException(status_code=404, detail="Profile not found for this fiscal year")
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"emission_profiles": profiles}}
    )
    
    return {"message": "Profile updated", "profile": profiles[i]}


@router.delete("/{product_id}/emission-profiles/{fiscal_year_id}")
async def delete_product_emission_profile(
    product_id: str,
    fiscal_year_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an emission profile (cannot delete default)"""
    if fiscal_year_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete default profile")
    
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    profiles = product.get("emission_profiles", [])
    new_profiles = [p for p in profiles if p.get("fiscal_year_id") != fiscal_year_id]
    
    if len(new_profiles) == len(profiles):
        raise HTTPException(status_code=404, detail="Profile not found")
    
    products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"emission_profiles": new_profiles}}
    )
    
    return {"message": "Profile deleted"}


def get_product_emissions_for_fiscal_year(product: dict, fiscal_year_id: str) -> dict:
    """
    Helper function to get the appropriate emission values for a given fiscal year.
    Returns the specific profile if it exists, otherwise returns the default values.
    """
    profiles = product.get("emission_profiles", [])
    
    # Look for a specific profile for this fiscal year
    for profile in profiles:
        if profile.get("fiscal_year_id") == fiscal_year_id:
            return {
                "manufacturing_emissions": profile.get("manufacturing_emissions", 0),
                "usage_emissions": profile.get("usage_emissions", 0),
                "disposal_emissions": profile.get("disposal_emissions", 0),
                "profile_source": "specific"
            }
    
    # Return default values
    return {
        "manufacturing_emissions": product.get("manufacturing_emissions", 0),
        "usage_emissions": product.get("usage_emissions", 0),
        "disposal_emissions": product.get("disposal_emissions", 0),
        "profile_source": "default"
    }


@router.post("/{product_id}/sales")
async def record_product_sale(
    product_id: str,
    sale: ProductSale,
    current_user: dict = Depends(get_current_user)
):
    """
    Record a product sale and create corresponding linked activities.
    All activities created from this sale are linked via a unique sale_id.
    Uses the emission profile specific to the fiscal year if available.
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
    
    # Find the appropriate fiscal year for this sale date
    fiscal_year_id = None
    company_id = current_user.get("company_id")
    if company_id:
        fiscal_year = fiscal_years_collection.find_one({
            "company_id": company_id,
            "start_date": {"$lte": sale_date},
            "end_date": {"$gte": sale_date}
        })
        if fiscal_year:
            fiscal_year_id = str(fiscal_year["_id"])
    
    # Get the appropriate emission profile for this fiscal year
    emission_profile = get_product_emissions_for_fiscal_year(product, fiscal_year_id)
    profile_manufacturing = emission_profile["manufacturing_emissions"]
    profile_usage = emission_profile["usage_emissions"]
    profile_disposal = emission_profile["disposal_emissions"]
    profile_source = emission_profile["profile_source"]
    
    emissions_per_unit = profile_manufacturing + profile_usage + profile_disposal
    total_emissions = emissions_per_unit * sale.quantity
    
    created_activity_ids = []
    
    # Create activity for transformation/manufacturing phase (Scope 3.10 - Transformation des produits vendus)
    manufacturing_emissions = profile_manufacturing * sale.quantity
    if manufacturing_emissions > 0:
        manufacturing_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "fiscal_year_id": fiscal_year_id,
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
            "profile_source": profile_source,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(manufacturing_activity)
        created_activity_ids.append(str(result.inserted_id))
    
    # Create activity for usage phase (Scope 3.11 - Utilisation des produits vendus)
    usage_emissions = profile_usage * sale.quantity
    if usage_emissions > 0:
        usage_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "fiscal_year_id": fiscal_year_id,
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
            "profile_source": profile_source,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = activities_collection.insert_one(usage_activity)
        created_activity_ids.append(str(result.inserted_id))
    
    # Create activity for end of life (Scope 3.12 - Fin de vie des produits vendus)
    disposal_emissions = profile_disposal * sale.quantity
    if disposal_emissions > 0:
        disposal_activity = {
            "tenant_id": current_user["id"],
            "company_id": current_user.get("company_id"),
            "fiscal_year_id": fiscal_year_id,
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
            "profile_source": profile_source,
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
                    "fiscal_year_id": fiscal_year_id,
                    "profile_source": profile_source,
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
        "profile_source": profile_source,
        "fiscal_year_id": fiscal_year_id,
        "activity_ids": created_activity_ids
    }


@router.get("/{product_id}/sales")
async def get_product_sales(
    product_id: str,
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get sales for a specific product.
    If fiscal_year_id is provided, only returns sales within that fiscal year's date range.
    """
    product = products_collection.find_one({
        "_id": ObjectId(product_id),
        "tenant_id": current_user["id"]
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sales_history = product.get("sales_history", [])
    
    # If fiscal year filter is provided, get its date range
    start_date = None
    end_date = None
    if fiscal_year_id:
        fiscal_year = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
        if fiscal_year:
            start_date = fiscal_year.get("start_date")
            end_date = fiscal_year.get("end_date")
    
    # Enrich and filter each sale
    enriched_sales = []
    for sale in sales_history:
        sale_date = sale.get("date", "")
        
        # Filter by fiscal year if provided
        if start_date and end_date:
            if not (start_date <= sale_date <= end_date):
                continue  # Skip sales outside the fiscal year
        
        sale_id = sale.get("sale_id")
        if sale_id:
            # Get linked activities
            linked_activities = list(activities_collection.find(
                {"sale_id": sale_id},
                {"_id": 0}
            ))
            sale["linked_activities_count"] = len(linked_activities)
        enriched_sales.append(sale)
    
    # Calculate total for filtered sales
    filtered_total = sum(s.get("quantity", 0) for s in enriched_sales)
    
    return {
        "product_id": product_id,
        "product_name": product.get("name"),
        "total_sales": product.get("total_sales", 0),
        "filtered_total": filtered_total,
        "fiscal_year_id": fiscal_year_id,
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
