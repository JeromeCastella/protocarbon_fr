import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { getStyles } from './wizardConstants';

export const StepGeneralInfo = ({ formData, setFormData, isDark }) => {
  const s = getStyles(isDark);
  return (
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
        <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Renseignez les informations de base de votre produit. Seul le nom est obligatoire pour continuer.
        </p>
      </div>
      <div>
        <label className={s.labelMd}>Nom du produit *</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Machine à laver XYZ" className={s.inputLg} data-testid="product-name-input" />
      </div>
      <div>
        <label className={s.labelMd}>Description</label>
        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3} placeholder="Description du produit..." className={s.inputLg} data-testid="product-description-input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={s.labelMd}>Type de produit</label>
          <select value={formData.product_type} onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
            className={s.inputLg} data-testid="product-type-select">
            <option value="finished">Produit fini</option>
            <option value="semi_finished">Produit semi-fini</option>
          </select>
        </div>
        <div>
          <label className={s.labelMd}>Unité de vente</label>
          <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className={s.inputLg} data-testid="product-unit-select">
            <option value="unit">Pièce/Unité</option>
            <option value="kg">Kilogramme</option>
            <option value="m2">Mètre carré</option>
            <option value="m3">Mètre cube</option>
            <option value="L">Litre</option>
          </select>
        </div>
      </div>
      <div>
        <label className={s.labelMd}>Durée de vie estimée (années)</label>
        <input type="number" min="1" max="30" step="1" value={formData.lifespan_years === 0 ? '' : formData.lifespan_years}
          onChange={(e) => setFormData({ ...formData, lifespan_years: parseFloat(e.target.value) || 0 })}
          className={s.inputLg} placeholder="0" data-testid="product-lifespan-input" />
      </div>
      {formData.product_type === 'semi_finished' && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'} flex items-start gap-3`}>
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            Un produit semi-fini nécessite une transformation chez le client avant utilisation. 
            Une étape supplémentaire sera ajoutée pour définir l&apos;énergie de transformation.
          </p>
        </div>
      )}
    </motion.div>
  );
};
