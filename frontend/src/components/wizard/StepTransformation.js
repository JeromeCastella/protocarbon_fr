import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Fuel } from 'lucide-react';
import { getStyles } from './wizardConstants';

const EnergySection = ({ icon: Icon, iconColor, title, qtyLabel, qtyKey, factorKey, qtyValue, factorValue, factors, onChange, isDark }) => {
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
          <input type="number" min="0" step="0.01" value={qtyValue === 0 ? '' : qtyValue}
            onChange={(e) => onChange(qtyKey, parseFloat(e.target.value) || 0)}
            className={s.input} placeholder="0" data-testid={`trans-${qtyKey}`} />
        </div>
        <div>
          <label className={s.label}>Facteur d&apos;émission</label>
          <select value={factorValue} onChange={(e) => onChange(factorKey, e.target.value)}
            className={s.input} data-testid={`trans-${factorKey}`}>
            <option value="">Sélectionner...</option>
            {factors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export const StepTransformation = ({ formData, setFormData, electricityFactors, fuelFactors, isDark }) => {
  const updateField = (key, value) => setFormData(prev => ({ ...prev, transformation: { ...prev.transformation, [key]: value } }));
  const t = formData.transformation;

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Énergie de transformation (Scope 3.10)</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Définissez l&apos;énergie nécessaire pour transformer ce produit semi-fini chez le client.
        </p>
      </div>
      <EnergySection icon={Zap} iconColor="text-yellow-500" title="Consommation électrique"
        qtyLabel="Kilowattheures par unité produite" qtyKey="electricity_kwh" factorKey="electricity_factor_id"
        qtyValue={t.electricity_kwh} factorValue={t.electricity_factor_id}
        factors={electricityFactors} onChange={updateField} isDark={isDark} />
      <EnergySection icon={Fuel} iconColor="text-orange-500" title="Combustible (gaz, fioul)"
        qtyLabel="Consommation (kWh/unité)" qtyKey="fuel_kwh" factorKey="fuel_factor_id"
        qtyValue={t.fuel_kwh} factorValue={t.fuel_factor_id}
        factors={fuelFactors} onChange={updateField} isDark={isDark} />
    </motion.div>
  );
};
