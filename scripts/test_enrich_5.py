#!/usr/bin/env python3
"""
Test d'enrichissement sur 5 facteurs pour estimer le coût en crédits.
Utilise gpt-4o-mini via la clé Emergent (format identique au POC validé).
"""
import json
import asyncio
import uuid
import sys
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

ENRICHMENT_PROMPT = """Tu es un expert en bilan carbone pour des entreprises suisses. Tu dois enrichir les facteurs d'émission pour les rendre compréhensibles par des utilisateurs novices.

Pour chaque facteur, génère les champs suivants en JSON:

1. "name_simple_fr" (max 50 caractères): Un nom court et compréhensible en français courant.
   - Évite le jargon technique (pas de "Euro-6d", "EURO-6", etc. dans le nom simple)
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

async def enrich_factor(factor: dict) -> dict:
    factor_context = {
        "name_fr": factor.get("name_fr"),
        "name_de": factor.get("name_de"),
        "subcategory": factor.get("subcategory"),
        "input_units": factor.get("input_units"),
        "impacts": factor.get("impacts", [])[:2],
        "tags": factor.get("tags", [])[:5],
        "source": factor.get("source"),
    }
    
    prompt = ENRICHMENT_PROMPT + json.dumps(factor_context, ensure_ascii=False, indent=2)
    
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"enrich-{uuid.uuid4()}",
        system_message="Tu es un assistant expert en bilan carbone. Réponds uniquement en JSON valide."
    ).with_model("openai", "gpt-4o-mini")
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    clean_response = response.strip()
    if clean_response.startswith("```"):
        clean_response = clean_response.split("```")[1]
        if clean_response.startswith("json"):
            clean_response = clean_response[4:]
    clean_response = clean_response.strip()
    
    return json.loads(clean_response)

async def main():
    client = MongoClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'carbon_tracker')]
    
    # Récupérer 5 facteurs NON enrichis
    unenriched = list(db.emission_factors.find(
        {"$or": [{"name_simple_fr": None}, {"name_simple_fr": {"$exists": False}}]},
        {"_id": 1, "name_fr": 1, "name_de": 1, "subcategory": 1, "input_units": 1, "impacts": 1, "tags": 1, "source": 1}
    ).limit(5))
    
    print(f"Test sur {len(unenriched)} facteurs non enrichis")
    print("=" * 60)
    
    success = 0
    for i, factor in enumerate(unenriched):
        factor_id = factor.pop("_id")
        print(f"\n[{i+1}/5] {factor.get('name_fr', '?')[:60]}")
        
        try:
            enrichment = await enrich_factor(factor)
            
            if enrichment and enrichment.get("name_simple_fr"):
                # Écrire directement en base
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
                print(f"  -> {enrichment.get('name_simple_fr')}")
                print(f"     Tags: {', '.join(enrichment.get('search_tags', [])[:5])}")
            else:
                print(f"  ERREUR: réponse vide ou invalide")
                
        except Exception as e:
            print(f"  ERREUR: {e}")
        
        await asyncio.sleep(1)  # 1s entre chaque appel
    
    print(f"\n{'=' * 60}")
    print(f"Résultat: {success}/5 enrichis avec succès")
    print(f"\nVérifiez maintenant votre solde de crédits dans Profil > Universal Key")
    print(f"Puis on pourra extrapoler : coût × {1158 // 5} = coût total estimé")

if __name__ == "__main__":
    asyncio.run(main())
