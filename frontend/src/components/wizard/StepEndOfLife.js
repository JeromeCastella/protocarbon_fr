import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Recycle, Info, Search } from 'lucide-react';
import { getStyles } from './wizardConstants';

export const StepEndOfLife = ({ formData, treatments, filteredTreatments, eolSearch, setEolSearch,
  addEndOfLifeEntry, updateEndOfLifeEntry, removeEndOfLifeEntry, isDark }) => {
  const s = getStyles(isDark);

  return (
    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fin de vie du produit (Scope 3.12)</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Définissez les traitements en fin de vie : incinération, mise en décharge, recyclage, etc.
          </p>
        </div>
        <button onClick={addEndOfLifeEntry} data-testid="eol-add-btn"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex-shrink-0">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className={`p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
        <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Sélectionnez un facteur d'émission par type de déchet et indiquez la quantité en kg par unité de produit. Cette étape est optionnelle.
        </p>
      </div>

      {treatments.length > 0 && (
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input type="text" value={eolSearch} onChange={(e) => setEolSearch(e.target.value)}
            placeholder="Rechercher un facteur de fin de vie..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 placeholder:text-gray-400'}`}
            data-testid="eol-search-input" />
        </div>
      )}

      {formData.end_of_life.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
          <Recycle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            Aucun traitement défini. Cliquez sur &quot;Ajouter&quot; pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.end_of_life.map((entry, index) => {
            const selectedFactor = treatments.find(t => t.id === entry.emission_factor_id);
            const factorLabel = selectedFactor ? (selectedFactor.name_simple_fr || selectedFactor.name_fr || selectedFactor.name) : `Ligne ${index + 1}`;
            const entryEmissions = selectedFactor && entry.quantity > 0 ? entry.quantity * (selectedFactor.value || 0) : 0;

            return (
              <div key={index} className={s.section} data-testid={`eol-entry-${index}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Recycle className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{factorLabel}</span>
                    {entryEmissions > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`}
                        data-testid={`eol-emissions-${index}`}>{entryEmissions.toFixed(3)} kgCO2e</span>
                    )}
                  </div>
                  <button onClick={() => removeEndOfLifeEntry(index)} data-testid={`eol-remove-${index}`}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className={s.label}>Facteur d'émission (traitement)</label>
                    <select value={entry.emission_factor_id}
                      onChange={(e) => {
                        const factor = treatments.find(t => t.id === e.target.value);
                        updateEndOfLifeEntry(index, 'emission_factor_id', e.target.value);
                        if (factor) {
                          updateEndOfLifeEntry(index, 'name', factor.name_simple_fr || factor.name_fr || factor.name || '');
                          updateEndOfLifeEntry(index, 'unit', factor.default_unit || 'kg');
                        }
                      }}
                      className={s.input} data-testid={`eol-factor-select-${index}`}>
                      <option value="">Sélectionner un traitement...</option>
                      {filteredTreatments.map(t => (
                        <option key={t.id} value={t.id}>{t.name_simple_fr || t.name_fr || t.name} ({t.value} {t.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={s.label}>Quantité ({entry.unit || 'kg'}) par unité</label>
                    <input type="number" min="0" step="0.01" value={entry.quantity === 0 ? '' : entry.quantity}
                      onChange={(e) => updateEndOfLifeEntry(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className={s.input} placeholder="0" data-testid={`eol-quantity-${index}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
