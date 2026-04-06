import { Factory, Zap, Truck, Leaf } from 'lucide-react';

// Scope styling constants
export const SCOPE_COLORS = {
  scope1: 'bg-blue-500',
  scope2: 'bg-cyan-500',
  scope3_amont: 'bg-amber-500',
  scope3_aval: 'bg-indigo-500',
};

export const SCOPE_ICONS = {
  scope1: Factory,
  scope2: Zap,
  scope3_amont: Truck,
  scope3_aval: Leaf,
};

export const CHART_COLORS = {
  scope1: '#FB923C',
  scope2: '#60A5FA',
  scope3_amont: '#A78BFA',
  scope3_aval: '#F9A8D4',
};

export const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO2e' };
  }
  const tonnes = valueInKg / 1000;
  if (tonnes >= 10) {
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'tCO2e'
    };
  }
  return {
    value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
    unit: 'kgCO2e'
  };
};

export const formatChartValue = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) return '0';
  const tonnes = valueInKg / 1000;
  return tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' tCO2e';
};
