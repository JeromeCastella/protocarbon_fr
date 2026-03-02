"""
Routes pour les données de référence (catégories, sous-catégories, conversions)
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import (
    categories_collection,
    subcategories_collection,
    unit_conversions_collection,
    emission_factors_collection
)
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(tags=["Reference Data"])


def get_default_categories():
    """Get default GHG categories"""
    return [
        {"code": "scope1", "name_fr": "Scope 1 - Émissions directes", "name_de": "Scope 1 - Direkte Emissionen", 
         "subcategories": ["combustion_stationnaire", "combustion_mobile", "emissions_process", "emissions_fugitives"]},
        {"code": "scope2", "name_fr": "Scope 2 - Énergie indirecte", "name_de": "Scope 2 - Indirekte Energie",
         "subcategories": ["electricite", "chaleur_vapeur"]},
        {"code": "scope3_amont", "name_fr": "Scope 3 Amont", "name_de": "Scope 3 Upstream",
         "subcategories": ["achats_biens_services", "biens_immobilisations", "energie_amont", "transport_amont", 
                          "dechets", "deplacements_professionnels", "deplacements_domicile_travail", "actifs_loues_amont"]},
        {"code": "scope3_aval", "name_fr": "Scope 3 Aval", "name_de": "Scope 3 Downstream",
         "subcategories": ["transport_aval", "transformation_produits", "utilisation_produits", "fin_vie_produits",
                          "actifs_loues_aval", "franchises", "investissements"]}
    ]


@router.get("/categories")
async def get_categories(response: Response):
    """Get all emission categories - cached for 1 hour"""
    response.headers["Cache-Control"] = "public, max-age=3600"
    
    categories = list(categories_collection.find({}))
    if not categories:
        default_categories = get_default_categories()
        categories_collection.insert_many(default_categories)
        categories = list(categories_collection.find({}))
    
    return [serialize_doc(c) for c in categories]


@router.get("/subcategories")
async def get_subcategories(response: Response, category: Optional[str] = None):
    """Get subcategories - no cache to ensure fresh data"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    query = {}
    if category:
        query["categories"] = category
    
    subcategories = list(subcategories_collection.find(query).sort("order", 1))
    return [serialize_doc(s) for s in subcategories]


@router.get("/unit-conversions")
async def get_unit_conversions(
    response: Response, 
    from_unit: Optional[str] = None, 
    to_unit: Optional[str] = None
):
    """Get unit conversions - cached for 1 hour"""
    response.headers["Cache-Control"] = "public, max-age=3600"
    
    query = {}
    if from_unit:
        query["from_unit"] = from_unit
    if to_unit:
        query["to_unit"] = to_unit
    
    conversions = list(unit_conversions_collection.find(query))
    return [serialize_doc(c) for c in conversions]


