"""
Service de curation : helpers pour les routes curation.py
"""
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
