"""
Service de curation : helpers pour les routes curation.py
"""
import os
import json
import re
from bson import ObjectId
from utils import serialize_doc


def build_factor_id_filters(factor_ids: list) -> list:
    """Build $or filters for matching factors by _id or custom id.
    Replaces the pattern duplicated 5+ times in curation routes."""
    or_filters = []
    for fid in factor_ids:
        try:
            or_filters.append({"_id": ObjectId(fid)})
        except Exception:
            pass
        or_filters.append({"id": fid})
    return or_filters


def build_curation_query(
    search: str = "",
    subcategory: str = "",
    curation_status: str = "",
    is_public: str = "",
    has_simple_name: str = "",
    default_unit: str = "",
    reporting_method: str = "",
) -> dict:
    """Build MongoDB query dict for the paginated curation factors list."""
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

    return query


VALID_SORT_FIELDS = {
    "name_fr", "subcategory", "popularity_score",
    "is_public", "curation_status", "source_product_name", "reporting_method",
}


def resolve_sort_field(sort_by: str) -> str:
    """Validate and return a safe sort field name."""
    return sort_by if sort_by in VALID_SORT_FIELDS else "subcategory"


def resolve_location_names(items: list, collection) -> list:
    """Enrich factor items with their linked location factor display name."""
    loc_ids = [f.get("location_factor_id") for f in items if f.get("location_factor_id")]
    if not loc_ids:
        return items

    loc_factors = {
        str(lf.get("id", lf.get("_id"))): lf
        for lf in collection.find(
            {"$or": [
                {"id": {"$in": loc_ids}},
                {"_id": {"$in": [ObjectId(i) for i in loc_ids if len(i) == 24]}}
            ]},
            {"_id": 0, "id": 1, "name_simple_fr": 1, "name_fr": 1}
        )
    }

    for item in items:
        lid = item.get("location_factor_id")
        if lid and lid in loc_factors:
            lf = loc_factors[lid]
            item["_locationName"] = lf.get("name_simple_fr") or lf.get("name_fr") or lid

    return items


def resolve_single_location_name(doc: dict, collection) -> dict:
    """Resolve the location factor name for a single factor document."""
    lid = doc.get("location_factor_id")
    if not lid:
        return doc

    loc_filter = {"deleted_at": None, "$or": [{"id": lid}]}
    try:
        loc_filter["$or"].append({"_id": ObjectId(lid) if len(lid) == 24 else None})
    except Exception:
        pass

    loc_factor = collection.find_one(loc_filter, {"_id": 0, "name_simple_fr": 1, "name_fr": 1})
    if loc_factor:
        doc["_locationName"] = loc_factor.get("name_simple_fr") or loc_factor.get("name_fr") or lid

    return doc


def enrich_stats_rows(raw_rows: list, subcategories_collection, categories_collection) -> dict:
    """
    Enrichit les résultats bruts de l'agrégation stats avec les noms de
    sous-catégories et catégories, et calcule les totaux globaux.
    """
    subcat_map = {}
    for sc in subcategories_collection.find({}):
        subcat_map[sc["code"]] = {
            "name_fr": sc.get("name_fr", sc["code"]),
            "name_de": sc.get("name_de", sc["code"]),
            "categories": sc.get("categories", []),
        }

    cat_map = {}
    for c in categories_collection.find({}):
        cat_map[c["code"]] = {"name_fr": c.get("name_fr", c["code"]), "scope": c.get("scope", "")}

    result = []
    for row in raw_rows:
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


def build_suggest_prompt(factors: list) -> str:
    """Construit le prompt LLM pour la suggestion de titres simplifiés."""
    lines = []
    for f in factors:
        fid = str(f["_id"])
        lines.append(
            f'- ID: {fid} | Original FR: "{f.get("name_fr", "")}" '
            f'| Original DE: "{f.get("name_de", "")}" '
            f'| Unité: {f.get("default_unit", "")}'
        )

    return f"""Tu es un expert en bilan carbone suisse. Simplifie les noms techniques de facteurs d'émission pour les rendre compréhensibles par un utilisateur non-technique.

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


async def call_llm_suggest(prompt: str, user_id: str) -> list:
    """Appelle le LLM pour obtenir les suggestions et parse la réponse JSON."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"curation-suggest-{user_id}",
        system_message="Tu es un expert en bilan carbone suisse. Tu simplifies les noms techniques de facteurs d'émission.",
    ).with_model("openai", "gpt-4o-mini")

    text = await chat.send_message(UserMessage(text=prompt))

    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


def map_suggestions_to_factors(suggestions: list, factors: list) -> list:
    """Map les suggestions LLM aux facteurs originaux par ID."""
    factor_map = {str(f["_id"]): f for f in factors}
    result = []
    for s in suggestions:
        fid = s.get("id", "")
        if fid in factor_map:
            result.append({
                "factor_id": fid,
                "name_fr_original": factor_map[fid].get("name_fr", ""),
                "name_simple_fr": s.get("name_simple_fr", ""),
                "name_simple_de": s.get("name_simple_de", ""),
            })
    return result
