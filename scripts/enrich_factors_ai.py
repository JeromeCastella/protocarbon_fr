#!/usr/bin/env python3
"""
Enrich 50 sample emission factors using AI (GPT-4o-mini via Emergent)
Sprint 1 - POC validation
"""
import json
import os
import sys
sys.path.insert(0, '/app/backend')

from emergentintegrations.llm.chat import LlmChat

EMERGENT_KEY = "sk-emergent-75eA3EbCd255bB1CeD"

ENRICHMENT_PROMPT = """Tu es un expert en bilan carbone pour des entreprises suisses. Tu dois enrichir les facteurs d'émission pour les rendre compréhensibles par des utilisateurs novices.

Pour chaque facteur, génère les champs suivants en JSON:

1. "name_simple_fr" (max 50 caractères): Un nom court et compréhensible en français courant.
   - Évite le jargon technique (pas de "Euro-6d", "EURO-6", etc. dans le nom simple)
   - Utilise des termes que tout le monde comprend
   - Exemples: "Voiture essence (berline)", "Vol Europe (économique)", "Électricité réseau suisse"

2. "name_simple_de" (max 50 caractères): Traduction allemande du nom simple.

3. "description_fr" (max 150 caractères): Une description avec exemples concrets.
   - Mentionne des exemples de véhicules, marques, ou situations
   - Donne une indication de consommation ou d'usage typique si pertinent

4. "description_de" (max 150 caractères): Traduction allemande de la description.

5. "search_tags" (liste de 5-10 mots): Mots-clés pour la recherche, incluant:
   - Synonymes courants (bagnole, auto, véhicule...)
   - Termes anglais si pertinents (car, truck, flight...)
   - Variantes orthographiques
   - Termes techniques simplifiés

6. "usage_hint_fr" (max 80 caractères): Conseil d'utilisation.
   - Quand utiliser ce facteur?
   - Pour quel type d'activité?

7. "usage_hint_de" (max 80 caractères): Traduction allemande.

8. "popularity_score" (0-100): Estimation de la fréquence d'utilisation.
   - 90-100: Très courant (voiture essence, électricité standard, vol Europe)
   - 70-89: Courant (bus, train, gaz naturel)
   - 50-69: Occasionnel (camion spécifique, matériau de construction courant)
   - 30-49: Rare (facteur technique spécialisé)
   - 0-29: Très rare (cas particuliers)

IMPORTANT:
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après
- Utilise des guillemets doubles pour les chaînes
- Assure-toi que le JSON est parsable

Facteur à enrichir:
"""

def enrich_factor(factor: dict) -> dict:
    """Enrich a single factor using AI."""
    
    # Prepare context for the AI
    factor_context = {
        "name_fr": factor.get("name_fr"),
        "name_de": factor.get("name_de"),
        "subcategory": factor.get("subcategory"),
        "input_units": factor.get("input_units"),
        "impacts": factor.get("impacts", [])[:2],  # First 2 impacts only
        "tags": factor.get("tags", [])[:5],  # First 5 tags only
        "source": factor.get("source"),
    }
    
    prompt = ENRICHMENT_PROMPT + json.dumps(factor_context, ensure_ascii=False, indent=2)
    
    chat = Chat(
        api_key=EMERGENT_KEY,
        model="gpt-4o-mini",
        system="Tu es un assistant expert en bilan carbone. Réponds uniquement en JSON valide."
    )
    
    response = chat.send_message(prompt)
    
    # Parse JSON response
    try:
        # Clean response (remove markdown code blocks if present)
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        enrichment = json.loads(clean_response)
        return enrichment
    except json.JSONDecodeError as e:
        print(f"  ⚠️ JSON parse error: {e}")
        print(f"  Response was: {response[:200]}...")
        return None

def main():
    # Load sample factors
    with open("/app/scripts/factors_sample_50.json", "r", encoding="utf-8") as f:
        factors = json.load(f)
    
    print(f"Enriching {len(factors)} factors...")
    print("=" * 60)
    
    enriched_factors = []
    success_count = 0
    
    for i, factor in enumerate(factors):
        print(f"\n[{i+1}/{len(factors)}] {factor.get('name_fr', 'Unknown')[:50]}...")
        
        try:
            enrichment = enrich_factor(factor)
            
            if enrichment:
                # Merge enrichment with original factor
                enriched_factor = {**factor, **enrichment}
                enriched_factors.append(enriched_factor)
                success_count += 1
                
                print(f"  ✅ {enrichment.get('name_simple_fr', 'N/A')}")
                print(f"     Tags: {', '.join(enrichment.get('search_tags', [])[:5])}")
                print(f"     Score: {enrichment.get('popularity_score', 'N/A')}")
            else:
                # Keep original factor without enrichment
                enriched_factors.append(factor)
                print(f"  ❌ Failed to enrich, keeping original")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            enriched_factors.append(factor)
    
    # Save enriched factors
    output_path = "/app/scripts/factors_sample_50_enriched.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(enriched_factors, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"✅ Enrichment complete: {success_count}/{len(factors)} successful")
    print(f"📄 Output saved to: {output_path}")

if __name__ == "__main__":
    main()
