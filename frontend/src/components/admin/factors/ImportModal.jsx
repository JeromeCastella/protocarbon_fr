import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ImportModal = ({
  show, onClose,
  importData, setImportData,
  importReplaceAll, setImportReplaceAll,
  onImport
}) => {
  const { isDark } = useTheme();

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
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
          >
            <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className="text-xl font-bold">Importer des données V2</h3>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Collez ici le JSON exporté..."
                rows={10}
                className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={importReplaceAll} onChange={(e) => setImportReplaceAll(e.target.checked)} className="rounded" />
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Remplacer toutes les données existantes</span>
              </label>
            </div>
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
              <button onClick={onClose} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>Annuler</button>
              <button onClick={onImport} disabled={!importData} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50">Importer</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportModal;
