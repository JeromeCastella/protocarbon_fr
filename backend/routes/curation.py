"""
Routes de curation des facteurs d'émission — atelier d'édition en masse
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId

import sys
sys.path.append('/app/backend')

from config import emission_factors_collection, subcategories_collection, categories_collection
from services.auth import require_admin
from services.curation_service import (
    build_factor_id_filters, build_curation_query,
    resolve_sort_field, resolve_location_names, resolve_single_location_name,
    enrich_stats_rows, build_suggest_prompt, call_llm_suggest, map_suggestions_to_factors,
)
from utils import serialize_doc, ef_id_filter

router = APIRouter(prefix="/curation", tags=["Curation"])

# ==================== MODELS ====================

class InlineEditPayload(BaseModel):
    name_simple_fr: Optional[str] = None
    name_simple_de: Optional[str] = None
    subcategory: Optional[str] = None
    is_public: Optional[bool] = None
    popularity_score: Optional[int] = None
    curation_status: Optional[str] = None
    default_unit: Optional[str] = None
    reporting_method: Optional[str] = None
    location_factor_id: Optional[str] = None

class BulkPayload(BaseModel):
    factor_ids: List[str]
    changes: InlineEditPayload

class SuggestTitlesPayload(BaseModel):
    factor_ids: List[str]

class BulkCopyOriginalsPayload(BaseModel):
    factor_ids: List[str]
    lang: str  # "fr" or "de"
    source_field: str = "original"  # "original" (name_fr/name_de) or "source_product_name"

class TranslatePreviewPayload(BaseModel):
    factor_ids: List[str]
    direction: str = "fr_to_de"  # "fr_to_de" or "de_to_fr"

class TranslateApplyPayload(BaseModel):
    translations: List[dict]  # [{"factor_id": "...", "value": "..."}]
    target_field: str  # "name_simple_de" or "name_simple_fr"

class BulkSetReportingMethodPayload(BaseModel):
    factor_ids: List[str]
    reporting_method: str  # "location" or "market"
    location_factor_id: Optional[str] = None  # required if market

# ==================== FILTER DEPENDENCY ====================

class CurationFilters:
    """Group all curation filter query parameters into a single dependency."""

    def __init__(
        self,
        page: int = Query(1),
        page_size: int = Query(50),
        search: str = Query(""),
        subcategory: str = Query(""),
        curation_status: str = Query(""),
        is_public: str = Query(""),
        has_simple_name: str = Query(""),
        default_unit: str = Query(""),
        reporting_method: str = Query(""),
        sort_by: str = Query("subcategory"),
        sort_order: str = Query("asc"),
    ):
        self.page = page
        self.page_size = page_size
        self.search = search
        self.subcategory = subcategory
        self.curation_status = curation_status
        self.is_public = is_public
        self.has_simple_name = has_simple_name
        self.default_unit = default_unit
        self.reporting_method = reporting_method
        self.sort_by = sort_by
        self.sort_order = sort_order

# ==================== FACTORS LIST (PAGINATED) ====================

CURATION_PROJECTION = {
    "id": 1, "name_fr": 1, "name_de": 1, "name_simple_fr": 1, "name_simple_de": 1,
    "subcategory": 1, "is_public": 1, "popularity_score": 1, "curation_status": 1,
    "default_unit": 1, "input_units": 1, "source": 1, "impacts": 1, "tags": 1,
    "reporting_method": 1, "location_factor_id": 1,
}

@router.get("/factors")
async def list_curation_factors(
    filters: CurationFilters = Depends(),
    current_user: dict = Depends(require_admin),
):
    query = build_curation_query(
        filters.search, filters.subcategory, filters.curation_status,
        filters.is_public, filters.has_simple_name, filters.default_unit,
        filters.reporting_method,
    )
    sort_dir = 1 if filters.sort_order == "asc" else -1
    sort_field = resolve_sort_field(filters.sort_by)

    total = emission_factors_collection.count_documents(query)
    skip = (filters.page - 1) * filters.page_size
    factors = list(
        emission_factors_collection.find(query)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(filters.page_size)
    )

    items = [serialize_doc(f) for f in factors]
    resolve_location_names(items, emission_factors_collection)

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": max(1, (total + filters.page_size - 1) // filters.page_size),
    }



# ==================== DISTINCT UNITS ====================

@router.get("/units")
async def list_units(current_user: dict = Depends(require_admin)):
    units = emission_factors_collection.distinct("default_unit", {"deleted_at": None})
    return sorted([u for u in units if u])

# ==================== INLINE EDIT (SINGLE FACTOR) ====================

@router.patch("/factors/{factor_id}")
async def inline_edit_factor(
    factor_id: str,
    payload: InlineEditPayload,
    current_user: dict = Depends(require_admin),
):
    # Use exclude_unset to allow explicitly sending null (e.g. clearing location_factor_id)
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(400, "Rien à mettre à jour")

    if "curation_status" in update_data and update_data["curation_status"] not in ("untreated", "reviewed", "flagged"):
        raise HTTPException(400, "curation_status invalide")

    if "reporting_method" in update_data and update_data["reporting_method"] not in ("location", "market"):
        raise HTTPException(400, "reporting_method invalide (location ou market)")

    # If switching to location, clear the linked factor
    if update_data.get("reporting_method") == "location":
        update_data["location_factor_id"] = None

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = emission_factors_collection.update_one(
        {**ef_id_filter(factor_id), "deleted_at": None},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Facteur non trouvé")

    from utils import find_emission_factor
    updated = find_emission_factor(emission_factors_collection, factor_id)
    doc = serialize_doc(updated)
    resolve_single_location_name(doc, emission_factors_collection)
    return doc


# ==================== BULK PREVIEW ====================

@router.post("/bulk-preview")
async def bulk_preview(
    payload: BulkPayload,
    current_user: dict = Depends(require_admin),
):
    changes = {k: v for k, v in payload.changes.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Aucun changement spécifié")

    or_filters = build_factor_id_filters(payload.factor_ids)
    if not or_filters:
        raise HTTPException(400, "Aucun facteur sélectionné")

    matched = emission_factors_collection.count_documents({"$or": or_filters, "deleted_at": None})

    # Get sample of affected factors (first 5)
    sample = list(
        emission_factors_collection.find({"$or": or_filters, "deleted_at": None})
        .limit(5)
    )

    return {
        "count": matched,
        "changes": changes,
        "sample": [
            {"id": serialize_doc(f).get("id"), "name_fr": f.get("name_fr", "")}
            for f in sample
        ],
    }


# ==================== BULK APPLY ====================

@router.post("/bulk-apply")
async def bulk_apply(
    payload: BulkPayload,
    current_user: dict = Depends(require_admin),
):
    changes = {k: v for k, v in payload.changes.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Aucun changement spécifié")


    or_filters = build_factor_id_filters(payload.factor_ids)
    if not or_filters:
        raise HTTPException(400, "Aucun facteur sélectionné")

    changes["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = emission_factors_collection.update_many(
        {"$or": or_filters, "deleted_at": None},
        {"$set": changes},
    )

    return {"modified_count": result.modified_count}


# ==================== STATS ====================

@router.get("/stats")
async def curation_stats(current_user: dict = Depends(require_admin)):
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {
            "_id": "$subcategory",
            "total": {"$sum": 1},
            "public": {"$sum": {"$cond": [{"$eq": ["$is_public", True]}, 1, 0]}},
            "reviewed": {"$sum": {"$cond": [{"$eq": ["$curation_status", "reviewed"]}, 1, 0]}},
            "flagged": {"$sum": {"$cond": [{"$eq": ["$curation_status", "flagged"]}, 1, 0]}},
            "has_custom_name": {"$sum": {"$cond": [
                {"$and": [
                    {"$ne": ["$name_simple_fr", None]},
                    {"$ne": ["$name_simple_fr", "$name_fr"]},
                ]}, 1, 0
            ]}},
        }},
        {"$sort": {"_id": 1}},
    ]

    raw = list(emission_factors_collection.aggregate(pipeline))
    return enrich_stats_rows(raw, subcategories_collection, categories_collection)


# ==================== NAME PREFIX GROUPS ====================

@router.get("/groups")
async def factor_groups(
    subcategory: str = "",
    current_user: dict = Depends(require_admin),
):
    query = {"deleted_at": None}
    if subcategory:
        query["subcategory"] = subcategory

    factors = list(emission_factors_collection.find(query, {"name_fr": 1, "subcategory": 1}))

    groups = {}
    for f in factors:
        name = f.get("name_fr", "")
        # Extract prefix: take text before first — or first ( or first ,
        prefix = name
        for sep in ["—", "(", ",", "-"]:
            idx = name.find(sep)
            if idx > 3:
                prefix = name[:idx].strip()
                break

        if prefix not in groups:
            groups[prefix] = {"prefix": prefix, "count": 0, "subcategories": set()}
        groups[prefix]["count"] += 1
        groups[prefix]["subcategories"].add(f.get("subcategory", ""))

    # Convert sets to lists and sort by count desc
    result = []
    for g in groups.values():
        g["subcategories"] = sorted(g["subcategories"])
        result.append(g)
    result.sort(key=lambda x: x["count"], reverse=True)

    return result[:200]


# ==================== BULK COPY ORIGINALS ====================

@router.post("/bulk-copy-originals")
async def bulk_copy_originals(
    payload: BulkCopyOriginalsPayload,
    current_user: dict = Depends(require_admin),
):
    """Copy name_fr/name_de or source_product_name -> name_simple_fr/de for factors where simplified name is null."""

    if payload.lang not in ("fr", "de"):
        raise HTTPException(400, "lang must be 'fr' or 'de'")

    if payload.source_field == "source_product_name":
        copy_from = "source_product_name"
    else:
        copy_from = f"name_{payload.lang}"
    target_field = f"name_simple_{payload.lang}"

    or_filters = build_factor_id_filters(payload.factor_ids)
    if not or_filters:
        raise HTTPException(400, "Aucun facteur sélectionné")

    # Only update where target is null (empty / not yet curated)
    query = {
        "$or": or_filters,
        "deleted_at": None,
        target_field: None,
    }

    # Count how many will be affected
    count_to_update = emission_factors_collection.count_documents(query)

    # Use aggregation pipeline update to copy field value
    result = emission_factors_collection.update_many(
        query,
        [{"$set": {
            target_field: f"${copy_from}",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}],
    )

    return {
        "modified_count": result.modified_count,
        "skipped_count": len(payload.factor_ids) - count_to_update,
    }


# ==================== TRANSLATE PREVIEW ====================

DIRECTION_CONFIG = {
    "fr_to_de": {
        "source_field": "name_simple_fr", "source_orig": "name_fr",
        "target_field": "name_simple_de",
        "source_lang": "français", "target_lang": "allemand",
        "is_source_translate": False,
    },
    "de_to_fr": {
        "source_field": "name_simple_de", "source_orig": "name_de",
        "target_field": "name_simple_fr",
        "source_lang": "allemand", "target_lang": "français",
        "is_source_translate": False,
    },
    "source_to_fr": {
        "source_field": "source_product_name", "source_orig": "source_product_name",
        "target_field": "name_simple_fr",
        "source_lang": "anglais (technique ecoinvent)", "target_lang": "français",
        "is_source_translate": True,
    },
    "source_to_de": {
        "source_field": "source_product_name", "source_orig": "source_product_name",
        "target_field": "name_simple_de",
        "source_lang": "anglais (technique ecoinvent)", "target_lang": "allemand",
        "is_source_translate": True,
    },
}


def build_translate_prompt(factors: list, cfg: dict) -> str:
    """Construit le prompt de traduction IA."""
    lines = []
    for f in factors:
        src_name = f.get(cfg["source_field"]) or f.get(cfg["source_orig"], "")
        fid = serialize_doc(f).get("id", str(f["_id"]))
        lines.append(f'- ID: {fid} | {cfg["source_lang"]}: "{src_name}"')

    names_block = chr(10).join(lines)
    de_note = '(Hochdeutsch)' if cfg["target_lang"] == "allemand" else ""

    if cfg["is_source_translate"]:
        return f"""Traduis et simplifie ces noms techniques de facteurs d'émission ecoinvent ({cfg["source_lang"]}) vers le {cfg["target_lang"]} (contexte: bilan carbone suisse).

