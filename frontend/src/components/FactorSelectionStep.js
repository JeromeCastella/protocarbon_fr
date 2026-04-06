import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Info, FlaskConical, LayoutGrid, Table2, Check } from 'lucide-react';
import FactorCard from './FactorCard';
import { createFactorSearchIndex, searchFactors, sortFactorsByRelevance } from '../utils/factorSearch';
import { useLanguage } from '../context/LanguageContext';

/**
 * FactorSelectionStep - Enhanced factor selection with search and cards
 * This component replaces the old factor selection UI with a cleaner, more user-friendly experience
 */
const FactorSelectionStep = ({
  factors,
  selectedFactor,
  onSelectFactor,
  selectedUnit,
  language = 'fr',
  isDark = false,
  showExpertFactors = false,
  onToggleExpert = null,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Split factors into public and all
  const publicFactors = useMemo(() => {
    if (!factors) return [];
    return factors.filter(f => f.is_public === true);
  }, [factors]);

  const expertCount = useMemo(() => {
    if (!factors) return 0;
    return factors.filter(f => f.is_public === false).length;
  }, [factors]);

  // Active factor list based on toggle
  const activeFactors = showExpertFactors ? factors : publicFactors;
  
  // Create search index when active factors change
  useEffect(() => {
    if (activeFactors && activeFactors.length > 0) {
      const index = createFactorSearchIndex(activeFactors);
      setSearchIndex(index);
    }
  }, [activeFactors]);
  
  // Filter and sort factors
  const displayFactors = useMemo(() => {
    if (!activeFactors || activeFactors.length === 0) return [];
    
    // If searching, use fuzzy search
    if (searchQuery.trim().length >= 2 && searchIndex) {
      const results = searchFactors(searchIndex, searchQuery);
      return results || [];
    }
    
    // Otherwise, sort by relevance
    return sortFactorsByRelevance(activeFactors, language);
  }, [activeFactors, searchQuery, searchIndex, language]);
  
  // Count enriched factors
  const enrichedCount = useMemo(() => {
    return activeFactors?.filter(f => f.name_simple_fr || f.name_simple_de).length || 0;
  }, [activeFactors]);

  if (!factors || factors.length === 0) {
    return (
      <div className={`p-6 rounded-xl text-center ${
        isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
      }`}>
        <Info className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          {t('factorSelection.noFactorsForUnit')}
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('factorSelection.selectOtherUnit')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with count, view toggle and expert toggle */}
      <div className="flex items-center justify-between flex-shrink-0">
        <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {t('factorSelection.title')}
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {displayFactors.length} {t('factorSelection.factors')}
          </span>
          {/* View mode toggle */}
          <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              data-testid="view-mode-grid"
              title={t('factorSelection.gridView')}
              className={`p-1.5 transition-all ${
                viewMode === 'grid'
                  ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              data-testid="view-mode-table"
              title={t('factorSelection.tableView')}
              className={`p-1.5 transition-all ${
                viewMode === 'table'
                  ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                  : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {expertCount > 0 && (
            <button
              type="button"
              onClick={() => onToggleExpert ? onToggleExpert() : null}
              data-testid="toggle-expert-factors"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                showExpertFactors
                  ? isDark
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                  : isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {showExpertFactors 
                ? t('factorSelection.hideExperts')
                : `+ ${expertCount} ${t('factorSelection.showExperts')}`
              }
            </button>
          )}
        </div>
      </div>
      
      {/* Search bar */}
      <div className="relative mt-4 flex-shrink-0">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
          isDark ? 'text-slate-400' : 'text-gray-400'
        }`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('factorSelection.searchPlaceholder')}
          data-testid="factor-search-input"
          className={`w-full pl-12 pr-10 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
            isDark 
              ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Search hint */}
      {!searchQuery && enrichedCount > 0 && (
        <p className={`text-xs mt-2 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {t('factorSelection.searchHint')}
        </p>
      )}
      
      {/* Factor cards grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 overflow-y-auto pr-2 mt-4 flex-1 auto-rows-min content-start">
          {displayFactors.map((factor) => (
            <FactorCard
              key={factor.id}
              factor={factor}
              language={language}
              isSelected={selectedFactor?.id === factor.id}
              onClick={() => onSelectFactor(factor)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-y-auto mt-4 flex-1" data-testid="factor-table-view">
          <table className="w-full text-left">
            <thead className={`sticky top-0 z-10 text-[11px] uppercase tracking-wider ${
              isDark ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-400'
            }`}>
              <tr>
                <th className="py-2 pr-2 font-medium">{t('factorSelection.name')}</th>
                <th className="py-2 px-2 font-medium text-right whitespace-nowrap">{t('factorSelection.value')}</th>
                <th className="py-2 px-2 font-medium">{t('factorSelection.unit')}</th>
                <th className="py-2 pl-2 font-medium">{t('factorSelection.source')}</th>
              </tr>
            </thead>
            <tbody>
              {displayFactors.map((factor) => {
                const isSelected = selectedFactor?.id === factor.id;
                const isExpert = factor.is_public === false;
                const name = language === 'fr'
                  ? (factor.name_simple_fr || factor.name_fr)
                  : (factor.name_simple_de || factor.name_de || factor.name_fr);
                const impact = factor.impacts?.[0];
                return (
                  <tr
                    key={factor.id}
                    onClick={() => onSelectFactor(factor)}
                    data-testid={`factor-row-${factor.id}`}
                    className={`cursor-pointer border-b transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-500/15 border-blue-500/30'
                          : 'bg-blue-50 border-blue-100'
                        : isDark
                          ? 'border-slate-700/50 hover:bg-slate-700/40'
                          : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSelected && (
                          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-xs truncate max-w-[280px] ${
                          isSelected
                            ? isDark ? 'text-blue-300 font-medium' : 'text-blue-700 font-medium'
                            : isDark ? 'text-slate-200' : 'text-gray-800'
                        }`}>
                          {name}
                        </span>
                        {isExpert && (
                          <span className={`flex-shrink-0 text-[8px] font-bold px-1 py-px rounded ${
                            isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                          }`}>EXP</span>
                        )}
                      </div>
                    </td>
                    <td className={`py-1.5 px-2 text-right font-mono text-[11px] whitespace-nowrap ${
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      {impact ? (impact.value < 0.001 ? impact.value.toExponential(2) : impact.value.toFixed(3)) : '—'}
                    </td>
                    <td className={`py-1.5 px-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {impact?.unit || ''}
                    </td>
                    <td className={`py-1.5 pl-2 text-[11px] ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>
                      {factor.source || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* No results message */}
      {searchQuery && displayFactors.length === 0 && (
        <div className={`p-4 rounded-xl text-center ${
          isDark ? 'bg-slate-700' : 'bg-gray-50'
        }`}>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            {t('factorSelection.noResults')}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            {t('factorSelection.clearSearch')}
          </button>
        </div>
      )}
      
      {/* Selected factor confirmation */}
      {selectedFactor && (
        <div className={`mt-4 p-4 rounded-xl flex-shrink-0 ${
          isDark 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              {t('factorSelection.selectedFactor')}
            </span>
          </div>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {language === 'fr' 
              ? (selectedFactor.name_simple_fr || selectedFactor.name_fr)
              : (selectedFactor.name_simple_de || selectedFactor.name_de || selectedFactor.name_fr)
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default FactorSelectionStep;
