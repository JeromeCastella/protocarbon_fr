"""
Routes pour les dimensions et conversions d'unités
"""
from fastapi import APIRouter

router = APIRouter(prefix="/units", tags=["Units"])

UNIT_DIMENSIONS = {
    "energy": {
        "label_fr": "Énergie",
        "label_de": "Energie",
        "base_unit": "kWh",
        "units": {
            "kWh":   {"label_fr": "kilowattheures",  "label_de": "Kilowattstunden", "to_base": 1},
            "MWh":   {"label_fr": "mégawattheures",  "label_de": "Megawattstunden", "to_base": 1000},
            "MJ":    {"label_fr": "mégajoules",      "label_de": "Megajoule",       "to_base": 0.2778},
            "GJ":    {"label_fr": "gigajoules",      "label_de": "Gigajoule",       "to_base": 277.78},
            "therm": {"label_fr": "therms",          "label_de": "Therms",          "to_base": 29.3},
        }
    },
    "distance": {
        "label_fr": "Distance",
        "label_de": "Distanz",
        "base_unit": "km",
        "units": {
            "km":    {"label_fr": "kilomètres",      "label_de": "Kilometer",       "to_base": 1},
            "m":     {"label_fr": "mètres",          "label_de": "Meter",           "to_base": 0.001},
            "miles": {"label_fr": "miles",           "label_de": "Meilen",          "to_base": 1.60934},
        }
    },
    "mass": {
        "label_fr": "Masse",
        "label_de": "Masse",
        "base_unit": "kg",
        "units": {
            "kg": {"label_fr": "kilogrammes",  "label_de": "Kilogramm",  "to_base": 1},
            "t":  {"label_fr": "tonnes",       "label_de": "Tonnen",     "to_base": 1000},
            "g":  {"label_fr": "grammes",      "label_de": "Gramm",      "to_base": 0.001},
            "lb": {"label_fr": "livres",       "label_de": "Pfund",      "to_base": 0.453592},
        }
    },
    "volume": {
        "label_fr": "Volume",
        "label_de": "Volumen",
        "base_unit": "L",
        "units": {
            "L":   {"label_fr": "litres",       "label_de": "Liter",       "to_base": 1},
            "m3":  {"label_fr": "mètres cubes", "label_de": "Kubikmeter",  "to_base": 1000},
            "gal": {"label_fr": "gallons",      "label_de": "Gallonen",    "to_base": 3.78541},
        }
    },
    "monetary": {
        "label_fr": "Monétaire",
        "label_de": "Monetär",
        "base_unit": "CHF",
        "units": {
            "CHF":  {"label_fr": "francs suisses",   "label_de": "Schweizer Franken", "to_base": 1},
            "kCHF": {"label_fr": "milliers de CHF",  "label_de": "Tausend CHF",       "to_base": 1000},
        }
    }
}


@router.get("/dimensions")
async def get_unit_dimensions():
    """Retourne toutes les dimensions d'unités avec leurs conversions"""
    return UNIT_DIMENSIONS
