/**
 * Utilitaires pour la normalisation des unités
 * Permet un matching strict entre l'unité sélectionnée et les input_units des facteurs
 */

// Table des alias d'unités pour normalisation
const UNIT_ALIASES = {
  // Volume
  'litre': 'L',
  'litres': 'L',
  'liter': 'L',
  'l': 'L',
  
  // Distance combinée (passager-kilomètre)
  'passager.km': 'pkm',
  'passager-km': 'pkm',
  'passager km': 'pkm',
  
  // Pièces / Unités
  'stk': 'Stk.',
  'stück': 'Stk.',
  'stuck': 'Stk.',
  'piece': 'p',
  'pièce': 'p',
  'pièces': 'p',
  'unité': 'p',
  'unités': 'p',
  
  // Surface
  'm²': 'm2',
  'mètre carré': 'm2',
  'mètres carrés': 'm2',
  
  // Volume (mètre cube)
  'm³': 'm3',
  'mètre cube': 'm3',
  'mètres cubes': 'm3',
  
  // Énergie (normalisation casse)
  'kwh': 'kWh',
  'KWH': 'kWh',
  'Kwh': 'kWh',
  'mwh': 'MWh',
  'MWH': 'MWh',
  'Mwh': 'MWh',
  'mj': 'MJ',
  
  // Masse
  'kilogramme': 'kg',
  'kilogrammes': 'kg',
  'kilo': 'kg',
  'kilos': 'kg',
  
  // Monnaie
  'kchf': 'kCHF',
  'KCHF': 'kCHF',
  
  // Temps
  'heure': 'h',
  'heures': 'h',
  
  // Puissance solaire
  'kwp': 'kWp',
  'KWP': 'kWp',
};

/**
 * Normalise une unité pour permettre le matching strict
 * @param {string} unit - L'unité à normaliser
 * @returns {string} - L'unité normalisée
 */
export const normalizeUnit = (unit) => {
  if (!unit) return '';
  const trimmed = unit.trim();
  const lower = trimmed.toLowerCase();
  return UNIT_ALIASES[lower] || UNIT_ALIASES[trimmed] || trimmed;
};

/**
 * Vérifie si deux unités sont équivalentes après normalisation
 * @param {string} unit1 
 * @param {string} unit2 
 * @returns {boolean}
 */
export const unitsMatch = (unit1, unit2) => {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
};

/**
 * Filtre les facteurs par unité avec matching strict
 * @param {Array} factors - Liste des facteurs d'émission
 * @param {string} selectedUnit - L'unité sélectionnée par l'utilisateur
 * @returns {Array} - Facteurs dont input_units contient l'unité sélectionnée
 */
export const filterFactorsByUnitStrict = (factors, selectedUnit) => {
  if (!selectedUnit || !factors) return factors || [];
  
  const normalizedSelected = normalizeUnit(selectedUnit);
  
  return factors.filter(factor => {
    const inputUnits = factor.input_units || [];
    return inputUnits.some(u => normalizeUnit(u) === normalizedSelected);
  });
};

/**
 * Extrait les unités disponibles à partir d'une liste de facteurs
 * @param {Array} factors - Liste des facteurs d'émission
 * @returns {Array} - Liste triée des unités uniques
 */
export const getAvailableUnitsFromFactors = (factors) => {
  if (!factors || !Array.isArray(factors)) return [];
  
  const units = new Set();
  
  factors.forEach(factor => {
    if (factor.input_units && Array.isArray(factor.input_units)) {
      factor.input_units.forEach(u => units.add(u));
    }
  });
  
  return Array.from(units).sort();
};

export default {
  normalizeUnit,
  unitsMatch,
  filterFactorsByUnitStrict,
  getAvailableUnitsFromFactors,
  UNIT_ALIASES
};
