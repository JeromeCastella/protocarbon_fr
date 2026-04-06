"""
Fonctions utilitaires
"""
from bson import ObjectId
from typing import Any, Dict


def find_emission_factor(collection, factor_id: str):
    """
    Find an emission factor by _id or custom id field.
    BAFU 2025 factors have a custom 'id' field different from MongoDB '_id'.
    """
    if not factor_id:
        return None
    try:
        doc = collection.find_one({"_id": ObjectId(factor_id)})
        if doc:
            return doc
    except Exception:
        pass
    return collection.find_one({"id": factor_id})


def ef_id_filter(factor_id: str) -> dict:
    """Build a MongoDB filter that matches either _id or custom id."""
    try:
        return {"$or": [{"_id": ObjectId(factor_id)}, {"id": factor_id}]}
    except Exception:
        return {"id": factor_id}


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sérialise un document MongoDB pour JSON
    Convertit ObjectId en string
    
    Args:
        doc: Document MongoDB
    
    Returns:
        Document sérialisable en JSON
    """
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(item) if isinstance(item, dict) else 
                str(item) if isinstance(item, ObjectId) else item
                for item in value
            ]
        else:
            result[key] = value
    
    return result


def serialize_docs(docs: list) -> list:
    """
    Sérialise une liste de documents MongoDB
    
    Args:
        docs: Liste de documents
    
    Returns:
        Liste de documents sérialisables
    """
    return [serialize_doc(doc) for doc in docs]


def format_emissions(value_kg: float) -> Dict[str, Any]:
    """
    Formate une valeur d'émissions en unité appropriée
    
    Args:
        value_kg: Valeur en kgCO2e
    
    Returns:
        Dict avec value et unit formatés
    """
    if value_kg >= 1_000_000_000:
        return {"value": round(value_kg / 1_000_000_000, 2), "unit": "MtCO₂e"}
    elif value_kg >= 1_000_000:
        return {"value": round(value_kg / 1_000_000, 2), "unit": "ktCO₂e"}
    elif value_kg >= 1_000:
        return {"value": round(value_kg / 1_000, 2), "unit": "tCO₂e"}
    else:
        return {"value": round(value_kg, 2), "unit": "kgCO₂e"}


def validate_scope(scope: str) -> bool:
    """
    Valide un scope GHG
    
    Args:
        scope: Le scope à valider
    
    Returns:
        True si valide
    """
    valid_scopes = ["scope1", "scope2", "scope3_amont", "scope3_aval"]
    return scope in valid_scopes


def get_scope_label(scope: str, language: str = "fr") -> str:
    """
    Retourne le label d'un scope
    
    Args:
        scope: Le scope
        language: La langue (fr ou de)
    
    Returns:
        Le label traduit
    """
    labels = {
        "scope1": {"fr": "Scope 1 - Émissions directes", "de": "Scope 1 - Direkte Emissionen"},
        "scope2": {"fr": "Scope 2 - Énergie indirecte", "de": "Scope 2 - Indirekte Energie"},
        "scope3_amont": {"fr": "Scope 3 Amont", "de": "Scope 3 Upstream"},
        "scope3_aval": {"fr": "Scope 3 Aval", "de": "Scope 3 Downstream"}
    }
    return labels.get(scope, {}).get(language, scope)
