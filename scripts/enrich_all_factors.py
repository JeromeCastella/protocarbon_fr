#!/usr/bin/env python3
"""
Enrichissement de TOUS les facteurs d'émission non enrichis.
- Lit directement MongoDB (pas de limite API)
- Skip les facteurs déjà enrichis
- Retry avec backoff exponentiel
- Checkpoint toutes les 25 réussites
- Log de progression dans /app/scripts/enrichment_full.log
"""
import json
import asyncio
import uuid
import sys
import os
import time
import logging

sys.path.insert(0, '/app/backend')
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(message)s',
    handlers=[
        logging.FileHandler('/app/scripts/enrichment_full.log', mode='w'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

ENRICHMENT_PROMPT = """Tu es un expert en bilan carbone pour des entreprises suisses. Tu dois enrichir les facteurs d'émission pour les rendre compréhensibles par des utilisateurs novices.

Pour chaque facteur, génère les champs suivants en JSON:

1. "name_simple_fr" (max 50 caractères): Un nom court et compréhensible en français courant.
   - Évite le jargon technique (pas de "Euro-6d", "EURO-6", etc.)
   - Utilise des termes que tout le monde comprend

2. "name_simple_de" (max 50 caractères): Traduction allemande du nom simple.

3. "description_fr" (max 150 caractères): Une description avec exemples concrets.

4. "description_de" (max 150 caractères): Traduction allemande de la description.

5. "search_tags" (liste de 5-10 mots): Mots-clés pour la recherche, incluant synonymes, termes anglais, variantes.

6. "usage_hint_fr" (max 80 caractères): Quand utiliser ce facteur?

7. "usage_hint_de" (max 80 caractères): Traduction allemande.

8. "popularity_score" (0-100): 90-100=très courant, 70-89=courant, 50-69=occasionnel, 30-49=rare, 0-29=très rare.

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.

Facteur à enrichir:
"""


async def enrich_factor(factor_context: dict, max_retries: int = 5) -> dict:
    prompt = ENRICHMENT_PROMPT + json.dumps(factor_context, ensure_ascii=False, indent=2)

    for attempt in range(max_retries):
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_KEY)
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Tu es un assistant expert en bilan carbone. Réponds uniquement en JSON valide."},
                    {"role": "user", "content": prompt},
                ],
            )
            response = completion.choices[0].message.content

            clean = response.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            clean = clean.strip()

            result = json.loads(clean)
            if result.get("name_simple_fr"):
                return result
            else:
                log.warning(f"  Attempt {attempt+1}: response missing name_simple_fr")

        except json.JSONDecodeError as e:
            log.warning(f"  Attempt {attempt+1}: JSON parse error: {e}")
        except Exception as e:
            err_str = str(e).lower()
            if "rate" in err_str or "limit" in err_str or "429" in err_str:
                wait = min(2 ** (attempt + 1), 60)
                log.warning(f"  Rate limit hit, waiting {wait}s...")
                await asyncio.sleep(wait)
            else:
                log.warning(f"  Attempt {attempt+1}: {type(e).__name__}: {str(e)[:100]}")
                if attempt >= 2:
                    break
                await asyncio.sleep(2)

    return None


async def main():
    client = MongoClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'carbon_tracker')]

    # Compter
    total_in_db = db.emission_factors.count_documents({})
    already_enriched = db.emission_factors.count_documents({
        "name_simple_fr": {"$exists": True, "$ne": None, "$ne": ""}
    })

    # Récupérer les facteurs NON enrichis
    unenriched = list(db.emission_factors.find(
        {"$or": [
            {"name_simple_fr": None},
            {"name_simple_fr": {"$exists": False}},
            {"name_simple_fr": ""}
        ]}
    ))

    log.info(f"Total en base: {total_in_db}")
    log.info(f"Déjà enrichis: {already_enriched}")
    log.info(f"À enrichir: {len(unenriched)}")
    log.info("=" * 60)

    success = 0
    errors = 0
    start_time = time.time()

    for i, factor in enumerate(unenriched):
        factor_id = factor["_id"]
        name = factor.get("name_fr", "?")[:60]

        # Contexte pour le LLM (sans _id)
        context = {
            "name_fr": factor.get("name_fr"),
            "name_de": factor.get("name_de"),
            "subcategory": factor.get("subcategory"),
            "input_units": factor.get("input_units"),
            "impacts": factor.get("impacts", [])[:2],
            "tags": factor.get("tags", [])[:5],
            "source": factor.get("source"),
        }

        try:
            enrichment = await enrich_factor(context)

            if enrichment:
                db.emission_factors.update_one(
                    {"_id": factor_id},
                    {"$set": {
                        "name_simple_fr": enrichment.get("name_simple_fr"),
                        "name_simple_de": enrichment.get("name_simple_de"),
                        "description_fr": enrichment.get("description_fr"),
                        "description_de": enrichment.get("description_de"),
                        "search_tags": enrichment.get("search_tags", []),
                        "usage_hint_fr": enrichment.get("usage_hint_fr"),
                        "usage_hint_de": enrichment.get("usage_hint_de"),
                        "popularity_score": enrichment.get("popularity_score", 50),
                    }}
                )
                success += 1
            else:
                errors += 1

        except Exception as e:
            errors += 1
            log.error(f"  [{i+1}] FATAL: {e}")

        # Progression
        if (i + 1) % 25 == 0 or i == 0:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            remaining = (len(unenriched) - i - 1) / rate if rate > 0 else 0
            log.info(
                f"[{i+1}/{len(unenriched)}] OK={success} ERR={errors} "
                f"({rate:.1f}/s, ~{remaining/60:.0f}min restantes)"
            )

        # Délai entre appels
        await asyncio.sleep(0.8)

    elapsed = time.time() - start_time
    log.info("=" * 60)
    log.info(f"TERMINÉ en {elapsed/60:.1f} minutes")
    log.info(f"Succès: {success}/{len(unenriched)}")
    log.info(f"Erreurs: {errors}")

    # Vérification finale
    final_enriched = db.emission_factors.count_documents({
        "name_simple_fr": {"$exists": True, "$ne": None, "$ne": ""}
    })
    log.info(f"Total enrichis en base: {final_enriched}/{total_in_db}")


if __name__ == "__main__":
    asyncio.run(main())
