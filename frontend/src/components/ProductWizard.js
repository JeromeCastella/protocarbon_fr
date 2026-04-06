import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Check, X, Zap, Leaf, Recycle, AlertTriangle,
  Factory, ArrowRight, ChevronRight
} from 'lucide-react';
import { useProductWizard } from './wizard/useProductWizard';
import { StepGeneralInfo } from './wizard/StepGeneralInfo';
import { StepTransformation } from './wizard/StepTransformation';
import { StepUsage } from './wizard/StepUsage';
import { StepEndOfLife } from './wizard/StepEndOfLife';
import { StepSummary } from './wizard/StepSummary';

const STEP_ICONS = { 1: Package, 2: Factory, 3: Leaf, 4: Recycle, 5: Check };

const ProductWizard = ({ isOpen, onClose, onProductCreated, editingProduct = null }) => {
  const { isDark } = useTheme();
  const w = useProductWizard(isOpen, editingProduct);

  if (!isOpen) return null;

  const handleClose = () => {
    if (w.hasUnsavedChanges()) {
      w.setShowCloseConfirm(true);
    } else {
      w.resetAndClose(onClose);
    }
  };

  // Emission bar segment
  const EmissionSegment = ({ label, value, color, icon: Icon }) => {
    const pct = w.emissionsPreview.total > 0 ? (value / w.emissionsPreview.total) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</span>
            <span className={`text-xs font-mono font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {value.toFixed(3)}
            </span>
          </div>
          <div className={`h-1.5 rounded-full mt-1 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                color.includes('orange') ? 'bg-orange-400' : color.includes('green') ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Left panel: persistent context with vertical stepper + live emissions
  const renderLeftPanel = () => (
    <div className={`w-full flex flex-col h-full border-r ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editingProduct ? 'Modifier le produit' : 'Fiche produit'}
          </h3>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg lg:hidden ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {w.formData.name && (
          <p className={`text-sm mt-1 truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {w.formData.name}
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Vertical stepper */}
        <div>
          <label className={`block text-xs font-medium mb-3 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Progression
          </label>
          <div className="space-y-1">
            {w.steps.map((step, index) => {
              const Icon = STEP_ICONS[step.number] || Package;
              const isCurrent = w.currentStep === step.number;
              const isDone = w.currentStepIndex > index;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => {
                    // Allow navigating back to completed steps or current
                    if (isDone || isCurrent) w.goToStep(step.number);
                  }}
                  data-testid={`step-nav-${step.number}`}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isCurrent
                      ? isDark ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                      : isDone
                        ? isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                        : 'opacity-50 cursor-default'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isCurrent ? 'bg-blue-500 text-white'
                      : isDone ? 'bg-green-500 text-white'
                      : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-sm font-medium truncate ${
                    isCurrent
                      ? isDark ? 'text-blue-300' : 'text-blue-700'
                      : isDone
                        ? isDark ? 'text-slate-300' : 'text-gray-700'
                        : isDark ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                  {isCurrent && <ChevronRight className={`w-4 h-4 ml-auto flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Separator */}
        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />

        {/* Live emissions preview */}
        <div>
          <label className={`block text-xs font-medium mb-3 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Emissions en temps réel
          </label>
          <div className="space-y-3">
            {w.formData.product_type === 'semi_finished' && (
              <EmissionSegment label="Transformation (3.10)" value={w.emissionsPreview.transformation} color="text-orange-500" icon={Factory} />
            )}
            <EmissionSegment label="Utilisation (3.11)" value={w.emissionsPreview.usage} color="text-green-500" icon={Leaf} />
            <EmissionSegment label="Fin de vie (3.12)" value={w.emissionsPreview.disposal} color="text-sky-500" icon={Recycle} />
          </div>

          {/* Total */}
          <div className={`mt-4 p-4 rounded-xl ${
            w.emissionsPreview.total > 0
              ? isDark ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'
              : isDark ? 'bg-slate-700/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <span className={`text-2xl font-bold ${
              w.emissionsPreview.total > 0
                ? isDark ? 'text-purple-400' : 'text-purple-600'
                : isDark ? 'text-slate-600' : 'text-gray-300'
            }`}>
              {w.emissionsPreview.total > 0 ? w.emissionsPreview.total.toFixed(3) : '—'}
            </span>
            <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>kgCO₂e / unité</span>
          </div>
        </div>

        {/* Product info summary when filled */}
        {w.formData.name && w.currentStep > 1 && (
          <>
            <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
            <div>
              <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Produit
              </label>
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.formData.name}</p>
                <div className={`flex gap-3 mt-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <span>{w.formData.product_type === 'semi_finished' ? 'Semi-fini' : 'Produit fini'}</span>
                  <span>{w.formData.lifespan_years} an(s)</span>
                  {w.formData.end_of_life.length > 0 && (
                    <span>{w.formData.end_of_life.length} trait. FdV</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm transition-all ${
              isDark 
                ? 'border-slate-600 hover:bg-slate-700 text-white' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}
          >
            Annuler
          </button>
          {w.isLastStep ? (
            <button
              onClick={() => w.handleSubmit(onProductCreated, onClose)}
              disabled={w.loading}
              data-testid="wizard-submit-btn"
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {w.loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {editingProduct ? 'Mettre à jour' : 'Créer'}
            </button>
          ) : (
            <button
              onClick={w.goNext}
              disabled={!w.canGoNext}
              data-testid="wizard-next-btn"
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Right panel: active step content
  const renderRightPanel = () => (
    <div className="w-full flex flex-col h-full">
      {/* Right header */}
      <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            'bg-blue-500 text-white'
          }`}>
            {(() => { const Icon = STEP_ICONS[w.currentStep] || Package; return <Icon className="w-4 h-4" />; })()}
          </div>
          <div>
            <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {w.steps.find(s => s.number === w.currentStep)?.title || ''}
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Étape {w.currentStepIndex + 1} sur {w.steps.length}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          data-testid="wizard-close-btn"
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {w.validationErrors.length > 0 && (
          <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-red-500/15 border border-red-500/30' : 'bg-red-50 border border-red-200'}`} data-testid="validation-errors">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <ul className="text-sm space-y-0.5">
              {w.validationErrors.map((err) => <li key={err} className={isDark ? 'text-red-300' : 'text-red-600'}>{err}</li>)}
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

      {/* Bottom navigation for mobile */}
      <div className={`p-4 border-t flex items-center justify-between lg:hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <button
          onClick={w.goPrev}
          disabled={w.currentStepIndex === 0}
          data-testid="wizard-prev-btn"
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            w.currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
          } ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          Précédent
        </button>
        {w.isLastStep ? (
          <button
            onClick={() => w.handleSubmit(onProductCreated, onClose)}
            disabled={w.loading}
            className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm transition-all disabled:opacity-50"
          >
            {editingProduct ? 'Mettre à jour' : 'Créer'}
          </button>
        ) : (
          <button
            onClick={w.goNext}
            disabled={!w.canGoNext}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm transition-all disabled:opacity-50"
          >
            Suivant
          </button>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30"
        style={{ zIndex: 50 }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-y-0 right-0 w-[94%] max-w-[1600px] ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl flex flex-row`}
        >
          {/* Left column — context, stepper, emissions, submit */}
          <div className="w-[32%] min-w-[320px] flex-shrink-0">
            {renderLeftPanel()}
          </div>

          {/* Right column — step content */}
          <div className="flex-1">
            {renderRightPanel()}
          </div>
        </motion.div>
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
    </AnimatePresence>
  );
};

export default ProductWizard;
