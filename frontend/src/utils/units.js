/**
 * Utilitaires pour la normalisation et conversion des unités
 * Gère les dimensions (énergie, distance, masse, volume, monétaire)
 * et les conversions entre unités d'une même dimension
 */

// ==================== DIMENSIONS ET CONVERSIONS ====================

export const UNIT_DIMENSIONS = {
  energy: {
    label_fr: "Énergie",
    label_de: "Energie",
    base_unit: "kWh",
    units: {
      kWh:   { label_fr: "kilowattheures",  label_de: "Kilowattstunden", to_base: 1 },
      MWh:   { label_fr: "mégawattheures",  label_de: "Megawattstunden", to_base: 1000 },
      MJ:    { label_fr: "mégajoules",      label_de: "Megajoule",       to_base: 0.2778 },
      GJ:    { label_fr: "gigajoules",      label_de: "Gigajoule",       to_base: 277.78 },
      therm: { label_fr: "therms",          label_de: "Therms",          to_base: 29.3 },
    }
  },
  distance: {
    label_fr: "Distance",
    label_de: "Distanz",
    base_unit: "km",
    units: {
      km:    { label_fr: "kilomètres",      label_de: "Kilometer",       to_base: 1 },
      m:     { label_fr: "mètres",          label_de: "Meter",           to_base: 0.001 },
      miles: { label_fr: "miles",           label_de: "Meilen",          to_base: 1.60934 },
    }
  },
  mass: {
    label_fr: "Masse",
    label_de: "Masse",
    base_unit: "kg",
    units: {
      kg: { label_fr: "kilogrammes",  label_de: "Kilogramm",  to_base: 1 },
      t:  { label_fr: "tonnes",       label_de: "Tonnen",     to_base: 1000 },
      g:  { label_fr: "grammes",      label_de: "Gramm",      to_base: 0.001 },
      lb: { label_fr: "livres",       label_de: "Pfund",      to_base: 0.453592 },
    }
  },
  volume: {
    label_fr: "Volume",
    label_de: "Volumen",
    base_unit: "L",
    units: {
      L:   { label_fr: "litres",       label_de: "Liter",       to_base: 1 },
      m3:  { label_fr: "mètres cubes", label_de: "Kubikmeter",  to_base: 1000 },
      gal: { label_fr: "gallons",      label_de: "Gallonen",    to_base: 3.78541 },
    }
  },
  monetary: {
    label_fr: "Monétaire",
    label_de: "Monetär",
    base_unit: "CHF",
    units: {
      CHF:  { label_fr: "francs suisses",   label_de: "Schweizer Franken", to_base: 1 },
      kCHF: { label_fr: "milliers de CHF",  label_de: "Tausend CHF",       to_base: 1000 },
    }
  }
};

// ==================== ALIAS POUR NORMALISATION ====================

const UNIT_ALIASES = {
  'litre': 'L', 'litres': 'L', 'liter': 'L', 'l': 'L',
  'passager.km': 'pkm', 'passager-km': 'pkm', 'passager km': 'pkm',
  'stk': 'Stk.', 'stück': 'Stk.', 'stuck': 'Stk.',
  'piece': 'p', 'pièce': 'p', 'pièces': 'p', 'unité': 'p', 'unités': 'p',
  'm²': 'm2', 'mètre carré': 'm2', 'mètres carrés': 'm2',
  'm³': 'm3', 'mètre cube': 'm3', 'mètres cubes': 'm3',
  'kwh': 'kWh', 'KWH': 'kWh', 'Kwh': 'kWh',
  'mwh': 'MWh', 'MWH': 'MWh', 'Mwh': 'MWh',
  'mj': 'MJ',
  'kilogramme': 'kg', 'kilogrammes': 'kg', 'kilo': 'kg', 'kilos': 'kg',
  'kchf': 'kCHF', 'KCHF': 'kCHF',
  'heure': 'h', 'heures': 'h',
  'kwp': 'kWp', 'KWP': 'kWp',
};

// ==================== FONCTIONS DE NORMALISATION ====================

export const normalizeUnit = (unit) => {
  if (!unit) return '';
  const trimmed = unit.trim();
  const lower = trimmed.toLowerCase();
  return UNIT_ALIASES[lower] || UNIT_ALIASES[trimmed] || trimmed;
};

export const unitsMatch = (unit1, unit2) => {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
};

// ==================== FONCTIONS DE DIMENSION ====================

/**
 * Trouve la dimension d'une unité (energy, distance, mass, volume, monetary)
 * @returns {string|null} clé de dimension ou null
 */
export const findDimension = (unitCode) => {
  if (!unitCode) return null;
  const normalized = normalizeUnit(unitCode);
  for (const [dimKey, dim] of Object.entries(UNIT_DIMENSIONS)) {
    if (dim.units[normalized]) return dimKey;
  }
  return null;
};

/**
 * Retourne toutes les unités compatibles (même dimension)
 * @returns {string[]} liste des codes d'unités
 */
export const getCompatibleUnits = (unitCode) => {
  const dimension = findDimension(unitCode);
  if (!dimension) return [unitCode];
  return Object.keys(UNIT_DIMENSIONS[dimension].units);
};

/**
 * Convertit une valeur vers l'unité de base de sa dimension
 * Ex: convertToBase(500, 'MJ') → 138.89 (kWh)
 */