@router.get("/emission-factors")
async def get_emission_factors(
    category: Optional[str] = None,
    scope: Optional[str] = None,
    subcategory: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get emission factors with optional filters"""
    query = {"deleted_at": None}
    
    if category:
        query["category"] = category
    if scope:
        query["scope"] = scope
    if subcategory:
        query["subcategory"] = subcategory
    
    factors = list(emission_factors_collection.find(query).limit(2000))
    return [serialize_doc(f) for f in factors]


@router.get("/emission-factors/search")
async def search_emission_factors(
    q: Optional[str] = None,
    subcategory: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Search emission factors by name, subcategory, or category (dynamic lookup)"""
    query = {"deleted_at": None}
    
    if q:
        query["$or"] = [
            {"name_fr": {"$regex": q, "$options": "i"}},
            {"name_de": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]
    
    if subcategory:
        query["subcategory"] = subcategory
    elif category:
        # Dynamic lookup: get subcategories for this category
        subcats = list(subcategories_collection.find({"categories": category}))
        subcat_codes = [s.get("code") for s in subcats]
        if subcat_codes:
            if "$or" in query:
                # Combine with existing $or
                existing_or = query.pop("$or")
                query["$and"] = [
                    {"$or": existing_or},
                    {"$or": [
                        {"subcategory": {"$in": subcat_codes}},
                        {"category": category}
                    ]}
                ]
            else:
                query["$or"] = [
                    {"subcategory": {"$in": subcat_codes}},
                    {"category": category}
                ]
    
    factors = list(emission_factors_collection.find(query).limit(100))
    return [serialize_doc(f) for f in factors]


@router.get("/emission-factors/by-category/{category}")
async def get_factors_by_category(
    category: str,
    current_user: dict = Depends(get_current_user)
):
    """Get emission factors by category - looks up subcategories dynamically"""
    # First, get all subcategories that belong to this category
    subcats = list(subcategories_collection.find({"categories": category}))
    subcat_codes = [s.get("code") for s in subcats]
    
    # Then get all factors that match any of these subcategories
    query = {
        "deleted_at": None,
        "$or": [
            {"subcategory": {"$in": subcat_codes}},
            {"category": category}
        ]
    }
    
    factors = list(emission_factors_collection.find(query).limit(1000))
    return [serialize_doc(f) for f in factors]


@router.get("/emission-factors/product-materials")
async def get_product_materials(current_user: dict = Depends(get_current_user)):
    """Get emission factors suitable for product material composition (weight-based)"""
    material_subcategories = [
        'beton', 'bois_et_produits_en_bois', 'matieres_plastique', 'produits_en_metal',
        'colles_et_masses_de_jointoiement', 'enduits_et_revetements', 'produits_disolation_thermique',
        'pierres_de_taille', 'mortiers_et_enduits', 'produits_chimiques_et_combustibles',
        'equipements_et_technologies', 'construction', 'produits', 'autres_materiaux_massifs',
        'building_and_construction_materials', 'metal_materials', 'glass_and_windows',
        'flooring_materials', 'insulation_and_waterproofing', 'furniture_and_fixtures',
        'fenetre_et_facades_verre_metal', 'installations_de_chauffage', 'installations_electriques',
        'installations_sanitaires', 'portes', 'tuyaux', 'ventilation', 'vetements_et_textiles',
        'revetements_de_sol', 'les_detancheite_et_feuilles_de_protection'
    ]
    factors = list(emission_factors_collection.find({
        "deleted_at": None,
        "subcategory": {"$in": material_subcategories},
        "input_units": {"$in": ["kg", "t", "g"]}
    }).limit(500))
    return [serialize_doc(f) for f in factors]



@router.get("/emission-factors/by-tags")
async def get_factors_by_tags(
    tags: str,
    current_user: dict = Depends(get_current_user)
):
    """Get emission factors by tags (comma-separated)"""
    tag_list = [t.strip() for t in tags.split(",")]
    
    factors = list(emission_factors_collection.find({
        "deleted_at": None,
        "tags": {"$in": tag_list}
    }).limit(500))
    return [serialize_doc(f) for f in factors]


@router.get("/emission-factors/valid-for-year")
async def get_factors_valid_for_year(
    year: int,
    subcategory: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get emission factors valid for a specific year"""
    query = {
        "deleted_at": None,
        "valid_from_year": {"$lte": year},
        "$or": [
            {"valid_to_year": {"$gte": year}},
            {"valid_to_year": None}
        ]
    }
    
    if subcategory:
        query["subcategory"] = subcategory
    
    factors = list(emission_factors_collection.find(query).limit(2000))
    return [serialize_doc(f) for f in factors]



# IMPORTANT: This route must be placed AFTER all other /emission-factors/* routes
# because it uses a path parameter that would catch routes like /search, /by-category, etc.
@router.get("/emission-factors/{factor_id}")
async def get_emission_factor_by_id(
    factor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific emission factor by its ID"""
    try:
        factor = emission_factors_collection.find_one({"_id": ObjectId(factor_id)})
        if not factor:
            raise HTTPException(status_code=404, detail="Emission factor not found")
        return serialize_doc(factor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid factor ID: {str(e)}")