Règles:
- Traduis de l'anglais technique vers le {cfg["target_lang"]} courant suisse {de_note}
- Simplifie le nom: 3-8 mots max, compréhensible par un non-spécialiste
- Garde l'information essentielle (matériau, type d'énergie, usage)
- Si le nom contient un code pays entre accolades (ex: {{IT}}, {{DE}}, {{FR}}), ajoute le code ISO tel quel entre parenthèses à la fin du titre traduit (ex: {{IT}} → (IT), {{FR}} → (FR)) — ne traduis jamais le code en toutes lettres et fais bien attention à remplacer les crochets par des parenthèses — sauf si c'est {{CH}} (Suisse), auquel cas tu l'omets complètement
- Supprime les variantes techniques, références et détails trop spécifiques (hors code pays)
- Conserve les unités si présentes
- Retourne UNIQUEMENT un JSON valide, sans commentaires

Noms à traduire:
{names_block}

Retourne un JSON array:
[{{"id": "...", "translation": "..."}}]"""
    else:
        return f"""Traduis ces noms de facteurs d'émission du {cfg["source_lang"]} vers le {cfg["target_lang"]} (contexte: bilan carbone suisse).

Règles:
- Garde le même style et longueur que l'original
- Conserve les abréviations techniques et les unités
- Utilise le {cfg["target_lang"]} courant suisse {de_note}
- Retourne UNIQUEMENT un JSON valide, sans commentaires

