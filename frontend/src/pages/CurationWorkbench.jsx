import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, X, Sparkles, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useCurationWorkbench } from '../hooks/useCurationWorkbench';
import LocationLinkPanel from '../components/curation/LocationLinkPanel';
import StatsDashboard from '../components/curation-workbench/StatsDashboard';
import BulkActionsBar from '../components/curation-workbench/BulkActionsBar';
import CurationTable from '../components/curation-workbench/CurationTable';
import BulkPreviewModal from '../components/curation-workbench/BulkPreviewModal';
import AISuggestModal from '../components/curation-workbench/AISuggestModal';
import TranslatePreviewModal from '../components/curation-workbench/TranslatePreviewModal';
import JsonViewerModal from '../components/curation-workbench/JsonViewerModal';

export default function CurationWorkbench() {
  const { isDark } = useTheme();
  const cw = useCurationWorkbench();

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`} data-testid="curation-workbench">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-4 flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <Layers className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-bold">{cw.t('curation.title')}</h1>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{cw.total} {cw.t('curation.factors')}</span>
        <div className="flex-1" />

        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input type="text" placeholder={cw.t('curation.searchPlaceholder')} value={cw.search} onChange={e => cw.setSearch(e.target.value)}
            data-testid="curation-search"
            className={`pl-8 pr-8 py-1.5 rounded-lg border text-xs w-56 ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-300 placeholder:text-gray-400'}`} />
          {cw.search && <button onClick={() => cw.setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3" /></button>}
        </div>

        <select value={cw.curationStatus} onChange={e => cw.setCurationStatus(e.target.value)} data-testid="filter-curation-status"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{cw.t('curation.allStatuses')}</option>
          <option value="untreated">{cw.t('curation.untreated')}</option>
          <option value="reviewed">{cw.t('curation.reviewed')}</option>
          <option value="flagged">{cw.t('curation.flagged')}</option>
        </select>

        <select value={cw.isPublic} onChange={e => cw.setIsPublic(e.target.value)} data-testid="filter-is-public"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{cw.t('curation.all')}</option>
          <option value="true">{cw.t('curation.public')}</option>
          <option value="false">{cw.t('curation.expert')}</option>
        </select>

        <select value={cw.defaultUnit} onChange={e => cw.setDefaultUnit(e.target.value)} data-testid="filter-unit"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{cw.t('curation.allUnits')}</option>
          {cw.unitsList.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select value={cw.reportingMethodFilter} onChange={e => cw.setReportingMethodFilter(e.target.value)} data-testid="filter-reporting-method"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{cw.t('curation.allMethods')}</option>
          <option value="location">Location</option>
          <option value="market">Market</option>
        </select>

        {cw.selectedIds.length > 0 && (
          <button onClick={() => cw.setShowAISuggest(true)} data-testid="ai-suggest-btn"
            className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />{cw.t('curation.aiTitles')} ({Math.min(cw.selectedIds.length, 20)})
          </button>
        )}
      </div>

      <StatsDashboard stats={cw.stats} isDark={isDark} onSubcategoryClick={cw.setSubcategory} activeSubcategory={cw.subcategory} />

      <BulkActionsBar selectedIds={cw.selectedIds} isDark={isDark} onClearSelection={() => cw.setSelectedIds([])}
        onBulkAction={cw.handleBulkAction} loading={cw.bulkLoading || cw.copyLoading} subcategoriesList={cw.subcategoriesList}
        onCopyOriginals={cw.handleCopyOriginals} onTranslate={(dir) => cw.setTranslateModal({ factorIds: cw.selectedIds, direction: dir })} />

      <CurationTable factors={cw.factors} loadingFactors={cw.loadingFactors} isDark={isDark}
        selectedIds={cw.selectedIds} toggleSelect={cw.toggleSelect} allPageSelected={cw.allPageSelected} toggleSelectAll={cw.toggleSelectAll}
        toggleSort={cw.toggleSort} sortBy={cw.sortBy} sortOrder={cw.sortOrder}
        subcategoriesList={cw.subcategoriesList} unitsList={cw.unitsList}
        inlineEdit={cw.inlineEdit} handleCellNavigate={cw.handleCellNavigate}
        setJsonModalFactor={cw.setJsonModalFactor} setLinkPanelFactor={cw.setLinkPanelFactor} />

      {/* Pagination */}
      <div className={`px-4 py-2 border-t flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {cw.t('curation.pagination.page')} {cw.page}/{cw.totalPages} {'\u2014'} {cw.total} {cw.t('curation.pagination.factorsCount')}
          </span>
          <div className={`flex items-center gap-3 text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-300'}`} data-testid="keyboard-hints">
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Tab</kbd> {cw.t('curation.keyboard.nextCell')}</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Enter</kbd> {cw.t('curation.keyboard.nextRow')}</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Shift+Enter</kbd> {cw.t('curation.keyboard.reviewedNext')}</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Esc</kbd> {cw.t('curation.keyboard.cancel')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cw.setPage(p => Math.max(1, p - 1))} disabled={cw.page <= 1} data-testid="page-prev"
            className={`p-1.5 rounded-lg ${cw.page <= 1 ? 'opacity-30' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="number" value={cw.page} min={1} max={cw.totalPages}
            onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= cw.totalPages) cw.setPage(v); }}
            className={`w-14 text-center text-xs rounded-lg border py-1 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`} />
          <button onClick={() => cw.setPage(p => Math.min(cw.totalPages, p + 1))} disabled={cw.page >= cw.totalPages} data-testid="page-next"
            className={`p-1.5 rounded-lg ${cw.page >= cw.totalPages ? 'opacity-30' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {cw.bulkPreview && (
        <BulkPreviewModal preview={cw.bulkPreview} isDark={isDark} loading={cw.bulkLoading}
          onConfirm={cw.confirmBulkApply} onCancel={() => { cw.setBulkPreview(null); cw.setPendingBulkChanges(null); }} />
      )}
      {cw.showAISuggest && (
        <AISuggestModal factorIds={cw.selectedIds.slice(0, 20)} isDark={isDark}
          onApply={cw.handleAISuggestApply} onClose={() => cw.setShowAISuggest(false)} />
      )}
      {cw.translateModal && (
        <TranslatePreviewModal factorIds={cw.translateModal.factorIds} direction={cw.translateModal.direction}
          isDark={isDark} onApply={cw.handleTranslateApply} onClose={() => cw.setTranslateModal(null)} />
      )}
      <LocationLinkPanel
        isOpen={!!cw.linkPanelFactor} onClose={() => cw.setLinkPanelFactor(null)}
        factor={cw.linkPanelFactor} isDark={isDark}
        subcategoriesList={cw.subcategoriesList}
        onLink={cw.handleLinkLocation} onUnlink={cw.handleUnlinkLocation} />
      {cw.jsonModalFactor && (
        <JsonViewerModal factor={cw.jsonModalFactor} isDark={isDark} onClose={() => cw.setJsonModalFactor(null)} />
      )}
    </div>
  );
}
