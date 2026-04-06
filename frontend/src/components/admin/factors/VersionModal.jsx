import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import { getScopeColor } from '../../../hooks/useAdminData';

const VersionModal = ({
  show, onClose,
  versioningFactor,
  versionForm, setVersionForm,
  onUpdateImpact,
  onSave
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  if (!versioningFactor) return null;

  const currentVersion = versioningFactor.factor_version || 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20"><GitBranch className="w-6 h-6 text-blue-500" /></div>
                <div>
                  <h2 className="text-xl font-bold">Nouvelle version</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {versioningFactor.name_simple_fr || versioningFactor.name_fr} - v{currentVersion} → v{currentVersion + 1}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Raison du changement *</label>
                <textarea
                  value={versionForm.change_reason}
                  onChange={(e) => setVersionForm(prev => ({ ...prev, change_reason: e.target.value }))}
                  placeholder="Ex: Mise à jour annuelle des facteurs OFEV 2025"
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_correction"
                  checked={versionForm.is_correction}
                  onChange={(e) => setVersionForm(prev => ({ ...prev, is_correction: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="is_correction">
                  <span className="font-medium">Correction d'erreur</span>
                  <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cocher si cette version corrige une erreur</span>
                </label>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année de début de validité</label>
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={versionForm.valid_from_year}
                  onChange={(e) => setVersionForm(prev => ({ ...prev, valid_from_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Valeurs des impacts</label>
                <div className="space-y-3">
                  {versionForm.impacts.map((impact, i) => (
                    <div key={`${impact.scope}-${impact.category || i}`} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getScopeColor(impact.scope)}`}>{impact.scope?.replace('_', ' ')}</span>
                        <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t(`categories.${impact.category}`) || impact.category}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Nouvelle valeur *</label>
                          <input
                            type="number"
                            step="any"
                            value={impact.value === '0' ? '' : impact.value}
                            onChange={(e) => onUpdateImpact(i, 'value', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                            placeholder="2.68"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Unité</label>
                          <input
                            type="text"
                            value={impact.unit}
                            onChange={(e) => onUpdateImpact(i, 'unit', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                            placeholder="kgCO2e/L"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex gap-3">
                <button onClick={onClose} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>Annuler</button>
                <button
                  onClick={onSave}
                  disabled={!versionForm.change_reason || versionForm.impacts.some(i => !i.value)}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <GitBranch className="w-5 h-5" />Créer la version {currentVersion + 1}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VersionModal;
