"""
Routes de curation des facteurs d'émission — atelier d'édition en masse
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId

import sys
sys.path.append('/app/backend')

from config import emission_factors_collection, subcategories_collection, categories_collection
from services.auth import require_admin
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

# ==================== FACTORS LIST (PAGINATED) ====================

CURATION_PROJECTION = {
    "id": 1, "name_fr": 1, "name_de": 1, "name_simple_fr": 1, "name_simple_de": 1,
    "subcategory": 1, "is_public": 1, "popularity_score": 1, "curation_status": 1,
    "default_unit": 1, "input_units": 1, "source": 1, "impacts": 1, "tags": 1,
    "reporting_method": 1, "location_factor_id": 1,
}

@router.get("/factors")
async def list_curation_factors(
    page: int = 1,
    page_size: int = 50,
    search: str = "",
    subcategory: str = "",
    curation_status: str = "",
    is_public: str = "",
    has_simple_name: str = "",
    default_unit: str = "",
    reporting_method: str = "",
    sort_by: str = "subcategory",
    sort_order: str = "asc",
    current_user: dict = Depends(require_admin),
):
    query = {"deleted_at": None}

    if search:
        query["$or"] = [
            {"name_fr": {"$regex": search, "$options": "i"}},
            {"name_de": {"$regex": search, "$options": "i"}},
            {"name_simple_fr": {"$regex": search, "$options": "i"}},
            {"name_simple_de": {"$regex": search, "$options": "i"}},
            {"source_product_name": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
    if subcategory:
        query["subcategory"] = subcategory
    if default_unit:
        query["default_unit"] = default_unit
    if curation_status:
        if curation_status == "untreated":
            # Match factors with null or "untreated" curation_status
            query["curation_status"] = {"$in": [None, "untreated"]}
        else:
            query["curation_status"] = curation_status
    if is_public == "true":
        query["is_public"] = True
    elif is_public == "false":
        query["is_public"] = False
    if reporting_method == "market":
        query["reporting_method"] = "market"
    elif reporting_method == "location":
        query["reporting_method"] = {"$in": [None, "location"]}
    if has_simple_name == "true":
        query["$and"] = query.get("$and", []) + [
            {"name_simple_fr": {"$exists": True, "$ne": None}},
            {"$expr": {"$ne": ["$name_simple_fr", "$name_fr"]}}
        ]
    elif has_simple_name == "false":
        query["$or"] = [
            {"name_simple_fr": {"$exists": False}},
            {"name_simple_fr": None},
            {"$expr": {"$eq": ["$name_simple_fr", "$name_fr"]}}
        ]

    sort_dir = 1 if sort_order == "asc" else -1
    sort_field = sort_by if sort_by in ["name_fr", "subcategory", "popularity_score", "is_public", "curation_status", "source_product_name", "reporting_method"] else "subcategory"

    total = emission_factors_collection.count_documents(query)
    skip = (page - 1) * page_size
    factors = list(
        emission_factors_collection.find(query)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(page_size)
    )

    # Resolve location factor names for market-based factors
    items = [serialize_doc(f) for f in factors]
    loc_ids = [f.get("location_factor_id") for f in items if f.get("location_factor_id")]
    if loc_ids:
        loc_factors = {
            str(lf.get("id", lf.get("_id"))): lf
            for lf in emission_factors_collection.find(
                {"$or": [{"id": {"$in": loc_ids}}, {"_id": {"$in": [ObjectId(i) for i in loc_ids if len(i) == 24]}}]},
                {"_id": 0, "id": 1, "name_simple_fr": 1, "name_fr": 1}
            )
        }
        for item in items:
            lid = item.get("location_factor_id")
            if lid and lid in loc_factors:
                lf = loc_factors[lid]
                item["_locationName"] = lf.get("name_simple_fr") or lf.get("name_fr") or lid

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
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
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
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
    return serialize_doc(updated)


# ==================== BULK PREVIEW ====================

@router.post("/bulk-preview")
async def bulk_preview(
    payload: BulkPayload,
    current_user: dict = Depends(require_admin),
):
    changes = {k: v for k, v in payload.changes.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(400, "Aucun changement spécifié")

    from bson import ObjectId

    # Build filter for the selected factors
    or_filters = []
    for fid in payload.factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})

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

    from bson import ObjectId

    or_filters = []
    for fid in payload.factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})

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

    # Enrich with subcategory names
    subcat_map = {}
    for sc in subcategories_collection.find({}):
        subcat_map[sc["code"]] = {
            "name_fr": sc.get("name_fr", sc["code"]),
            "name_de": sc.get("name_de", sc["code"]),
            "categories": sc.get("categories", []),
        }

    # Category names
    cat_map = {}
    for c in categories_collection.find({}):
        cat_map[c["code"]] = {"name_fr": c.get("name_fr", c["code"]), "scope": c.get("scope", "")}

    result = []
    for row in raw:
        code = row["_id"] or "unknown"
        sc_info = subcat_map.get(code, {})
        untreated = row["total"] - row["reviewed"] - row["flagged"]
        result.append({
            "subcategory": code,
            "name_fr": sc_info.get("name_fr", code),
            "name_de": sc_info.get("name_de", code),
            "categories": sc_info.get("categories", []),
            "total": row["total"],
            "public": row["public"],
            "reviewed": row["reviewed"],
            "flagged": row["flagged"],
            "untreated": untreated,
            "has_custom_name": row["has_custom_name"],
            "progress_pct": round(row["reviewed"] / row["total"] * 100) if row["total"] > 0 else 0,
        })

    # Global totals
    g_total = sum(r["total"] for r in result)
    g_reviewed = sum(r["reviewed"] for r in result)
    g_flagged = sum(r["flagged"] for r in result)

    return {
        "global": {
            "total": g_total,
            "reviewed": g_reviewed,
            "flagged": g_flagged,
            "untreated": g_total - g_reviewed - g_flagged,
            "progress_pct": round(g_reviewed / g_total * 100) if g_total > 0 else 0,
        },
        "by_subcategory": result,
        "categories": {k: v for k, v in cat_map.items()},
    }


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
    from bson import ObjectId

    if payload.lang not in ("fr", "de"):
        raise HTTPException(400, "lang must be 'fr' or 'de'")

    if payload.source_field == "source_product_name":
        copy_from = "source_product_name"
    else:
        copy_from = f"name_{payload.lang}"
    target_field = f"name_simple_{payload.lang}"

    or_filters = []
    for fid in payload.factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})

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
    from bson import ObjectId

    cfg = DIRECTION_CONFIG.get(payload.direction)
    if not cfg:
        raise HTTPException(400, f"direction must be one of: {', '.join(DIRECTION_CONFIG.keys())}")

    source_field = cfg["source_field"]
    target_field = cfg["target_field"]

    or_filters = []
    for fid in payload.factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})

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
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"curation-translate-{current_user['id']}",
            system_message=f"Tu es un traducteur expert {cfg['source_lang']}-{cfg['target_lang']} spécialisé dans le domaine du bilan carbone suisse.",
        ).with_model("openai", "gpt-4o-mini")

        response = await chat.send_message(UserMessage(text=prompt))
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

    from bson import ObjectId

    or_filters = []
    for fid in payload.factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})

    factors = list(emission_factors_collection.find(
        {"$or": or_filters, "deleted_at": None},
        {"name_fr": 1, "name_de": 1, "subcategory": 1, "default_unit": 1}
    ))

    if not factors:
        raise HTTPException(404, "Aucun facteur trouvé")

    # Build prompt
    lines = []
    for f in factors:
        fid = str(f["_id"])
        lines.append(f'- ID: {fid} | Original FR: "{f.get("name_fr", "")}" | Original DE: "{f.get("name_de", "")}" | Unité: {f.get("default_unit", "")}')

    prompt = f"""Tu es un expert en bilan carbone suisse. Simplifie les noms techniques de facteurs d'émission pour les rendre compréhensibles par un utilisateur non-technique.

