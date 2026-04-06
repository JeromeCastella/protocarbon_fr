import {
  Truck, Flame, Factory, Wind, Zap, Thermometer, Snowflake,
  ShoppingCart, Wrench, Fuel, Trash2, Plane, Car, Building, Settings,
  Power, Recycle, Home, Store, TrendingUp, Package,
} from 'lucide-react';

export const PRODUCT_SALE_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

export const PRODUITS_VENDUS_CARD = {
  code: 'produits_vendus',
  name_fr: 'Produits vendus',
  name_de: 'Verkaufte Produkte',
  scope: 'scope3_aval',
  icon: 'package',
  color: '#7c3aed',
};

export const SCOPE3_AMONT_CATEGORIES = new Set([
  'biens_services_achetes', 'biens_equipement', 'activites_combustibles_energie',
  'transport_distribution_amont', 'dechets_operations', 'deplacements_professionnels',
  'deplacements_domicile_travail', 'actifs_loues_amont',
]);

export const iconMap = {
  truck: Truck, flame: Flame, factory: Factory, wind: Wind, zap: Zap,
  thermometer: Thermometer, snowflake: Snowflake, 'shopping-cart': ShoppingCart,
  tool: Wrench, fuel: Fuel, trash: Trash2, plane: Plane, car: Car,
  building: Building, settings: Settings, power: Power, recycle: Recycle,
  home: Home, store: Store, 'trending-up': TrendingUp, package: Package,
};

export const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) return { value: '0', unit: 'kgCO2e' };
  const tonnes = valueInKg / 1000;
  if (tonnes >= 10) {
    return { value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), unit: 'tCO2e' };
  }
  return { value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), unit: 'kgCO2e' };
};

export const formatEmissionsForTable = (valueInKg, totalEmissionsKg) => {
  if (valueInKg === null || valueInKg === undefined) return '0.00 kgCO2e';
  const useTonnes = (totalEmissionsKg || 0) / 1000 >= 10;
  if (useTonnes) {
    return `${(valueInKg / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO2e`;
  }
  return `${valueInKg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO2e`;
};

export const normalizeScope = (scope, categoryId) => {
  if (!scope) return 'scope1';
  if (['scope1', 'scope2', 'scope3_amont', 'scope3_aval'].includes(scope)) return scope;
  if (scope === 'scope3_3') return 'scope3_amont';
  if (scope === 'scope3') return SCOPE3_AMONT_CATEGORIES.has(categoryId) ? 'scope3_amont' : 'scope3_aval';
  return 'scope1';
};
