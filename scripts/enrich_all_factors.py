#!/usr/bin/env python3
"""
Enrich ALL emission factors using Claude Haiku via Anthropic API
With rate limiting and retry logic
"""
import json
import asyncio
import uuid
import os
import time
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage

ANTHROPIC_KEY = os.environ.get('ANTHROPIC_API_KEY')

ENRICHMENT_PROMPT = """Tu es un expert en bilan carbone pour des entreprises suisses. Tu dois enrichir les facteurs d'émission pour les rendre compréhensibles par des utilisateurs novices.

Pour chaque facteur, génère les champs suivants en JSON:

1. "name_simple_fr" (max 50 caractères): Nom court et compréhensible en français courant. Évite le jargon technique.

2. "name_simple_de" (max 50 caractères): Traduction allemande.

3. "description_fr" (max 150 caractères): Description avec exemples concrets.

4. "description_de" (max 150 caractères): Traduction allemande.

5. "search_tags" (liste de 5-10 mots): Mots-clés pour la recherche (synonymes, anglais, variantes).

6. "usage_hint_fr" (max 80 caractères): Quand utiliser ce facteur?

7. "usage_hint_de" (max 80 caractères): Traduction allemande.

8. "popularity_score" (0-100): 90-100=très courant, 70-89=courant, 50-69=occasionnel, 30-49=rare, 0-29=très rare.

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide.

Facteur:
"""

async def enrich_factor_with_retry(factor: dict, max_retries: int = 3) -> dict:
    """Enrich a factor with retry logic for rate limits."""
    
    factor_context = {
        "name_fr": factor.get("name_fr"),
        "name_de": factor.get("name_de"),
        "subcategory": factor.get("subcategory"),
        "input_units": factor.get("input_units"),
        "impacts": factor.get("impacts", [])[:2],
        "source": factor.get("source"),
    }
    
    prompt = ENRICHMENT_PROMPT + json.dumps(factor_context, ensure_ascii=False)
    
    for attempt in range(max_retries):
        try:
            chat = LlmChat(
                api_key=ANTHROPIC_KEY,
                session_id=f"enrich-{uuid.uuid4()}",
                system_message="Réponds uniquement en JSON valide."
            ).with_model("anthropic", "claude-haiku-4-5-20251001")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            return json.loads(clean_response)
            
        except Exception as e:
            if "RateLimitError" in str(type(e).__name__) or "rate" in str(e).lower():
                wait_time = (attempt + 1) * 2  # Exponential backoff
                await asyncio.sleep(wait_time)
            else:
                raise e
    
    return None

async def main():
    import requests
    
    print("Fetching all factors from API...")
    API_URL = 'https://impact-measure-5.preview.emergentagent.com'
    
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
    print("Processing with rate limiting (1 request per second)...")
    
    enriched_factors = []
    success_count = 0
    error_count = 0
    
    for i, factor in enumerate(factors):
        # Progress every 50
        if (i + 1) % 50 == 0 or i == 0:
            print(f"\n[{i+1}/{len(factors)}] - Success: {success_count}, Errors: {error_count}")
        
        try:
            enrichment = await enrich_factor_with_retry(factor)
            
            if enrichment:
                enriched_factor = {**factor, **enrichment}
                enriched_factors.append(enriched_factor)
                success_count += 1
            else:
                enriched_factors.append(factor)
                error_count += 1
                
        except Exception as e:
            error_count += 1
            enriched_factors.append(factor)
            if error_count <= 20:
                print(f"  ❌ Error on factor {i+1}: {str(e)[:80]}")
        
        # Rate limiting: wait between requests
        await asyncio.sleep(0.5)  # 2 requests per second max
        
        # Save checkpoint every 100 factors
        if (i + 1) % 100 == 0:
            with open("/app/scripts/factors_checkpoint.json", "w", encoding="utf-8") as f:
                json.dump(enriched_factors, f, indent=2, ensure_ascii=False)
            print(f"  💾 Checkpoint saved")
    
    # Save final results
    output_path = "/app/scripts/factors_all_enriched.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched_factors, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"✅ Enrichment complete!")
    print(f"   Success: {success_count}/{len(factors)} ({success_count*100/len(factors):.1f}%)")
    print(f"   Errors: {error_count}")
    print(f"📄 Output saved to: {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
