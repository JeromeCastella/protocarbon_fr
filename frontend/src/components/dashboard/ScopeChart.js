import React, { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Factory } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  SCOPE_COLORS, CATEGORY_COLORS, iconMap, CATEGORY_ICONS, formatChartValue
} from './constants';

const ScopeChart = ({ scopeBreakdown }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [drillDownScope, setDrillDownScope] = useState(null);

  const scopeChartData = useMemo(() => {
    if (!scopeBreakdown?.scopes) return [];
    const data = [];
    const scopes = scopeBreakdown.scopes;
    const scope3Total = (scopes.scope3_amont?.total || 0) + (scopes.scope3_aval?.total || 0);
    const scope3Categories = {
      ...(scopes.scope3_amont?.categories || {}),
      ...(scopes.scope3_aval?.categories || {})
    };

    if (scopes.scope1?.total > 0) {
      data.push({ name: t('dashboard.scopes.scope1'), key: 'scope1', emissions: scopes.scope1.total, categories: scopes.scope1.categories || {}, color: SCOPE_COLORS.scope1 });
    }
    if (scopes.scope2?.total > 0) {
      data.push({ name: t('dashboard.scopes.scope2'), key: 'scope2', emissions: scopes.scope2.total, categories: scopes.scope2.categories || {}, color: SCOPE_COLORS.scope2 });
    }
    if (scope3Total > 0) {
      data.push({ name: t('dashboard.objectives.scope3'), key: 'scope3', emissions: scope3Total, categories: scope3Categories, color: SCOPE_COLORS.scope3 });
    }
    return data;
  }, [scopeBreakdown, t]);

  const categoryDrillDownData = useMemo(() => {
    if (!drillDownScope) return [];
    const scopeData = scopeChartData.find(s => s.key === drillDownScope);
    if (!scopeData?.categories) return [];
    return Object.entries(scopeData.categories)
      .map(([key, value]) => ({ key, name: t(`categories.${key}`) || key, icon: CATEGORY_ICONS[key] || 'factory', emissions: value }))
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 10);
  }, [drillDownScope, scopeChartData, t]);

  const handleScopeClick = (entry) => {
    if (entry?.key && !drillDownScope) setDrillDownScope(entry.key);
  };

  const ScopeTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className={`p-3 rounded-lg shadow-lg ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.name}</p>
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{formatChartValue(data.emissions)}</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('dashboard.chart.clickToSeeCategories')}</p>
      </div>
    );
  };

  const DrillDownTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const IconComp = iconMap[data.icon] || Factory;
    return (
      <div className={`px-3 py-2.5 rounded-xl shadow-lg ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          <IconComp className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
          <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.name}</p>
        </div>
        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{formatChartValue(data.emissions)}</p>
      </div>
    );
  };

  const CategoryIconTick = ({ x, y, payload }) => {
    const entry = categoryDrillDownData.find(d => d.name === payload.value);
    const IconComp = iconMap[entry?.icon || 'factory'] || Factory;
    const color = isDark ? '#94a3b8' : '#6b7280';
    return (
      <g transform={`translate(${x},${y + 4})`}>
        <foreignObject x={-10} y={0} width={20} height={20}>
          <div xmlns="http://www.w3.org/1999/xhtml" title={payload.value} style={{ cursor: 'default', display: 'flex', justifyContent: 'center' }}>
            <IconComp size={16} color={color} />
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      data-testid="scope-chart"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {drillDownScope && (
            <button
              onClick={() => setDrillDownScope(null)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {drillDownScope
              ? `${scopeChartData.find(s => s.key === drillDownScope)?.name || ''} - ${t('dashboard.chart.categories')}`
              : t('dashboard.chart.emissionsByScope')}
          </h3>
        </div>
        {!drillDownScope && (
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('dashboard.chart.clickToDetail')}
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
              tick={drillDownScope ? <CategoryIconTick /> : { fill: isDark ? '#94a3b8' : '#6b7280', fontSize: 12 }}
              interval={0}
              height={drillDownScope ? 32 : 30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
              tick={{ fill: isDark ? '#94a3b8' : '#6b7280' }}
            />
            <Tooltip content={drillDownScope ? <DrillDownTooltip /> : <ScopeTooltip />} />
            <Bar
              dataKey="emissions"
              barSize={36}
              cursor={drillDownScope ? 'default' : 'pointer'}
              radius={[6, 6, 0, 0]}
              onClick={(data) => handleScopeClick(data)}
              style={{ outline: 'none' }}
            >
              {(drillDownScope ? categoryDrillDownData : scopeChartData).map((entry, index) => (
                <Cell
                  key={`cell-${entry.key || index}`}
                  fill={drillDownScope ? CATEGORY_COLORS[index % CATEGORY_COLORS.length] : entry.color}
                  style={{ outline: 'none', cursor: drillDownScope ? 'default' : 'pointer' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default ScopeChart;
