"""
Migration: Normaliser le scope des activités existantes.
Convertit scope3 → scope3_amont/scope3_aval et scope3_3 → scope3_amont.
"""
import sys
sys.path.append('/app/backend')

from config import activities_collection
from services.scope_mapping import normalize_scope_for_reporting


def migrate():
    # Find activities with non-standard scopes
    activities = list(activities_collection.find({
        "scope": {"$in": ["scope3", "scope3_3", "scope3.3", "scope33"]}
    }))

    if not activities:
        print("Aucune activité avec scope non-standard à migrer.")
        return

    print(f"Trouvé {len(activities)} activités à normaliser.")

    updated = 0
    for act in activities:
        old_scope = act.get("scope", "")
        category_id = act.get("category_id", "")
        new_scope = normalize_scope_for_reporting(old_scope, category_id)

        if old_scope != new_scope:
            activities_collection.update_one(
                {"_id": act["_id"]},
                {"$set": {"scope": new_scope}}
            )
            updated += 1
            print(f"  {act.get('name', '?')[:40]}: {old_scope} → {new_scope} (cat: {category_id})")

    print(f"\nMigration terminée: {updated}/{len(activities)} activités mises à jour.")


if __name__ == "__main__":
    migrate()
