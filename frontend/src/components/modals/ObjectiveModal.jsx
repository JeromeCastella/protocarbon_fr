/**
 * Modal de configuration des objectifs SBTi
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, RefreshCw, Flag } from 'lucide-react';

const ObjectiveModal = ({
  isOpen,
  onClose,
  onSubmit,
  fiscalYears = [],
  form,
  setForm,
  loading = false,
  isDark = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/20">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Fixer un objectif SBTi
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Science Based Targets initiative
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reference Year Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Année de référence (baseline)
              </label>
              <select
                value={form.reference_fiscal_year_id}
                onChange={(e) => setForm({ ...form, reference_fiscal_year_id: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
              >
                <option value="">Sélectionner un exercice...</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.name}</option>
                ))}
              </select>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Les émissions de cet exercice serviront de point de départ
              </p>
            </div>

            {/* Target Year Selection */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Horizon de réduction (Near-term)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <TargetYearButton
                  year={2030}
                  reductionScope12={42}
                  reductionScope3={25}
                  selected={form.target_year === 2030}
                  onClick={() => setForm({ ...form, target_year: 2030 })}
                  isDark={isDark}
                />
                <TargetYearButton
                  year={2035}
                  reductionScope12={65}
                  reductionScope3={39}
                  selected={form.target_year === 2035}
                  onClick={() => setForm({ ...form, target_year: 2035 })}
                  isDark={isDark}
                />
              </div>
            </div>

            {/* Info box */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <Sparkles className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-blue-700'}`}>
                  <strong>Objectifs SBTi Near-term</strong>
                  <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-blue-600'}`}>
                    Ces objectifs sont alignés sur une trajectoire limitant le réchauffement à 1.5°C, 
                    conformément aux recommandations de la Science Based Targets initiative.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              Annuler
            </button>
            <button
              onClick={onSubmit}
              disabled={!form.reference_fiscal_year_id || loading}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Flag className="w-5 h-5" />
                  Définir l'objectif
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Sub-component for target year buttons
const TargetYearButton = ({ year, reductionScope12, reductionScope3, selected, onClick, isDark }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-4 rounded-xl border-2 transition-all ${
      selected
        ? 'border-green-500 bg-green-500/10'
        : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className={`text-2xl font-bold mb-1 ${selected ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
      {year}
    </div>
    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
      <span className="text-blue-500 font-medium">-{reductionScope12}%</span> Scope 1&2
    </div>
    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
      <span className="text-amber-500 font-medium">-{reductionScope3}%</span> Scope 3
    </div>
  </button>
);

export default ObjectiveModal;
