import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFiscalYear } from '../../context/FiscalYearContext';
import { motion } from 'framer-motion';
import { Target, X, Flag, RefreshCw, FlaskConical } from 'lucide-react';
import { formatEmissions } from './constants';
import TrajectoryChart from './TrajectoryChart';

const ObjectivesTab = ({
  objective, trajectoryData,
  onArchiveObjective,
  onOpenObjectiveModal,
  selectedScenarioEntityId, setSelectedScenarioEntityId,
  scenarioEntities, scenarioDataPoints, scenarioSummary
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { fiscalYears, currentFiscalYear } = useFiscalYear();

  if (!objective) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-12 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <Target className="w-10 h-10 text-green-500" />
        </div>
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Définissez vos objectifs climatiques
        </h2>
        <p className={`max-w-md mx-auto mb-8 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Alignez votre stratégie sur les objectifs Science Based Targets (SBTi) pour contribuer à limiter le réchauffement climatique à 1.5°C.
        </p>
        <button
          onClick={() => onOpenObjectiveModal(fiscalYears[0]?.id || '', 2030)}
          className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium flex items-center gap-2 mx-auto"
        >
          <Flag className="w-5 h-5" />
          Fixer des objectifs
        </button>
      </motion.div>
    );
  }

  return (
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
            onClick={onArchiveObjective}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Archiver l'objectif"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScopeProgressCard
            scopeLabel="Scope 1 & 2"
            dotColor="bg-sky-400"
            accentColor="sky"
            reductionPercent={objective.reduction_scope1_2_percent}
            targetYear={objective.target_year}
            baseline={objective.baseline_scope1_2 || 0}
            target={objective.target_scope1_2 || 0}
            trajectoryData={trajectoryData}
            referenceYear={objective.reference_year}
            getScopeActual={(a) => (a.actual_scope1 || 0) + (a.actual_scope2 || 0)}
            getTargetForYear={(tr) => tr?.target_scope1_2}
          />
          <ScopeProgressCard
            scopeLabel="Scope 3"
            dotColor="bg-violet-400"
            accentColor="violet"
            reductionPercent={objective.reduction_scope3_percent}
            targetYear={objective.target_year}
            baseline={objective.baseline_scope3 || 0}
            target={objective.target_scope3 || 0}
            trajectoryData={trajectoryData}
            referenceYear={objective.reference_year}
            getScopeActual={(a) => a.actual_scope3 || 0}
            getTargetForYear={(tr) => tr?.target_scope3}
          />
        </div>
      </motion.div>

      {/* Scenario selector */}
      {scenarioEntities.length > 0 && currentFiscalYear?.type !== 'scenario' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}
          data-testid="scenario-selector"
        >
          <FlaskConical className={`w-4 h-4 flex-shrink-0 ${selectedScenarioEntityId ? 'text-violet-500' : isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <select
            value={selectedScenarioEntityId || ''}
            onChange={(e) => setSelectedScenarioEntityId(e.target.value || null)}
            data-testid="scenario-select"
            className={`flex-1 px-3 py-1.5 rounded-lg border text-sm transition-all ${
              selectedScenarioEntityId
                ? 'border-violet-500/50 bg-violet-500/5 text-violet-700 font-medium'
                : isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <option value="">Superposer un scénario...</option>
            {scenarioEntities.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedScenarioEntityId && (
            <button
              onClick={() => setSelectedScenarioEntityId(null)}
              className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
              title={t('dashboard.scenario.remove')}
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          )}
        </motion.div>
      )}

      {/* Scenario effort indicator */}
      {selectedScenarioEntityId && scenarioSummary && (
        <ScenarioEffortIndicator
          objective={objective}
          scenarioSummary={scenarioSummary}
          scenarioEntities={scenarioEntities}
          selectedScenarioEntityId={selectedScenarioEntityId}
        />
      )}

      {/* Trajectory Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Trajectoire de réduction
        </h3>
        <TrajectoryChart
          trajectoryData={trajectoryData}
          objective={objective}
          selectedScenarioEntityId={selectedScenarioEntityId}
          scenarioDataPoints={scenarioDataPoints}
        />
      </motion.div>

      {/* Change objective button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <button
          onClick={() => onOpenObjectiveModal(
            objective.reference_fiscal_year_id || fiscalYears[0]?.id || '',
            objective.target_year === 2030 ? 2035 : 2030
          )}
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
  );
};

/* ─── Scope progress card (used twice: S1&2 and S3) ─── */
const ScopeProgressCard = ({
  scopeLabel, dotColor, accentColor,
  reductionPercent, targetYear,
  baseline, target,
  trajectoryData, referenceYear,
  getScopeActual, getTargetForYear
}) => {
  const { isDark } = useTheme();

  const actualsWithData = trajectoryData.actuals?.filter(a =>
    ((a.actual_scope1 || 0) + (a.actual_scope2 || 0)) > 0 || (a.actual_scope3 || 0) > 0
  ) || [];
  const latestActual = actualsWithData.length > 0
    ? actualsWithData[actualsWithData.length - 1]
    : trajectoryData.actuals?.[0];

  const current = latestActual ? getScopeActual(latestActual) : baseline;
  const reductionNeeded = baseline - target;
  const reductionAchieved = baseline - current;
  const progressPercent = reductionNeeded > 0
    ? Math.min(100, Math.max(0, Math.round((reductionAchieved / reductionNeeded) * 100)))
    : 0;

  const currentYear = latestActual?.year || referenceYear;
  const targetForYear = trajectoryData.trajectory?.find(t => t.year === currentYear);
  const isOnTrack = current <= (getTargetForYear(targetForYear) || baseline);

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{scopeLabel}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isOnTrack ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
        }`}>
          {isOnTrack ? '✓ En bonne voie' : '⚠ Effort requis'}
        </span>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className={`text-3xl font-bold text-${accentColor}-400`}>-{reductionPercent}%</span>
        <span className={`text-sm pb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>d'ici {targetYear}</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Progression ({currentYear})</span>
          <span className={`font-medium ${progressPercent >= 50 ? 'text-green-500' : `text-${accentColor}-400`}`}>
            {progressPercent}%
          </span>
        </div>
        <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 50 ? 'bg-green-500' : `bg-${accentColor}-400`}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        Actuel : {formatEmissions(current).value} {formatEmissions(current).unit}
        {' • '}Cible : {formatEmissions(target).value} {formatEmissions(target).unit}
      </p>
    </div>
  );
};

/* ─── Scenario effort indicator ─── */
const ScenarioEffortIndicator = ({ objective, scenarioSummary, scenarioEntities, selectedScenarioEntityId }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const se = scenarioSummary.summary?.scope_emissions || {};

  const computeCoverage = (baselineVal, targetVal, scenarioVal) => {
    const reductionNeeded = baselineVal - targetVal;
    const reductionAchieved = baselineVal - scenarioVal;
    return reductionNeeded > 0 ? Math.round((reductionAchieved / reductionNeeded) * 100) : 0;
  };

  const scenarioS12 = (se.scope1 || 0) + (se.scope2 || 0);
  const scenarioS3 = (se.scope3_amont || 0) + (se.scope3_aval || 0);
  const coverageS12 = computeCoverage(objective.baseline_scope1_2 || 0, objective.target_scope1_2 || 0, scenarioS12);
  const coverageS3 = computeCoverage(objective.baseline_scope3 || 0, objective.target_scope3 || 0, scenarioS3);

  const renderCoverageCard = (label, dotColor, coveragePct, scenarioVal, targetVal) => {
    const isPositive = coveragePct > 0;
    return (
      <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{label}</span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className={`text-2xl font-bold ${coveragePct >= 100 ? 'text-green-500' : isPositive ? `text-${dotColor.includes('sky') ? 'sky' : 'violet'}-400` : 'text-red-500'}`}>
            {coveragePct}%
          </span>
          <span className={`text-xs pb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>de l'effort requis</span>
        </div>
        <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${coveragePct >= 100 ? 'bg-green-500' : isPositive ? (dotColor.includes('sky') ? 'bg-sky-400' : 'bg-violet-400') : 'bg-red-400'}`}
            style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          Scénario : {formatEmissions(scenarioVal).value} {formatEmissions(scenarioVal).unit}
          {' • '}Cible : {formatEmissions(targetVal).value} {formatEmissions(targetVal).unit}
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={`p-4 rounded-xl border-2 border-violet-500/30 ${isDark ? 'bg-violet-500/5' : 'bg-violet-50'}`}
      data-testid="scenario-effort-indicator"
    >
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-violet-500" />
        <span className={`text-sm font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
          {t('dashboard.scenario.coverage')} — {scenarioEntities.find(s => s.id === selectedScenarioEntityId)?.name || t('dashboard.scenario.label')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderCoverageCard('Scope 1 & 2', 'bg-sky-400', coverageS12, scenarioS12, objective.target_scope1_2 || 0)}
        {renderCoverageCard('Scope 3', 'bg-violet-400', coverageS3, scenarioS3, objective.target_scope3 || 0)}
      </div>
    </motion.div>
  );
};

export default ObjectivesTab;
