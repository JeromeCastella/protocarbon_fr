import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Calendar, Plus } from 'lucide-react';
import { useFiscalYearsPage } from '../hooks/useFiscalYearsPage';
import FiscalYearCard from '../components/fiscal-years/FiscalYearCard';
import { CreateModal, CloseModal, RectifyModal, DeleteModal } from '../components/fiscal-years/FiscalYearModals';

const FiscalYears = () => {
  const { isDark } = useTheme();
  const f = useFiscalYearsPage();

  return (
    <div data-testid="fiscal-years-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{f.t('fiscalYears.title')}</h1>
          <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{f.t('fiscalYears.subtitle')}</p>
        </div>
        <button onClick={() => {
          f.setCreateForm({ year: f.availableYears.find(y => y.available)?.year || new Date().getFullYear(), duplicateFrom: null, duplicateActivities: false, isScenario: false, scenarioName: '' });
          f.setCreateError('');
          f.setShowCreateModal(true);
        }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
          <Plus className="w-5 h-5" />{f.t('fiscalYears.newExercise')}
        </button>
      </div>

      {/* Fiscal Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {f.sortedFiscalYears.map((fy, index) => (
          <FiscalYearCard key={fy.id} fy={fy} index={index} isDark={isDark}
            currentFiscalYear={f.currentFiscalYear} selectFiscalYear={f.selectFiscalYear}
            openMenuId={f.openMenuId} setOpenMenuId={f.setOpenMenuId}
            getAvailableActions={f.getAvailableActions} handleAction={f.handleAction}
            formatDate={f.formatDate} getActivityCount={f.getActivityCount}
            fiscalYears={f.fiscalYears} t={f.t} />
        ))}
      </div>

      {/* Empty state */}
      {f.fiscalYears.length === 0 && (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Aucun exercice fiscal</h3>
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Créez votre premier exercice fiscal pour commencer</p>
          <button onClick={() => f.setShowCreateModal(true)} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">Créer un exercice</button>
        </div>
      )}

      {/* Click outside to close menu */}
      {f.openMenuId && <div className="fixed inset-0 z-40" onClick={() => f.setOpenMenuId(null)} />}

      {/* Modals */}
      <CreateModal isDark={isDark} show={f.showCreateModal} onClose={() => f.setShowCreateModal(false)}
        createForm={f.createForm} setCreateForm={f.setCreateForm} createError={f.createError}
        loading={f.loading} handleCreate={f.handleCreate} availableYears={f.availableYears}
        existingYears={f.existingYears} scenarioTakenYears={f.scenarioTakenYears}
        scenarios={f.scenarios} sortedFiscalYears={f.sortedFiscalYears}
        getActivityCount={f.getActivityCount} fiscalYears={f.fiscalYears} t={f.t} />

      <CloseModal isDark={isDark} show={f.showCloseModal} onClose={() => f.setShowCloseModal(false)}
        selectedFY={f.selectedFY} loading={f.loading} handleClose={f.handleClose} t={f.t} />

      <RectifyModal isDark={isDark} show={f.showRectifyModal} onClose={() => f.setShowRectifyModal(false)}
        selectedFY={f.selectedFY} loading={f.loading} handleRectify={f.handleRectify}
        rectifyReason={f.rectifyReason} setRectifyReason={f.setRectifyReason} t={f.t} />

      <DeleteModal isDark={isDark} show={f.showDeleteModal} onClose={() => f.setShowDeleteModal(false)}
        selectedFY={f.selectedFY} loading={f.loading} handleDelete={f.handleDelete}
        deleteStats={f.deleteStats} deleteConfirmText={f.deleteConfirmText}
        setDeleteConfirmText={f.setDeleteConfirmText} deleteError={f.deleteError} t={f.t} />
    </div>
  );
};

export default FiscalYears;
