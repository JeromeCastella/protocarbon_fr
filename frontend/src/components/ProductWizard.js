import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ArrowRight, ArrowLeft, Check, X, Zap, Leaf, Recycle, AlertTriangle
} from 'lucide-react';
import { useProductWizard } from './wizard/useProductWizard';
import { StepGeneralInfo } from './wizard/StepGeneralInfo';
import { StepTransformation } from './wizard/StepTransformation';
import { StepUsage } from './wizard/StepUsage';
import { StepEndOfLife } from './wizard/StepEndOfLife';
import { StepSummary } from './wizard/StepSummary';

const STEP_ICONS = { 1: Package, 2: Zap, 3: Leaf, 4: Recycle, 5: Check };

const ProductWizard = ({ isOpen, onClose, onProductCreated, editingProduct = null }) => {
  const { isDark } = useTheme();
  const w = useProductWizard(isOpen, editingProduct);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>

        {/* Header with stepper */}
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingProduct ? 'Modifier le produit' : 'Créer une fiche produit'}
            </h2>
            <button onClick={() => w.hasUnsavedChanges() ? w.setShowCloseConfirm(true) : w.resetAndClose(onClose)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`} data-testid="wizard-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            {w.steps.map((step, index) => {
              const Icon = STEP_ICONS[step.number] || Package;
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      w.currentStep === step.number ? 'bg-blue-500 text-white'
                        : w.currentStepIndex > index ? 'bg-green-500 text-white'
                        : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {w.currentStepIndex > index ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-sm font-medium hidden md:block ${
                      w.currentStep === step.number ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-slate-400' : 'text-gray-500')
                    }`}>{step.title}</span>
                  </div>
                  {index < w.steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${w.currentStepIndex > index ? 'bg-green-500' : isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {w.validationErrors.length > 0 && (
            <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-red-500/15 border border-red-500/30' : 'bg-red-50 border border-red-200'}`} data-testid="validation-errors">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <ul className="text-sm space-y-0.5">
                {w.validationErrors.map((err, i) => <li key={i} className={isDark ? 'text-red-300' : 'text-red-600'}>{err}</li>)}
              </ul>
            </div>
          )}
          <AnimatePresence mode="wait">
            {w.currentStep === 1 && <StepGeneralInfo formData={w.formData} setFormData={w.setFormData} isDark={isDark} />}
            {w.currentStep === 2 && w.formData.product_type === 'semi_finished' && (
              <StepTransformation formData={w.formData} setFormData={w.setFormData}
                electricityFactors={w.electricityFactors} fuelFactors={w.fuelFactors} isDark={isDark} />
            )}
            {w.currentStep === 3 && (
              <StepUsage formData={w.formData} setFormData={w.setFormData}
                electricityFactors={w.electricityFactors} fuelFactors={w.fuelFactors}
                carburantFactors={w.carburantFactors} refrigerantFactors={w.refrigerantFactors} isDark={isDark} />
            )}
            {w.currentStep === 4 && (
              <StepEndOfLife formData={w.formData} treatments={w.treatments} filteredTreatments={w.filteredTreatments}
                eolSearch={w.eolSearch} setEolSearch={w.setEolSearch}
                addEndOfLifeEntry={w.addEndOfLifeEntry} updateEndOfLifeEntry={w.updateEndOfLifeEntry}
                removeEndOfLifeEntry={w.removeEndOfLifeEntry} isDark={isDark} />
            )}
            {w.currentStep === 5 && (
              <StepSummary formData={w.formData} emissionsPreview={w.emissionsPreview} goToStep={w.goToStep} isDark={isDark} />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <button onClick={w.goPrev} disabled={w.currentStepIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                w.currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              } ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="wizard-prev-btn">
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            {w.isLastStep ? (
              <button onClick={() => w.handleSubmit(onProductCreated, onClose)} disabled={w.loading} data-testid="wizard-submit-btn"
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50">
                {w.loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
              </button>
            ) : (
              <button onClick={w.goNext} disabled={!w.canGoNext} data-testid="wizard-next-btn"
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50">
                Suivant <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Close confirmation dialog */}
      <AnimatePresence>
        {w.showCloseConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => w.setShowCloseConfirm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl mx-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              data-testid="close-confirm-dialog">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quitter sans sauvegarder ?</h3>
              </div>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Les données saisies seront perdues.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => w.setShowCloseConfirm(false)} data-testid="close-confirm-cancel"
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  Continuer l'édition
                </button>
                <button onClick={() => w.resetAndClose(onClose)} data-testid="close-confirm-discard"
                  className="px-4 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {w.errorToast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-[70] max-w-sm" data-testid="error-toast">
            <div className="flex items-start gap-3 p-4 rounded-xl shadow-2xl bg-red-600 text-white">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Erreur de sauvegarde</p>
                <p className="text-xs mt-1 text-red-200">{w.errorToast}</p>
              </div>
              <button onClick={() => w.setErrorToast(null)} className="p-1 rounded-lg hover:bg-red-500"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductWizard;
