import {
  Truck, Flame, Factory, Wind, Zap, Thermometer, Snowflake,
  ShoppingCart, Wrench, Fuel, Trash2, Plane, Car, Building,
  Settings, Power, Recycle, Home, Store, TrendingUp, Package
} from 'lucide-react';

export const SCOPE_COLORS = {
  scope1: '#FB923C',
  scope2: '#60A5FA',
  scope3_amont: '#A78BFA',
  scope3_aval: '#F9A8D4',
  scope3: '#A78BFA'
};

export const CATEGORY_COLORS = [
  '#A78BFA', '#60A5FA', '#34D399', '#6EE7B7',
  '#FCD34D', '#FCA5A5', '#F9A8D4', '#818CF8',
  '#BEF264', '#FB923C'
];

export const iconMap = {
  truck: Truck, flame: Flame, factory: Factory, wind: Wind, zap: Zap,
  thermometer: Thermometer, snowflake: Snowflake, 'shopping-cart': ShoppingCart,
  tool: Wrench, fuel: Fuel, trash: Trash2, plane: Plane, car: Car,
  building: Building, settings: Settings, power: Power, recycle: Recycle,
  home: Home, store: Store, 'trending-up': TrendingUp, package: Package
};

export const CATEGORY_ICONS = {
  combustion_mobile: 'truck', combustion_fixe: 'flame',
  emissions_procedes: 'factory', emissions_fugitives: 'wind',
  electricite: 'zap', chaleur_vapeur: 'thermometer',
  refroidissement: 'snowflake', biens_services_achetes: 'shopping-cart',
  biens_equipement: 'tool', activites_combustibles_energie: 'fuel',
  transport_distribution_amont: 'truck', dechets_operations: 'trash',
  deplacements_professionnels: 'plane', deplacements_domicile_travail: 'car',
  actifs_loues_amont: 'building', transport_distribution_aval: 'truck',
  transformation_produits: 'settings', utilisation_produits: 'power',
  fin_vie_produits: 'recycle', actifs_loues_aval: 'home',
  franchises: 'store', investissements: 'trending-up'
};

export const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined || valueInKg === 0) {
    return { value: '0', unit: 'tCO₂e' };
  }
  const tonnes = valueInKg / 1000;
  return {
    value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 }),
    unit: 'tCO₂e'
  };
};

export const formatChartValue = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) return '0 tCO₂e';
  const tonnes = valueInKg / 1000;
  return tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' tCO₂e';
};
