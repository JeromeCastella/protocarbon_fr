import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Lock, Unlock, Trash2, AlertTriangle, Check, ChevronDown,
  FileText, FlaskConical, RefreshCw,
} from 'lucide-react';

const ModalWrapper = ({ show, onClose, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()} className="w-full max-w-md">{children}</motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const CreateModal = ({
  isDark, show, onClose, createForm, setCreateForm, createError,
  loading, handleCreate, availableYears, existingYears, scenarioTakenYears,
  scenarios, sortedFiscalYears, getActivityCount, fiscalYears, t,
}) => {
  const inputCls = `w-full px-4 py-3 pr-10 rounded-xl border appearance-none transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`;

  return (
    <ModalWrapper show={show} onClose={onClose}>
      <div className={`rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Créer un exercice</h2>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {createForm.duplicateFrom && (
            <div className="flex gap-2">
              <button onClick={() => setCreateForm(prev => ({ ...prev, isScenario: false, selectedScenarioId: '', newScenarioName: '' }))} data-testid="type-actual-btn"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${!createForm.isScenario ? 'border-blue-500 bg-blue-500/10 text-blue-500' : isDark ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                <FileText className="w-4 h-4" />Exercice réel
              </button>
              <button onClick={() => setCreateForm(prev => ({ ...prev, isScenario: true }))} data-testid="type-scenario-btn"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${createForm.isScenario ? 'border-violet-500 bg-violet-500/10 text-violet-500' : isDark ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                <FlaskConical className="w-4 h-4" />Scénario
              </button>
            </div>
          )}

          {createForm.isScenario && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Scénario *</label>
              <div className="relative">
                <select value={createForm.selectedScenarioId} onChange={e => setCreateForm(prev => ({ ...prev, selectedScenarioId: e.target.value, newScenarioName: '' }))} data-testid="scenario-select" className={inputCls}>
                  <option value="">{t('fiscalYears.createModal.chooseScenario')}</option>
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="new">{t('fiscalYears.createModal.createNewScenario')}</option>
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              </div>
              {createForm.selectedScenarioId === 'new' && (
                <input type="text" value={createForm.newScenarioName} onChange={e => setCreateForm(prev => ({ ...prev, newScenarioName: e.target.value }))}
                  placeholder={t('fiscalYears.createModal.newScenarioPlaceholder')} data-testid="new-scenario-name-input"
                  className={`w-full mt-2 px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-violet-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} />
              )}
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année</label>
            <div className="relative">
              <select value={createForm.year} onChange={e => setCreateForm(prev => ({ ...prev, year: parseInt(e.target.value) }))} className={inputCls}>
                {availableYears.map(({ year, available }) => {
                  const isActualTaken = !createForm.isScenario && !available;
                  const isScenarioTaken = createForm.isScenario && scenarioTakenYears.has(year);
                  const isDisabled = isActualTaken || isScenarioTaken;
                  return <option key={year} value={year} disabled={isDisabled} className={isDisabled ? 'text-gray-400' : ''}>
                    {year} {isActualTaken ? t('fiscalYears.createModal.alreadyCreated') : isScenarioTaken ? t('fiscalYears.createModal.existingScenario') : ''}
                  </option>;
                })}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
            </div>
            <p className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {createForm.isScenario ? t('fiscalYears.createModal.projectionFor').replace('{year}', createForm.year) : t('fiscalYears.createModal.periodFor').replaceAll('{year}', createForm.year)}
            </p>
          </div>

          {fiscalYears.length > 0 && (
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={createForm.duplicateActivities}
                  onChange={e => setCreateForm(prev => ({ ...prev, duplicateActivities: e.target.checked, duplicateFrom: e.target.checked ? (prev.duplicateFrom || fiscalYears[0]?.id) : null }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                <div>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Dupliquer les données depuis</span>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Copie toutes les activités d'un exercice existant</p>
                </div>
              </label>
              {createForm.duplicateActivities && (
                <div className="mt-3">
                  <select value={createForm.duplicateFrom || ''} onChange={e => setCreateForm(prev => ({ ...prev, duplicateFrom: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                    {sortedFiscalYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name} ({getActivityCount(fy)} saisies)</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {createError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{createError}</span>
            </div>
          )}
        </div>
        <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
          <button onClick={handleCreate}
            disabled={loading || (!createForm.isScenario && existingYears.has(createForm.year)) || (createForm.isScenario && createForm.selectedScenarioId === '') || (createForm.isScenario && createForm.selectedScenarioId === 'new' && !createForm.newScenarioName.trim()) || (createForm.isScenario && scenarioTakenYears.has(createForm.year))}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Créer
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export const CloseModal = ({ isDark, show, onClose, selectedFY, loading, handleClose, t }) => (
  <ModalWrapper show={show && !!selectedFY} onClose={onClose}>
    <div className={`rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-green-500/20"><Lock className="w-6 h-6 text-green-500" /></div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Clôturer {selectedFY?.name} ?</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>L'exercice sera verrouillé après clôture</p>
          </div>
        </div>
        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('fiscalYears.closeModal.description')}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
          <button onClick={handleClose} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Clôturer
          </button>
        </div>
      </div>
    </div>
  </ModalWrapper>
);

export const RectifyModal = ({ isDark, show, onClose, selectedFY, loading, handleRectify, rectifyReason, setRectifyReason, t }) => (
  <ModalWrapper show={show && !!selectedFY} onClose={onClose}>
    <div className={`rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-orange-500/20"><Unlock className="w-6 h-6 text-orange-500" /></div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rectifier {selectedFY?.name} ?</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>L'exercice sera rouvert pour modifications</p>
          </div>
        </div>
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Motif de rectification *</label>
          <textarea value={rectifyReason} onChange={e => setRectifyReason(e.target.value)} placeholder={t('fiscalYears.rectifyModal.reasonPlaceholder')} rows={3}
            className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => { onClose(); setRectifyReason(''); }} className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
          <button onClick={handleRectify} disabled={loading || !rectifyReason.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}Rectifier
          </button>
        </div>
      </div>
    </div>
  </ModalWrapper>
);

export const DeleteModal = ({ isDark, show, onClose, selectedFY, loading, handleDelete, deleteStats, deleteConfirmText, setDeleteConfirmText, deleteError, t }) => (
  <ModalWrapper show={show && !!selectedFY} onClose={onClose}>
    <div className={`rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-red-500/20"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Supprimer {selectedFY?.name} ?</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cette action est irréversible</p>
          </div>
        </div>
        <div className={`p-4 rounded-xl mb-5 border-2 border-red-500/30 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <p className={`font-medium mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Cette action supprimera définitivement :</p>
          <ul className={`space-y-1 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            <li>- <strong>{deleteStats?.activitiesCount || 0}</strong> {t('fiscalYears.deleteModal.activitiesCount')}</li>
            <li>- <strong>{((deleteStats?.totalEmissions || 0) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong> {t('fiscalYears.deleteModal.emissionsCount')}</li>
          </ul>
        </div>
        <div className="mb-5">
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {t('fiscalYears.deleteModal.confirmLabel')} <strong className="text-red-500">"{selectedFY?.name}"</strong>
          </label>
          <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={selectedFY?.name}
            className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-red-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`} />
        </div>
        {deleteError && (
          <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-red-500/20 text-red-500">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{deleteError}</span>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={() => { onClose(); setDeleteConfirmText(''); }} className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
          <button onClick={handleDelete} disabled={loading || deleteConfirmText !== selectedFY?.name}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Supprimer
          </button>
        </div>
      </div>
    </div>
  </ModalWrapper>
);
