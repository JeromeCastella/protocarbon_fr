import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Leaf, 
  Zap, 
  Truck, 
  Factory,
  Target,
  Award,
  BarChart3,
  PieChart,
  Users,
  Banknote,
  Calendar,
  ArrowLeft,
  Minus,
  RefreshCw,
  GitCompare,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Activity,
  Package,
  FileText,
  Flag,
  TrendingDown as TrendDown,
  Sparkles,
  X,
  FlaskConical,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import DashboardResultsTab from '../components/DashboardResultsTab';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'tCO₂e'
    };
  } else {
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'kgCO₂e'
    };
  }
};

// Format for chart tooltips (always in tonnes for consistency)
const formatChartValue = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) return '0';
  const tonnes = valueInKg / 1000;
  return tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' tCO₂e';
};

const Dashboard = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { fiscalYears, currentFiscalYear } = useFiscalYear();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('suivi');
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [reportingView, setReportingView] = useState('market'); // 'market' or 'location'
  const [kpis, setKpis] = useState(null);
  const [fiscalComparison, setFiscalComparison] = useState([]);
  const [scopeBreakdown, setScopeBreakdown] = useState(null);
  const [selectedFiscalYearForChart, setSelectedFiscalYearForChart] = useState('current');
  const [drillDownScope, setDrillDownScope] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Statistics
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalProducts: 0,
    totalEmissions: 0,
    completedCategories: 0,
    totalCategories: 0
  });

  // Recalculation state
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcFiscalYear, setRecalcFiscalYear] = useState('');
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState(false);

  // Scenario state
  const [selectedScenarioEntityId, setSelectedScenarioEntityId] = useState(null);
  const [scenarioEntities, setScenarioEntities] = useState([]);
  const [scenarioDataPoints, setScenarioDataPoints] = useState([]); // [{year, scope1, scope2, scope3}]
  const [scenarioSummary, setScenarioSummary] = useState(null); // summary of the latest period (for KPI cards)

  // Objectives state
  const [objective, setObjective] = useState(null);
  const [trajectoryData, setTrajectoryData] = useState({ trajectory: [], actuals: [] });
  const [recommendations, setRecommendations] = useState([]);

  // Plausibility state
  const [plausibilityResult, setPlausibilityResult] = useState(null);
  const [plausibilityLoading, setPlausibilityLoading] = useState(false);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [objectiveForm, setObjectiveForm] = useState({
    reference_fiscal_year_id: '',
    target_year: 2030
  });
  const [objectiveLoading, setObjectiveLoading] = useState(false);

  // Reload data when fiscal year changes
  useEffect(() => {
    fetchAllData();
    fetchObjectiveData();
    fetchScenarioEntities();
    // Sync the chart fiscal year selector with the global context
    if (currentFiscalYear?.id) {
      setSelectedFiscalYearForChart(currentFiscalYear.id);
    }
    // Reset scenario selection when switching fiscal year
    setSelectedScenarioEntityId(null);
    setScenarioDataPoints([]);
    setScenarioSummary(null);
    // Reset plausibility when fiscal year changes
    setPlausibilityResult(null);
  }, [currentFiscalYear?.id, reportingView]);

  useEffect(() => {
    if (selectedFiscalYearForChart && selectedFiscalYearForChart !== 'current') {
      fetchScopeBreakdown(selectedFiscalYearForChart);
    }
  }, [selectedFiscalYearForChart, reportingView]);

  const fetchObjectiveData = async () => {
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
  };

  // Fetch scenario entities for the company
  const fetchScenarioEntities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/scenarios`);
      setScenarioEntities(response.data || []);
    } catch (error) {
      setScenarioEntities([]);
    }
  };

  // Plausibility check
  const runPlausibilityCheck = async () => {
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
  };

  // Fetch all periods for the selected scenario entity
  useEffect(() => {
    if (!selectedScenarioEntityId) {
      setScenarioDataPoints([]);
      setScenarioSummary(null);
      return;
    }
    const fetchAllScenarioPeriods = async () => {
      try {
        // Get all fiscal years linked to this scenario entity
        const fyRes = await axios.get(`${API_URL}/api/fiscal-years`);
        const allFys = fyRes.data || [];
        const scenarioFys = allFys.filter(fy => fy.scenario_id === selectedScenarioEntityId && fy.type === 'scenario');
        
        if (scenarioFys.length === 0) {
          setScenarioDataPoints([]);
          setScenarioSummary(null);
          return;
        }
        
        // Fetch summary for each period in parallel
        const summaries = await Promise.all(
          scenarioFys.map(fy => axios.get(`${API_URL}/api/dashboard/summary?fiscal_year_id=${fy.id}`).then(r => ({ year: fy.year, data: r.data, fyId: fy.id })).catch(() => null))
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
        
        // Use the latest period's summary for KPI cards
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

  const handleCreateObjective = async () => {
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
  };

  const handleArchiveObjective = async () => {
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
  };

  const fetchAllData = async () => {
    try {
      // Build fiscal year query param
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
      
      // Calculate stats from summary data (handle paginated activities response)
      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      const products = productsRes.data || [];
      const scopeCompletion = summaryRes.data?.scope_completion || {};
      
      let completedCats = 0;
      let totalCats = 0;
      Object.values(scopeCompletion).forEach(scope => {
        // API returns categories_filled, not completed_categories
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
  };

  const fetchScopeBreakdown = async (fyId) => {
    try {
      const rvParam = reportingView === 'location' ? '?reporting_view=location' : '';
      const response = await axios.get(`${API_URL}/api/dashboard/scope-breakdown/${fyId}${rvParam}`);
      const data = response.data;
      
      // Transform scopes data for the chart
      const scopeLabels = {
        scope1: t('dashboard.scopes.scope1'),
        scope2: t('dashboard.scopes.scope2'),
        scope3_amont: t('dashboard.scopes.scope3_amont'),
        scope3_aval: t('dashboard.scopes.scope3_aval')
      };
      
      const scope_data = Object.entries(data.scopes || {}).map(([scope, values]) => ({
        name: scopeLabels[scope] || scope,
        scope: scope,
        emissions: values.total || 0,
        categories: values.categories || {}
      })).filter(s => s.emissions > 0); // Only show scopes with data
      
      setScopeBreakdown({
        ...data,
        scope_data
      });
      setDrillDownScope(null);
    } catch (error) {
      logger.error('Failed to fetch scope breakdown:', error);
    }
  };

  // Recalculation function
  const handleRecalculate = async () => {
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
  };

  const openRecalcModal = () => {
    setRecalcFiscalYear(fiscalYears[0]?.id || '');
    setRecalcResult(null);
    setExpandedActivities(false);
    setShowRecalcModal(true);
  };

  const scopeColors = {
    scope1: 'bg-blue-500',
    scope2: 'bg-cyan-500',
    scope3_amont: 'bg-amber-500',
    scope3_aval: 'bg-indigo-500',
  };

  const scopeNames = {
    scope1: t('dashboard.scopes.scope1'),
    scope2: t('dashboard.scopes.scope2'),
    scope3_amont: t('dashboard.scopes.scope3_amont'),
    scope3_aval: t('dashboard.scopes.scope3_aval'),
  };

  const scopeIcons = {
    scope1: Factory,
    scope2: Zap,
    scope3_amont: Truck,
    scope3_aval: Leaf
  };

  const chartColors = {
    scope1: '#FB923C',
    scope2: '#60A5FA',
    scope3_amont: '#A78BFA',
    scope3_aval: '#F9A8D4'
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Empty state - no fiscal years
  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <EmptyFiscalYearState 
        contextMessage={t('dashboard.emptyState')}
      />
    );
  }

  // Tab definitions
  const tabs = [
    { id: 'suivi', label: t('dashboard.tabs.tracking'), icon: ClipboardList },
    { id: 'resultats', label: t('dashboard.tabs.results'), icon: BarChart3 },
    { id: 'objectifs', label: t('dashboard.tabs.objectives'), icon: Target }
  ];

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Header */}
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

      {/* ==================== TAB 1: SUIVI DE SAISIE ==================== */}
      {activeTab === 'suivi' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Activity className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Activités saisies</p>
                  <p className="text-2xl font-bold">{stats.totalActivities}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Package className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Produits définis</p>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <FileText className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Catégories remplies</p>
                  <p className="text-2xl font-bold">{stats.completedCategories}/{stats.totalCategories}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Target className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Progression</p>
                  <p className="text-2xl font-bold">
                    {stats.totalCategories > 0 
                      ? Math.round((stats.completedCategories / stats.totalCategories) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scope Completion Cards */}
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Avancement par scope
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summary?.scope_completion && Object.entries(summary.scope_completion).map(([scope, data], index) => {
                const Icon = scopeIcons[scope] || Factory;
                // Get emissions from scope_emissions, not from scope_completion
                const scopeEmissions = summary?.scope_emissions?.[scope] || 0;
                const emissions = formatEmissions(scopeEmissions);
                const completion = data.percentage || 0;
                
                return (
                  <motion.div
                    key={scope}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${scopeColors[scope]}/20`}>
                          <Icon className={`w-5 h-5 ${scopeColors[scope].replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {scopeNames[scope]}
                          </h3>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {data.categories_filled}/{data.total_categories} catégories
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className={`h-2 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full ${scopeColors[scope]} transition-all duration-500`}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold">{emissions.value}</p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{emissions.unit}</p>
                      </div>
                      <div className={`text-right px-3 py-1 rounded-lg ${
                        completion === 100 
                          ? 'bg-green-500/20 text-green-500' 
                          : completion > 0 
                            ? 'bg-amber-500/20 text-amber-500'
                            : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className="text-lg font-bold">{completion}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Gamification */}
          {summary?.gamification && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/30">
                  <Award className="w-8 h-8 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {summary.gamification.message || t('dashboard.gamification.defaultMsg')}
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {summary.gamification.next_milestone || t('dashboard.gamification.defaultNext')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-amber-500">
                    {stats.totalCategories > 0 
                      ? Math.round((stats.completedCategories / stats.totalCategories) * 100) 
                      : 0}%
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('dashboard.gamification.completed')}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Diagnostic de plausibilité ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            data-testid="plausibility-section"
            className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-500/20">
                  <ShieldCheck className="w-6 h-6 text-sky-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('dashboard.plausibility.title')}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t('dashboard.plausibility.subtitle')}
                  </p>
                </div>
              </div>
              <button
                data-testid="run-plausibility-btn"
                onClick={runPlausibilityCheck}
                disabled={plausibilityLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  plausibilityLoading
                    ? 'bg-sky-500/50 text-white cursor-wait'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {plausibilityLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {plausibilityLoading ? t('dashboard.plausibility.running') : t('dashboard.plausibility.runBtn')}
              </button>
            </div>

            {/* Results */}
            <AnimatePresence>
              {plausibilityResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  {/* Summary badges */}
                  <div className="flex items-center gap-3 mb-4">
                    {plausibilityResult.summary.critical > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {plausibilityResult.summary.critical} {plausibilityResult.summary.critical > 1 ? t('dashboard.plausibility.criticals') : t('dashboard.plausibility.critical')}
                      </span>
                    )}
                    {plausibilityResult.summary.warning > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {plausibilityResult.summary.warning} {plausibilityResult.summary.warning > 1 ? t('dashboard.plausibility.warnings') : t('dashboard.plausibility.warning')}
                      </span>
                    )}
                    {plausibilityResult.summary.info > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-500">
                        <Info className="w-3.5 h-3.5" />
                        {plausibilityResult.summary.info} {plausibilityResult.summary.info > 1 ? t('dashboard.plausibility.infos') : t('dashboard.plausibility.info')}
                      </span>
                    )}
                    {plausibilityResult.summary.total_alerts === 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('dashboard.plausibility.noIssues')}
                      </span>
                    )}
                  </div>

                  {/* Alert list */}
                  {plausibilityResult.alerts.length > 0 && (
                    <div className="space-y-2">
                      {plausibilityResult.alerts.map((alert, idx) => {
                        const severityConfig = {
                          critical: {
                            bg: isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
                            icon: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
                            text: isDark ? 'text-red-300' : 'text-red-800',
                          },
                          warning: {
                            bg: isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200',
                            icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
                            text: isDark ? 'text-amber-300' : 'text-amber-800',
                          },
                          info: {
                            bg: isDark ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-50 border-sky-200',
                            icon: <Info className="w-4 h-4 text-sky-500 flex-shrink-0" />,
                            text: isDark ? 'text-sky-300' : 'text-sky-800',
                          },
                        };
                        const cfg = severityConfig[alert.severity] || severityConfig.info;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg}`}
                          >
                            {cfg.icon}
                            <span className={`text-sm ${cfg.text}`}>{alert.message}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Context info */}
                  <p className={`text-xs mt-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {t('dashboard.plausibility.contextExercise')} : {plausibilityResult.context_used.fiscal_year || '—'}
                    {' · '}{plausibilityResult.context_used.activities_count} {t('dashboard.plausibility.contextActivities')}
                    {' · '}{t('dashboard.plausibility.contextSector')} : {plausibilityResult.context_used.sector}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* ==================== TAB 2: RÉSULTATS ==================== */}
      {activeTab === 'resultats' && (
        <DashboardResultsTab 
          summary={summary}
          kpis={kpis}
          scopeBreakdown={scopeBreakdown}
          fiscalComparison={fiscalComparison}
        />
      )}

      {/* ==================== TAB 3: OBJECTIFS ==================== */}
      {activeTab === 'objectifs' && (
        <div className="space-y-6">
          {/* No objective yet - Show setup button */}
          {!objective ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-12 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Target className="w-10 h-10 text-green-500" />
              </div>
              <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Définissez vos objectifs climatiques
              </h2>
              <p className={`max-w-md mx-auto mb-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Alignez votre stratégie sur les objectifs Science Based Targets (SBTi) 
                pour contribuer à limiter le réchauffement climatique à 1.5°C.
              </p>
              
              <button
                onClick={() => {
                  setObjectiveForm({ reference_fiscal_year_id: fiscalYears[0]?.id || '', target_year: 2030 });
                  setShowObjectiveModal(true);
                }}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center gap-2 mx-auto"
              >
                <Flag className="w-5 h-5" />
                Fixer des objectifs
              </button>
            </motion.div>
          ) : (
            <>
              {/* Objective Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20">
                      <Target className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Objectif SBTi {objective.target_year}
                      </h2>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Année de référence : {objective.reference_year}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleArchiveObjective}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Archiver l'objectif"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Target Cards with Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scope 1&2 Progress Card */}
                  {(() => {
                    // Calculate current progress for Scope 1&2
                    // Find the most recent actual with data
                    const actualsWithData = trajectoryData.actuals?.filter(a => ((a.actual_scope1 || 0) + (a.actual_scope2 || 0)) > 0 || (a.actual_scope3 || 0) > 0) || [];
                    const latestActual = actualsWithData.length > 0 
                      ? actualsWithData[actualsWithData.length - 1] 
                      : trajectoryData.actuals?.[0]; // Fallback to first (baseline year)
                    
                    const currentS12 = (latestActual?.actual_scope1 || 0) + (latestActual?.actual_scope2 || 0) || objective.baseline_scope1_2;
                    const baselineS12 = objective.baseline_scope1_2 || 0;
                    const targetS12 = objective.target_scope1_2 || 0;
                    const reductionNeeded = baselineS12 - targetS12;
                    const reductionAchieved = baselineS12 - currentS12;
                    const progressPercent = reductionNeeded > 0 
                      ? Math.min(100, Math.max(0, Math.round((reductionAchieved / reductionNeeded) * 100))) 
                      : 0;
                    
                    // Check if on track by comparing to target trajectory for current year
                    const currentYear = latestActual?.year || objective.reference_year;
                    const targetForYear = trajectoryData.trajectory?.find(t => t.year === currentYear);
                    const isOnTrack = currentS12 <= (targetForYear?.target_scope1_2 || baselineS12);
                    
                    return (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-sky-400"></div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              Scope 1 & 2
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isOnTrack 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-amber-500/20 text-amber-500'
                          }`}>
                            {isOnTrack ? '✓ En bonne voie' : '⚠ Effort requis'}
                          </span>
                        </div>
                        
                        <div className="flex items-end gap-2 mb-3">
                          <span className="text-3xl font-bold text-sky-400">-{objective.reduction_scope1_2_percent}%</span>
                          <span className={`text-sm pb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            d'ici {objective.target_year}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progression ({currentYear})</span>
                            <span className={`font-medium ${progressPercent >= 50 ? 'text-green-500' : 'text-sky-400'}`}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPercent >= 50 ? 'bg-green-500' : 'bg-sky-400'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          Actuel : {formatEmissions(currentS12).value} {formatEmissions(currentS12).unit}
                          {' • '}Cible : {formatEmissions(targetS12).value} {formatEmissions(targetS12).unit}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Scope 3 Progress Card */}
                  {(() => {
                    // Find the most recent actual with data
                    const actualsWithData = trajectoryData.actuals?.filter(a => ((a.actual_scope1 || 0) + (a.actual_scope2 || 0)) > 0 || (a.actual_scope3 || 0) > 0) || [];
                    const latestActual = actualsWithData.length > 0 
                      ? actualsWithData[actualsWithData.length - 1] 
                      : trajectoryData.actuals?.[0];
                    
                    const currentS3 = latestActual?.actual_scope3 || objective.baseline_scope3;
                    const baselineS3 = objective.baseline_scope3 || 0;
                    const targetS3 = objective.target_scope3 || 0;
                    const reductionNeeded = baselineS3 - targetS3;
                    const reductionAchieved = baselineS3 - currentS3;
                    const progressPercent = reductionNeeded > 0 
                      ? Math.min(100, Math.max(0, Math.round((reductionAchieved / reductionNeeded) * 100))) 
                      : 0;
                    
                    const currentYear = latestActual?.year || objective.reference_year;
                    const targetForYear = trajectoryData.trajectory?.find(t => t.year === currentYear);
                    const isOnTrack = currentS3 <= (targetForYear?.target_scope3 || baselineS3);
                    
                    return (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-violet-400"></div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              Scope 3
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isOnTrack 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-amber-500/20 text-amber-500'
                          }`}>
                            {isOnTrack ? '✓ En bonne voie' : '⚠ Effort requis'}
                          </span>
                        </div>
                        
                        <div className="flex items-end gap-2 mb-3">
                          <span className="text-3xl font-bold text-violet-400">-{objective.reduction_scope3_percent}%</span>
                          <span className={`text-sm pb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            d'ici {objective.target_year}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progression ({currentYear})</span>
                            <span className={`font-medium ${progressPercent >= 50 ? 'text-green-500' : 'text-violet-400'}`}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPercent >= 50 ? 'bg-green-500' : 'bg-violet-400'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          Actuel : {formatEmissions(currentS3).value} {formatEmissions(currentS3).unit}
                          {' • '}Cible : {formatEmissions(targetS3).value} {formatEmissions(targetS3).unit}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* FEAT-02: Scenario selector for Objectives (only when viewing actual data) */}
              {scenarioEntities.length > 0 && currentFiscalYear?.type !== 'scenario' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}
                  data-testid="scenario-selector"
                >
                  <FlaskConical className={`w-4 h-4 flex-shrink-0 ${selectedScenarioEntityId ? 'text-violet-500' : isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <select
                    value={selectedScenarioEntityId || ''}
                    onChange={(e) => setSelectedScenarioEntityId(e.target.value || null)}
                    data-testid="scenario-select"
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      selectedScenarioEntityId
                        ? 'border-violet-500/50 bg-violet-500/5 text-violet-700 font-medium'
                        : isDark
                          ? 'bg-slate-700 border-slate-600 text-slate-300'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <option value="">Superposer un scénario...</option>
                    {scenarioEntities.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {selectedScenarioEntityId && (
                    <button
                      onClick={() => setSelectedScenarioEntityId(null)}
                      className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      title={t('dashboard.scenario.remove')}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </motion.div>
              )}

              {/* FEAT-02: Effort coverage indicator */}
              {selectedScenarioEntityId && scenarioSummary && objective && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`p-4 rounded-xl border-2 border-violet-500/30 ${isDark ? 'bg-violet-500/5' : 'bg-violet-50'}`}
                  data-testid="scenario-effort-indicator"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="w-4 h-4 text-violet-500" />
                    <span className={`text-sm font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                      {t('dashboard.scenario.coverage')} — {scenarioEntities.find(s => s.id === selectedScenarioEntityId)?.name || t('dashboard.scenario.label')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Scope 1&2 coverage */}
                    {(() => {
                      const baselineS12 = objective.baseline_scope1_2 || 0;
                      const targetS12 = objective.target_scope1_2 || 0;
                      const reductionNeeded = baselineS12 - targetS12;
                      const se = scenarioSummary.summary?.scope_emissions || {};
                      const scenarioS12 = (se.scope1 || 0) + (se.scope2 || 0);
                      const reductionAchieved = baselineS12 - scenarioS12;
                      const coveragePct = reductionNeeded > 0 ? Math.round((reductionAchieved / reductionNeeded) * 100) : 0;
                      const isPositive = coveragePct > 0;
                      return (
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Scope 1 & 2</span>
                          </div>
                          <div className="flex items-end gap-2 mb-2">
                            <span className={`text-2xl font-bold ${coveragePct >= 100 ? 'text-green-500' : isPositive ? 'text-sky-400' : 'text-red-500'}`}>
                              {coveragePct}%
                            </span>
                            <span className={`text-xs pb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              de l'effort requis
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${coveragePct >= 100 ? 'bg-green-500' : isPositive ? 'bg-sky-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Scénario : {formatEmissions(scenarioS12).value} {formatEmissions(scenarioS12).unit}
                            {' • '}Cible : {formatEmissions(targetS12).value} {formatEmissions(targetS12).unit}
                          </p>
                        </div>
                      );
                    })()}
                    {/* Scope 3 coverage */}
                    {(() => {
                      const baselineS3 = objective.baseline_scope3 || 0;
                      const targetS3 = objective.target_scope3 || 0;
                      const reductionNeeded = baselineS3 - targetS3;
                      const se = scenarioSummary.summary?.scope_emissions || {};
                      const scenarioS3 = (se.scope3_amont || 0) + (se.scope3_aval || 0);
                      const reductionAchieved = baselineS3 - scenarioS3;
                      const coveragePct = reductionNeeded > 0 ? Math.round((reductionAchieved / reductionNeeded) * 100) : 0;
                      const isPositive = coveragePct > 0;
                      return (
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-400"></div>
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Scope 3</span>
                          </div>
                          <div className="flex items-end gap-2 mb-2">
                            <span className={`text-2xl font-bold ${coveragePct >= 100 ? 'text-green-500' : isPositive ? 'text-violet-400' : 'text-red-500'}`}>
                              {coveragePct}%
                            </span>
                            <span className={`text-xs pb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              de l'effort requis
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${coveragePct >= 100 ? 'bg-green-500' : isPositive ? 'bg-violet-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            Scénario : {formatEmissions(scenarioS3).value} {formatEmissions(scenarioS3).unit}
                            {' • '}Cible : {formatEmissions(targetS3).value} {formatEmissions(targetS3).unit}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              {/* Trajectory Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
              >
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Trajectoire de réduction
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      barGap={2}
                      barCategoryGap="20%"
                      data={(() => {
                        const chartData = trajectoryData.trajectory.map(t => {
                          const actual = trajectoryData.actuals.find(a => a.year === t.year);
                          return {
                            year: t.year,
                            target_total: t.target_total,
                            actual_scope1: actual?.actual_scope1 || null,
                            actual_scope2: actual?.actual_scope2 || null,
                            actual_scope3: actual?.actual_scope3 || null,
                          };
                        });
                        
                        // Add scenario data for ALL periods of the selected scenario
                        if (selectedScenarioEntityId && scenarioDataPoints.length > 0) {
                          for (const dp of scenarioDataPoints) {
                            const existingIdx = chartData.findIndex(d => d.year === dp.year);
                            if (existingIdx >= 0) {
                              chartData[existingIdx].scenario_scope1 = dp.scope1;
                              chartData[existingIdx].scenario_scope2 = dp.scope2;
                              chartData[existingIdx].scenario_scope3 = dp.scope3;
                            } else {
                              chartData.push({
                                year: dp.year,
                                scenario_scope1: dp.scope1,
                                scenario_scope2: dp.scope2,
                                scenario_scope3: dp.scope3
                              });
                            }
                          }
                          chartData.sort((a, b) => a.year - b.year);
                        }
                        
                        return chartData;
                      })()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="gradTargetTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34D399" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#34D399" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const items = payload.filter(p => p.value != null && p.value > 0);
                          if (!items.length) return null;
                          return (
                            <div className={`px-4 py-3 rounded-xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Année {label}</p>
                              {items.map((item, i) => {
                                const nameMap = {
                                  target_total: t('dashboard.objectives.targetTotal'),
                                  actual_scope1: t('dashboard.scopes.scope1'),
                                  actual_scope2: t('dashboard.scopes.scope2'),
                                  actual_scope3: t('dashboard.objectives.scope3'),
                                  scenario_scope1: t('dashboard.scenario.s1'),
                                  scenario_scope2: t('dashboard.scenario.s2'),
                                  scenario_scope3: t('dashboard.scenario.s3'),
                                };
                                return (
                                  <div key={item.dataKey || `legend-${i}`} className="flex items-center gap-2 text-xs py-0.5">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                                    <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{nameMap[item.dataKey] || item.name}</span>
                                    <span className={`ml-auto font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatChartValue(item.value)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }}
                        cursor={{ stroke: isDark ? '#475569' : '#cbd5e1', strokeWidth: 1 }}
                      />
                      
                      {/* Reference line at baseline */}
                      {objective?.baseline_total && (
                        <ReferenceLine 
                          y={objective.baseline_total} 
                          stroke={isDark ? '#64748b' : '#94a3b8'} 
                          strokeDasharray="6 4" 
                          strokeWidth={1}
                          label={{ 
                            value: `Base: ${(objective.baseline_total / 1000).toFixed(1)}t`, 
                            position: 'right', 
                            fill: isDark ? '#64748b' : '#94a3b8', 
                            fontSize: 11 
                          }}
                        />
                      )}
                      
                      {/* Target trajectory area - emerald envelope */}
                      <Area
                        type="monotone"
                        dataKey="target_total"
                        name="Cible totale"
                        stroke="#34D399"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        fill="url(#gradTargetTotal)"
                        dot={false}
                        activeDot={false}
                      />
                      
                      {/* Actual emissions - stacked bars */}
                      <Bar dataKey="actual_scope1" name={t('dashboard.scopes.scope1')} stackId="actual" fill="#FB923C" radius={[0, 0, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="actual_scope2" name={t('dashboard.scopes.scope2')} stackId="actual" fill="#60A5FA" radius={[0, 0, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="actual_scope3" name={t('dashboard.objectives.scope3')} stackId="actual" fill="#A78BFA" radius={[4, 4, 0, 0]} maxBarSize={32} />

                      {/* Scenario emissions - stacked bars with transparency */}
                      {selectedScenarioEntityId && scenarioDataPoints.length > 0 && (
                        <>
                          <Bar dataKey="scenario_scope1" name={t('dashboard.scenario.s1')} stackId="scenario" fill="#FB923C" fillOpacity={0.4} stroke="#FB923C" strokeDasharray="4 2" strokeWidth={1} radius={[0, 0, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="scenario_scope2" name={t('dashboard.scenario.s2')} stackId="scenario" fill="#60A5FA" fillOpacity={0.4} stroke="#60A5FA" strokeDasharray="4 2" strokeWidth={1} radius={[0, 0, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="scenario_scope3" name={t('dashboard.scenario.s3')} stackId="scenario" fill="#A78BFA" fillOpacity={0.4} stroke="#A78BFA" strokeDasharray="4 2" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={32} />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FB923C' }} />
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 1</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#60A5FA' }} />
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 2</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#A78BFA' }} />
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 3</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 rounded-sm border border-dashed" style={{ borderColor: '#34D399', backgroundColor: 'rgba(52,211,153,0.12)' }} />
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Trajectoire cible</span>
                  </div>
                  {selectedScenarioEntityId && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border border-dashed opacity-50" style={{ borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.2)' }} />
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scénario</span>
                    </div>
                  )}
                </div>
                
                <p className={`text-xs mt-3 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  La zone verte représente la trajectoire cible SBTi. Les barres montrent les émissions réelles par scope.
                  {selectedScenarioEntityId && ' Les barres transparentes montrent la projection du scénario.'}
                </p>
              </motion.div>


              {/* Change objective button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={() => {
                    setObjectiveForm({ 
                      reference_fiscal_year_id: objective.reference_fiscal_year_id || fiscalYears[0]?.id || '', 
                      target_year: objective.target_year === 2030 ? 2035 : 2030
                    });
                    setShowObjectiveModal(true);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    isDark 
                      ? 'border-slate-600 hover:bg-slate-700 text-slate-300 hover:text-white' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>Modifier l'objectif</span>
                </button>
              </motion.div>
            </>
          )}
        </div>
      )}

      {/* ==================== OBJECTIVE MODAL ==================== */}
      <AnimatePresence>
        {showObjectiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowObjectiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <Target className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Fixer un objectif SBTi
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Science Based Targets initiative
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Reference Year Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Année de référence (baseline)
                  </label>
                  <select
                    value={objectiveForm.reference_fiscal_year_id}
                    onChange={(e) => setObjectiveForm({ ...objectiveForm, reference_fiscal_year_id: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="">Sélectionner un exercice...</option>
                    {fiscalYears.map(fy => (
                      <option key={fy.id} value={fy.id}>{fy.name}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Les émissions de cet exercice serviront de point de départ
                  </p>
                </div>

                {/* Target Year Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Horizon de réduction (Near-term)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setObjectiveForm({ ...objectiveForm, target_year: 2030 })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        objectiveForm.target_year === 2030
                          ? 'border-green-500 bg-green-500/10'
                          : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${objectiveForm.target_year === 2030 ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                        2030
                      </div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span className="text-blue-500 font-medium">-42%</span> Scope 1&2
                      </div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span className="text-amber-500 font-medium">-25%</span> Scope 3
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setObjectiveForm({ ...objectiveForm, target_year: 2035 })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        objectiveForm.target_year === 2035
                          ? 'border-green-500 bg-green-500/10'
                          : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${objectiveForm.target_year === 2035 ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                        2035
                      </div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span className="text-blue-500 font-medium">-65%</span> Scope 1&2
                      </div>
                      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span className="text-amber-500 font-medium">-39%</span> Scope 3
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info box */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
                  <div className="flex items-start gap-3">
                    <Sparkles className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-blue-700'}`}>
                      <strong>Objectifs SBTi Near-term</strong>
                      <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-blue-600'}`}>
                        Ces objectifs sont alignés sur une trajectoire limitant le réchauffement à 1.5°C, 
                        conformément aux recommandations de la Science Based Targets initiative.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
                <button
                  onClick={() => setShowObjectiveModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateObjective}
                  disabled={!objectiveForm.reference_fiscal_year_id || objectiveLoading}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {objectiveLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Flag className="w-5 h-5" />
                      Définir l'objectif
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== RECALCULATION MODAL ==================== */}
      <AnimatePresence>
        {showRecalcModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRecalcModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20">
                    <GitCompare className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Recalcul avec facteurs actuels</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Comparez les émissions historiques avec les facteurs à jour
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
                {/* Fiscal Year Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Exercice fiscal à recalculer
                  </label>
                  <select
                    value={recalcFiscalYear}
                    onChange={(e) => setRecalcFiscalYear(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="">Sélectionner un exercice...</option>
                    {fiscalYears.map(fy => (
                      <option key={fy.id} value={fy.id}>{fy.name} ({fy.year})</option>
                    ))}
                  </select>
                </div>

                {/* Recalculate Button */}
                {!recalcResult && (
                  <button
                    onClick={handleRecalculate}
                    disabled={!recalcFiscalYear || recalcLoading}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {recalcLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Lancer le recalcul
                      </>
                    )}
                  </button>
                )}

                {/* Results */}
                {recalcResult && (
                  <div className="space-y-6">
                    {/* No activities message */}
                    {(!recalcResult.summary || recalcResult.comparisons?.length === 0) ? (
                      <div className={`p-6 rounded-xl border text-center ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-500 opacity-50" />
                        <h3 className="text-lg font-bold mb-2">Aucune activité trouvée</h3>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {recalcResult.message || t('dashboard.recalculate.noActivityData')}
                        </p>
                        <button
                          onClick={() => setRecalcResult(null)}
                          className={`mt-4 px-4 py-2 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          Sélectionner un autre exercice
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Summary Card */}
                        <div className={`p-6 rounded-xl border ${
                          recalcResult.summary.total_difference > 0 
                            ? isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                            : recalcResult.summary.total_difference < 0
                              ? isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                              : isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-3 mb-4">
                            {recalcResult.summary.total_difference > 0 ? (
                              <AlertTriangle className="w-6 h-6 text-red-500" />
                            ) : recalcResult.summary.total_difference < 0 ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : (
                              <CheckCircle className="w-6 h-6 text-gray-500" />
                            )}
                            <h3 className="text-lg font-bold">Résumé du recalcul</h3>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Émissions originales</p>
                              <p className="text-lg font-bold">
                                {formatEmissions(recalcResult.summary.total_original_emissions).value}
                                <span className="text-sm font-normal ml-1">{formatEmissions(recalcResult.summary.total_original_emissions).unit}</span>
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Émissions recalculées</p>
                              <p className="text-lg font-bold">
                                {formatEmissions(recalcResult.summary.total_recalculated_emissions).value}
                                <span className="text-sm font-normal ml-1">{formatEmissions(recalcResult.summary.total_recalculated_emissions).unit}</span>
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Différence</p>
                              <p className={`text-lg font-bold ${
                                recalcResult.summary.total_difference > 0 ? 'text-red-500' : 
                                recalcResult.summary.total_difference < 0 ? 'text-green-500' : ''
                              }`}>
                                {recalcResult.summary.total_difference > 0 ? '+' : ''}
                                {formatEmissions(recalcResult.summary.total_difference).value}
                                <span className="text-sm font-normal ml-1">{formatEmissions(recalcResult.summary.total_difference).unit}</span>
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Variation</p>
                              <p className={`text-lg font-bold ${
                                recalcResult.summary.total_difference_percent > 0 ? 'text-red-500' : 
                                recalcResult.summary.total_difference_percent < 0 ? 'text-green-500' : ''
                              }`}>
                                {recalcResult.summary.total_difference_percent > 0 ? '+' : ''}
                                {recalcResult.summary.total_difference_percent}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Activities details (collapsible) */}
                        <div className={`rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                          <button
                            onClick={() => setExpandedActivities(!expandedActivities)}
                            className={`w-full p-4 flex items-center justify-between ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} rounded-xl transition-colors`}
                          >
                            <span className="font-medium">
                              Détail par activité ({recalcResult.summary.total_activities} activités)
                            </span>
                            {expandedActivities ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>

                          {expandedActivities && (
                            <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                              <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                                    <tr>
                                      <th className="text-left px-4 py-2">Activité</th>
                                      <th className="text-right px-4 py-2">Original</th>
                                      <th className="text-right px-4 py-2">Recalculé</th>
                                      <th className="text-right px-4 py-2">Diff</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {recalcResult.comparisons?.map((comp, i) => (
                                      <tr key={comp.activity_name || `comp-${i}`} className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                                        <td className="px-4 py-2">
                                          <div className="font-medium">{comp.activity_name}</div>
                                          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {comp.scope?.replace('_', ' ')} • {comp.quantity} {comp.unit}
                                          </div>
                                        </td>
                                        <td className="text-right px-4 py-2">{comp.original_emissions.toFixed(2)}</td>
                                        <td className="text-right px-4 py-2">{comp.recalculated_emissions.toFixed(2)}</td>
                                        <td className={`text-right px-4 py-2 font-medium ${
                                          comp.difference > 0 ? 'text-red-500' : 
                                          comp.difference < 0 ? 'text-green-500' : ''
                                        }`}>
                                          {comp.difference > 0 ? '+' : ''}{comp.difference.toFixed(2)}
                                          <span className="text-xs ml-1">({comp.difference_percent}%)</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info message */}
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            <strong>Note :</strong> Ce recalcul est une simulation. Les données originales de l'exercice 
                            ne sont pas modifiées et restent basées sur les facteurs d'émission qui étaient en vigueur 
                            à l'époque de la saisie.
                          </p>
                        </div>

                        {/* Recalculate again button */}
                        <button
                          onClick={() => setRecalcResult(null)}
                          className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          Recalculer un autre exercice
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button 
                  onClick={() => setShowRecalcModal(false)} 
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
