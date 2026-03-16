"""
Migration: Créer des entités scénario à partir des fiscal_years existants de type 'scenario'
et lier chaque fiscal_year à son scenario_id.
"""
import sys
sys.path.append('/app/backend')

from config import fiscal_years_collection, scenarios_collection
from datetime import datetime, timezone

def migrate():
    # Find all scenario fiscal years without a scenario_id
    scenario_fys = list(fiscal_years_collection.find({
        "type": "scenario",
        "scenario_id": {"$exists": False}
    }))

    if not scenario_fys:
        print("Aucun scénario à migrer.")
        return

    print(f"Trouvé {len(scenario_fys)} exercices scénario à migrer.")

    # Group by (company_id, scenario_name) to deduplicate
    scenario_map = {}  # (company_id, scenario_name) -> scenario_id
    created = 0

    for fy in scenario_fys:
        name = fy.get("scenario_name", "").strip()
        company_id = fy.get("company_id", "")
        tenant_id = fy.get("tenant_id", "")

        if not name:
            name = fy.get("name", "Scénario sans nom").replace(f"Scénario {fy.get('year', '')} — ", "")

        key = (company_id, name)

        if key not in scenario_map:
            # Create scenario entity
            doc = {
                "name": name,
                "description": "",
                "company_id": company_id,
                "tenant_id": tenant_id,
                "created_at": fy.get("created_at", datetime.now(timezone.utc).isoformat()),
                "created_by": tenant_id
            }
            result = scenarios_collection.insert_one(doc)
            scenario_id = str(result.inserted_id)
            scenario_map[key] = scenario_id
            created += 1
            print(f"  Créé scénario: '{name}' (company={company_id}) -> {scenario_id}")
        else:
            scenario_id = scenario_map[key]

        # Link fiscal year to scenario
        fiscal_years_collection.update_one(
            {"_id": fy["_id"]},
            {"$set": {"scenario_id": scenario_id}}
        )
        print(f"  Lié exercice '{fy.get('name', '')}' -> scenario_id={scenario_id}")

    print(f"\nMigration terminée: {created} scénarios créés, {len(scenario_fys)} exercices liés.")


if __name__ == "__main__":
    migrate()