Noms à traduire:
{names_block}

Retourne un JSON array:
[{{"id": "...", "translation": "..."}}]"""


def parse_translation_response(response: str, factors: list, cfg: dict) -> list:
    """Parse la réponse IA et la mappe aux facteurs."""
    import json
    import re
    match = re.search(r'\[.*\]', response, re.DOTALL)
    translations_raw = json.loads(match.group()) if match else json.loads(response)

    factor_map = {}
    for f in factors:
        doc = serialize_doc(f)
        factor_map[doc.get("id", str(f["_id"]))] = f

    result = []
    for t in translations_raw:
        fid = t.get("id", "")
        if fid in factor_map:
            f = factor_map[fid]
            src_name = f.get(cfg["source_field"]) or f.get(cfg["source_orig"], "")
            result.append({
                "factor_id": fid,
                "source_name": src_name,
                "translation": t.get("translation", ""),
            })
    return result


@router.post("/translate-preview")
async def translate_preview(
    payload: TranslatePreviewPayload,
    current_user: dict = Depends(require_admin),
):
    """Generate translation preview using AI. Only for factors with source name set and target empty."""

    cfg = DIRECTION_CONFIG.get(payload.direction)
    if not cfg:
        raise HTTPException(400, f"direction must be one of: {', '.join(DIRECTION_CONFIG.keys())}")

    source_field = cfg["source_field"]
    target_field = cfg["target_field"]

    or_filters = build_factor_id_filters(payload.factor_ids)
    if not or_filters:
        raise HTTPException(400, "Aucun facteur sélectionné")

    factors = list(
        emission_factors_collection.find({
            "$or": or_filters,
            "deleted_at": None,
            source_field: {"$ne": None},
            target_field: None,
        }).limit(50)
    )

    if not factors:
        return {"translations": [], "skipped": len(payload.factor_ids), "target_field": target_field}

    prompt = build_translate_prompt(factors, cfg)

    try:
        import os
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"Tu es un traducteur expert {cfg['source_lang']}-{cfg['target_lang']} spécialisé dans le domaine du bilan carbone suisse.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        response = completion.choices[0].message.content
        result = parse_translation_response(response, factors, cfg)
        skipped = len(payload.factor_ids) - len(factors)
        return {"translations": result, "skipped": skipped, "target_field": target_field}

    except Exception as e:
        import traceback
        print(f"[TRANSLATE ERROR] direction={payload.direction}, factors={len(payload.factor_ids)}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Erreur de traduction IA: {str(e)}")


# ==================== TRANSLATE APPLY ====================

@router.post("/translate-apply")
async def translate_apply(
    payload: TranslateApplyPayload,
    current_user: dict = Depends(require_admin),
):
    """Apply validated translations."""
    if payload.target_field not in ("name_simple_fr", "name_simple_de"):
        raise HTTPException(400, "target_field invalide")

    modified = 0
    for t in payload.translations:
        fid = t.get("factor_id")
        value = t.get("value")
        if not fid or not value:
            continue

        filt = {**ef_id_filter(fid), "deleted_at": None}
        result = emission_factors_collection.update_one(
            filt,
            {"$set": {
                payload.target_field: value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        if result.modified_count > 0:
            modified += 1

    return {"modified_count": modified}


# ==================== AI TITLE SUGGESTIONS ====================

@router.post("/suggest-titles")
async def suggest_titles(
    payload: SuggestTitlesPayload,
    current_user: dict = Depends(require_admin),
):
    if len(payload.factor_ids) > 20:
        raise HTTPException(400, "Maximum 20 facteurs à la fois pour les suggestions")

    or_filters = build_factor_id_filters(payload.factor_ids)
    factors = list(emission_factors_collection.find(
        {"$or": or_filters, "deleted_at": None},
        {"name_fr": 1, "name_de": 1, "subcategory": 1, "default_unit": 1}
    ))

    if not factors:
        raise HTTPException(404, "Aucun facteur trouvé")

    try:
        prompt = build_suggest_prompt(factors)
        suggestions = await call_llm_suggest(prompt, current_user["id"])
        result = map_suggestions_to_factors(suggestions, factors)
        return {"suggestions": result}
    except Exception as e:
        raise HTTPException(500, f"Erreur de génération IA: {str(e)}")



# ==================== DUAL REPORTING ====================

@router.get("/factors/search-location")
async def search_location_factors(
    q: str = "",
    subcategory: str = "",
    limit: int = 30,
    current_user: dict = Depends(require_admin),
):
    """Search factors suitable as location-based counterparts (for linking)."""
    query = {"deleted_at": None}
    if q and len(q) >= 2:
        query["$or"] = [
            {"name_simple_fr": {"$regex": q, "$options": "i"}},
            {"name_simple_de": {"$regex": q, "$options": "i"}},
            {"name_fr": {"$regex": q, "$options": "i"}},
            {"name_de": {"$regex": q, "$options": "i"}},
        ]
    if subcategory:
        query["subcategory"] = subcategory
    # Only return factors that are location-based (or unset = default location)
    query["reporting_method"] = {"$in": [None, "location"]}

    capped_limit = min(limit, 50)
    factors = list(emission_factors_collection.find(
        query,
        {"_id": 0, "id": 1, "name_fr": 1, "name_simple_fr": 1, "name_de": 1,
         "name_simple_de": 1, "subcategory": 1, "default_unit": 1, "impacts": 1,
         "source_product_name": 1, "is_public": 1},
    ).sort([("is_public", -1), ("popularity_score", -1)]).limit(capped_limit))

    return factors


@router.post("/bulk-set-reporting-method")
async def bulk_set_reporting_method(
    payload: BulkSetReportingMethodPayload,
    current_user: dict = Depends(require_admin),
):
    """Bulk set reporting_method and optionally link a location factor."""
    if payload.reporting_method not in ("location", "market"):
        raise HTTPException(400, "reporting_method invalide")

    if payload.reporting_method == "market" and not payload.location_factor_id:
        raise HTTPException(400, "location_factor_id requis pour les facteurs market-based")

    update = {
        "reporting_method": payload.reporting_method,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.reporting_method == "market":
        update["location_factor_id"] = payload.location_factor_id
    else:
        update["location_factor_id"] = None

    oid_filters = []
    for fid in payload.factor_ids:
        f = ef_id_filter(fid)
        if "_id" in f:
            oid_filters.append(f["_id"])
        elif "id" in f:
            oid_filters.append(f["id"])

    result = emission_factors_collection.update_many(
        {"$or": [{"_id": {"$in": oid_filters}}, {"id": {"$in": payload.factor_ids}}], "deleted_at": None},
        {"$set": update},
    )

    return {"modified": result.modified_count}
