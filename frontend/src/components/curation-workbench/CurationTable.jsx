import React from 'react';
import {
  CheckSquare, Square, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown,
  Link2, Code2, Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import EditableCell from './EditableCell';
import StatusBadge from './StatusBadge';

const SortIcon = ({ sortBy, sortOrder, field }) => {
  if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />;
};

const CurationTable = ({
  factors, loadingFactors, isDark,
  selectedIds, toggleSelect, allPageSelected, toggleSelectAll,
  toggleSort, sortBy, sortOrder,
  subcategoriesList, unitsList,
  inlineEdit, handleCellNavigate,
  setJsonModalFactor, setLinkPanelFactor,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left" data-testid="curation-table">
        <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          <tr className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            <th className="py-2 px-2 w-8">
              <button onClick={toggleSelectAll} data-testid="select-all-btn">
                {allPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('name_fr')}>
              <div className="flex items-center gap-1">{t('curation.table.originalName')} <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="name_fr" /></div>
            </th>
            <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('source_product_name')}>
              <div className="flex items-center gap-1">{t('curation.table.sourceBAFU')} <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="source_product_name" /></div>
            </th>
            <th className="py-2 px-2">{t('curation.table.simplifiedFr')}</th>
            <th className="py-2 px-2">{t('curation.table.simplifiedDe')}</th>
            <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('subcategory')}>
              <div className="flex items-center gap-1">{t('curation.table.subcategory')} <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="subcategory" /></div>
            </th>
            <th className="py-2 px-2 cursor-pointer text-center" onClick={() => toggleSort('is_public')}>
              <div className="flex items-center gap-1 justify-center"><Eye className="w-3 h-3" /><SortIcon sortBy={sortBy} sortOrder={sortOrder} field="is_public" /></div>
            </th>
            <th className="py-2 px-2 cursor-pointer text-center" onClick={() => toggleSort('popularity_score')}>
              <div className="flex items-center gap-1 justify-center">Pop. <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="popularity_score" /></div>
            </th>
            <th className="py-2 px-2">{t('curation.table.unit')}</th>
            <th className="py-2 px-2">{t('curation.table.value')}</th>
            <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('curation_status')}>
              <div className="flex items-center gap-1">{t('curation.table.status')} <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="curation_status" /></div>
            </th>
            <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('reporting_method')}>
              <div className="flex items-center gap-1">{t('curation.table.method')} <SortIcon sortBy={sortBy} sortOrder={sortOrder} field="reporting_method" /></div>
            </th>
            <th className="py-2 px-2">{t('curation.table.linkedLocationFactor')}</th>
            <th className="py-2 px-1 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {loadingFactors ? (
            <tr><td colSpan={14} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
          ) : factors.length === 0 ? (
            <tr><td colSpan={14} className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('curation.noFactorFound')}</td></tr>
          ) : factors.map((f, rowIdx) => {
            const isSelected = selectedIds.includes(f.id);
            const hasFrCustom = f.name_simple_fr != null && f.name_simple_fr !== f.name_fr;
            const impact = f.impacts?.[0];
            return (
              <tr key={f.id} data-testid={`factor-row-${f.id}`}
                className={`border-b transition-colors ${
                  isSelected
                    ? isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'
                    : isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-gray-100 hover:bg-gray-50'
                }`}>
                <td className="py-1.5 px-2">
                  <button onClick={() => toggleSelect(f.id)}>
                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </td>
                <td className={`py-1.5 px-2 text-xs max-w-[220px] truncate ${isDark ? 'text-slate-300' : 'text-gray-700'}`} title={f.name_fr}>
                  {f.name_fr}
                </td>
                <td className={`py-1.5 px-2 text-[10px] max-w-[200px] truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
                  title={f.source_product_name || ''} data-testid={`source-name-${f.id}`}>
                  {f.source_product_name || '\u2014'}
                </td>
                <td className={`py-1.5 px-2 text-xs max-w-[200px] ${hasFrCustom ? 'font-medium' : ''} ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <EditableCell
                    value={f.name_simple_fr || ''}
                    placeholder="\u2014"
                    isDark={isDark}
                    onSave={v => inlineEdit(f.id, 'name_simple_fr', v)}
                    cellId={`row-${rowIdx}-col-0`}
                    onNavigate={handleCellNavigate}
                  />
                </td>
                <td className="py-1.5 px-2 text-xs max-w-[200px]">
                  <EditableCell
                    value={f.name_simple_de || ''}
                    placeholder="\u2014"
                    isDark={isDark}
                    onSave={v => inlineEdit(f.id, 'name_simple_de', v)}
                    cellId={`row-${rowIdx}-col-1`}
                    onNavigate={handleCellNavigate}
                  />
                </td>
                <td className={`py-1.5 px-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <select
                    value={f.subcategory || ''}
                    onChange={e => inlineEdit(f.id, 'subcategory', e.target.value)}
                    data-testid={`subcat-select-${f.id}`}
                    className={`w-full text-[11px] rounded border py-0.5 px-1 cursor-pointer ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {subcategoriesList.map(sc => (
                      <option key={sc.code} value={sc.code}>{sc.name_fr}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-2 text-center">
                  <button onClick={() => inlineEdit(f.id, 'is_public', !f.is_public)}
                    className={`p-1 rounded ${f.is_public ? 'text-green-500' : isDark ? 'text-slate-600' : 'text-gray-300'}`}
                    title={f.is_public ? t('curation.bulk.publicLabel') : t('curation.bulk.expertLabel')}>
                    {f.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </td>
                <td className={`py-1.5 px-2 text-center font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <EditableCell
                    value={String(f.popularity_score || 0)}
                    isDark={isDark}
                    type="number"
                    onSave={v => inlineEdit(f.id, 'popularity_score', v)}
                    className="text-center w-10 mx-auto"
                  />
                </td>
                <td className={`py-1.5 px-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <input
                    list="units-datalist"
                    defaultValue={f.default_unit || ''}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val && val !== f.default_unit) inlineEdit(f.id, 'default_unit', val);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.target.blur(); }
                      if (e.key === 'Escape') { e.target.value = f.default_unit || ''; e.target.blur(); }
                    }}
                    data-testid={`unit-input-${f.id}`}
                    className={`w-full text-[11px] rounded border py-0.5 px-1 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                    placeholder={t('curation.unitPlaceholder')}
                  />
                </td>
                <td className={`py-1.5 px-2 font-mono text-[11px] whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {impact ? `${impact.value < 0.001 ? impact.value.toExponential(2) : impact.value.toFixed(4)} ${impact.unit}` : '\u2014'}
                </td>
                <td className="py-1.5 px-2">
                  <StatusBadge status={f.curation_status} isDark={isDark} onCycle={s => inlineEdit(f.id, 'curation_status', s)} />
                </td>
                <td className="py-1.5 px-2">
                  <select
                    value={f.reporting_method || 'location'}
                    onChange={e => inlineEdit(f.id, 'reporting_method', e.target.value)}
                    data-testid={`method-select-${f.id}`}
                    className={`text-[11px] rounded border py-0.5 px-1 cursor-pointer ${
                      f.reporting_method === 'market'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 font-medium'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    <option value="location">Location</option>
                    <option value="market">Market</option>
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  {f.reporting_method === 'market' ? (
                    f.location_factor_id ? (
                      <button
                        onClick={() => setLinkPanelFactor(f)}
                        data-testid={`loc-linked-${f.id}`}
                        className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1 max-w-[180px] transition-colors ${
                          isDark ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title={`${t('curation.link.linkedTo')}: ${f._locationName || f.location_factor_id}\n${t('curation.link.clickToEdit')}`}
                      >
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{f._locationName || f.location_factor_id}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setLinkPanelFactor(f)}
                        data-testid={`loc-link-btn-${f.id}`}
                        className={`flex items-center gap-1 text-[11px] rounded-lg px-2 py-1 transition-colors ${
                          isDark ? 'bg-slate-700/50 text-slate-400 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <Link2 className="w-3 h-3" />
                        Lier...
                      </button>
                    )
                  ) : (
                    <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-300'}`}></span>
                  )}
                </td>
                <td className="py-1.5 px-1">
                  <button onClick={() => setJsonModalFactor(f)} title={t('curation.link.viewJson')}
                    data-testid={`json-btn-${f.id}`}
                    className={`p-1 rounded transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-700' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <datalist id="units-datalist">
        {unitsList.map(u => <option key={u} value={u} />)}
      </datalist>
    </div>
  );
};

export default CurationTable;