Règles:
- Le titre simplifié doit être court (3-8 mots max)
- Garde l'information essentielle (matériau, type d'énergie, usage)
- Supprime les codes pays, variantes techniques et références
- Le titre FR doit être en français courant suisse
- Le titre DE doit être en allemand courant suisse (Hochdeutsch)
- Retourne UNIQUEMENT un JSON valide, sans commentaires

Facteurs à simplifier:
{chr(10).join(lines)}

Retourne un JSON array:
[{{"id": "...", "name_simple_fr": "...", "name_simple_de": "..."}}]"""

    try:
        import os
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"curation-suggest-{current_user['id']}",
            system_message="Tu es un expert en bilan carbone suisse. Tu simplifies les noms techniques de facteurs d'émission.",
        ).with_model("openai", "gpt-4o-mini")

        response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON from response (response is a string)
        import json
        import re
        text = response
        # Extract JSON array from response
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            suggestions = json.loads(match.group())
        else:
            suggestions = json.loads(text)

        # Map back by _id
        result = []
        factor_map = {str(f["_id"]): f for f in factors}
        for s in suggestions:
            fid = s.get("id", "")
            if fid in factor_map:
                result.append({
                    "factor_id": fid,
                    "name_fr_original": factor_map[fid].get("name_fr", ""),
                    "name_simple_fr": s.get("name_simple_fr", ""),
                    "name_simple_de": s.get("name_simple_de", ""),
                })

        return {"suggestions": result}

    except Exception as e:
        raise HTTPException(500, f"Erreur de génération IA: {str(e)}")



# ==================== DUAL REPORTING ====================

@router.get("/factors/search-location")
async def search_location_factors(
    q: str = "",
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
    # Only return factors that are location-based (or unset = default location)
    query["reporting_method"] = {"$in": [None, "location"]}

    factors = list(emission_factors_collection.find(
        query,
        {"_id": 0, "id": 1, "name_fr": 1, "name_simple_fr": 1, "name_de": 1,
         "name_simple_de": 1, "subcategory": 1, "default_unit": 1, "impacts": 1},
    ).sort([("is_public", -1), ("popularity_score", -1)]).limit(20))

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
