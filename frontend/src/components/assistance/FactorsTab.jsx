import React from 'react';
import { Search, Filter, X, Database, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scopeConfig } from './assistanceData';

const FactorsTab = ({ isDark, t, language, factorSearch, setFactorSearch, scopeFilter, setScopeFilter, showFilters, setShowFilters, filteredFactors, factorsLoading, getScopeColor, setSelectedFactor }) => {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input type="text" value={factorSearch} onChange={(e) => setFactorSearch(e.target.value)}
            placeholder={t('assistance.factorSearch')} data-testid="factors-search"
            className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
            }`} />
          {factorSearch && (
            <button onClick={() => setFactorSearch('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters-btn"
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
            showFilters || scopeFilter
              ? 'bg-blue-500 text-white border-blue-500'
              : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="w-5 h-5" />
          {t('assistance.filters')}
          {scopeFilter && <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">1</span>}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('assistance.filterByScope')}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setScopeFilter('')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !scopeFilter ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {t('assistance.all')}
              </button>
              {Object.entries(scopeConfig).slice(0, 4).map(([key, config]) => (
                <button key={key} onClick={() => setScopeFilter(scopeFilter === key ? '' : key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    scopeFilter === key ? `bg-${config.color}-500 text-white` : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {language === 'fr' ? config.label_fr : config.label_de}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {filteredFactors.length} {t('assistance.factorsFound')}
      </p>

      {/* Factors List */}
      {factorsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFactors.slice(0, 50).map((factor, idx) => {
            const name = language === 'fr' ? (factor.name_simple_fr || factor.name_fr || factor.name) : (factor.name_simple_de || factor.name_de || factor.name);
            const impacts = factor.impacts || [];

            return (
              <motion.div key={factor.id || idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                onClick={() => setSelectedFactor(factor)} data-testid={`factor-card-${factor.id || idx}`}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' : 'bg-white hover:shadow-md shadow-sm border border-gray-100'
                }`}>
                <h4 className={`font-medium mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</h4>
                {factor.subcategory && (
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{factor.subcategory}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {impacts.map((impact, i) => {
                    const color = getScopeColor(impact.scope);
                    return (
                      <span key={`${impact.scope}-${impact.value}-${i}`}
                        className={`px-2 py-0.5 text-xs rounded-full bg-${color}-500/20 text-${color}-500`}>
                        {impact.scope}: {impact.value?.toFixed(2)} {impact.unit}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <Tag className="w-3 h-3" />
                    {(factor.input_units || []).slice(0, 3).join(', ')}
                    {(factor.input_units || []).length > 3 && '...'}
                  </span>
                  {factor.source && (
                    <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{factor.source}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredFactors.length > 50 && (
        <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {t('assistance.showFirst50').replace('{count}', filteredFactors.length)}
        </p>
      )}

      {!factorsLoading && filteredFactors.length === 0 && (
        <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <Database className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('assistance.noFactors')}</p>
        </div>
      )}
    </div>
  );
};

export default FactorsTab;
