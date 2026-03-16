import React from 'react';
import { motion } from 'framer-motion';
import { Package, Factory, Leaf, Recycle, Info } from 'lucide-react';
import { getStyles } from './wizardConstants';

export const StepSummary = ({ formData, emissionsPreview, goToStep, isDark }) => {
  const s = getStyles(isDark);
  const editBtn = (step, label) => (
    <button onClick={() => goToStep(step)} data-testid={`summary-edit-step${step}`}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}>
      {label}
    </button>
  );

  return (
    <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Résumé de la fiche produit</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Vérifiez les informations avant de sauvegarder</p>
      </div>

      {/* Product info */}
      <div className={s.section}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.name}</h4>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {formData.product_type === 'semi_finished' ? 'Produit semi-fini' : 'Produit fini'} · 
                Durée de vie : {formData.lifespan_years} an(s)
                {formData.end_of_life.length > 0 && ` · ${formData.end_of_life.length} traitement(s) fin de vie`}
              </p>
            </div>
          </div>
          {editBtn(1, 'Modifier')}
        </div>
      </div>

      {/* Emissions breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Répartition des émissions</h4>
          <div className="flex gap-2">
            {formData.product_type === 'semi_finished' && editBtn(2, 'Transformation')}
            {editBtn(3, 'Utilisation')}
            {editBtn(4, 'Fin de vie')}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {formData.product_type === 'semi_finished' && (
            <EmissionCard icon={Factory} color="orange" label="Transformation" value={emissionsPreview.transformation} isDark={isDark} />
          )}
          <EmissionCard icon={Leaf} color="green" label="Utilisation" value={emissionsPreview.usage} isDark={isDark} />
          <EmissionCard icon={Recycle} color="blue" label="Fin de vie" value={emissionsPreview.disposal} isDark={isDark} />
        </div>
      </div>

      {/* Total */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm">Émissions totales par unité vendue</p>
            <p className="text-4xl font-bold mt-1" data-testid="summary-total-emissions">{emissionsPreview.total.toFixed(3)} kgCO2e</p>
          </div>
          <div className="text-right">
            <p className="text-purple-200 text-sm">Soit pour 100 unités</p>
            <p className="text-2xl font-bold">{(emissionsPreview.total * 100 / 1000).toFixed(2)} tCO2e</p>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'} flex items-start gap-3`}>
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          Lors de l&apos;enregistrement d&apos;une vente, les émissions seront automatiquement ventilées 
          dans les catégories <strong>Transformation (3.10)</strong>, <strong>Utilisation (3.11)</strong> et <strong>Fin de vie (3.12)</strong>.
        </p>
      </div>
    </motion.div>
  );
};

const EmissionCard = ({ icon: Icon, color, label, value, isDark }) => {
  const colorMap = {
    orange: { bg: isDark ? 'bg-orange-500/20' : 'bg-orange-50', text: 'text-orange-500', label: isDark ? 'text-orange-300' : 'text-orange-700', sub: isDark ? 'text-orange-300' : 'text-orange-600' },
    green:  { bg: isDark ? 'bg-green-500/20' : 'bg-green-50', text: 'text-green-500', label: isDark ? 'text-green-300' : 'text-green-700', sub: isDark ? 'text-green-300' : 'text-green-600' },
    blue:   { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-50', text: 'text-blue-500', label: isDark ? 'text-blue-300' : 'text-blue-700', sub: isDark ? 'text-blue-300' : 'text-blue-600' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`p-4 rounded-xl ${c.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${c.text}`} />
        <span className={`text-sm ${c.label}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value.toFixed(3)}</p>
      <p className={`text-xs ${c.sub}`}>kgCO2e/unité</p>
    </div>
  );
};
