import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Square, Banknote, Save, Loader2, Check, AlertCircle, Info } from 'lucide-react';

const FiscalYearContextCard = ({
  fiscalYearContext, setFiscalYearContext, selectedFiscalYear,
  isDark, savingContext, savedContext, handleSaveContext,
  contextLoading, contextReadonly, isPrivateCompany, t,
}) => {
  const inputCls = `w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-amber-500 ${
    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
  } disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'} ${contextReadonly ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('generalInfo.fiscalYearData').replace('{year}', selectedFiscalYear?.year || '')}
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('generalInfo.fiscalYearDataDesc2')}</p>
          </div>
        </div>
        <motion.button onClick={handleSaveContext} disabled={savingContext || contextReadonly || !selectedFiscalYear?.id} whileTap={{ scale: 0.95 }} data-testid="save-context-btn"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            savedContext ? 'bg-green-500 text-white'
              : contextReadonly ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
          } disabled:opacity-50`}
        >
          {savingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : savedContext ? <><Check className="w-4 h-4" />{t('common.success')}</> : <><Save className="w-4 h-4" />{t('common.save')}</>}
        </motion.button>
      </div>

      {contextReadonly && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{t('generalInfo.closedExercise')}</span>
        </div>
      )}
      {!selectedFiscalYear?.id && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
          <Info className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{t('generalInfo.selectFiscalYear')}</span>
        </div>
      )}

      {contextLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Users className="w-4 h-4" />{t('company.employees')}</label>
            <input type="number" step="0.1" value={fiscalYearContext.employees === 0 ? '' : fiscalYearContext.employees}
              onChange={e => setFiscalYearContext({ ...fiscalYearContext, employees: parseFloat(e.target.value) || 0 })}
              placeholder="0" disabled={contextReadonly || !selectedFiscalYear?.id} data-testid="context-employees-input" className={inputCls} />
          </div>
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Square className="w-4 h-4" />{t('company.surfaceArea')}</label>
            <input type="number" value={fiscalYearContext.surface_area === 0 ? '' : fiscalYearContext.surface_area}
              onChange={e => setFiscalYearContext({ ...fiscalYearContext, surface_area: parseFloat(e.target.value) || 0 })}
              placeholder="0" disabled={contextReadonly || !selectedFiscalYear?.id} data-testid="context-surface-input" className={inputCls} />
          </div>
          {isPrivateCompany && (
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Banknote className="w-4 h-4" />{t('company.revenue')} (kCHF)</label>
              <input type="number" value={fiscalYearContext.revenue === 0 ? '' : fiscalYearContext.revenue}
                onChange={e => setFiscalYearContext({ ...fiscalYearContext, revenue: parseFloat(e.target.value) || 0 })}
                placeholder="ex: 1500" disabled={contextReadonly || !selectedFiscalYear?.id} data-testid="context-revenue-input" className={inputCls} />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default FiscalYearContextCard;
