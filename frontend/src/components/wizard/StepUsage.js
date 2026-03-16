import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Thermometer, Fuel, Wind } from 'lucide-react';
import { getStyles } from './wizardConstants';

const EnergyRow = ({ icon: Icon, iconColor, title, qtyLabel, qtyKey, factorKey, qtyValue, factorValue, factors, defaultLabel, onChange, isDark }) => {
  const s = getStyles(isDark);
  return (
    <div className={s.section}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={s.label}>{qtyLabel}</label>
          <input type="number" min="0" step="0.001" value={qtyValue === 0 ? '' : qtyValue}
            onChange={(e) => onChange(qtyKey, parseFloat(e.target.value) || 0)}
            className={s.input} placeholder="0" data-testid={`usage-${qtyKey.replace('_per_cycle', '')}`} />
        </div>
        <div>
          <label className={s.label}>Facteur d&apos;émission</label>
          <select value={factorValue} onChange={(e) => onChange(factorKey, e.target.value)}
            className={s.input} data-testid={`usage-${factorKey}`}>
            <option value="">{defaultLabel || 'Sélectionner...'}</option>
            {factors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export const StepUsage = ({ formData, setFormData, electricityFactors, fuelFactors, carburantFactors, refrigerantFactors, isDark }) => {
  const s = getStyles(isDark);
  const u = formData.usage;
  const updateField = (key, value) => setFormData(prev => ({ ...prev, usage: { ...prev.usage, [key]: value } }));
  const totalCycles = Math.round(formData.lifespan_years * u.cycles_per_year);

  return (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Consommations en phase d&apos;utilisation (Scope 3.11)</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Estimez ce que consomme votre produit à chaque utilisation (un cycle de lavage, un trajet, une journée...).
        </p>
      </div>
      <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className={`block text-xs mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Nombre de cycles par an</label>
            <input type="number" min="1" value={u.cycles_per_year === 0 ? '' : u.cycles_per_year}
              onChange={(e) => updateField('cycles_per_year', parseInt(e.target.value) || 1)}
              className={s.input} placeholder="1" data-testid="usage-cycles-input" />
          </div>
          <div className={`text-center px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total cycles sur la vie</p>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="usage-total-cycles">{totalCycles}</p>
          </div>
        </div>
      </div>
      <EnergyRow icon={Zap} iconColor="text-yellow-500" title="Consommation électrique"
        qtyLabel="Kilowattheures par cycle d'utilisation" qtyKey="electricity_kwh_per_cycle" factorKey="electricity_factor_id"
        qtyValue={u.electricity_kwh_per_cycle} factorValue={u.electricity_factor_id}
        factors={electricityFactors} defaultLabel="Par défaut (mix national)" onChange={updateField} isDark={isDark} />
      <EnergyRow icon={Thermometer} iconColor="text-orange-500" title="Combustible (gaz, fioul)"
        qtyLabel="kWh par cycle" qtyKey="fuel_kwh_per_cycle" factorKey="fuel_factor_id"
        qtyValue={u.fuel_kwh_per_cycle} factorValue={u.fuel_factor_id}
        factors={fuelFactors} defaultLabel="Par défaut (Gaz naturel)" onChange={updateField} isDark={isDark} />
      <EnergyRow icon={Fuel} iconColor="text-red-500" title="Carburant (essence, diesel)"
        qtyLabel="Litres par cycle" qtyKey="carburant_l_per_cycle" factorKey="carburant_factor_id"
        qtyValue={u.carburant_l_per_cycle} factorValue={u.carburant_factor_id}
        factors={carburantFactors} defaultLabel="Par défaut (Diesel)" onChange={updateField} isDark={isDark} />
      <EnergyRow icon={Wind} iconColor="text-cyan-500" title="Réfrigérants (fuites)"
        qtyLabel="kg par cycle (fuites estimées)" qtyKey="refrigerant_kg_per_cycle" factorKey="refrigerant_factor_id"
        qtyValue={u.refrigerant_kg_per_cycle} factorValue={u.refrigerant_factor_id}
        factors={refrigerantFactors} onChange={updateField} isDark={isDark} />
    </motion.div>
  );
};
