export const INITIAL_FORM = {
  name: '',
  description: '',
  product_type: 'finished',
  unit: 'unit',
  lifespan_years: 1,
  transformation: {
    electricity_kwh: 0,
    electricity_factor_id: '',
    fuel_kwh: 0,
    fuel_factor_id: '',
    carburant_l: 0,
    carburant_factor_id: '',
    refrigerant_kg: 0,
    refrigerant_factor_id: '',
  },
  usage: {
    electricity_kwh_per_cycle: 0,
    electricity_factor_id: '',
    fuel_kwh_per_cycle: 0,
    fuel_factor_id: '',
    carburant_l_per_cycle: 0,
    carburant_factor_id: '',
    refrigerant_kg_per_cycle: 0,
    refrigerant_factor_id: '',
    cycles_per_year: 1
  },
  end_of_life: []
};

export const getStyles = (isDark) => ({
  input: `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`,
  inputLg: `w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`,
  label: `block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`,
  labelMd: `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`,
  section: `p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`,
});
