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
  ChevronUp
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
  Cell
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
  
  const [summary, setSummary] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [fiscalComparison, setFiscalComparison] = useState([]);
  const [scopeBreakdown, setScopeBreakdown] = useState(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('current');
  const [drillDownScope, setDrillDownScope] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedFiscalYear) {
      fetchScopeBreakdown(selectedFiscalYear);
    }
  }, [selectedFiscalYear]);

  const fetchAllData = async () => {
    try {
      const [summaryRes, kpisRes, comparisonRes, breakdownRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/summary`),
        axios.get(`${API_URL}/api/dashboard/kpis`),
        axios.get(`${API_URL}/api/dashboard/fiscal-comparison`),
        axios.get(`${API_URL}/api/dashboard/scope-breakdown/current`)
      ]);
      
      setSummary(summaryRes.data);
      setKpis(kpisRes.data);
      setFiscalComparison(comparisonRes.data);
      setScopeBreakdown(breakdownRes.data);
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

  const scopeColors = {
    scope1: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100 text-blue-600', hex: '#3b82f6' },
    scope2: { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-100 text-cyan-600', hex: '#06b6d4' },
    scope3_amont: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-100 text-purple-600', hex: '#8b5cf6' },
    scope3_aval: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-100 text-indigo-600', hex: '#6366f1' },
  };

  const scopeNames = {
    scope1: 'Scope 1',
    scope2: 'Scope 2',
    scope3_amont: 'Scope 3 - Amont',
    scope3_aval: 'Scope 3 - Aval',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalCompletion = summary?.scope_completion 
    ? Math.round(
        Object.values(summary.scope_completion).reduce((acc, s) => acc + s.percentage, 0) / 4
      )
    : 0;

  // Custom tooltip for charts
  const renderCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
          <p className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatChartValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Prepare data for fiscal year comparison chart
  const comparisonChartData = fiscalComparison.map(fy => ({
    name: fy.name.replace('Exercice ', ''),
    year: fy.year,
    'Scope 1': fy.scope1,
    'Scope 2': fy.scope2,
    'Scope 3 Amont': fy.scope3_amont,
    'Scope 3 Aval': fy.scope3_aval,
    total: fy.total
  }));

  return (
    <div data-testid="dashboard" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('nav.dashboard')}
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Vue d&apos;ensemble de votre bilan carbone
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emissions KPI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {kpis?.variation_percent !== 0 && kpis?.variation_percent !== null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                kpis?.variation_percent > 0 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {kpis?.variation_percent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(kpis?.variation_percent)}%
              </div>
            )}
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Émissions totales</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatEmissions(kpis?.current_emissions).value}
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {formatEmissions(kpis?.current_emissions).unit}
          </p>
        </motion.div>

        {/* Variation vs Previous Year */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              kpis?.variation_percent > 0 
                ? 'bg-gradient-to-br from-red-500 to-red-600' 
                : kpis?.variation_percent < 0 
                  ? 'bg-gradient-to-br from-green-500 to-green-600'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
            }`}>
              {kpis?.variation_percent > 0 ? (
                <TrendingUp className="w-5 h-5 text-white" />
              ) : kpis?.variation_percent < 0 ? (
                <TrendingDown className="w-5 h-5 text-white" />
              ) : (
                <Minus className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Variation N-1</p>
          <p className={`text-2xl font-bold ${
            kpis?.variation_percent > 0 
              ? 'text-red-500' 
              : kpis?.variation_percent < 0 
                ? 'text-green-500'
                : isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {kpis?.variation_percent > 0 ? '+' : ''}{kpis?.variation_percent || 0}%
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {kpis?.variation_absolute ? formatEmissions(kpis.variation_absolute).value + ' ' + formatEmissions(kpis.variation_absolute).unit : 'Pas de données N-1'}
          </p>
        </motion.div>

        {/* Emissions per Employee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Par employé</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {kpis?.emissions_per_employee ? formatEmissions(kpis.emissions_per_employee).value : '-'}
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {kpis?.emissions_per_employee ? formatEmissions(kpis.emissions_per_employee).unit + '/employé' : `${kpis?.employees || 0} employés`}
          </p>
        </motion.div>

        {/* Fiscal Years */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Exercice actuel</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {kpis?.current_fiscal_year?.replace('Exercice ', '') || '-'}
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {kpis?.fiscal_years_count || 0} exercice(s) enregistré(s)
          </p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fiscal Year Comparison Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Évolution des émissions par exercice
          </h3>
          
          {comparisonChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                  axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                  axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                />
                <Tooltip content={renderCustomTooltip} />
                <Legend />
                <Bar dataKey="Scope 1" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Scope 2" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Scope 3 Amont" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Scope 3 Aval" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Aucun exercice fiscal enregistré
              </p>
            </div>
          )}
        </motion.div>

        {/* Scope Breakdown Chart with Drill-down */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {drillDownScope && (
                <button
                  onClick={() => setDrillDownScope(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {drillDownScope 
                  ? `Détail ${scopeNames[drillDownScope]}`
                  : 'Répartition par scope'}
              </h3>
            </div>
            
            {/* Fiscal Year Selector */}
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <option value="current">Exercice actuel</option>
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          <AnimatePresence mode="wait">
            {!drillDownScope ? (
              // Scope level chart
              <motion.div
                key="scope-chart"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {scopeBreakdown?.scope_data?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={scopeBreakdown.scope_data} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                      <XAxis 
                        type="number"
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                        axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                        axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                        width={75}
                      />
                      <Tooltip content={renderCustomTooltip} />
                      <Bar 
                        dataKey="emissions" 
                        name="Émissions"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          if (data && scopeBreakdown?.category_data?.[data.scope]?.length > 0) {
                            setDrillDownScope(data.scope);
                          }
                        }}
                      >
                        {scopeBreakdown?.scope_data?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Aucune donnée pour cet exercice
                    </p>
                  </div>
                )}
                <p className={`text-xs text-center mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Cliquez sur une barre pour voir le détail par catégorie
                </p>
              </motion.div>
            ) : (
              // Category drill-down chart
              <motion.div
                key="category-chart"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {scopeBreakdown?.category_data?.[drillDownScope]?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={scopeBreakdown.category_data[drillDownScope].slice(0, 8)} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                      <XAxis 
                        type="number"
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                        axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 11 }}
                        axisLine={{ stroke: isDark ? '#475569' : '#d1d5db' }}
                        width={95}
                        tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                      />
                      <Tooltip content={renderCustomTooltip} />
                      <Bar 
                        dataKey="emissions" 
                        name="Émissions"
                        fill={scopeColors[drillDownScope]?.hex}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className={`${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Aucune donnée pour ce scope
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scope Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(summary?.scope_emissions || {}).map(([scope, emissions], index) => (
          <motion.div
            key={scope}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${scopeColors[scope]?.light}`}>
                {scopeNames[scope]}
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${scopeColors[scope]?.bg} flex items-center justify-center text-white`}>
                {scope === 'scope1' && <Factory className="w-5 h-5" />}
                {scope === 'scope2' && <Zap className="w-5 h-5" />}
                {scope === 'scope3_amont' && <Truck className="w-5 h-5" />}
                {scope === 'scope3_aval' && <Leaf className="w-5 h-5" />}
              </div>
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatEmissions(emissions).value}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{formatEmissions(emissions).unit}</p>
            
            {/* Completion */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                  {summary?.scope_completion?.[scope]?.categories_filled || 0}/{summary?.scope_completion?.[scope]?.total_categories || 0} {t('dataEntry.categories')}
                </span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {summary?.scope_completion?.[scope]?.percentage || 0}%
                </span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${summary?.scope_completion?.[scope]?.percentage || 0}%` }}
                  transition={{ duration: 0.8, delay: 0.7 + index * 0.1 }}
                  className={`h-full rounded-full bg-gradient-to-r ${scopeColors[scope]?.bg}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gamification - Achievement hint */}
      {totalCompletion < 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-2xl border-2 border-dashed ${
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('gamification.keepGoing')}
              </h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Complétez votre bilan carbone pour débloquer des insights et recommandations personnalisées
              </p>
            </div>
            <div className="ml-auto">
              <div className="text-3xl font-bold text-amber-500">{totalCompletion}%</div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('dataEntry.completed')}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
