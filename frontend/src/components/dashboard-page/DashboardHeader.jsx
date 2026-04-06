import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { BarChart3, Target, ClipboardList } from 'lucide-react';

const DashboardHeader = ({
  summary, reportingView, setReportingView,
  activeTab, setActiveTab
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const tabs = [
    { id: 'suivi', label: t('dashboard.tabs.tracking'), icon: ClipboardList },
    { id: 'resultats', label: t('dashboard.tabs.results'), icon: BarChart3 },
    { id: 'objectifs', label: t('dashboard.tabs.objectives'), icon: Target }
  ];

  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('nav.dashboard')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Vue d'ensemble de votre bilan carbone
          </p>
        </div>
        {summary?.has_market_based && (
          <div data-testid="reporting-view-toggle" className={`flex items-center gap-1 p-0.5 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <button
              onClick={() => setReportingView('market')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                reportingView === 'market'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >Market-based</button>
            <button
              onClick={() => setReportingView('location')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                reportingView === 'location'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >Location-based</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default DashboardHeader;
