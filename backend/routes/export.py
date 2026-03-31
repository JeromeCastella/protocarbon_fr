"""
Routes pour l'export des données
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
import subprocess
import os
import tempfile

import sys
sys.path.append('/app/backend')

from config import (
    fiscal_years_collection,
    activities_collection,
    products_collection,
    emission_factors_collection,
    subcategories_collection,
    unit_conversions_collection,
    carbon_objectives_collection,
    companies_collection
)
from services.auth import get_current_user, require_admin

router = APIRouter(prefix="/export", tags=["Export"])


def serialize_for_export(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = [serialize_for_export(item) for item in value]
            elif isinstance(value, dict):
                result[key] = serialize_for_export(value)
            else:
                result[key] = value
        return result
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    return doc


@router.get("/full")
async def export_full_backup(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Export complete backup of all data for the current user.
    If fiscal_year_id is provided, activities will be filtered to that fiscal year.
    """
    tenant_id = current_user["id"]
    
    # Get company info
    company = companies_collection.find_one({"tenant_id": tenant_id})
    
    # Get fiscal years
    fiscal_years = list(fiscal_years_collection.find({"tenant_id": tenant_id}))
    
    # Validate fiscal_year_id if provided
    target_fiscal_year = None
    if fiscal_year_id:
        target_fiscal_year = fiscal_years_collection.find_one({
            "_id": ObjectId(fiscal_year_id),
            "tenant_id": tenant_id
        })
        if not target_fiscal_year:
            raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Get activities (filtered by fiscal year if specified)
    activities_query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        activities_query["fiscal_year_id"] = fiscal_year_id
    activities = list(activities_collection.find(activities_query))
    
    # Get products
    products = list(products_collection.find({"tenant_id": tenant_id}))
    
    # Get emission factors (global, no tenant filter)
    emission_factors = list(emission_factors_collection.find({}))
    
    # Get subcategories (global)
    subcategories = list(subcategories_collection.find({}))
    
    # Get unit conversions (global)
    unit_conversions = list(unit_conversions_collection.find({}))
    
    # Get carbon objectives
    objectives = list(carbon_objectives_collection.find({"tenant_id": tenant_id}))
    
    # Build export object
    export_data = {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": current_user.get("email"),
            "tenant_id": tenant_id,
            "fiscal_year_filter": fiscal_year_id,
            "fiscal_year_name": serialize_for_export(target_fiscal_year).get("name") if target_fiscal_year else "all",
            "version": "1.0"
        },
        "company": serialize_for_export(company),
        "fiscal_years": [serialize_for_export(fy) for fy in fiscal_years],
        "activities": [serialize_for_export(a) for a in activities],
        "products": [serialize_for_export(p) for p in products],
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors],
        "subcategories": [serialize_for_export(sc) for sc in subcategories],
        "unit_conversions": [serialize_for_export(uc) for uc in unit_conversions],
        "carbon_objectives": [serialize_for_export(obj) for obj in objectives],
        "statistics": {
            "total_activities": len(activities),
            "total_products": len(products),
            "total_emission_factors": len(emission_factors),
            "total_fiscal_years": len(fiscal_years),
            "total_objectives": len(objectives)
        }
    }
    
    return JSONResponse(content=export_data)


@router.get("/activities")
async def export_activities(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export only activities data"""
    tenant_id = current_user["id"]
    
    query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    
    activities = list(activities_collection.find(query))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "activities",
            "fiscal_year_filter": fiscal_year_id,
            "count": len(activities)
        },
        "activities": [serialize_for_export(a) for a in activities]
    }


@router.get("/products")
async def export_products(current_user: dict = Depends(get_current_user)):
    """Export only products data"""
    tenant_id = current_user["id"]
    
    products = list(products_collection.find({"tenant_id": tenant_id}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "products",
            "count": len(products)
        },
        "products": [serialize_for_export(p) for p in products]
    }


@router.get("/emission-factors")
async def export_emission_factors(current_user: dict = Depends(get_current_user)):
    """Export emission factors (global data)"""
    emission_factors = list(emission_factors_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "emission_factors",
            "count": len(emission_factors)
        },
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors]
    }


@router.get("/subcategories")
async def export_subcategories(current_user: dict = Depends(get_current_user)):
    """Export subcategories (global data)"""
    subcategories = list(subcategories_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "subcategories",
            "count": len(subcategories)
        },
        "subcategories": [serialize_for_export(sc) for sc in subcategories]
    }


@router.get("/reference-data")
async def export_reference_data(current_user: dict = Depends(get_current_user)):
    """Export all reference data (emission factors + subcategories + unit conversions)"""
    emission_factors = list(emission_factors_collection.find({}))
    subcategories = list(subcategories_collection.find({}))
    unit_conversions = list(unit_conversions_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "reference_data",
            "version": "1.0"
        },
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors],
        "subcategories": [serialize_for_export(sc) for sc in subcategories],
        "unit_conversions": [serialize_for_export(uc) for uc in unit_conversions],
        "statistics": {
            "total_emission_factors": len(emission_factors),
            "total_subcategories": len(subcategories),
            "total_unit_conversions": len(unit_conversions)
        }
    }



@router.get("/mongodump")
async def export_mongodump(current_user: dict = Depends(require_admin)):
    """
    Export complet de la base MongoDB au format mongodump archive.
    Lecture seule — aucun risque pour la base de données.
    Réservé aux administrateurs.
    """
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "carbon_tracker")

    # Créer un fichier temporaire pour l'archive
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".archive")
    tmp.close()
    archive_path = tmp.name

    try:
        result = subprocess.run(
            ["mongodump", f"--uri={mongo_url}", f"--db={db_name}", f"--archive={archive_path}"],
            capture_output=True, text=True, timeout=120
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"mongodump failed: {result.stderr}")

        file_size = os.path.getsize(archive_path)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
        filename = f"{db_name}_{timestamp}.archive"

        def iterfile():
            try:
                with open(archive_path, "rb") as f:
                    while chunk := f.read(1024 * 1024):  # 1MB chunks
                        yield chunk
            finally:
                # Nettoyage du fichier temporaire après envoi
                if os.path.exists(archive_path):
                    os.unlink(archive_path)

        return StreamingResponse(
            iterfile(),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(file_size),
                "X-Export-DB": db_name,
                "X-Export-Timestamp": timestamp,
            }
        )
    except subprocess.TimeoutExpired:
        if os.path.exists(archive_path):
            os.unlink(archive_path)
        raise HTTPException(status_code=504, detail="mongodump timed out (>120s)")
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(archive_path):
            os.unlink(archive_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mongodump/info")
async def mongodump_info(current_user: dict = Depends(require_admin)):
    """
    Retourne les métadonnées de la base sans lancer le dump.
    Utile pour afficher la taille estimée et les collections avant export.
    """
    from config import db

    collections = db.list_collection_names()
    stats = {}
    total_docs = 0
    for col_name in collections:
        count = db[col_name].count_documents({})
        stats[col_name] = count
        total_docs += count

    # Taille estimée via la commande dbStats
    db_stats = db.command("dbStats")
    data_size = db_stats.get("dataSize", 0)
    storage_size = db_stats.get("storageSize", 0)

    return {
        "db_name": os.environ.get("DB_NAME", "carbon_tracker"),
        "collections": stats,
        "total_documents": total_docs,
        "total_collections": len(collections),
        "data_size_bytes": data_size,
        "data_size_mb": round(data_size / (1024 * 1024), 2),
        "storage_size_mb": round(storage_size / (1024 * 1024), 2),
    }