export const convertToBase = (value, unitCode) => {
  const dimension = findDimension(unitCode);
  if (!dimension) return value;
  const normalized = normalizeUnit(unitCode);
  const unitDef = UNIT_DIMENSIONS[dimension].units[normalized];
  if (!unitDef) return value;
  return value * unitDef.to_base;
};

/**
 * Retourne le facteur de conversion to_base pour une unité
 */
export const getToBaseFactor = (unitCode) => {
  const dimension = findDimension(unitCode);
  if (!dimension) return 1;
  const normalized = normalizeUnit(unitCode);
  const unitDef = UNIT_DIMENSIONS[dimension].units[normalized];
  return unitDef ? unitDef.to_base : 1;
};

/**
 * Convertit une valeur d'une unité à une autre (même dimension)
 * Ex: convertUnit(500, 'MJ', 'kWh') → 138.89
 */
export const convertUnit = (value, fromUnit, toUnit) => {
  if (!fromUnit || !toUnit) return value;
  const fromNorm = normalizeUnit(fromUnit);
  const toNorm = normalizeUnit(toUnit);
  if (fromNorm === toNorm) return value;
  
  const dim = findDimension(fromUnit);
  if (!dim) return value;
  
  const fromDef = UNIT_DIMENSIONS[dim].units[fromNorm];
  const toDef = UNIT_DIMENSIONS[dim].units[toNorm];
  if (!fromDef || !toDef) return value;
  
  // Convertir via la base : from → base → to
  const baseValue = value * fromDef.to_base;
  return baseValue / toDef.to_base;
};

/**
 * Retourne l'unité de base d'une dimension pour un code d'unité donné
 */
export const getBaseUnit = (unitCode) => {
  const dimension = findDimension(unitCode);
  if (!dimension) return unitCode;
  return UNIT_DIMENSIONS[dimension].base_unit;
};

/**
 * Retourne le label de la dimension pour une unité donnée
 */
export const getDimensionLabel = (unitCode, language = 'fr') => {
  const dimension = findDimension(unitCode);
  if (!dimension) return null;
  const dim = UNIT_DIMENSIONS[dimension];
  return language === 'de' ? dim.label_de : dim.label_fr;
};

// ==================== FONCTIONS DE FILTRAGE DE FACTEURS ====================

/**
 * Filtre les facteurs par unité avec matching strict
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
 * Filtre les facteurs par unité OU par unité convertible (même dimension)
 * Retourne les facteurs dont input_units contient une unité de la même dimension
 */
export const filterFactorsByDimension = (factors, selectedUnit) => {
  if (!selectedUnit || !factors) return factors || [];
  const normalizedSelected = normalizeUnit(selectedUnit);
  const compatibleUnits = getCompatibleUnits(normalizedSelected);
  
  return factors.filter(factor => {
    const inputUnits = factor.input_units || [];
    return inputUnits.some(u => compatibleUnits.includes(normalizeUnit(u)));
  });
};

/**
 * Extrait les unités disponibles à partir des facteurs,
 * enrichies avec les unités convertibles de la même dimension
 * @returns {{ native: string[], converted: string[], all: string[] }}
 */
export const getAvailableUnitsWithConversions = (factors) => {
  if (!factors || !Array.isArray(factors)) return { native: [], converted: [], all: [] };
  
  // Collecter les unités natives des facteurs
  const nativeSet = new Set();
  factors.forEach(factor => {
    if (factor.input_units && Array.isArray(factor.input_units)) {
      factor.input_units.forEach(u => nativeSet.add(normalizeUnit(u)));
    }
  });
  
  const native = Array.from(nativeSet);
  
  // Pour chaque unité native, trouver les unités convertibles de la même dimension
  const convertedSet = new Set();
  native.forEach(unit => {
    const compatible = getCompatibleUnits(unit);
    compatible.forEach(cu => {
      if (!nativeSet.has(cu)) {
        convertedSet.add(cu);
      }
    });
  });
  
  const converted = Array.from(convertedSet);
  const all = [...native, ...converted].sort();
  
  return { native, converted, all };
};

/**
 * Extrait les unités disponibles depuis les facteurs (legacy - compatibilité)
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

/**
 * Trouve l'unité native du facteur qui est dans la même dimension que l'unité sélectionnée
 * Ex: selectedUnit='MJ' et factor.input_units=['kWh'] → retourne 'kWh'
 */
export const findFactorNativeUnit = (factor, selectedUnit) => {
  if (!factor || !selectedUnit) return selectedUnit;
  const inputUnits = factor.input_units || [];
  const normalizedSelected = normalizeUnit(selectedUnit);
  
  // Si l'unité est déjà native, la retourner
  if (inputUnits.some(u => normalizeUnit(u) === normalizedSelected)) {
    return normalizedSelected;
  }
  
  // Sinon, chercher une unité native dans la même dimension
  const compatibleUnits = getCompatibleUnits(normalizedSelected);
  for (const iu of inputUnits) {
    if (compatibleUnits.includes(normalizeUnit(iu))) {
      return normalizeUnit(iu);
    }
  }
  
  return selectedUnit;
};

export default {
  UNIT_DIMENSIONS,
  normalizeUnit,
  unitsMatch,
  findDimension,
  getCompatibleUnits,
  convertToBase,
  getToBaseFactor,
  convertUnit,
  getBaseUnit,
  getDimensionLabel,
  filterFactorsByUnitStrict,
  filterFactorsByDimension,
  getAvailableUnitsWithConversions,
  getAvailableUnitsFromFactors,
  findFactorNativeUnit,
  UNIT_ALIASES
};
