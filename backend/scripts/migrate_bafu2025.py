"""
Script de migration : Import BAFU 2025 (émission factors + sous-catégories)
Exécution en 6 étapes avec validation.
"""
import sys
import json
from datetime import datetime, timezone

sys.path.append('/app/backend')
from config import db, emission_factors_collection

subcategories_collection = db['subcategories']
activities_collection = db['activities']

TIMESTAMP = datetime.now(timezone.utc).isoformat()


def step1_backup():
    """Étape 1 — Backup des collections actuelles"""
    print("=" * 60)
    print("ÉTAPE 1 — BACKUP")
    print("=" * 60)

    efs = list(emission_factors_collection.find({}, {"_id": 0}))
    subs = list(subcategories_collection.find({}, {"_id": 0}))

    with open("/tmp/backup_emission_factors.json", "w") as f:
        json.dump(efs, f, ensure_ascii=False, default=str)
    with open("/tmp/backup_subcategories.json", "w") as f:
        json.dump(subs, f, ensure_ascii=False, default=str)

    print(f"  Backup EFs: {len(efs)} documents")
    print(f"  Backup subcategories: {len(subs)} documents")
    print(f"  Fichiers: /tmp/backup_emission_factors.json, /tmp/backup_subcategories.json")
    return True


def step2_purge_test_activities():
    """Étape 2 — Purger les activités de test"""
    print("\n" + "=" * 60)
    print("ÉTAPE 2 — PURGE DES ACTIVITÉS DE TEST")
    print("=" * 60)

    count_before = activities_collection.count_documents({})
    linked = activities_collection.count_documents({"emission_factor_id": {"$exists": True, "$ne": None, "$ne": ""}})
    
    # Delete all activities (test data)
    result = activities_collection.delete_many({})
    
    print(f"  Activités avant: {count_before}")
    print(f"  Dont liées à un EF: {linked}")
    print(f"  Supprimées: {result.deleted_count}")
    return True


def step3_import_subcategories():
    """Étape 3 — Import des sous-catégories (fusion: existantes + nouvelles + manquantes)"""
    print("\n" + "=" * 60)
    print("ÉTAPE 3 — IMPORT DES SOUS-CATÉGORIES")
    print("=" * 60)

    # Load new subcategories
    with open("/tmp/new_subcategories.json") as f:
        new_subs = json.load(f)

    # Get existing subcategories
    existing_subs = {s["code"]: s for s in subcategories_collection.find({}, {"_id": 0})}
    new_subs_by_code = {s["code"]: s for s in new_subs}

    # Load EFs to find all needed subcats
    with open("/tmp/emission_factors_bafu2025.json") as f:
        efs = json.load(f)["emission_factors"]
    needed_codes = set(ef.get("subcategory") for ef in efs)

    # Build final list: existing (updated if overlap) + new + missing
    final_subs = []
    
    # Keep existing subcats
    for code, sub in existing_subs.items():
        if code in new_subs_by_code:
            # Overlap: use new version but preserve existing fields if missing
            merged = {**sub, **new_subs_by_code[code]}
            merged.pop("_note", None)
            final_subs.append(merged)
        else:
            final_subs.append(sub)

    # Add new subcats that don't exist yet
    for code, sub in new_subs_by_code.items():
        if code not in existing_subs:
            clean = {k: v for k, v in sub.items() if k != "_note"}
            final_subs.append(clean)

    # Create missing subcats (not in existing nor new file)
    existing_codes = set(s["code"] for s in final_subs)
    missing = needed_codes - existing_codes
    
    MISSING_DEFINITIONS = {
        "autres_dechets": {
            "code": "autres_dechets",
            "name_fr": "Autres déchets",
            "name_de": "Andere Abfälle",
            "categories": ["dechets_operations"],
            "icon": "trash-2",
            "order": 95,
            "created_at": TIMESTAMP
        },
        "dechets_nucleaires": {
            "code": "dechets_nucleaires",
            "name_fr": "Déchets nucléaires",
            "name_de": "Nuklearabfälle",
            "categories": ["dechets_operations"],
            "icon": "atom",
            "order": 96,
            "created_at": TIMESTAMP
        }
    }
    
    for code in missing:
        if code in MISSING_DEFINITIONS:
            final_subs.append(MISSING_DEFINITIONS[code])
            print(f"  Créée sous-catégorie manquante: {code}")
        else:
            print(f"  ⚠️ ATTENTION: sous-catégorie '{code}' introuvable, aucune définition")

    # Drop and insert
    subcategories_collection.drop()
    if final_subs:
        subcategories_collection.insert_many(final_subs)

    print(f"  Existantes conservées: {len(existing_subs)}")
    print(f"  Nouvelles ajoutées: {len(new_subs_by_code) - len(set(new_subs_by_code.keys()) & set(existing_subs.keys()))}")
    print(f"  Manquantes créées: {len(missing)}")
    print(f"  Total final: {subcategories_collection.count_documents({})}")
    return True


def step4_import_emission_factors():
    """Étape 4 — Import des facteurs d'émission"""
    print("\n" + "=" * 60)
    print("ÉTAPE 4 — IMPORT DES FACTEURS D'ÉMISSION")
    print("=" * 60)

    with open("/tmp/emission_factors_bafu2025.json") as f:
        data = json.load(f)
    efs = data["emission_factors"]

    # Clean: remove any _id fields and add import metadata
    for ef in efs:
        ef.pop("_id", None)
        ef["imported_at"] = TIMESTAMP
        ef["import_batch"] = "BAFU_2025"

    old_count = emission_factors_collection.count_documents({})
    emission_factors_collection.drop()
    emission_factors_collection.insert_many(efs)
    new_count = emission_factors_collection.count_documents({})

    print(f"  Anciens EFs supprimés: {old_count}")
    print(f"  Nouveaux EFs importés: {new_count}")
    print(f"  Croissance: +{new_count - old_count} ({round((new_count/old_count - 1)*100)}%)")
    return True


