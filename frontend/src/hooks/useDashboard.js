import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

const useDashboard = () => {
  const { t } = useLanguage();
  const { fiscalYears, currentFiscalYear } = useFiscalYear();

  // Tab
  const [activeTab, setActiveTab] = useState('suivi');

  // Data
  const [summary, setSummary] = useState(null);
  const [reportingView, setReportingView] = useState('market');
  const [kpis, setKpis] = useState(null);
  const [fiscalComparison, setFiscalComparison] = useState([]);
  const [scopeBreakdown, setScopeBreakdown] = useState(null);
  const [selectedFiscalYearForChart, setSelectedFiscalYearForChart] = useState('current');
  const [drillDownScope, setDrillDownScope] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalActivities: 0,
    totalProducts: 0,
    totalEmissions: 0,
    completedCategories: 0,
    totalCategories: 0
  });

  // Recalculation
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcFiscalYear, setRecalcFiscalYear] = useState('');
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState(false);

  // Scenarios
  const [selectedScenarioEntityId, setSelectedScenarioEntityId] = useState(null);
  const [scenarioEntities, setScenarioEntities] = useState([]);
  const [scenarioDataPoints, setScenarioDataPoints] = useState([]);
  const [scenarioSummary, setScenarioSummary] = useState(null);

  // Objectives
  const [objective, setObjective] = useState(null);
  const [trajectoryData, setTrajectoryData] = useState({ trajectory: [], actuals: [] });

  // Plausibility
  const [plausibilityResult, setPlausibilityResult] = useState(null);
  const [plausibilityLoading, setPlausibilityLoading] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [objectiveForm, setObjectiveForm] = useState({
    reference_fiscal_year_id: '',
    target_year: 2030
  });
  const [objectiveLoading, setObjectiveLoading] = useState(false);

  // Scope names (depends on t)
  const scopeNames = useMemo(() => ({
    scope1: t('dashboard.scopes.scope1'),
    scope2: t('dashboard.scopes.scope2'),
    scope3_amont: t('dashboard.scopes.scope3_amont'),
    scope3_aval: t('dashboard.scopes.scope3_aval'),
  }), [t]);

  // ─── Data fetching ───

  const fetchObjectiveData = useCallback(async () => {
    try {
      const rvParam = reportingView === 'location' ? '?reporting_view=location' : '';
      const [objRes, trajRes] = await Promise.all([
        axios.get(`${API_URL}/api/objectives`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/objectives/trajectory${rvParam}`).catch(() => ({ data: { trajectory: [], actuals: [] } })),
      ]);
      setObjective(objRes.data);
      setTrajectoryData(trajRes.data);
    } catch (error) {
      logger.error('Failed to fetch objective data:', error);
    }
  }, [reportingView]);

  const fetchScenarioEntities = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/scenarios`);
      setScenarioEntities(response.data || []);
    } catch {
      setScenarioEntities([]);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      const fyParam = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const fyParamAmp = currentFiscalYear?.id ? `&fiscal_year_id=${currentFiscalYear.id}` : '';
      const rvParam = reportingView === 'location' ? `${fyParam ? '&' : '?'}reporting_view=location` : '';
      const rvParamAmp = reportingView === 'location' ? '&reporting_view=location' : '';
      const rvParamOnly = reportingView === 'location' ? '?reporting_view=location' : '';

      const [summaryRes, kpisRes, comparisonRes, breakdownRes, activitiesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/summary${fyParam}${rvParam}`),
        axios.get(`${API_URL}/api/dashboard/kpis${fyParam}${rvParam}`),
        axios.get(`${API_URL}/api/dashboard/fiscal-comparison${rvParamOnly}`),
        axios.get(`${API_URL}/api/dashboard/scope-breakdown/${currentFiscalYear?.id || 'current'}${rvParamOnly}`),
        axios.get(`${API_URL}/api/activities?limit=100${fyParamAmp}`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/api/products`).catch(() => ({ data: [] }))
      ]);

      setSummary(summaryRes.data);
      setKpis(kpisRes.data);
      setFiscalComparison(comparisonRes.data);
      setScopeBreakdown(breakdownRes.data);

      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      const products = productsRes.data || [];
      const scopeCompletion = summaryRes.data?.scope_completion || {};

      let completedCats = 0;
      let totalCats = 0;
      Object.values(scopeCompletion).forEach(scope => {
        completedCats += scope.categories_filled || 0;
        totalCats += scope.total_categories || 0;
      });

      setStats({
        totalActivities: summaryRes.data?.activities_count || activitiesData.length,
        totalProducts: summaryRes.data?.products_count || products.length,
        totalEmissions: summaryRes.data?.total_emissions || 0,
        completedCategories: completedCats,
        totalCategories: totalCats
      });
    } catch (error) {
      logger.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFiscalYear?.id, reportingView]);

  const fetchScopeBreakdown = useCallback(async (fyId) => {
    try {
      const rvParam = reportingView === 'location' ? '?reporting_view=location' : '';
      const response = await axios.get(`${API_URL}/api/dashboard/scope-breakdown/${fyId}${rvParam}`);
      const data = response.data;

      const scopeLabels = {
        scope1: t('dashboard.scopes.scope1'),
        scope2: t('dashboard.scopes.scope2'),
        scope3_amont: t('dashboard.scopes.scope3_amont'),
        scope3_aval: t('dashboard.scopes.scope3_aval')
      };

      const scope_data = Object.entries(data.scopes || {}).map(([scope, values]) => ({
        name: scopeLabels[scope] || scope,
        scope,
        emissions: values.total || 0,
        categories: values.categories || {}
      })).filter(s => s.emissions > 0);

      setScopeBreakdown({ ...data, scope_data });
      setDrillDownScope(null);
    } catch (error) {
      logger.error('Failed to fetch scope breakdown:', error);
    }
  }, [reportingView, t]);

  // ─── Effects ───

  useEffect(() => {
    fetchAllData();
    fetchObjectiveData();
    fetchScenarioEntities();
    if (currentFiscalYear?.id) {
      setSelectedFiscalYearForChart(currentFiscalYear.id);
    }
    setSelectedScenarioEntityId(null);
    setScenarioDataPoints([]);
    setScenarioSummary(null);
    setPlausibilityResult(null);
  }, [currentFiscalYear?.id, reportingView, fetchAllData, fetchObjectiveData, fetchScenarioEntities]);

  useEffect(() => {
    if (selectedFiscalYearForChart && selectedFiscalYearForChart !== 'current') {
      fetchScopeBreakdown(selectedFiscalYearForChart);
    }
  }, [selectedFiscalYearForChart, reportingView, fetchScopeBreakdown]);

  // Fetch all periods for selected scenario entity
  useEffect(() => {
    if (!selectedScenarioEntityId) {
      setScenarioDataPoints([]);
      setScenarioSummary(null);
      return;
    }
    const fetchAllScenarioPeriods = async () => {
      try {
        const fyRes = await axios.get(`${API_URL}/api/fiscal-years`);
        const allFys = fyRes.data || [];
        const scenarioFys = allFys.filter(fy => fy.scenario_id === selectedScenarioEntityId && fy.type === 'scenario');

        if (scenarioFys.length === 0) {
          setScenarioDataPoints([]);
          setScenarioSummary(null);
          return;
        }

        const summaries = await Promise.all(
          scenarioFys.map(fy =>
            axios.get(`${API_URL}/api/dashboard/summary?fiscal_year_id=${fy.id}`)
              .then(r => ({ year: fy.year, data: r.data, fyId: fy.id }))
              .catch(() => null)
          )
        );

        const dataPoints = summaries.filter(Boolean).map(s => {
          const se = s.data?.scope_emissions || {};
          return {
            year: s.year,
            scope1: se.scope1 || 0,
            scope2: se.scope2 || 0,
            scope3: (se.scope3_amont || 0) + (se.scope3_aval || 0)
          };
        });

        setScenarioDataPoints(dataPoints);

        const latestPeriod = summaries.filter(Boolean).sort((a, b) => b.year - a.year)[0];
        if (latestPeriod) {
          setScenarioSummary({ summary: latestPeriod.data });
        }
      } catch (error) {
        logger.error('Failed to fetch scenario periods:', error);
        setScenarioDataPoints([]);
        setScenarioSummary(null);
      }
    };
    fetchAllScenarioPeriods();
  }, [selectedScenarioEntityId]);

  // ─── Handlers ───

  const runPlausibilityCheck = useCallback(async () => {
    setPlausibilityLoading(true);
    setPlausibilityResult(null);
    try {
      const fyParam = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const response = await axios.post(`${API_URL}/api/plausibility/check${fyParam}`);
      setPlausibilityResult(response.data);
    } catch (error) {
      logger.error('Failed to run plausibility check:', error);
    } finally {
      setPlausibilityLoading(false);
    }
  }, [currentFiscalYear?.id]);

  const handleCreateObjective = useCallback(async () => {
    if (!objectiveForm.reference_fiscal_year_id) {
      alert('Veuillez sélectionner une année de référence');
      return;
    }
    setObjectiveLoading(true);
    try {
      await axios.post(`${API_URL}/api/objectives`, objectiveForm);
      await fetchObjectiveData();
      setShowObjectiveModal(false);
    } catch (error) {
      logger.error('Failed to create objective:', error);
      alert('Erreur lors de la création de l\'objectif: ' + (error.response?.data?.detail || error.message));
    } finally {
      setObjectiveLoading(false);
    }
  }, [objectiveForm, fetchObjectiveData]);

  const handleArchiveObjective = useCallback(async () => {
    if (!objective?.id) return;
    if (!window.confirm('Êtes-vous sûr de vouloir archiver cet objectif ?')) return;
    try {
      await axios.delete(`${API_URL}/api/objectives/${objective.id}`);
      setObjective(null);
      setTrajectoryData({ trajectory: [], actuals: [] });
    } catch (error) {
      logger.error('Failed to archive objective:', error);
      alert('Erreur lors de l\'archivage: ' + (error.response?.data?.detail || error.message));
    }
  }, [objective?.id]);

  const handleRecalculate = useCallback(async () => {
    if (!recalcFiscalYear) {
      alert('Veuillez sélectionner un exercice fiscal');
      return;
    }
    setRecalcLoading(true);
    setRecalcResult(null);
    try {
      const response = await axios.post(`${API_URL}/api/activities/recalculate`, {
        fiscal_year_id: recalcFiscalYear,
        preview_only: true
      });
      setRecalcResult(response.data);
    } catch (error) {
      logger.error('Failed to recalculate:', error);
      alert('Erreur lors du recalcul: ' + (error.response?.data?.detail || error.message));
    } finally {
      setRecalcLoading(false);
    }
  }, [recalcFiscalYear]);

  const openRecalcModal = useCallback(() => {
    setRecalcFiscalYear(fiscalYears[0]?.id || '');
    setRecalcResult(null);
    setExpandedActivities(false);
    setShowRecalcModal(true);
  }, [fiscalYears]);

  return {
    fiscalYears, currentFiscalYear,
    activeTab, setActiveTab,
    summary, reportingView, setReportingView,
    kpis, fiscalComparison, scopeBreakdown,
    loading, stats, scopeNames,
    plausibilityResult, plausibilityLoading, runPlausibilityCheck,
    objective, trajectoryData,
    showObjectiveModal, setShowObjectiveModal,
    objectiveForm, setObjectiveForm, objectiveLoading,
    handleCreateObjective, handleArchiveObjective,
    selectedScenarioEntityId, setSelectedScenarioEntityId,
    scenarioEntities, scenarioDataPoints, scenarioSummary,
    showRecalcModal, setShowRecalcModal,
    recalcFiscalYear, setRecalcFiscalYear,
    recalcResult, setRecalcResult,
    recalcLoading, expandedActivities, setExpandedActivities,
    handleRecalculate, openRecalcModal,
  };
};

export default useDashboard;
