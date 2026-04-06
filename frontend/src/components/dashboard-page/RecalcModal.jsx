import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompare, RefreshCw, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { formatEmissions } from './constants';

const RecalcModal = ({
  show, onClose,
  recalcFiscalYear, setRecalcFiscalYear,
  recalcResult, setRecalcResult,
  recalcLoading,
  expandedActivities, setExpandedActivities,
  onRecalculate
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { fiscalYears } = useFiscalYear();

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
            className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <GitCompare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recalcul avec facteurs actuels</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Comparez les émissions historiques avec les facteurs à jour
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Exercice fiscal à recalculer
                </label>
                <select
                  value={recalcFiscalYear}
                  onChange={(e) => setRecalcFiscalYear(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                >
                  <option value="">Sélectionner un exercice...</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id}>{fy.name} ({fy.year})</option>
                  ))}
                </select>
              </div>

              {!recalcResult && (
                <button
                  onClick={onRecalculate}
                  disabled={!recalcFiscalYear || recalcLoading}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {recalcLoading ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" />Calcul en cours...</>
                  ) : (
                    <><RefreshCw className="w-5 h-5" />Lancer le recalcul</>
                  )}
                </button>
              )}

              {recalcResult && (
                <div className="space-y-6">
                  {(!recalcResult.summary || recalcResult.comparisons?.length === 0) ? (
                    <div className={`p-6 rounded-xl border text-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-500 opacity-50" />
                      <h3 className="text-lg font-bold mb-2">Aucune activité trouvée</h3>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {recalcResult.message || t('dashboard.recalculate.noActivityData')}
                      </p>
                      <button
                        onClick={() => setRecalcResult(null)}
                        className={`mt-4 px-4 py-2 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        Sélectionner un autre exercice
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className={`p-6 rounded-xl border ${
                        recalcResult.summary.total_difference > 0
                          ? isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                          : recalcResult.summary.total_difference < 0
                            ? isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                            : isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3 mb-4">
                          {recalcResult.summary.total_difference > 0 ? (
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                          ) : recalcResult.summary.total_difference < 0 ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <CheckCircle className="w-6 h-6 text-gray-500" />
                          )}
                          <h3 className="text-lg font-bold">Résumé du recalcul</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Émissions originales', val: recalcResult.summary.total_original_emissions },
                            { label: 'Émissions recalculées', val: recalcResult.summary.total_recalculated_emissions },
                            { label: 'Différence', val: recalcResult.summary.total_difference, signed: true },
                            { label: 'Variation', val: null, percent: recalcResult.summary.total_difference_percent, signed: true }
                          ].map((item) => {
                            const diff = item.signed ? (item.val || item.percent || 0) : 0;
                            const colorClass = item.signed
                              ? diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : ''
                              : '';
                            return (
                              <div key={item.label}>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
                                {item.percent !== undefined && item.percent !== null ? (
                                  <p className={`text-lg font-bold ${colorClass}`}>
                                    {item.percent > 0 ? '+' : ''}{item.percent}%
                                  </p>
                                ) : (
                                  <p className={`text-lg font-bold ${colorClass}`}>
                                    {item.signed && item.val > 0 ? '+' : ''}
                                    {formatEmissions(item.val).value}
                                    <span className="text-sm font-normal ml-1">{formatEmissions(item.val).unit}</span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Activities details */}
                      <div className={`rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                        <button
                          onClick={() => setExpandedActivities(!expandedActivities)}
                          className={`w-full p-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} rounded-xl transition-colors`}
                        >
                          <span className="font-medium">
                            Détail par activité ({recalcResult.summary.total_activities} activités)
                          </span>
                          {expandedActivities ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {expandedActivities && (
                          <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <div className="max-h-64 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                                  <tr>
                                    <th className="text-left px-4 py-2">Activité</th>
                                    <th className="text-right px-4 py-2">Original</th>
                                    <th className="text-right px-4 py-2">Recalculé</th>
                                    <th className="text-right px-4 py-2">Diff</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recalcResult.comparisons?.map((comp, i) => (
                                    <tr key={comp.activity_name || `comp-${i}`} className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                                      <td className="px-4 py-2">
                                        <div className="font-medium">{comp.activity_name}</div>
                                        <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                          {comp.scope?.replace('_', ' ')} • {comp.quantity} {comp.unit}
                                        </div>
                                      </td>
                                      <td className="text-right px-4 py-2">{comp.original_emissions.toFixed(2)}</td>
                                      <td className="text-right px-4 py-2">{comp.recalculated_emissions.toFixed(2)}</td>
                                      <td className={`text-right px-4 py-2 font-medium ${
                                        comp.difference > 0 ? 'text-red-500' : comp.difference < 0 ? 'text-green-500' : ''
                                      }`}>
                                        {comp.difference > 0 ? '+' : ''}{comp.difference.toFixed(2)}
                                        <span className="text-xs ml-1">({comp.difference_percent}%)</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          <strong>Note :</strong> Ce recalcul est une simulation. Les données originales de l'exercice
                          ne sont pas modifiées et restent basées sur les facteurs d'émission qui étaient en vigueur
                          à l'époque de la saisie.
                        </p>
                      </div>

                      <button
                        onClick={() => setRecalcResult(null)}
                        className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        Recalculer un autre exercice
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={onClose}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecalcModal;
