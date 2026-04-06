import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { History } from 'lucide-react';
import { getScopeColor } from '../../../hooks/useAdminData';

const HistoryModal = ({ show, onClose, factorHistory }) => {
  const { isDark } = useTheme();

  if (!factorHistory) return null;

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
                <div className="p-2 rounded-xl bg-purple-500/20"><History className="w-6 h-6 text-purple-500" /></div>
                <div>
                  <h2 className="text-xl font-bold">Historique des versions</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factorHistory.total_versions} version(s)</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
              {/* Change history timeline */}
              {factorHistory.change_history?.length > 0 && (
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Journal des modifications</h3>
                  <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                    {factorHistory.change_history.slice().reverse().map((change, i) => (
                      <div key={`v${change.version}-${i}`} className="relative">
                        <div className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-blue-500" />
                        <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          <span className="font-medium">v{change.version}</span>
                          {change.is_correction && <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">Correction</span>}
                          <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {new Date(change.changed_at).toLocaleDateString('fr-CH')} par {change.changed_by}
                          </span>
                          <span className={`block mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{change.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All versions */}
              <div>
                <h3 className={`font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Toutes les versions</h3>
                <div className="space-y-3">
                  {factorHistory.versions?.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-xl border ${
                        version.id === factorHistory.factor_id
                          ? isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                          : isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            version.id === factorHistory.factor_id ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            v{version.factor_version || 1}
                          </span>
                          <span className="font-medium">{version.name_simple_fr || version.name_fr}</span>
                          {version.deleted_at && <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-500">Archivé</span>}
                          {version.replaced_by && !version.deleted_at && <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">Remplacé</span>}
                        </div>
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {version.valid_from_year || '?'} → {version.valid_to_year || 'Actuel'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(version.impacts || []).map((imp) => (
                          <span key={`${imp.scope}-${imp.unit}`} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                            {imp.scope?.replace('_', ' ')}: {imp.value} {imp.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <button onClick={onClose} className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HistoryModal;
