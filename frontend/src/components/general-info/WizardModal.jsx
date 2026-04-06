import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react';

const WizardModal = ({
  isDark, showWizard, setShowWizard, wizardStep, setWizardStep,
  wizardSteps, wizardAnswers, handleWizardAnswer,
  getSelectedCategoriesFromWizard, applyWizardResults,
  categories, language, t,
}) => {
  if (!showWizard) return null;

  const currentStep = wizardSteps[wizardStep];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setShowWizard(false)}
      >
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/20"><Wand2 className="w-6 h-6 text-purple-500" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{currentStep?.title}</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{currentStep?.subtitle}</p>
              </div>
              <button onClick={() => setShowWizard(false)} data-testid="close-wizard-btn"
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                title={t('generalInfo.close')}
              ><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-1">
              {wizardSteps.map((step, i) => (
                <div key={step.id || `step-${i}`} className={`h-1 flex-1 rounded-full transition-all ${i <= wizardStep ? 'bg-purple-500' : isDark ? 'bg-slate-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[55vh]">
            {wizardStep === 0 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Configurons votre périmètre</h3>
                <p className={`max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  En quelques questions simples, nous allons identifier les catégories d'émissions pertinentes pour votre organisation. Vous pourrez ajuster le résultat ensuite.
                </p>
                <div className={`mt-8 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'} inline-flex items-center gap-3`}>
                  <Info className="w-5 h-5 text-blue-500" /><span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Environ 2-3 minutes</span>
                </div>
              </div>
            )}

            {wizardStep > 0 && wizardStep < wizardSteps.length - 1 && (
              <div className="space-y-4">
                {currentStep.questions.map(q => {
                  const Icon = q.icon;
                  const isYes = wizardAnswers[q.key] === true;
                  const isNo = wizardAnswers[q.key] === false;
                  const isAnswered = wizardAnswers[q.key] !== null;
                  return (
                    <div key={q.key} className={`p-4 rounded-xl border-2 transition-all ${
                      isAnswered ? (isYes ? isDark ? 'bg-green-500/10 border-green-500/50' : 'bg-green-50 border-green-200' : isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200')
                        : isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${isYes ? 'bg-green-500/20' : isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>
                          <Icon className={`w-5 h-5 ${isYes ? 'text-green-500' : isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{q.text}</p>
                          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{q.hint}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4 ml-12">
                        <button onClick={() => handleWizardAnswer(q.key, true)} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          isYes ? 'bg-green-500 text-white' : isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}>Oui</button>
                        <button onClick={() => handleWizardAnswer(q.key, false)} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          isNo ? isDark ? 'bg-slate-500 text-white' : 'bg-gray-300 text-gray-700' : isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}>Non</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {wizardStep === wizardSteps.length - 1 && (
              <div>
                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Check className="w-6 h-6 text-green-500" />
                    <span className={`font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>Configuration terminée !</span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
                    {getSelectedCategoriesFromWizard().size} catégories seront activées selon vos réponses.
                  </p>
                </div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Catégories sélectionnées :</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(getSelectedCategoriesFromWizard()).map(code => {
                    const cat = categories.find(c => c.code === code);
                    if (!cat) return null;
                    const scopeColor = cat.scope === 'scope1' ? 'blue' : cat.scope === 'scope2' ? 'cyan' : cat.scope === 'scope3_amont' ? 'amber' : 'indigo';
                    return (
                      <div key={code} className={`px-3 py-2 rounded-lg text-sm ${isDark ? `bg-${scopeColor}-500/20 text-${scopeColor}-300` : `bg-${scopeColor}-50 text-${scopeColor}-700`}`}>
                        {language === 'fr' ? cat.name_fr : cat.name_de}
                      </div>
                    );
                  })}
                </div>
                <p className={`mt-6 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Vous pourrez modifier ces sélections manuellement après avoir appliqué les résultats.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-3">
              {wizardStep > 0 && (
                <button onClick={() => setWizardStep(prev => prev - 1)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <ChevronLeft className="w-5 h-5" />Retour
                </button>
              )}
              <div className="flex-1" />
              {wizardStep < wizardSteps.length - 1 ? (
                <button onClick={() => setWizardStep(prev => prev + 1)} className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600">
                  {wizardStep === 0 ? 'Commencer' : 'Suivant'}<ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={applyWizardResults} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600">
                  <Check className="w-5 h-5" />Appliquer
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WizardModal;
