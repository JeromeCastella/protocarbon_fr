import React, { useState, useEffect } from 'react';
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
  DollarSign,
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
  Lightbulb,
  TrendingDown as TrendDown,
  Sparkles,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'tCO₂e'
    };
  } else {
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
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
  const { fiscalYears } = useFiscalYear();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('suivi');
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [fiscalComparison, setFiscalComparison] = useState([]);
  const [scopeBreakdown, setScopeBreakdown] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('current');
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

  // Objectives state
  const [objective, setObjective] = useState(null);
  const [trajectoryData, setTrajectoryData] = useState({ trajectory: [], actuals: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [objectiveForm, setObjectiveForm] = useState({
    reference_fiscal_year_id: '',
    target_year: 2030
  });
  const [objectiveLoading, setObjectiveLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
    fetchObjectiveData();
  }, []);

  useEffect(() => {
    if (selectedFiscalYear) {
      fetchScopeBreakdown(selectedFiscalYear);
    }
  }, [selectedFiscalYear]);

  const fetchObjectiveData = async () => {
    try {
      const [objRes, trajRes, recoRes] = await Promise.all([
        axios.get(`${API_URL}/api/objectives`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/objectives/trajectory`).catch(() => ({ data: { trajectory: [], actuals: [] } })),
        axios.get(`${API_URL}/api/objectives/recommendations`).catch(() => ({ data: { recommendations: [] } }))
      ]);
      
      setObjective(objRes.data);
      setTrajectoryData(trajRes.data);
      setRecommendations(recoRes.data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch objective data:', error);
    }
  };

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
      console.error('Failed to create objective:', error);
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
      setRecommendations([]);
    } catch (error) {
      console.error('Failed to archive objective:', error);
      alert('Erreur lors de l\'archivage: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchAllData = async () => {
    try {
      const [summaryRes, kpisRes, comparisonRes, breakdownRes, activitiesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/summary`),
        axios.get(`${API_URL}/api/dashboard/kpis`),
        axios.get(`${API_URL}/api/dashboard/fiscal-comparison`),
        axios.get(`${API_URL}/api/dashboard/scope-breakdown/current`),
        axios.get(`${API_URL}/api/activities`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/products`).catch(() => ({ data: [] }))
      ]);
      
      setSummary(summaryRes.data);
      setKpis(kpisRes.data);
      setFiscalComparison(comparisonRes.data);
      setScopeBreakdown(breakdownRes.data);
      
      // Calculate stats from summary data
      const activities = activitiesRes.data || [];
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
        totalActivities: summaryRes.data?.activities_count || activities.length,
        totalProducts: summaryRes.data?.products_count || products.length,
        totalEmissions: summaryRes.data?.total_emissions || 0,
        completedCategories: completedCats,
        totalCategories: totalCats
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScopeBreakdown = async (fyId) => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/scope-breakdown/${fyId}`);
      setScopeBreakdown(response.data);
      setDrillDownScope(null);
    } catch (error) {
      console.error('Failed to fetch scope breakdown:', error);
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
      console.error('Failed to recalculate:', error);
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
    scope1: 'Scope 1',
    scope2: 'Scope 2',
    scope3_amont: 'Scope 3 - Amont',
    scope3_aval: 'Scope 3 - Aval',
  };

  const scopeIcons = {
    scope1: Factory,
    scope2: Zap,
    scope3_amont: Truck,
    scope3_aval: Leaf
  };

  const chartColors = {
    scope1: '#3B82F6',
    scope2: '#06B6D4',
    scope3_amont: '#F59E0B',
    scope3_aval: '#6366F1'
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

  // Tab definitions
  const tabs = [
    { id: 'suivi', label: 'Suivi de saisie', icon: ClipboardList },
    { id: 'resultats', label: 'Résultats', icon: BarChart3 },
    { id: 'objectifs', label: 'Objectifs', icon: Target }
  ];

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('nav.dashboard')}
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Vue d'ensemble de votre bilan carbone
        </p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
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
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
                    className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
                    {summary.gamification.message || "Continuez comme ça !"}
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {summary.gamification.next_milestone || "Complétez plus de catégories pour débloquer des badges"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-amber-500">
                    {stats.totalCategories > 0 
                      ? Math.round((stats.completedCategories / stats.totalCategories) * 100) 
                      : 0}%
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>complété</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: RÉSULTATS ==================== */}
      {activeTab === 'resultats' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Leaf className="w-5 h-5 text-green-500" />
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Émissions totales</span>
              </div>
              <p className="text-2xl font-bold">
                {formatEmissions(summary?.total_emissions || 0).value}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {formatEmissions(summary?.total_emissions || 0).unit}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Par employé</span>
              </div>
              <p className="text-2xl font-bold">
                {kpis?.emissions_per_employee 
                  ? formatEmissions(kpis.emissions_per_employee).value 
                  : '-'}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {kpis?.emissions_per_employee ? formatEmissions(kpis.emissions_per_employee).unit : 'tCO₂e/employé'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Par kCHF</span>
              </div>
              <p className="text-2xl font-bold">
                {kpis?.emissions_per_revenue 
                  ? formatEmissions(kpis.emissions_per_revenue).value 
                  : '-'}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {kpis?.emissions_per_revenue ? formatEmissions(kpis.emissions_per_revenue).unit + '/kCHF' : 'tCO₂e/kCHF'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  (kpis?.year_over_year_change || 0) > 0 
                    ? 'bg-red-500/20' 
                    : (kpis?.year_over_year_change || 0) < 0 
                      ? 'bg-green-500/20' 
                      : isDark ? 'bg-slate-700' : 'bg-gray-100'
                }`}>
                  {(kpis?.year_over_year_change || 0) > 0 ? (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  ) : (kpis?.year_over_year_change || 0) < 0 ? (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  ) : (
                    <Minus className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  )}
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Variation N-1</span>
              </div>
              <p className={`text-2xl font-bold ${
                (kpis?.year_over_year_change || 0) > 0 
                  ? 'text-red-500' 
                  : (kpis?.year_over_year_change || 0) < 0 
                    ? 'text-green-500' 
                    : ''
              }`}>
                {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined
                  ? `${kpis.year_over_year_change > 0 ? '+' : ''}${kpis.year_over_year_change}%` 
                  : '-'}
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>vs année précédente</p>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fiscal Year Comparison Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Évolution des émissions par exercice
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fiscalComparison} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="year" tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }} />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`} 
                      tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value) => formatChartValue(value)}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        borderColor: isDark ? '#475569' : '#e5e7eb'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="scope1" name="Scope 1" stackId="a" fill={chartColors.scope1} />
                    <Bar dataKey="scope2" name="Scope 2" stackId="a" fill={chartColors.scope2} />
                    <Bar dataKey="scope3_amont" name="Scope 3 Amont" stackId="a" fill={chartColors.scope3_amont} />
                    <Bar dataKey="scope3_aval" name="Scope 3 Aval" stackId="a" fill={chartColors.scope3_aval} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Scope Breakdown Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Répartition par scope
                </h3>
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-gray-100 text-gray-900 border-gray-200'
                  } border`}
                >
                  <option value="current">Exercice actuel</option>
                  {fiscalYears.map(fy => (
                    <option key={fy.id} value={fy.id}>{fy.name}</option>
                  ))}
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={scopeBreakdown?.scope_data || []}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                      tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value) => formatChartValue(value)}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        borderColor: isDark ? '#475569' : '#e5e7eb'
                      }}
                    />
                    <Bar dataKey="emissions" name="Émissions">
                      {(scopeBreakdown?.scope_data || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[entry.scope] || '#6366F1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Recalculate Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={openRecalcModal}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                isDark 
                  ? 'border-slate-600 hover:bg-slate-700 text-slate-300 hover:text-white' 
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <GitCompare className="w-5 h-5" />
              <span>Recalculer avec facteurs actuels</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* ==================== TAB 3: OBJECTIFS ==================== */}
      {activeTab === 'objectifs' && (
        <div className="space-y-6">
          {/* No objective yet - Show setup button */}
          {!objective ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-12 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
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
                    const actualsWithData = trajectoryData.actuals?.filter(a => (a.actual_scope1_2 || 0) > 0 || (a.actual_scope3 || 0) > 0) || [];
                    const latestActual = actualsWithData.length > 0 
                      ? actualsWithData[actualsWithData.length - 1] 
                      : trajectoryData.actuals?.[0]; // Fallback to first (baseline year)
                    
                    const currentS12 = latestActual?.actual_scope1_2 || objective.baseline_scope1_2;
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
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
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
                          <span className="text-3xl font-bold text-blue-500">-{objective.reduction_scope1_2_percent}%</span>
                          <span className={`text-sm pb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            d'ici {objective.target_year}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progression ({currentYear})</span>
                            <span className={`font-medium ${progressPercent >= 50 ? 'text-green-500' : 'text-blue-500'}`}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPercent >= 50 ? 'bg-green-500' : 'bg-blue-500'
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
                    const actualsWithData = trajectoryData.actuals?.filter(a => (a.actual_scope1_2 || 0) > 0 || (a.actual_scope3 || 0) > 0) || [];
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
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
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
                          <span className="text-3xl font-bold text-amber-500">-{objective.reduction_scope3_percent}%</span>
                          <span className={`text-sm pb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            d'ici {objective.target_year}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progression ({currentYear})</span>
                            <span className={`font-medium ${progressPercent >= 50 ? 'text-green-500' : 'text-amber-500'}`}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPercent >= 50 ? 'bg-green-500' : 'bg-amber-500'
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

              {/* Trajectory Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
              >
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Trajectoire de réduction
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={trajectoryData.trajectory.map(t => {
                        const actual = trajectoryData.actuals.find(a => a.year === t.year);
                        return {
                          ...t,
                          actual_scope1_2: actual?.actual_scope1_2,
                          actual_scope3: actual?.actual_scope3,
                          actual_total: actual?.actual_total
                        };
                      })}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="year" 
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [formatChartValue(value), name]}
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1e293b' : '#fff',
                          borderColor: isDark ? '#475569' : '#e5e7eb'
                        }}
                        labelFormatter={(year) => `Année ${year}`}
                      />
                      <Legend />
                      
                      {/* Target lines (dashed) */}
                      <Line 
                        type="monotone" 
                        dataKey="target_scope1_2" 
                        name="Cible Scope 1&2" 
                        stroke="#3B82F6" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target_scope3" 
                        name="Cible Scope 3" 
                        stroke="#F59E0B" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                      
                      {/* Actual values (bars) */}
                      <Bar 
                        dataKey="actual_scope1_2" 
                        name="Réel Scope 1&2" 
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="actual_scope3" 
                        name="Réel Scope 3" 
                        fill="#F59E0B"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-xs mt-4 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Les lignes pointillées représentent la trajectoire cible SBTi. Les barres montrent les émissions réelles par exercice.
                </p>
              </motion.div>

              {/* Recommended Measures */}
              {recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="w-6 h-6 text-amber-500" />
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Mesures recommandées
                    </h3>
                  </div>
                  <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Basées sur vos principales sources d'émissions
                  </p>

                  <div className="space-y-6">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {rec.category.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded-lg ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                            {formatEmissions(rec.emissions).value} {formatEmissions(rec.emissions).unit}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {rec.measures.map((measure, mIdx) => (
                            <div key={mIdx} className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                measure.impact === 'high' ? 'bg-green-500' :
                                measure.impact === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                              }`}></div>
                              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                {measure.title_fr}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                measure.impact === 'high' 
                                  ? 'bg-green-500/20 text-green-600' 
                                  : measure.impact === 'medium'
                                    ? 'bg-amber-500/20 text-amber-600'
                                    : 'bg-gray-500/20 text-gray-500'
                              }`}>
                                {measure.impact === 'high' ? 'Impact fort' : measure.impact === 'medium' ? 'Impact moyen' : 'Impact faible'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowObjectiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRecalcModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
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
                          {recalcResult.message || "Aucune donnée d'activité pour cet exercice fiscal."}
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
                                      <tr key={i} className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
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
