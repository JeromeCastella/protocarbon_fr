/**
 * Unit Labels - Display units in full words
 * Maps unit codes to human-readable labels in FR and DE
 */

export const UNIT_LABELS = {
  // Distance
  km: { fr: 'kilomètres', de: 'Kilometer' },
  m: { fr: 'mètres', de: 'Meter' },
  miles: { fr: 'miles', de: 'Meilen' },
  
  // Passenger distance
  'pkm': { fr: 'passagers-kilomètres', de: 'Personenkilometer' },
  'passager.km': { fr: 'passagers-kilomètres', de: 'Personenkilometer' },
  'p.km': { fr: 'passagers-kilomètres', de: 'Personenkilometer' },
  
  // Tonne-distance
  'tkm': { fr: 'tonnes-kilomètres', de: 'Tonnenkilometer' },
  't.km': { fr: 'tonnes-kilomètres', de: 'Tonnenkilometer' },
  
  // Energy
  kWh: { fr: 'kilowattheures', de: 'Kilowattstunden' },
  MWh: { fr: 'mégawattheures', de: 'Megawattstunden' },
  MJ: { fr: 'mégajoules', de: 'Megajoule' },
  GJ: { fr: 'gigajoules', de: 'Gigajoule' },
  therm: { fr: 'therms', de: 'Therms' },
  
  // Volume
  L: { fr: 'litres', de: 'Liter' },
  l: { fr: 'litres', de: 'Liter' },
  m3: { fr: 'mètres cubes', de: 'Kubikmeter' },
  'm³': { fr: 'mètres cubes', de: 'Kubikmeter' },
  gal: { fr: 'gallons', de: 'Gallonen' },
  
  // Mass
  kg: { fr: 'kilogrammes', de: 'Kilogramm' },
  g: { fr: 'grammes', de: 'Gramm' },
  t: { fr: 'tonnes', de: 'Tonnen' },
  lb: { fr: 'livres', de: 'Pfund' },
  
  // Area
  'm²': { fr: 'mètres carrés', de: 'Quadratmeter' },
  m2: { fr: 'mètres carrés', de: 'Quadratmeter' },
  ha: { fr: 'hectares', de: 'Hektar' },
  
  // Monetary
  CHF: { fr: 'francs suisses', de: 'Schweizer Franken' },
  kCHF: { fr: 'milliers de CHF', de: 'Tausend CHF' },
  EUR: { fr: 'euros', de: 'Euro' },
  
  // Quantity / Units
  'unités': { fr: 'unités', de: 'Einheiten' },
  'pièces': { fr: 'pièces', de: 'Stück' },
  'unit': { fr: 'unités', de: 'Einheiten' },
  'units': { fr: 'unités', de: 'Einheiten' },
  
  // Time
  h: { fr: 'heures', de: 'Stunden' },
  jour: { fr: 'jours', de: 'Tage' },
  'nuitées': { fr: 'nuitées', de: 'Übernachtungen' },
  
  // Specific units
  'repas': { fr: 'repas', de: 'Mahlzeiten' },
  'personne': { fr: 'personnes', de: 'Personen' },
};

/**
 * Get the display label for a unit
 * @param {string} unitCode - The unit code (e.g., "km", "kWh")
 * @param {string} language - "fr" or "de"
 * @returns {string} - The human-readable label
 */
export function getUnitLabel(unitCode, language = 'fr') {
  if (!unitCode) return '';
  
  const labels = UNIT_LABELS[unitCode];
  if (labels) {
    return labels[language] || labels.fr || unitCode;
  }
  
  // Fallback: return the code as-is
  return unitCode;
}

/**
 * Format a unit with its full label
 * @param {string} unitCode - The unit code
 * @param {string} language - "fr" or "de"
 * @param {boolean} showCode - Whether to show the code in parentheses
 * @returns {string} - Formatted label, e.g., "kilomètres (km)"
 */
export function formatUnitWithCode(unitCode, language = 'fr', showCode = true) {
  const label = getUnitLabel(unitCode, language);
  
  // If label is same as code, just return it
  if (label === unitCode) return unitCode;
  
  // Return label with code in parentheses
  return showCode ? `${label} (${unitCode})` : label;
}

export default {
  UNIT_LABELS,
  getUnitLabel,
  formatUnitWithCode,
};
