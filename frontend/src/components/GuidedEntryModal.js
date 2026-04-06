import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search } from 'lucide-react';
import FactorSelectionStep from './FactorSelectionStep';
import LeftPanel from './guided-entry/LeftPanel';
import useGuidedEntry from '../hooks/useGuidedEntry';
import { useLanguage } from '../context/LanguageContext';

const GuidedEntryModal = ({
  isOpen, onClose, category, scope, language, isDark,
  onSubmit, editingActivity = null, preSelectedFactor = null,
  showExpertFactors = false, onToggleExpert = null,
}) => {
  const { t } = useLanguage();
  const hook = useGuidedEntry({
    isOpen, category, scope, language, onSubmit, onClose,
    editingActivity, preSelectedFactor, showExpertFactors
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30" style={{ zIndex: 60 }} onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-y-0 right-0 w-[94%] max-w-[1600px] ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl flex flex-row`}
        >
          {/* Left column — context, form, submit */}
          <div className="w-[32%] min-w-[320px] flex-shrink-0">
            <LeftPanel
              isDark={isDark} language={language}
              editingActivity={editingActivity} onClose={onClose}
              {...hook}
            />
          </div>

          {/* Right column — factor selection */}
          <div className="flex-1 w-full flex flex-col h-full">
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      hook.step >= s ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {hook.step > s ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                  ))}
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {hook.step === 1 && t('guidedEntry.subcategory')}
                  {hook.step === 2 && t('guidedEntry.unit')}
                  {hook.step >= 3 && t('guidedEntry.emissionFactor')}
                </span>
              </div>
              <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col min-h-0">
              {hook.step < 3 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <Search className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-base font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {hook.step === 1 ? t('guidedEntry.selectSubcategory') : t('guidedEntry.selectUnit')}
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {language === 'fr' ? "Les facteurs d'émission s'afficheront ici" : 'Emissionsfaktoren werden hier angezeigt'}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <FactorSelectionStep
                    factors={hook.filteredFactors}
                    selectedFactor={hook.selectedFactor}
                    onSelectFactor={hook.handleFactorSelect}
                    selectedUnit={hook.selectedUnit}
                    language={language} isDark={isDark}
                    showExpertFactors={showExpertFactors}
                    onToggleExpert={onToggleExpert}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedEntryModal;
