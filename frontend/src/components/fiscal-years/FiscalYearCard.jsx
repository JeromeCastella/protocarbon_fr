import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, FileText, AlertTriangle, FlaskConical, MoreVertical } from 'lucide-react';

const FiscalYearCard = ({
  fy, index, isDark, currentFiscalYear, selectFiscalYear,
  openMenuId, setOpenMenuId, getAvailableActions, handleAction,
  formatDate, getActivityCount, fiscalYears, t,
}) => {
  const isScenario = fy.type === 'scenario';
  const isCurrent = currentFiscalYear?.id === fy.id;

  const statusBadge = isScenario ? (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-500 text-xs font-medium" data-testid={`badge-scenario-${fy.id}`}>
      <FlaskConical className="w-3 h-3" />{t('fiscalYears.status.scenario')}
    </span>
  ) : fy.status === 'closed' ? (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium"><Lock className="w-3 h-3" />Clôturé</span>
  ) : fy.status === 'rectified' ? (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-500 text-xs font-medium"><AlertTriangle className="w-3 h-3" />Rectifié</span>
  ) : (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-500 text-xs font-medium"><FileText className="w-3 h-3" />En cours</span>
  );

  return (
    <motion.div key={fy.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`relative p-5 rounded-2xl border transition-all ${
        isScenario ? isDark ? 'bg-violet-500/5 border-violet-500/30 hover:border-violet-500/50' : 'bg-violet-50/50 border-violet-200 hover:border-violet-300'
          : isCurrent ? isDark ? 'bg-blue-500/10 border-blue-500/50' : 'bg-blue-50 border-blue-200'
          : isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white shadow-sm border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
    >
      {isCurrent && <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">Actif</div>}

      <div className="flex items-start justify-between mb-3">
        <div className="cursor-pointer flex-1" onClick={() => selectFiscalYear(fy)}>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isScenario ? (fy.scenario_name || 'Scénario') : fy.name}
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {isScenario
              ? `${fy.year} — basé sur ${fiscalYears.find(f => f.id === fy.reference_fiscal_year_id)?.name || 'exercice source'}`
              : `${formatDate(fy.start_date)} → ${formatDate(fy.end_date)}`}
          </p>
        </div>
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === fy.id ? null : fy.id); }}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <MoreVertical className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
          <AnimatePresence>
            {openMenuId === fy.id && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                {getAvailableActions(fy).map(action => (
                  <button key={action.key} onClick={() => handleAction(fy, action.key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      action.color === 'red' ? 'text-red-500 hover:bg-red-500/10'
                        : action.color === 'green' ? isDark ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50'
                        : action.color === 'orange' ? isDark ? 'text-orange-400 hover:bg-orange-500/10' : 'text-orange-600 hover:bg-orange-50'
                        : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <action.icon className="w-4 h-4" /><span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {statusBadge}
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{getActivityCount(fy)} {t('fiscalYears.entries')}</span>
      </div>

      {fy.summary && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {(fy.summary.total_emissions_tco2e || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO2e
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default FiscalYearCard;
