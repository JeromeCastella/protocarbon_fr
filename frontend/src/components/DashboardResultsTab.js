import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Chart colors
const SCOPE_COLORS = {
  scope1: '#FB923C',
  scope2: '#60A5FA',
  scope3_amont: '#A78BFA',
  scope3_aval: '#F9A8D4',
  scope3: '#A78BFA'
};

const CATEGORY_COLORS = [
  '#A78BFA', '#60A5FA', '#34D399', '#6EE7B7',
  '#FCD34D', '#FCA5A5', '#F9A8D4', '#818CF8',
  '#BEF264', '#FB923C'
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
  const { language, t } = useLanguage();
  
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
      .slice(0, 7);
  }, [scopeBreakdown]);
  
  // Evolution data for stacked chart (using fiscal comparison)
  const evolutionData = useMemo(() => {
    if (!fiscalComparison?.length) return [];
    
    return fiscalComparison.map(fc => ({
      year: fc.year || fc.name?.replace('Exercice ', ''),
      scope1: (fc.scope1 || 0) / 1000, // Convert to tonnes
      scope2: (fc.scope2 || 0) / 1000,
      scope3: ((fc.scope3_amont || 0) + (fc.scope3_aval || 0)) / 1000
    }));
  }, [fiscalComparison]);
  
  // Handle click on scope bar for drill-down
  const handleScopeClick = (entry, index) => {
    if (entry?.key && !drillDownScope) {
      setDrillDownScope(entry.key);
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
      {/* KPI Cards - Horizontal layout like mockup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Emissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Leaf className={`w-6 h-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            </div>
            <div className="flex-1">
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {language === 'fr' ? 'Émissions totales' : 'Gesamtemissionen'}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatEmissions(summary?.total_emissions || 0).value}
                </span>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatEmissions(summary?.total_emissions || 0).unit}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Emissions per kCHF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Banknote className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {language === 'fr' ? 'Émissions par kCHF' : 'Emissionen pro kCHF'}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {kpis?.emissions_per_revenue 
                    ? (kpis.emissions_per_revenue / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                    : '0'}
                </span>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  tCO₂e/kCHF
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Year over Year Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              (kpis?.year_over_year_change || 0) < 0 
                ? 'bg-green-500/20' 
                : (kpis?.year_over_year_change || 0) > 0 
                  ? 'bg-red-500/20' 
                  : 'bg-green-500/20'
            }`}>
              {(kpis?.year_over_year_change || 0) < 0 ? (
                <TrendingDown className="w-6 h-6 text-green-500" />
              ) : (kpis?.year_over_year_change || 0) > 0 ? (
                <TrendingUp className="w-6 h-6 text-red-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-500" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {language === 'fr' ? 'Variation N-1' : 'Veränderung N-1'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl font-bold ${
                  (kpis?.year_over_year_change || 0) < 0 
                    ? 'text-green-500' 
                    : (kpis?.year_over_year_change || 0) > 0 
                      ? 'text-red-500' 
                      : 'text-green-500'
                }`}>
                  {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined
                    ? `${kpis.year_over_year_change < 0 ? '-' : kpis.year_over_year_change > 0 ? '+' : ''}${Math.abs(kpis.year_over_year_change)}%`
                    : '-'}
                </span>
                {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    kpis.year_over_year_change < 0 
                      ? 'bg-green-100 text-green-600' 
                      : kpis.year_over_year_change > 0 
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {kpis.year_over_year_change < 0 ? `↓ ${Math.abs(kpis.year_over_year_change)}%` : kpis.year_over_year_change > 0 ? `↑ ${kpis.year_over_year_change}%` : '0%'}
                  </span>
                )}
              </div>
            </div>
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
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
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
              >
                <CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
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
                  barSize={36}
                  cursor={drillDownScope ? 'default' : 'pointer'}
                  radius={[6, 6, 0, 0]}
                  onClick={(data, index) => handleScopeClick(data, index)}
                  style={{ outline: 'none' }}
                >
                  {(drillDownScope ? categoryDrillDownData : scopeChartData).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={drillDownScope 
                        ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] 
                        : entry.color}
                      style={{ outline: 'none', cursor: drillDownScope ? 'default' : 'pointer' }}
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
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {language === 'fr' ? 'Top 7 sous-catégories' : 'Top 7 Unterkategorien'}
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
                        {t(`categories.${item.name}`) || item.name}
                      </span>
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatted.value}
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} overflow-hidden`}>
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
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {language === 'fr' ? 'Évolution des émissions' : 'Emissionsentwicklung'}
        </h3>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolutionData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gradScope1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradScope2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradScope3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.05} />
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
                tickFormatter={(v) => `${v.toFixed(0)}t`}
                tick={{ fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value, name) => [`${value.toFixed(1)} tCO₂e`, name]}
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
                cursor={{ stroke: isDark ? '#475569' : '#cbd5e1', strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
              <Area
                type="monotone"
                dataKey="scope1"
                name="Scope 1"
                stackId="stack"
                stroke={SCOPE_COLORS.scope1}
                strokeWidth={2}
                fill="url(#gradScope1)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="scope2"
                name="Scope 2"
                stackId="stack"
                stroke={SCOPE_COLORS.scope2}
                strokeWidth={2}
                fill="url(#gradScope2)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="scope3"
                name="Scope 3"
                stackId="stack"
                stroke={SCOPE_COLORS.scope3}
                strokeWidth={2}
                fill="url(#gradScope3)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardResultsTab;
