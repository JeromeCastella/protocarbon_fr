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
    """Convert MongoDB document to JSON-serializable format."""
    if doc is None:
        return None
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    if isinstance(doc, list):
        return [serialize_for_export(item) for item in doc]
    if isinstance(doc, dict):
        return {
            ("id" if k == "_id" else k): serialize_for_export(v)
            for k, v in doc.items()
        }
    return doc


def _collect_export_data(tenant_id: str, fiscal_year_id: str = None) -> dict:
    """Collect all tenant data for export, optionally filtered by fiscal year."""
    company = companies_collection.find_one({"tenant_id": tenant_id})
    fiscal_years = list(fiscal_years_collection.find({"tenant_id": tenant_id}))

    target_fiscal_year = None
    if fiscal_year_id:
        target_fiscal_year = fiscal_years_collection.find_one({
            "_id": ObjectId(fiscal_year_id), "tenant_id": tenant_id
        })
        if not target_fiscal_year:
            raise HTTPException(status_code=404, detail="Fiscal year not found")

    activities_query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        activities_query["fiscal_year_id"] = fiscal_year_id

    return {
        "company": company,
        "fiscal_years": fiscal_years,
        "target_fiscal_year": target_fiscal_year,
        "activities": list(activities_collection.find(activities_query)),
        "products": list(products_collection.find({"tenant_id": tenant_id})),
        "emission_factors": list(emission_factors_collection.find({})),
        "subcategories": list(subcategories_collection.find({})),
        "unit_conversions": list(unit_conversions_collection.find({})),
        "objectives": list(carbon_objectives_collection.find({"tenant_id": tenant_id})),
    }


@router.get("/full")
async def export_full_backup(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export complete backup of all data for the current user."""
    data = _collect_export_data(current_user["id"], fiscal_year_id)

    export_data = {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": current_user.get("email"),
            "tenant_id": current_user["id"],
            "fiscal_year_filter": fiscal_year_id,
            "fiscal_year_name": serialize_for_export(data["target_fiscal_year"]).get("name") if data["target_fiscal_year"] else "all",
            "version": "1.0",
        },
        "company": serialize_for_export(data["company"]),
        "fiscal_years": [serialize_for_export(fy) for fy in data["fiscal_years"]],
        "activities": [serialize_for_export(a) for a in data["activities"]],
        "products": [serialize_for_export(p) for p in data["products"]],
        "emission_factors": [serialize_for_export(ef) for ef in data["emission_factors"]],
        "subcategories": [serialize_for_export(sc) for sc in data["subcategories"]],
        "unit_conversions": [serialize_for_export(uc) for uc in data["unit_conversions"]],
        "carbon_objectives": [serialize_for_export(obj) for obj in data["objectives"]],
        "statistics": {
            "total_activities": len(data["activities"]),
            "total_products": len(data["products"]),
            "total_emission_factors": len(data["emission_factors"]),
            "total_fiscal_years": len(data["fiscal_years"]),
            "total_objectives": len(data["objectives"]),
        },
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
    Export complet de la base MongoDB.
    Tente d'abord mongodump (format .archive natif).
    Si mongodump n'est pas disponible, génère un export BSON en .zip
    compatible avec mongorestore --dir.
    Lecture seule — aucun risque pour la base de données.
    Réservé aux administrateurs.
    """
    import shutil

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "carbon_tracker")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")

    mongodump_available = shutil.which("mongodump") is not None

    if mongodump_available:
        try:
            return await _export_via_mongodump(mongo_url, db_name, timestamp)
        except FileNotFoundError:
            pass  # Binary in PATH but not executable — fall through to Python fallback
    return await _export_via_python(db_name, timestamp)


async def _export_via_mongodump(mongo_url: str, db_name: str, timestamp: str):
    """Export natif via le binaire mongodump → fichier .archive"""
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
        filename = f"{db_name}_{timestamp}.archive"

        def iterfile():
            try:
                with open(archive_path, "rb") as f:
                    while chunk := f.read(1024 * 1024):
                        yield chunk
            finally:
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
                "X-Export-Method": "mongodump",
            }
        )
    except subprocess.TimeoutExpired:
        if os.path.exists(archive_path):
            os.unlink(archive_path)
        raise HTTPException(status_code=504, detail="mongodump timed out (>120s)")
    except FileNotFoundError:
    # mongodump binary referenced in PATH but not actually executable — fallback to Python
        if os.path.exists(archive_path):
            os.unlink(archive_path)
        raise
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(archive_path):
            os.unlink(archive_path)
        raise HTTPException(status_code=500, detail=str(e))


def _write_collection_to_zip(zf, db_name: str, col_name: str, collection) -> None:
    """Write a single collection's BSON data and metadata JSON to a zip archive."""
    import bson
    import json

    bson_data = b""
    for doc in collection.find():
        bson_data += bson.BSON.encode(doc)
    zf.writestr(f"dump/{db_name}/{col_name}.bson", bson_data)

    indexes = []
    for idx in collection.list_indexes():
        idx_doc = dict(idx)
        idx_doc["key"] = {k: v for k, v in idx_doc.get("key", {}).items()}
        indexes.append(idx_doc)

    metadata = {"options": {}, "indexes": indexes, "type": "collection"}
    zf.writestr(f"dump/{db_name}/{col_name}.metadata.json", json.dumps(metadata, default=str))


async def _export_via_python(db_name: str, timestamp: str):
    """
    Fallback Python pur : exporte chaque collection en BSON + metadata JSON
    dans un zip compatible mongorestore --dir.
    """
    import zipfile
    from config import db

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tmp.close()
    zip_path = tmp.name

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for col_name in db.list_collection_names():
                _write_collection_to_zip(zf, db_name, col_name, db[col_name])

        file_size = os.path.getsize(zip_path)
        filename = f"{db_name}_{timestamp}_bson.zip"

        def iterfile():
            try:
                with open(zip_path, "rb") as f:
                    while chunk := f.read(1024 * 1024):
                        yield chunk
            finally:
                if os.path.exists(zip_path):
                    os.unlink(zip_path)

        return StreamingResponse(
            iterfile(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(file_size),
                "X-Export-DB": db_name,
                "X-Export-Timestamp": timestamp,
                "X-Export-Method": "python-bson",
            }
        )
    except Exception as e:
        if os.path.exists(zip_path):
            os.unlink(zip_path)
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
