/**
 * Factor Search Utility using Fuse.js
 * Provides fuzzy search on enriched emission factors
 */
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: [
    { name: 'name_simple_fr', weight: 3 },
    { name: 'name_simple_de', weight: 3 },
    { name: 'search_tags', weight: 2 },
    { name: 'description_fr', weight: 1 },
    { name: 'description_de', weight: 1 },
    { name: 'name_fr', weight: 0.5 },
    { name: 'name_de', weight: 0.5 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

/**
 * Create a Fuse search index for factors
 */
export function createFactorSearchIndex(factors) {
  return new Fuse(factors, fuseOptions);
}

/**
 * Search factors using fuzzy matching
 * @param {Fuse} fuse - The Fuse instance
 * @param {string} query - Search query
 * @returns {Array|null} - Matching factors or null if no query
 */
export function searchFactors(fuse, query) {
  if (!query || query.trim().length < 2) return null;
  
  const results = fuse.search(query.trim());
  return results.map(result => result.item);
}

/**
 * Sort factors by relevance for display
 * @param {Array} factors - List of factors
 * @param {string} language - 'fr' or 'de'
 * @returns {Array} - Sorted factors
 */
export function sortFactorsByRelevance(factors, language = 'fr') {
  return [...factors].sort((a, b) => {
    // Primary: popularity_score (descending)
    const scoreA = a.popularity_score ?? 50;
    const scoreB = b.popularity_score ?? 50;
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    // Secondary: alphabetical by simple name
    const nameField = language === 'fr' ? 'name_simple_fr' : 'name_simple_de';
    const nameA = a[nameField] || a.name_fr || '';
    const nameB = b[nameField] || b.name_fr || '';
    return nameA.localeCompare(nameB);
  });
}

export default {
  createFactorSearchIndex,
  searchFactors,
  sortFactorsByRelevance,
};
