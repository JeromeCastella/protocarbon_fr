"""
TECH-01 — Script de validation de la base sous-catégories / facteurs d'émission.
Exécutable via: pytest backend/tests/test_db_integrity.py -v
Objectif: Détecter les incohérences et prévenir les régressions.
"""
import pytest
from pymongo import MongoClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "carbon_tracker")

# Sous-catégories autorisées à avoir 0 EF (nouvellement créées, en attente de données)
ALLOWED_EMPTY_SUBCATEGORIES = {"district_cooling"}

# Catégories autorisées à ne pas avoir de sous-catégories (saisie automatique / manuelle)
ALLOWED_EMPTY_CATEGORIES = {"activites_combustibles_energie", "emissions_procedes"}

# Mappings interdits (sous-catégorie, catégorie) — incohérences connues
FORBIDDEN_MAPPINGS = [
    ("route", "emissions_procedes"),
    ("route", "electricite"),
    ("route_transport_individuel", "emissions_procedes"),
    ("route_transport_individuel", "electricite"),
    ("route_transports_en_communs", "emissions_procedes"),
    ("route_transports_en_communs", "electricite"),
]


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def categories(db):
    return list(db["categories"].find({}, {"_id": 0}))


@pytest.fixture(scope="module")
def subcategories(db):
    return list(db["subcategories"].find({}, {"_id": 0}))


@pytest.fixture(scope="module")
def category_codes(categories):
    return {c["code"] for c in categories}


@pytest.fixture(scope="module")
def subcategory_codes(subcategories):
    return {s["code"] for s in subcategories}


class TestTranslations:
    def test_all_subcategories_have_name_fr(self, subcategories):
        missing = [s["code"] for s in subcategories if not s.get("name_fr", "").strip()]
        assert missing == [], f"Traduction FR manquante: {missing}"

    def test_all_subcategories_have_name_de(self, subcategories):
        missing = [s["code"] for s in subcategories if not s.get("name_de", "").strip()]
        assert missing == [], f"Traduction DE manquante: {missing}"

    def test_no_leading_trailing_spaces_in_names(self, subcategories):
        bad = []
        for s in subcategories:
            if s.get("name_fr", "") != s.get("name_fr", "").strip():
                bad.append(f'{s["code"]}: name_fr="{s["name_fr"]}"')
            if s.get("name_de", "") != s.get("name_de", "").strip():
                bad.append(f'{s["code"]}: name_de="{s["name_de"]}"')
        assert bad == [], f"Espaces parasites: {bad}"

    def test_no_english_names_in_name_fr(self, subcategories):
        english_markers = [" and ", " of ", " from ", " waste", "materials",
                           "components", "treatment", "deposit", "impoundment",
                           "recycling", "elements"]
        bad = []
        for s in subcategories:
            name = s.get("name_fr", "").lower()
            if any(marker in name for marker in english_markers):
                bad.append(f'{s["code"]}: "{s["name_fr"]}"')
        assert bad == [], f"Noms anglais dans name_fr: {bad}"


class TestDuplicates:
    def test_no_duplicate_name_fr(self, subcategories):
        seen = {}
        duplicates = []
        for s in subcategories:
            key = s["name_fr"].lower().strip()
            if key in seen:
                duplicates.append(f'"{s["name_fr"]}": {s["code"]} vs {seen[key]}')
            seen[key] = s["code"]
        assert duplicates == [], f"Doublons name_fr: {duplicates}"

    def test_no_duplicate_codes(self, subcategories):
        codes = [s["code"] for s in subcategories]
        duplicates = [c for c in codes if codes.count(c) > 1]
        assert duplicates == [], f"Codes en double: {set(duplicates)}"


class TestLinks:
    def test_no_orphan_subcategories(self, subcategories):
        orphans = [s["code"] for s in subcategories
                   if not s.get("categories") or len(s["categories"]) == 0]
        assert orphans == [], f"Sous-catégories sans catégorie: {orphans}"

    def test_no_broken_category_links(self, subcategories, category_codes):
        broken = []
        for s in subcategories:
            for cat in s.get("categories", []):
                if cat not in category_codes:
                    broken.append(f'{s["code"]} -> {cat}')
        assert broken == [], f"Liens vers catégories inexistantes: {broken}"

    def test_no_orphan_emission_factors(self, db, subcategory_codes):
        ef_subcats = db["emission_factors"].distinct("subcategory")
        orphans = [s for s in ef_subcats if s not in subcategory_codes]
        assert orphans == [], f"EF liés à des sous-catégories inexistantes: {orphans}"

    def test_all_categories_have_subcategories(self, categories, subcategories):
        cat_to_subs = {}
        for s in subcategories:
            for cat in s.get("categories", []):
                cat_to_subs.setdefault(cat, []).append(s["code"])
        empty = [c["code"] for c in categories
                 if c["code"] not in cat_to_subs
                 and c["code"] not in ALLOWED_EMPTY_CATEGORIES]
        assert empty == [], f"Catégories sans sous-catégories (non autorisées): {empty}"


class TestDataQuality:
    def test_no_unexpected_empty_subcategories(self, db, subcategories):
        empty = []
        for s in subcategories:
            if s["code"] in ALLOWED_EMPTY_SUBCATEGORIES:
                continue
            count = db["emission_factors"].count_documents({"subcategory": s["code"]})
            if count == 0:
                empty.append(s["code"])
        assert empty == [], f"Sous-catégories avec 0 EF (non autorisées): {empty}"

    def test_no_forbidden_mappings(self, db):
        violations = []
        for sub_code, cat_code in FORBIDDEN_MAPPINGS:
            doc = db["subcategories"].find_one({"code": sub_code}, {"_id": 0})
            if doc and cat_code in doc.get("categories", []):
                violations.append(f"{sub_code} -> {cat_code}")
        assert violations == [], f"Mappings interdits encore présents: {violations}"

    def test_emission_factors_have_subcategory(self, db):
        count = db["emission_factors"].count_documents({
            "$or": [
                {"subcategory": {"$exists": False}},
                {"subcategory": None},
                {"subcategory": ""}
            ]
        })
        assert count == 0, f"{count} EF sans champ subcategory"

    def test_emission_factors_have_name_fr(self, db):
        count = db["emission_factors"].count_documents({
            "$or": [
                {"name_fr": {"$exists": False}},
                {"name_fr": None},
                {"name_fr": ""}
            ]
        })
        assert count == 0, f"{count} EF sans name_fr"
