import React, { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import useDashboard from '../hooks/useDashboard';
import DashboardResultsTab from '../components/DashboardResultsTab';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';
import { useLanguage } from '../context/LanguageContext';
import {
  DashboardHeader,
  TrackingTab,
  ObjectivesTab,
  ObjectiveModal,
  RecalcModal
} from '../components/dashboard-page';

const Dashboard = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { fiscalYears } = useFiscalYear();
  const hook = useDashboard();

  const handleOpenObjectiveModal = useCallback((refId, targetYear) => {
    hook.setObjectiveForm({ reference_fiscal_year_id: refId, target_year: targetYear });
    hook.setShowObjectiveModal(true);
  }, [hook]);

  // Loading state
  if (hook.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!fiscalYears || fiscalYears.length === 0) {
    return <EmptyFiscalYearState contextMessage={t('dashboard.emptyState')} />;
  }

  return (
    <div data-testid="dashboard" className="space-y-6">
      <DashboardHeader
        summary={hook.summary}
        reportingView={hook.reportingView}
        setReportingView={hook.setReportingView}
        activeTab={hook.activeTab}
        setActiveTab={hook.setActiveTab}
      />

      {/* Tab 1: Suivi */}
      {hook.activeTab === 'suivi' && (
        <TrackingTab
          stats={hook.stats}
          summary={hook.summary}
          plausibilityResult={hook.plausibilityResult}
          plausibilityLoading={hook.plausibilityLoading}
          runPlausibilityCheck={hook.runPlausibilityCheck}
        />
      )}

      {/* Tab 2: Résultats (already refactored in Phase 1) */}
      {hook.activeTab === 'resultats' && (
        <DashboardResultsTab
          summary={hook.summary}
          kpis={hook.kpis}
          scopeBreakdown={hook.scopeBreakdown}
          fiscalComparison={hook.fiscalComparison}
        />
      )}

      {/* Tab 3: Objectifs */}
      {hook.activeTab === 'objectifs' && (
        <div className="space-y-6">
          <ObjectivesTab
            objective={hook.objective}
            trajectoryData={hook.trajectoryData}
            onArchiveObjective={hook.handleArchiveObjective}
            onOpenObjectiveModal={handleOpenObjectiveModal}
            selectedScenarioEntityId={hook.selectedScenarioEntityId}
            setSelectedScenarioEntityId={hook.setSelectedScenarioEntityId}
            scenarioEntities={hook.scenarioEntities}
            scenarioDataPoints={hook.scenarioDataPoints}
            scenarioSummary={hook.scenarioSummary}
          />
        </div>
      )}

      {/* Modals */}
      <ObjectiveModal
        show={hook.showObjectiveModal}
        onClose={() => hook.setShowObjectiveModal(false)}
        objectiveForm={hook.objectiveForm}
        setObjectiveForm={hook.setObjectiveForm}
        objectiveLoading={hook.objectiveLoading}
        onSubmit={hook.handleCreateObjective}
      />

      <RecalcModal
        show={hook.showRecalcModal}
        onClose={() => hook.setShowRecalcModal(false)}
        recalcFiscalYear={hook.recalcFiscalYear}
        setRecalcFiscalYear={hook.setRecalcFiscalYear}
        recalcResult={hook.recalcResult}
        setRecalcResult={hook.setRecalcResult}
        recalcLoading={hook.recalcLoading}
        expandedActivities={hook.expandedActivities}
        setExpandedActivities={hook.setExpandedActivities}
        onRecalculate={hook.handleRecalculate}
      />
    </div>
  );
};

export default Dashboard;
