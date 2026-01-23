import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion } from 'framer-motion';
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
  PieChart
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    // Display in tonnes if >= 10 tonnes
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'tCO₂e'
    };
  } else {
    // Display in kg if < 10 tonnes
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'kgCO₂e'
    };
  }
};

const Dashboard = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const scopeColors = {
    scope1: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100 text-blue-600', border: 'border-blue-500' },
    scope2: { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-500' },
    scope3_amont: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-100 text-purple-600', border: 'border-purple-500' },
    scope3_aval: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-500' },
  };

  const scopeNames = {
    scope1: { fr: 'Scope 1', de: 'Scope 1' },
    scope2: { fr: 'Scope 2', de: 'Scope 2' },
    scope3_amont: { fr: 'Scope 3 - Amont', de: 'Scope 3 - Vorgelagert' },
    scope3_aval: { fr: 'Scope 3 - Aval', de: 'Scope 3 - Nachgelagert' },
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

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Emissions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`col-span-1 md:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/30`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 font-medium">{t('dataEntry.totalBalance')}</p>
              <h2 className="text-5xl font-bold mt-2" data-testid="total-emissions">
                {summary?.total_emissions?.toLocaleString() || 0}
              </h2>
              <p className="text-blue-200 mt-1">tCO₂e</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-xl">
              <Target className="w-5 h-5" />
              <span className="font-medium">{totalCompletion}% {t('dataEntry.completed')}</span>
            </div>
          </div>
          
          {/* Mini progress bars */}
          <div className="mt-6 space-y-3">
            {Object.entries(summary?.scope_completion || {}).map(([scope, data]) => (
              <div key={scope} className="flex items-center gap-4">
                <span className="text-sm text-blue-100 w-32">{scopeNames[scope]?.fr}</span>
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.percentage}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{data.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Statistiques rapides
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Activités saisies</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {summary?.activities_count || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Produits définis</p>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {summary?.products_count || 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scope Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(summary?.scope_emissions || {}).map(([scope, emissions], index) => (
          <motion.div
            key={scope}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`px-3 py-1 rounded-lg text-sm font-medium ${scopeColors[scope]?.light}`}>
                {scopeNames[scope]?.fr}
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${scopeColors[scope]?.bg} flex items-center justify-center text-white`}>
                {scope === 'scope1' && <Factory className="w-5 h-5" />}
                {scope === 'scope2' && <Zap className="w-5 h-5" />}
                {scope === 'scope3_amont' && <Truck className="w-5 h-5" />}
                {scope === 'scope3_aval' && <Leaf className="w-5 h-5" />}
              </div>
            </div>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {emissions?.toLocaleString() || 0}
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>tCO₂e</p>
            
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
                  transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
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
