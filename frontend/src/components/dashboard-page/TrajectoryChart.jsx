import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis,
  Tooltip, Area, Bar, ReferenceLine
} from 'recharts';
import { formatChartValue } from './constants';

const TrajectoryChart = ({
  trajectoryData, objective,
  selectedScenarioEntityId, scenarioDataPoints
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const chartData = (() => {
    const data = trajectoryData.trajectory.map(tr => {
      const actual = trajectoryData.actuals.find(a => a.year === tr.year);
      return {
        year: tr.year,
        target_total: tr.target_total,
        actual_scope1: actual?.actual_scope1 || null,
        actual_scope2: actual?.actual_scope2 || null,
        actual_scope3: actual?.actual_scope3 || null,
      };
    });

    if (selectedScenarioEntityId && scenarioDataPoints.length > 0) {
      for (const dp of scenarioDataPoints) {
        const existingIdx = data.findIndex(d => d.year === dp.year);
        if (existingIdx >= 0) {
          data[existingIdx].scenario_scope1 = dp.scope1;
          data[existingIdx].scenario_scope2 = dp.scope2;
          data[existingIdx].scenario_scope3 = dp.scope3;
        } else {
          data.push({
            year: dp.year,
            scenario_scope1: dp.scope1,
            scenario_scope2: dp.scope2,
            scenario_scope3: dp.scope3
          });
        }
      }
      data.sort((a, b) => a.year - b.year);
    }

    return data;
  })();

  return (
    <div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart barGap={2} barCategoryGap="20%" data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                  <div className={`px-4 py-3 rounded-xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                    <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Année {label}</p>
                    {items.map((item, i) => (
                      <div key={item.dataKey || `legend-${i}`} className="flex items-center gap-2 text-xs py-0.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                        <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{nameMap[item.dataKey] || item.name}</span>
                        <span className={`ml-auto font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatChartValue(item.value)}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
              cursor={{ stroke: isDark ? '#475569' : '#cbd5e1', strokeWidth: 1 }}
            />

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

            <Bar dataKey="actual_scope1" name={t('dashboard.scopes.scope1')} stackId="actual" fill="#FB923C" radius={[0, 0, 0, 0]} maxBarSize={32} />
            <Bar dataKey="actual_scope2" name={t('dashboard.scopes.scope2')} stackId="actual" fill="#60A5FA" radius={[0, 0, 0, 0]} maxBarSize={32} />
            <Bar dataKey="actual_scope3" name={t('dashboard.objectives.scope3')} stackId="actual" fill="#A78BFA" radius={[4, 4, 0, 0]} maxBarSize={32} />

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
    </div>
  );
};

export default TrajectoryChart;
