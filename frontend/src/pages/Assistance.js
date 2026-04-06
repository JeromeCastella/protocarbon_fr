import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle, Database } from 'lucide-react';
import { useAssistance } from '../hooks/useAssistance';
import FaqTab from '../components/assistance/FaqTab';
import FactorsTab from '../components/assistance/FactorsTab';
import FactorDetailModal from '../components/assistance/FactorDetailModal';

const Assistance = () => {
  const { isDark } = useTheme();
  const a = useAssistance();

  const tabs = [
    { id: 'faq', label: a.t('assistance.tabs.faq'), icon: HelpCircle },
    { id: 'factors', label: a.t('assistance.tabs.factors'), icon: Database }
  ];

  return (
    <div data-testid="assistance-page" className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{a.t('assistance.title')}</h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{a.t('assistance.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => a.setActiveTab(tab.id)} data-testid={`tab-${tab.id}`}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                a.activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}>
              <Icon className="w-5 h-5" />{tab.label}
            </button>
          );
        })}
      </div>

      {a.activeTab === 'faq' && (
        <FaqTab isDark={isDark} t={a.t} language={a.language}
          faqSearch={a.faqSearch} setFaqSearch={a.setFaqSearch}
          filteredFaqCategories={a.filteredFaqCategories}
          expandedCategories={a.expandedCategories} toggleCategory={a.toggleCategory}
          expandedQuestions={a.expandedQuestions} toggleQuestion={a.toggleQuestion} />
      )}

      {a.activeTab === 'factors' && (
        <FactorsTab isDark={isDark} t={a.t} language={a.language}
          factorSearch={a.factorSearch} setFactorSearch={a.setFactorSearch}
          scopeFilter={a.scopeFilter} setScopeFilter={a.setScopeFilter}
          showFilters={a.showFilters} setShowFilters={a.setShowFilters}
          filteredFactors={a.filteredFactors} factorsLoading={a.factorsLoading}
          getScopeColor={a.getScopeColor} setSelectedFactor={a.setSelectedFactor} />
      )}

      <AnimatePresence>
        {a.selectedFactor && (
          <FactorDetailModal factor={a.selectedFactor} isDark={isDark}
            language={a.language} t={a.t} getScopeColor={a.getScopeColor}
            onClose={() => a.setSelectedFactor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Assistance;
