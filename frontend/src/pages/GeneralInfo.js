import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useGeneralInfo } from '../hooks/useGeneralInfo';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';
import CompanyIdentityCard from '../components/general-info/CompanyIdentityCard';
import FiscalYearContextCard from '../components/general-info/FiscalYearContextCard';
import ScopePerimeterCard from '../components/general-info/ScopePerimeterCard';
import WizardModal from '../components/general-info/WizardModal';

const GeneralInfo = () => {
  const { isDark } = useTheme();
  const g = useGeneralInfo();

  useEffect(() => { g.fetchData(); }, [g.fetchData]);
  useEffect(() => {
    if (g.selectedFiscalYear?.id) g.fetchFiscalYearContext(g.selectedFiscalYear.id);
  }, [g.selectedFiscalYear?.id, g.fetchFiscalYearContext]);

  if (g.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!g.fiscalYears || g.fiscalYears.length === 0) {
    return <EmptyFiscalYearState contextMessage={g.t('generalInfo.emptyFiscalYear')} />;
  }

  return (
    <div data-testid="general-info-page" className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.t('nav.generalInfo')}</h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{g.t('company.subtitle')}</p>
      </div>

      <CompanyIdentityCard
        company={g.company} setCompany={g.setCompany} isDark={isDark}
        saving={g.saving} saved={g.saved} handleSave={g.handleSave}
        isPrivateCompany={g.isPrivateCompany} entityTypes={g.entityTypes}
        sectors={g.sectors} consolidationApproaches={g.consolidationApproaches} t={g.t}
      />

      <FiscalYearContextCard
        fiscalYearContext={g.fiscalYearContext} setFiscalYearContext={g.setFiscalYearContext}
        selectedFiscalYear={g.selectedFiscalYear} isDark={isDark}
        savingContext={g.savingContext} savedContext={g.savedContext}
        handleSaveContext={g.handleSaveContext} contextLoading={g.contextLoading}
        contextReadonly={g.contextReadonly} isPrivateCompany={g.isPrivateCompany} t={g.t}
      />

      <ScopePerimeterCard
        isDark={isDark} selectedFiscalYear={g.selectedFiscalYear}
        contextReadonly={g.contextReadonly}
        showManualConfig={g.showManualConfig} setShowManualConfig={g.setShowManualConfig}
        openWizard={g.openWizard} savedWizard={g.savedWizard}
        scopeCategories={g.scopeCategories} fiscalYearContext={g.fiscalYearContext}
        toggleCategory={g.toggleCategory} toggleProductCategories={g.toggleProductCategories}
        areProductCategoriesIncluded={g.areProductCategoriesIncluded}
        PRODUCT_CATEGORIES={g.PRODUCT_CATEGORIES} language={g.language} t={g.t}
      />

      <WizardModal
        isDark={isDark} showWizard={g.showWizard} setShowWizard={g.setShowWizard}
        wizardStep={g.wizardStep} setWizardStep={g.setWizardStep}
        wizardSteps={g.wizardSteps} wizardAnswers={g.wizardAnswers}
        handleWizardAnswer={g.handleWizardAnswer}
        getSelectedCategoriesFromWizard={g.getSelectedCategoriesFromWizard}
        applyWizardResults={g.applyWizardResults}
        categories={g.categories} language={g.language} t={g.t}
      />

      {/* Toast auto-save périmètre */}
      <AnimatePresence>
        {g.savedPerimeter && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg z-50"
          >
            <Check className="w-4 h-4" />{g.t('common.success')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeneralInfo;
