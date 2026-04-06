import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { SCOPE_COLORS } from './constants';

const EvolutionChart = ({ fiscalComparison }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const evolutionData = useMemo(() => {
    if (!fiscalComparison?.length) return [];
    return fiscalComparison.map(fc => ({
      year: fc.year || fc.name?.replace('Exercice ', ''),
      scope1: (fc.scope1 || 0) / 1000,
      scope2: (fc.scope2 || 0) / 1000,
      scope3: ((fc.scope3_amont || 0) + (fc.scope3_aval || 0)) / 1000
    }));
  }, [fiscalComparison]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      data-testid="evolution-chart"
    >
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {t('dashboard.chart.fiscalComparison')}
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
            <Area type="monotone" dataKey="scope1" name={t('dashboard.scopes.scope1')} stackId="stack" stroke={SCOPE_COLORS.scope1} strokeWidth={2} fill="url(#gradScope1)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="scope2" name={t('dashboard.scopes.scope2')} stackId="stack" stroke={SCOPE_COLORS.scope2} strokeWidth={2} fill="url(#gradScope2)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="scope3" name={t('dashboard.objectives.scope3')} stackId="stack" stroke={SCOPE_COLORS.scope3} strokeWidth={2} fill="url(#gradScope3)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default EvolutionChart;
