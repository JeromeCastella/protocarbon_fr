import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import { Leaf, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { formatEmissions } from './constants';

const KPICards = ({ summary, kpis }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const yoyChange = kpis?.year_over_year_change || 0;
  const isDown = yoyChange < 0;
  const isUp = yoyChange > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="kpi-cards">
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
              {t('dashboard.results.totalEmissions')}
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
              {t('dashboard.chart.emissionsPerKCHF')}
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
          <div className={`p-3 rounded-xl ${isUp ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
            {isUp
              ? <TrendingUp className="w-6 h-6 text-red-500" />
              : <TrendingDown className="w-6 h-6 text-green-500" />
            }
          </div>
          <div className="flex-1">
            <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('dashboard.results.yearOverYearChange')}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-2xl font-bold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined
                  ? `${isDown ? '-' : isUp ? '+' : ''}${Math.abs(kpis.year_over_year_change)}%`
                  : '-'}
              </span>
              {kpis?.year_over_year_change !== null && kpis?.year_over_year_change !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDown ? 'bg-green-100 text-green-600'
                    : isUp ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {isDown ? `↓ ${Math.abs(kpis.year_over_year_change)}%` : isUp ? `↑ ${kpis.year_over_year_change}%` : '0%'}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KPICards;
