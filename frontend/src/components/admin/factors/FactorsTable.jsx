import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Edit2, Trash2, Sparkles, GitBranch, History, Archive, Copy
} from 'lucide-react';
import { getScopeColor } from '../../../hooks/useAdminData';

const FactorsTable = ({
  factors,
  onViewHistory, onCreateNewVersion, onEdit, onDuplicate, onSoftDelete, onDelete
}) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      <table className="w-full">
        <thead>
          <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
            <th className="text-left px-4 py-3 font-medium">{t('common.name')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('admin.factors.subcategory')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('admin.factors.impacts')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('common.version')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('emissionFactors.source')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {factors.map(factor => {
            const impacts = factor.impacts || [{ scope: factor.scope, value: factor.value, unit: factor.unit }];
            const isMultiImpact = impacts.length > 1;
            const isArchived = !!factor.deleted_at;
            const isReplaced = !!factor.replaced_by;
            const version = factor.factor_version || 1;

            return (
              <tr
                key={factor.id}
                data-testid={`factor-row-${factor.id}`}
                className={`border-t ${isArchived ? 'opacity-50' : ''} ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {language === 'de'
                        ? (factor.name_simple_de || factor.name_de || factor.name_simple_fr || factor.name_fr || factor.name)
                        : (factor.name_simple_fr || factor.name_fr || factor.name)}
                    </div>
                    {isArchived && <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-500">{t('common.archived')}</span>}
                    {isReplaced && !isArchived && <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">{t('common.replaced')}</span>}
                    {factor.reporting_method && (
                      <span className={`px-1.5 py-0.5 text-xs rounded ${factor.reporting_method === 'market' ? 'bg-purple-500/20 text-purple-500' : 'bg-teal-500/20 text-teal-500'}`}>
                        {factor.reporting_method}
                      </span>
                    )}
                  </div>
                  {factor.source_product_name && (
                    <div className={`text-xs truncate max-w-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`} title={factor.source_product_name}>
                      {factor.source_product_name}
                    </div>
                  )}
                  {language === 'fr' && (factor.name_simple_de || factor.name_de) && (
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.name_simple_de || factor.name_de}</div>
                  )}
                  {language === 'de' && (factor.name_simple_fr || factor.name_fr) && (
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.name_simple_fr || factor.name_fr}</div>
                  )}
                  {factor.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {factor.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>{tag}</span>
                      ))}
                      {factor.tags.length > 3 && <span className="text-xs text-gray-500">+{factor.tags.length - 3}</span>}
                    </div>
                  )}
                </td>
                {/* Subcategory */}
                <td className="px-4 py-3">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{factor.subcategory || '-'}</span>
                </td>
                {/* Impacts */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {impacts.slice(0, 2).map((imp, i) => (
                      <div key={`${imp.scope}-${imp.value}-${i}`} className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getScopeColor(imp.scope)}`}>
                          {imp.scope?.replace('_', ' ')}
                        </span>
                        <span className="text-sm">{imp.value} {imp.unit}</span>
                      </div>
                    ))}
                    {impacts.length > 2 && <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>+{impacts.length - 2}</span>}
                    {isMultiImpact && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-500">
                        <Sparkles className="w-3 h-3" />{t('admin.factors.multiImpact')}
                      </span>
                    )}
                  </div>
                </td>
                {/* Version */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <GitBranch className="w-3 h-3" />v{version}
                    </span>
                    {(factor.valid_from_year || factor.valid_from) && (
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('common.since')} {factor.valid_from_year || factor.valid_from?.split('-')[0]}
                      </span>
                    )}
                  </div>
                </td>
                {/* Source */}
                <td className="px-4 py-3">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.source}</span>
                  {factor.year && <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{factor.year}</div>}
                </td>
                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onViewHistory(factor.id)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`} title={t('common.history')}>
                      <History className="w-4 h-4" />
                    </button>
                    {!isArchived && !isReplaced && (
                      <>
                        <button onClick={() => onCreateNewVersion(factor)} className={`p-2 rounded-lg text-blue-500 ${isDark ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`} title={t('admin.versioning.newVersion')}>
                          <GitBranch className="w-4 h-4" />
                        </button>
                        <button onClick={() => onEdit(factor)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`} title={t('common.edit')}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDuplicate(factor)} className={`p-2 rounded-lg text-green-500 ${isDark ? 'hover:bg-green-500/20' : 'hover:bg-green-100'}`} title="Dupliquer">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => onSoftDelete(factor.id)} className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10" title={t('common.archive')}>
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => onDelete(factor.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title={t('common.delete')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FactorsTable;
