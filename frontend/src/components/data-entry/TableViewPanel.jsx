import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import {
  Search, ChevronUp, ChevronDown, X, Edit3, Trash2, Table, Package, FileText,
} from 'lucide-react';

const TableViewPanel = ({
  isDark, tableViewScope, scopeLabels, scopes, getScopeActivities,
  getCategoryName, summary, formatEmissions, formatEmissionsForTable,
  handleEditActivityInModal, handleDeleteActivity, PRODUCT_SALE_CATEGORIES,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const rawActivities = getScopeActivities(tableViewScope);
  const totalEmissions = rawActivities.reduce((sum, a) => sum + (a.emissions || 0), 0);

  const filtered = searchQuery
    ? rawActivities.filter(a => {
        const q = searchQuery.toLowerCase();
        return (a.name || '').toLowerCase().includes(q) || (a.emission_factor_name || '').toLowerCase().includes(q)
          || (getCategoryName(a.category_id) || '').toLowerCase().includes(q)
          || (a.factor_snapshot?.name_simple_fr || '').toLowerCase().includes(q)
          || (a.factor_snapshot?.name_fr || '').toLowerCase().includes(q)
          || (a.comments || '').toLowerCase().includes(q);
      })
    : rawActivities;

  const activities = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    let va, vb;
    switch (sortField) {
      case 'name': va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); break;
      case 'category': va = getCategoryName(a.category_id); vb = getCategoryName(b.category_id); break;
      case 'factor': va = (a.factor_snapshot?.name_simple_fr || a.factor_snapshot?.name_fr || '').toLowerCase(); vb = (b.factor_snapshot?.name_simple_fr || b.factor_snapshot?.name_fr || '').toLowerCase(); break;
      case 'quantity': va = a.quantity || 0; vb = b.quantity || 0; break;
      case 'emissions': va = a.emissions || 0; vb = b.emissions || 0; break;
      case 'percent': va = a.emissions || 0; vb = b.emissions || 0; break;
      case 'source': va = a.sale_id ? 1 : 0; vb = b.sale_id ? 1 : 0; break;
      default: return 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const scopeColorMap = (scope) => {
    if (scope === 'scope1') return { text: 'text-blue-500', bg: 'bg-blue-500' };
    if (scope === 'scope2') return { text: 'text-cyan-500', bg: 'bg-cyan-500' };
    if (scope === 'scope3_3') return { text: 'text-amber-500', bg: 'bg-amber-500' };
    if (scope?.includes('amont') || scope === 'scope3') return { text: 'text-purple-500', bg: 'bg-purple-500' };
    return { text: 'text-indigo-500', bg: 'bg-indigo-500' };
  };

  const headerBg = tableViewScope === null ? 'from-blue-500 to-purple-500'
    : tableViewScope === 'scope1' ? 'from-blue-500 to-blue-600'
    : tableViewScope === 'scope2' ? 'from-cyan-500 to-cyan-600'
    : tableViewScope?.includes('amont') ? 'from-purple-500 to-purple-600'
    : 'from-indigo-500 to-indigo-600';

  const thClass = `text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`;
  const thRightClass = `text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()}
        className={`absolute inset-y-0 right-0 w-[94%] max-w-[1600px] ${isDark ? 'bg-slate-900' : 'bg-gray-50'} shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerBg} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Table className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {tableViewScope === null ? 'Bilan complet' : scopeLabels[tableViewScope]?.name}
                </h3>
                <p className="text-sm text-white/70">
                  {rawActivities.length} entrées — {formatEmissions(tableViewScope === null ? summary?.total_emissions : summary?.scope_emissions?.[tableViewScope]).value}{' '}
                  {formatEmissions(tableViewScope === null ? summary?.total_emissions : summary?.scope_emissions?.[tableViewScope]).unit}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white" data-testid="close-table-view"><X className="w-6 h-6" /></button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une activité, catégorie, facteur..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              data-testid="table-view-search" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <Table className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{searchQuery ? t('dataEntry.noResults') : t('dataEntry.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'}`}>
                <tr>
                  <th className={thClass} onClick={() => toggleSort('name')}><div className="flex items-center gap-1">Activité <SortIcon field="name" /></div></th>
                  {tableViewScope === null && <th className={thClass}>Scope</th>}
                  <th className={thClass} onClick={() => toggleSort('category')}><div className="flex items-center gap-1">Catégorie <SortIcon field="category" /></div></th>
                  <th className={thClass} onClick={() => toggleSort('factor')}><div className="flex items-center gap-1">Facteur d'émission <SortIcon field="factor" /></div></th>
                  <th className={thRightClass} onClick={() => toggleSort('quantity')}><div className="flex items-center justify-end gap-1">Quantité <SortIcon field="quantity" /></div></th>
                  <th className={thRightClass} onClick={() => toggleSort('emissions')}><div className="flex items-center justify-end gap-1">Émissions <SortIcon field="emissions" /></div></th>
                  <th className={thRightClass} onClick={() => toggleSort('percent')}><div className="flex items-center justify-end gap-1">% <SortIcon field="percent" /></div></th>
                  <th className={thClass} onClick={() => toggleSort('source')}><div className="flex items-center gap-1">Source <SortIcon field="source" /></div></th>
                  <th className={thClass}>Commentaire</th>
                  <th className={`text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => {
                  const activityScope = activity.scope || 'scope1';
                  const { text: scopeColor, bg: scopeBgColor } = scopeColorMap(activityScope);
                  const isGrouped = activity.group_size > 1;
                  const isSecondary = activity.group_index > 0;
                  const isLinkedActivity = isSecondary;
                  const pct = totalEmissions > 0 ? ((activity.emissions || 0) / totalEmissions * 100) : 0;
                  const factorName = activity.factor_snapshot?.name_simple_fr || activity.factor_snapshot?.name_fr || activity.emission_factor_name || '—';
                  const factorValue = activity.factor_snapshot?.impacts?.[0]
                    ? `${activity.factor_snapshot.impacts[0].value} ${activity.factor_snapshot.impacts[0].unit}`
                    : (activity.impact_value ? `${activity.impact_value} ${activity.impact_unit || ''}` : '');

                  return (
                    <tr key={activity.id}
                      className={`border-b ${isDark ? 'border-slate-800' : 'border-gray-100'} transition-colors ${
                        isLinkedActivity ? (isDark ? 'bg-slate-800/60' : 'bg-gray-50/80') : (isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white')
                      }`}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isLinkedActivity ? <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>↳</span>
                            : isGrouped ? <span className={`text-[10px] px-1 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{activity.group_size}x</span>
                            : null}
                          <span className={`text-sm font-medium truncate max-w-[200px] ${isDark ? 'text-slate-200' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                            {activity.name || activity.emission_factor_name || '—'}
                          </span>
                        </div>
                      </td>
                      {tableViewScope === null && (
                        <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${scopeBgColor}`}>
                          {activityScope === 'scope3_3' ? '3.3' : (scopeLabels[activityScope]?.name || activityScope).replace('Scope ', '')}
                        </span></td>
                      )}
                      <td className={`py-3 px-3 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                        <span className="truncate max-w-[150px] block">{getCategoryName(activity.category_id)}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className={isLinkedActivity ? 'opacity-60' : ''}>
                          <p className={`text-xs truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{factorName}</p>
                          {factorValue && <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{factorValue}</p>}
                        </div>
                      </td>
                      <td className={`py-3 px-3 text-right text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                        {activity.quantity?.toLocaleString('fr-FR')} {activity.original_unit || activity.unit}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold text-sm ${scopeColor} ${isLinkedActivity ? 'opacity-70' : ''}`}>
                        {formatEmissionsForTable(activity.emissions, totalEmissions)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className={`w-10 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div className={`h-full rounded-full ${scopeBgColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium min-w-[36px] text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {pct < 0.1 && pct > 0 ? '<0.1' : pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {!isLinkedActivity && PRODUCT_SALE_CATEGORIES.includes(activity.category_id) ? (
                          activity.sale_id
                            ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}><Package className="w-3 h-3 inline mr-0.5" />Fiche</span>
                            : <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}><FileText className="w-3 h-3 inline mr-0.5" />Direct</span>
                        ) : isLinkedActivity
                          ? <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Auto</span>
                          : <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}><FileText className="w-3 h-3 inline mr-0.5" />Direct</span>
                        }
                      </td>
                      <td className={`py-3 px-3 text-xs max-w-[150px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <span className="truncate block" title={activity.comments || ''}>{activity.comments || '—'}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isLinkedActivity ? <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Auto</span> : (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleEditActivityInModal(activity)} data-testid={`edit-activity-${activity.id}`}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-500'}`} title={t('dataEntry.edit')}>
                              <Edit3 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                            </button>
                            <button onClick={() => activity.sale_id && activity.product_id ? handleEditActivityInModal(activity) : handleDeleteActivity(activity)}
                              data-testid={`delete-activity-${activity.id}`} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                              title={activity.sale_id ? t('dataEntry.manageSale') : t('dataEntry.delete')}>
                              <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`sticky bottom-0 ${isDark ? 'bg-slate-800 border-t border-slate-700' : 'bg-white border-t border-gray-200'}`}>
                  <td colSpan={tableViewScope === null ? 5 : 4} className={`py-3 px-3 font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {tableViewScope === null ? t('dataEntry.totalGeneral') : `${t('dataEntry.totalScope')} ${scopeLabels[tableViewScope]?.name}`}
                    {searchQuery && ` (${activities.length} résultats)`}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold text-sm ${
                    tableViewScope === null ? 'text-blue-500' : tableViewScope === 'scope1' ? 'text-blue-500' : tableViewScope === 'scope2' ? 'text-cyan-500' : 'text-purple-500'
                  }`}>{formatEmissionsForTable(activities.reduce((s, a) => s + (a.emissions || 0), 0), totalEmissions)}</td>
                  <td className={`py-3 px-3 text-right text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {totalEmissions > 0 ? (activities.reduce((s, a) => s + (a.emissions || 0), 0) / totalEmissions * 100).toFixed(1) : 0}%
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TableViewPanel;
