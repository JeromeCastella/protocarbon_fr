import React from 'react';
import KPICards from './dashboard/KPICards';
import ScopeChart from './dashboard/ScopeChart';
import TopSubcategories from './dashboard/TopSubcategories';
import EvolutionChart from './dashboard/EvolutionChart';

const DashboardResultsTab = ({
  summary,
  kpis,
  scopeBreakdown,
  fiscalComparison
}) => {
  return (
    <div className="space-y-6" data-testid="dashboard-results-tab">
      <KPICards summary={summary} kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScopeChart scopeBreakdown={scopeBreakdown} />
        <TopSubcategories scopeBreakdown={scopeBreakdown} />
      </div>

      <EvolutionChart fiscalComparison={fiscalComparison} />
    </div>
  );
};

export default DashboardResultsTab;