def step5_validate():
    """Étape 5 — Tests d'intégrité"""
    print("\n" + "=" * 60)
    print("ÉTAPE 5 — VALIDATION")
    print("=" * 60)

    errors = []
    warnings = []

    # 5.1 Count check
    ef_count = emission_factors_collection.count_documents({})
    sub_count = subcategories_collection.count_documents({})
    print(f"  EFs: {ef_count}")
    print(f"  Subcategories: {sub_count}")
    if ef_count != 8978:
        errors.append(f"EF count mismatch: expected 8978, got {ef_count}")

    # 5.2 No duplicate IDs
    pipeline = [{"$group": {"_id": "$id", "count": {"$sum": 1}}}, {"$match": {"count": {"$gt": 1}}}]
    dupes = list(emission_factors_collection.aggregate(pipeline))
    if dupes:
        errors.append(f"Duplicate EF IDs: {len(dupes)}")
    else:
        print("  ✅ 0 IDs dupliqués")

    # 5.3 All subcategories referenced by EFs exist
    ef_subcats = emission_factors_collection.distinct("subcategory")
    sub_codes = set(s["code"] for s in subcategories_collection.find({}, {"_id": 0, "code": 1}))
    missing_subs = set(ef_subcats) - sub_codes
    if missing_subs:
        errors.append(f"Missing subcategories: {missing_subs}")
    else:
        print(f"  ✅ Toutes les {len(ef_subcats)} sous-catégories sont couvertes")

    # 5.4 Valid scopes
    valid_scopes = {"scope1", "scope2", "scope3", "scope3_3"}
    all_scopes = set()
    for ef in emission_factors_collection.find({}, {"_id": 0, "impacts": 1}):
        for imp in ef.get("impacts", []):
            all_scopes.add(imp.get("scope"))
    invalid = all_scopes - valid_scopes
    if invalid:
        errors.append(f"Invalid scopes: {invalid}")
    else:
        print(f"  ✅ Scopes valides: {all_scopes}")

    # 5.5 All EFs have impacts
    no_impacts = emission_factors_collection.count_documents({"$or": [{"impacts": {"$exists": False}}, {"impacts": {"$size": 0}}]})
    if no_impacts > 0:
        errors.append(f"{no_impacts} EFs without impacts")
    else:
        print("  ✅ Tous les EFs ont des impacts")

    # 5.6 is_public field present
    no_public = emission_factors_collection.count_documents({"is_public": {"$exists": False}})
    if no_public > 0:
        errors.append(f"{no_public} EFs missing is_public field")
    else:
        public = emission_factors_collection.count_documents({"is_public": True})
        expert = emission_factors_collection.count_documents({"is_public": False})
        print(f"  ✅ is_public: {public} publics, {expert} experts")

    # 5.7 popularity_score range
    out_of_range = emission_factors_collection.count_documents({"$or": [{"popularity_score": {"$lt": 0}}, {"popularity_score": {"$gt": 100}}]})
    if out_of_range > 0:
        errors.append(f"{out_of_range} EFs with popularity_score out of [0-100]")
    else:
        print("  ✅ popularity_score dans [0-100]")

    # 5.8 Mandatory fields
    mandatory = ["name_fr", "subcategory", "impacts", "default_unit"]
    for field in mandatory:
        missing_count = emission_factors_collection.count_documents({field: {"$exists": False}})
        if missing_count > 0:
            errors.append(f"{missing_count} EFs missing mandatory field '{field}'")
        else:
            print(f"  ✅ Champ '{field}' présent partout")

    # Summary
    print("\n" + "-" * 40)
    if errors:
        print(f"  ❌ {len(errors)} ERREURS:")
        for e in errors:
            print(f"    - {e}")
        return False
    else:
        if warnings:
            for w in warnings:
                print(f"  ⚠️ {w}")
        print("  ✅ VALIDATION RÉUSSIE — Base de données intègre")
        return True


def step6_summary():
    """Étape 6 — Résumé final"""
    print("\n" + "=" * 60)
    print("RÉSUMÉ DE L'INTÉGRATION")
    print("=" * 60)

    ef_count = emission_factors_collection.count_documents({})
    sub_count = subcategories_collection.count_documents({})
    public = emission_factors_collection.count_documents({"is_public": True})
    expert = emission_factors_collection.count_documents({"is_public": False})

    print(f"  Facteurs d'émission: {ef_count} (était: 1191)")
    print(f"    - Publics: {public}")
    print(f"    - Experts: {expert}")
    print(f"  Sous-catégories: {sub_count}")
    print(f"  Activités: {activities_collection.count_documents({})}")
    print(f"  Backup disponible: /tmp/backup_*.json")
    print(f"  Horodatage: {TIMESTAMP}")


if __name__ == "__main__":
    print("🚀 MIGRATION BAFU 2025 — Début")
    print(f"   Horodatage: {TIMESTAMP}\n")

    if not step1_backup():
        sys.exit(1)
    if not step2_purge_test_activities():
        sys.exit(1)
    if not step3_import_subcategories():
        sys.exit(1)
    if not step4_import_emission_factors():
        sys.exit(1)
    
    valid = step5_validate()
    step6_summary()

    if not valid:
        print("\n⚠️  Des erreurs ont été détectées. Vérifiez les logs ci-dessus.")
        sys.exit(1)
    else:
        print("\n✅ MIGRATION TERMINÉE AVEC SUCCÈS")
