import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowLeft,
  ChevronRight
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
  AreaChart,
  Area
} from 'recharts';

// Chart colors
const SCOPE_COLORS = {
  scope1: '#F97316', // Orange
  scope2: '#3B82F6', // Blue
  scope3_amont: '#8B5CF6', // Purple
  scope3_aval: '#EC4899', // Pink
  scope3: '#8B5CF6' // Purple (combined)
};

// Category colors for top 10
const CATEGORY_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F97316'  // Orange
];

// Format emissions value
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined || valueInKg === 0) {
    return { value: '0', unit: 'tCO₂e' };
  }
  const tonnes = valueInKg / 1000;
  return {
    value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 }),
    unit: 'tCO₂e'
  };
};

const formatChartValue = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) return '0 tCO₂e';
  const tonnes = valueInKg / 1000;
  return tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' tCO₂e';
};

const DashboardResultsTab = ({ 
  summary, 
  kpis, 
  scopeBreakdown, 
  fiscalComparison,
  fiscalYears,
  selectedFiscalYearForChart,
  setSelectedFiscalYearForChart,
  onOpenRecalcModal
}) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  
  // Drill-down state for scope chart
  const [drillDownScope, setDrillDownScope] = useState(null);
  
  // Prepare scope data for the chart
  const scopeChartData = useMemo(() => {
    if (!scopeBreakdown?.scopes) return [];
    
    const data = [];
    const scopes = scopeBreakdown.scopes;
    
    // Combine scope3_amont and scope3_aval into Scope 3
    const scope3Total = (scopes.scope3_amont?.total || 0) + (scopes.scope3_aval?.total || 0);
    const scope3Categories = {
      ...(scopes.scope3_amont?.categories || {}),
      ...(scopes.scope3_aval?.categories || {})
    };
    
    if (scopes.scope1?.total > 0) {
      data.push({
        name: 'Scope 1',
        key: 'scope1',
        emissions: scopes.scope1.total,
        categories: scopes.scope1.categories || {},
        color: SCOPE_COLORS.scope1
      });
    }
    
    if (scopes.scope2?.total > 0) {
      data.push({
        name: 'Scope 2',
        key: 'scope2',
        emissions: scopes.scope2.total,
        categories: scopes.scope2.categories || {},
        color: SCOPE_COLORS.scope2
      });
    }
    
    if (scope3Total > 0) {
      data.push({
        name: 'Scope 3',
        key: 'scope3',
        emissions: scope3Total,
        categories: scope3Categories,
        color: SCOPE_COLORS.scope3
      });
    }
    
    return data;
  }, [scopeBreakdown]);
  
  // Prepare drill-down data for categories
  const categoryDrillDownData = useMemo(() => {
    if (!drillDownScope) return [];
    
    const scopeData = scopeChartData.find(s => s.key === drillDownScope);
    if (!scopeData?.categories) return [];
    
    return Object.entries(scopeData.categories)
      .map(([name, value]) => ({
        name: name,
        emissions: value
      }))
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 10);
  }, [drillDownScope, scopeChartData]);
  
  // Top 10 subcategories from all scopes
  const top10Subcategories = useMemo(() => {
    if (!scopeBreakdown?.scopes) return [];
    
    const allCategories = {};
    Object.values(scopeBreakdown.scopes).forEach(scope => {
      if (scope.categories) {
        Object.entries(scope.categories).forEach(([name, value]) => {
          if (allCategories[name]) {
            allCategories[name] += value;
          } else {
            allCategories[name] = value;
          }
        });
      }
    });
    
    return Object.entries(allCategories)
      .map(([name, value]) => ({ name, emissions: value }))
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 10);
  }, [scopeBreakdown]);
  
  // Evolution data for stacked chart (using fiscal comparison)
  const evolutionData = useMemo(() => {
    if (!fiscalComparison?.length) return [];
    
    return fiscalComparison.map(fc => ({
      year: fc.year,
      scope1: fc.scope1 / 1000, // Convert to tonnes
      scope2: fc.scope2 / 1000,
      scope3: ((fc.scope3_amont || 0) + (fc.scope3_aval || 0)) / 1000
    }));
  }, [fiscalComparison]);
  
  // Handle click on scope bar for drill-down
  const handleScopeClick = (data) => {
    if (data?.key) {
      setDrillDownScope(data.key);
    }
  };
  
  // Custom tooltip for scope chart
  const ScopeTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className={`p-3 rounded-lg shadow-lg ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.name}</p>
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          {formatChartValue(data.emissions)}
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {language === 'fr' ? 'Cliquez pour voir les catégories' : 'Klicken für Kategorien'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Emissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <Leaf className="w-5 h-5 text-green-500" />
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' ? 'Émissions totales' : 'Gesamtemissionen'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatEmissions(summary?.total_emissions || 0).value}
            </p>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {formatEmissions(summary?.total_emissions || 0).unit}
            </span>
          </div>
        </motion.div>

        {/* Emissions per kCHF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' ? 'Émissions par kCHF' : 'Emissionen pro kCHF'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {kpis?.emissions_per_revenue 
                ? (kpis.emissions_per_revenue / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                : '0'}
            </p>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              tCO₂e/kCHF
            </span>
          </div>
        </motion.div>

        {/* Year over Year Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              (kpis?.year_over_year_change || 0) < 0 
                ? 'bg-green-500/20' 
                : (kpis?.year_over_year_change || 0) > 0 
                  ? 'bg-red-500/20' 
                  : isDark ? 'bg-slate-700' : 'bg-gray-100'
            }`}>
              {(kpis?.year_over_year_change || 0) < 0 ? (
                <TrendingDown className="w-5 h-5 text-green-500" />
              ) : (kpis?.year_over_year_change || 0) > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-500" />
              ) : (
                <Minus className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              )}
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' ? 'Variation N-1' : 'Veränderung N-1'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${
              (kpis?.year_over_year_change || 0) < 0 
                ? 'text-green-500' 
                : (kpis?.year_over_year_change || 0) > 0 
                  ? 'text-red-500' 
                  : isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined
                ? `${kpis.year_over_year_change > 0 ? '+' : ''}${kpis.year_over_year_change}%`
                : '-'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emissions by Scope with Drill-down */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {drillDownScope && (
                <button
                  onClick={() => setDrillDownScope(null)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {drillDownScope 
                  ? `${scopeChartData.find(s => s.key === drillDownScope)?.name || ''} - ${language === 'fr' ? 'Catégories' : 'Kategorien'}`
                  : (language === 'fr' ? 'Émissions par Scope' : 'Emissionen nach Scope')}
              </h3>
            </div>
            {!drillDownScope && (
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {language === 'fr' ? 'Cliquez pour détailler' : 'Klicken für Details'}
              </span>
            )}
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={drillDownScope ? categoryDrillDownData : scopeChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                onClick={(data) => !drillDownScope && data?.activePayload && handleScopeClick(data.activePayload[0]?.payload)}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
                  interval={0}
                  angle={drillDownScope ? -45 : 0}
                  textAnchor={drillDownScope ? 'end' : 'middle'}
                  height={drillDownScope ? 80 : 30}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                  tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                />
                <Tooltip content={drillDownScope ? undefined : <ScopeTooltip />} />
                <Bar 
                  dataKey="emissions" 
                  cursor={drillDownScope ? 'default' : 'pointer'}
                  radius={[4, 4, 0, 0]}
                >
                  {(drillDownScope ? categoryDrillDownData : scopeChartData).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={drillDownScope 
                        ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] 
                        : entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top 10 Subcategories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {language === 'fr' ? 'Top 10 sous-catégories' : 'Top 10 Unterkategorien'}
          </h3>
          
          <div className="space-y-3">
            {top10Subcategories.map((item, index) => {
              const maxEmissions = top10Subcategories[0]?.emissions || 1;
              const percentage = (item.emissions / maxEmissions) * 100;
              const formatted = formatEmissions(item.emissions);
              
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-5 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {item.name}
                      </span>
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatted.value}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} overflow-hidden`}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {top10Subcategories.length === 0 && (
              <p className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {language === 'fr' ? 'Aucune donnée disponible' : 'Keine Daten verfügbar'}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Evolution Chart - Stacked Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {language === 'fr' ? 'Évolution des émissions' : 'Emissionsentwicklung'}
        </h3>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={evolutionData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="year" 
                tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                axisLine={{ stroke: isDark ? '#475569' : '#e5e7eb' }}
              />
              <YAxis 
                tickFormatter={(value) => `${value.toFixed(0)}`}
                tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
                axisLine={{ stroke: isDark ? '#475569' : '#e5e7eb' }}
              />
              <Tooltip 
                formatter={(value, name) => [`${value.toFixed(1)} tCO₂e`, name]}
                contentStyle={{ 
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  borderColor: isDark ? '#475569' : '#e5e7eb',
                  borderRadius: '8px'
                }}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar 
                dataKey="scope1" 
                name="Scope 1" 
                stackId="stack" 
                fill={SCOPE_COLORS.scope1}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="scope2" 
                name="Scope 2" 
                stackId="stack" 
                fill={SCOPE_COLORS.scope2}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="scope3" 
                name="Scope 3" 
                stackId="stack" 
                fill={SCOPE_COLORS.scope3}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardResultsTab;
