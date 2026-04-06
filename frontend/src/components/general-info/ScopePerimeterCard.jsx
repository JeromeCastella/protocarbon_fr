import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Calendar, Pencil, Wand2, Check, ChevronDown, ChevronUp } from 'lucide-react';

const ScopeCategoryList = ({ cats, color, isDark, excludedCategories, toggleCategory, contextReadonly, language, PRODUCT_CATEGORIES, areProductCategoriesIncluded, toggleProductCategories, t }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* Grouped product checkbox for scope3_aval */}
    {PRODUCT_CATEGORIES && (
      <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all md:col-span-2 ${
        areProductCategoriesIncluded()
          ? isDark ? `bg-${color}-500/20 border-2 border-${color}-500` : `bg-${color}-50 border-2 border-${color}-200`
          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
      } ${contextReadonly ? 'cursor-not-allowed opacity-60' : ''}`}>
        <input type="checkbox" checked={areProductCategoriesIncluded()} onChange={toggleProductCategories} disabled={contextReadonly} className={`w-5 h-5 rounded text-${color}-500 focus:ring-${color}-500`} />
        <div className="flex-1">
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('generalInfo.soldProducts')}</span>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('generalInfo.soldProductsIncludes')}</p>
        </div>
      </label>
    )}
    {cats.map(cat => (
      <label key={cat.code} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
        !excludedCategories?.includes(cat.code)
          ? isDark ? `bg-${color}-500/20 border-2 border-${color}-500` : `bg-${color}-50 border-2 border-${color}-200`
          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
      } ${contextReadonly ? 'cursor-not-allowed opacity-60' : ''}`}>
        <input type="checkbox" checked={!excludedCategories?.includes(cat.code)} onChange={() => toggleCategory(cat.code)} disabled={contextReadonly} className={`w-5 h-5 rounded text-${color}-500 focus:ring-${color}-500`} />
        <span className={isDark ? 'text-white' : 'text-gray-900'}>{language === 'fr' ? cat.name_fr : cat.name_de}</span>
      </label>
    ))}
  </div>
);

const ScopePerimeterCard = ({
  isDark, selectedFiscalYear, contextReadonly,
  showManualConfig, setShowManualConfig, openWizard, savedWizard,
  scopeCategories, fiscalYearContext, toggleCategory,
  toggleProductCategories, areProductCategoriesIncluded,
  PRODUCT_CATEGORIES, language, t,
}) => {
  const excluded = fiscalYearContext.excluded_categories;
  const commonProps = { isDark, excludedCategories: excluded, toggleCategory, contextReadonly, language, t };
  const scopes = [
    { key: 'scope1', label: `${t('scope.scope1')} - ${t('scope.scope1Title')}`, color: 'blue', cats: scopeCategories.scope1 },
    { key: 'scope2', label: `${t('scope.scope2')} - ${t('scope.scope2Title')}`, color: 'cyan', cats: scopeCategories.scope2 },
    { key: 'scope3_amont', label: t('scope.scope3Amont'), color: 'purple', cats: scopeCategories.scope3_amont },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
    >
      <div className="flex items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Layers className="w-5 h-5 text-purple-600" /></div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('scope.perimeter')}</h2>
        </div>
      </div>

      {selectedFiscalYear?.id && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{t('generalInfo.perimeterConfig').replace('{year}', selectedFiscalYear.year)}</span>
        </div>
      )}

      <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('scope.perimeterDesc')}</p>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setShowManualConfig(!showManualConfig)} data-testid="manual-config-btn"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ml-auto ${
            showManualConfig
              ? isDark ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Pencil className="w-4 h-4" />Configuration manuelle{showManualConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={openWizard} disabled={contextReadonly || !selectedFiscalYear?.id} data-testid="wizard-config-btn"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            contextReadonly || !selectedFiscalYear?.id ? 'bg-gray-400 text-white cursor-not-allowed'
              : savedWizard ? 'bg-green-500 text-white' : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/30'
          }`}
        >
          {savedWizard ? <><Check className="w-4 h-4" />{t('common.success')}</> : <><Wand2 className="w-4 h-4" />Configuration guidée</>}
        </button>
      </div>

      <AnimatePresence>
        {showManualConfig && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            {scopes.map(s => (
              <div key={s.key} className="mb-6">
                <h3 className={`text-${s.color}-500 font-semibold mb-3`}>{s.label}</h3>
                <ScopeCategoryList {...commonProps} cats={s.cats} color={s.color} />
              </div>
            ))}
            {/* Scope 3 Aval - with grouped product categories */}
            <div>
              <h3 className="text-indigo-500 font-semibold mb-3">{t('scope.scope3Aval')}</h3>
              <ScopeCategoryList {...commonProps} color="indigo"
                cats={scopeCategories.scope3_aval.filter(c => !PRODUCT_CATEGORIES.includes(c.code))}
                PRODUCT_CATEGORIES={PRODUCT_CATEGORIES}
                areProductCategoriesIncluded={areProductCategoriesIncluded}
                toggleProductCategories={toggleProductCategories}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ScopePerimeterCard;
