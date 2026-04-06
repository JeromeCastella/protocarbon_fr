import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Award, Activity, Package, FileText,
  ShieldCheck, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { SCOPE_COLORS, SCOPE_ICONS, formatEmissions } from './constants';

const TrackingTab = ({ stats, summary, plausibilityResult, plausibilityLoading, runPlausibilityCheck }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const scopeNames = {
    scope1: t('dashboard.scopes.scope1'),
    scope2: t('dashboard.scopes.scope2'),
    scope3_amont: t('dashboard.scopes.scope3_amont'),
    scope3_aval: t('dashboard.scopes.scope3_aval'),
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, color: 'blue', label: 'Activités saisies', value: stats.totalActivities },
          { icon: Package, color: 'purple', label: 'Produits définis', value: stats.totalProducts },
          { icon: FileText, color: 'green', label: 'Catégories remplies', value: `${stats.completedCategories}/${stats.totalCategories}` },
          { icon: Target, color: 'amber', label: 'Progression', value: `${stats.totalCategories > 0 ? Math.round((stats.completedCategories / stats.totalCategories) * 100) : 0}%` }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`p-5 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-${card.color}-500/20`}>
                  <Icon className={`w-6 h-6 text-${card.color}-500`} />
                </div>
                <div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Scope Completion Cards */}
      <div>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Avancement par scope
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary?.scope_completion && Object.entries(summary.scope_completion).map(([scope, data], index) => {
            const Icon = SCOPE_ICONS[scope] || Activity;
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
                    <div className={`p-2 rounded-xl ${SCOPE_COLORS[scope]}/20`}>
                      <Icon className={`w-5 h-5 ${SCOPE_COLORS[scope].replace('bg-', 'text-')}`} />
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

                <div className={`h-2 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div
                    className={`h-full rounded-full ${SCOPE_COLORS[scope]} transition-all duration-500`}
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

      {/* Plausibility check */}
      <PlausibilitySection
        plausibilityResult={plausibilityResult}
        plausibilityLoading={plausibilityLoading}
        runPlausibilityCheck={runPlausibilityCheck}
      />
    </div>
  );
};

const PlausibilitySection = ({ plausibilityResult, plausibilityLoading, runPlausibilityCheck }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
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
                      key={`alert-${idx}`}
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

            <p className={`text-xs mt-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('dashboard.plausibility.contextExercise')} : {plausibilityResult.context_used.fiscal_year || '—'}
              {' · '}{plausibilityResult.context_used.activities_count} {t('dashboard.plausibility.contextActivities')}
              {' · '}{t('dashboard.plausibility.contextSector')} : {plausibilityResult.context_used.sector}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TrackingTab;
