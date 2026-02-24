#!/usr/bin/env python3
"""
Enrich ALL emission factors using Claude Haiku via Anthropic API
Sprint 2 - Full enrichment
"""
import json
import asyncio
import uuid
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY')

ENRICHMENT_PROMPT = """Tu es un expert en bilan carbone pour des entreprises suisses. Tu dois enrichir les facteurs d'émission pour les rendre compréhensibles par des utilisateurs novices.

Pour chaque facteur, génère les champs suivants en JSON:

1. "name_simple_fr" (max 50 caractères): Un nom court et compréhensible en français courant.
   - Évite le jargon technique (pas de "Euro-6d", "EURO-6", etc. dans le nom simple)
   - Utilise des termes que tout le monde comprend

2. "name_simple_de" (max 50 caractères): Traduction allemande du nom simple.

3. "description_fr" (max 150 caractères): Une description avec exemples concrets.

4. "description_de" (max 150 caractères): Traduction allemande de la description.

5. "search_tags" (liste de 5-10 mots): Mots-clés pour la recherche (synonymes, termes anglais, variantes).

6. "usage_hint_fr" (max 80 caractères): Conseil d'utilisation - quand utiliser ce facteur?

7. "usage_hint_de" (max 80 caractères): Traduction allemande.

8. "popularity_score" (0-100): Estimation de la fréquence d'utilisation.
   - 90-100: Très courant (voiture essence, électricité, vol Europe)
   - 70-89: Courant (bus, train, gaz naturel)
   - 50-69: Occasionnel (camion spécifique, matériau courant)
   - 30-49: Rare (facteur technique)
   - 0-29: Très rare

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.

Facteur à enrichir:
"""

async def enrich_factor(factor: dict, semaphore: asyncio.Semaphore) -> dict:
    """Enrich a single factor using Claude Haiku."""
    async with semaphore:
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
            api_key=ANTHROPIC_KEY,
            session_id=f"enrich-{uuid.uuid4()}",
            system_message="Tu es un assistant expert en bilan carbone. Réponds uniquement en JSON valide."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        enrichment = json.loads(clean_response)
        return enrichment

async def main():
    import requests
    
    # Fetch all factors from API
    print("Fetching all factors from API...")
    API_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecotracker-39.preview.emergentagent.com')
    
    # Login
    login_resp = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": "newtest@x.com", "password": "test123"}
    )
    token = login_resp.json().get('token')
    
    # Get all factors
    headers = {"Authorization": f"Bearer {token}"}
    factors_resp = requests.get(f"{API_URL}/api/emission-factors", headers=headers)
    factors = factors_resp.json()
    
    print(f"Total factors to enrich: {len(factors)}")
    print("=" * 60)
    
    # Process in batches with concurrency limit
    semaphore = asyncio.Semaphore(5)  # Max 5 concurrent requests
    enriched_factors = []
    success_count = 0
    error_count = 0
    
    # Process all factors
    for i, factor in enumerate(factors):
        if (i + 1) % 50 == 0 or i == 0:
            print(f"\n[{i+1}/{len(factors)}] Processing...")
        
        try:
            enrichment = await enrich_factor(factor, semaphore)
            enriched_factor = {**factor, **enrichment}
            enriched_factors.append(enriched_factor)
            success_count += 1
            
            if (i + 1) % 100 == 0:
                print(f"  ✅ {success_count} enriched, {error_count} errors")
                # Save intermediate results
                with open("/app/scripts/factors_all_enriched_partial.json", "w", encoding="utf-8") as f:
                    json.dump(enriched_factors, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            error_count += 1
            enriched_factors.append(factor)  # Keep original
            if error_count <= 10:
                print(f"  ❌ Error on factor {i+1}: {str(e)[:100]}")
    
    # Save final results
    output_path = "/app/scripts/factors_all_enriched.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched_factors, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"✅ Enrichment complete!")
    print(f"   Success: {success_count}/{len(factors)}")
    print(f"   Errors: {error_count}")
    print(f"📄 Output saved to: {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
