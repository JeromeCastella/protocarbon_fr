import React from 'react';
import { X, Check, Info, RotateCcw, Loader2 } from 'lucide-react';
import { getUnitLabel, formatUnitWithCode } from '../../utils/unitLabels';
import { useLanguage } from '../../context/LanguageContext';

const LeftPanel = ({
  isDark, language, editingActivity,
  effectiveCategory, effectiveScope,
  step, subcategories, selectedSubcategory,
  availableUnits, nativeUnits, convertedUnits, selectedUnit, isConvertedUnit,
  selectedFactor, quantity, setQuantity, comments, setComments,
  loading, pendingCategoryChoice, resolvedCategory, setResolvedCategory,
  emissions, totalEmissions, convertedQty, allImpacts, hasFilteredImpacts,
  scopeColors,
  goBackToStep, handleSubcategorySelect, handleUnitSelect,
  handleSubmit, getFactorName, onClose
}) => {
  const { t } = useLanguage();

  return (
    <div className={`w-full flex flex-col h-full border-r ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editingActivity ? t('guidedEntry.editTitle') : t('guidedEntry.newTitle')}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-lg lg:hidden ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: effectiveCategory?.color }}></div>
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {language === 'fr' ? effectiveCategory?.name_fr : effectiveCategory?.name_de}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('guidedEntry.loading')}</p>
          </div>
        ) : (
          <>
            {/* Step 1: Subcategory */}
            {subcategories.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.step1')}
                </label>
                {selectedSubcategory && step >= 2 ? (
                  <button type="button" onClick={() => subcategories.length > 1 && goBackToStep(1)}
                    data-testid="change-subcategory-btn"
                    className={`w-full p-3 rounded-xl border flex items-center justify-between group ${isDark ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}>
                    <span className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {language === 'fr' ? selectedSubcategory.name_fr : selectedSubcategory.name_de}
                    </span>
                    {subcategories.length > 1 && <RotateCcw className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                  </button>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {subcategories.map(subcat => (
                      <button key={subcat.code} type="button" onClick={() => handleSubcategorySelect(subcat)}
                        data-testid={`subcat-${subcat.code}`}
                        className={`p-3 rounded-xl text-left text-sm transition-all border ${
                          selectedSubcategory?.code === subcat.code
                            ? 'bg-blue-500 text-white border-blue-500'
                            : isDark ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'
                        }`}>
                        {language === 'fr' ? subcat.name_fr : subcat.name_de}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Unit */}
            {step >= 2 && availableUnits.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.step2')}
                </label>
                {selectedUnit && step >= 3 ? (
                  <button type="button" onClick={() => availableUnits.length > 1 && goBackToStep(2)}
                    data-testid="change-unit-btn"
                    className={`w-full p-3 rounded-xl border flex items-center justify-between group ${isDark ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}>
                    <span className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {formatUnitWithCode(selectedUnit, language, true)}
                    </span>
                    {availableUnits.length > 1 && <RotateCcw className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                  </button>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {nativeUnits.map(unit => (
                        <button key={unit} type="button" onClick={() => handleUnitSelect(unit)}
                          data-testid={`unit-${unit}`}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedUnit === unit ? 'bg-blue-500 text-white'
                              : isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          }`}>
                          {formatUnitWithCode(unit, language, true)}
                        </button>
                      ))}
                    </div>
                    {convertedUnits.length > 0 && (
                      <div className="mt-2">
                        <p className={`text-xs mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('guidedEntry.autoConversion')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {convertedUnits.map(unit => (
                            <button key={unit} type="button" onClick={() => handleUnitSelect(unit)}
                              data-testid={`unit-${unit}`}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border border-dashed ${
                                selectedUnit === unit ? 'bg-blue-500 text-white border-blue-500'
                                  : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                              }`}>
                              {formatUnitWithCode(unit, language, true)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected factor recap */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.step3')}
                </label>
                <button type="button" onClick={() => goBackToStep(3)}
                  className={`w-full p-3 rounded-xl border text-left group ${isDark ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-medium text-sm leading-tight ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                      {getFactorName(selectedFactor)}
                    </span>
                    <RotateCcw className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  {selectedFactor.is_public === false && (
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Expert</span>
                  )}
                </button>
              </div>
            )}

            {selectedFactor && <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />}

            {/* Category picker */}
            {selectedFactor && pendingCategoryChoice && pendingCategoryChoice.length > 1 && (
              <div data-testid="category-picker">
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.category')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {pendingCategoryChoice.map(cat => {
                    const isSelected = effectiveCategory?.code === cat.code;
                    const scopeLabel = scopeColors[cat.scope]?.label || cat.scope;
                    return (
                      <button key={cat.code} type="button" onClick={() => setResolvedCategory(cat)}
                        data-testid={`category-choice-${cat.code}`}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? (isDark ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-blue-400 bg-blue-50 text-blue-700')
                            : (isDark ? 'border-slate-600 hover:border-slate-500 text-slate-400' : 'border-gray-200 hover:border-gray-300 text-gray-600')
                        }`}>
                        <span>{language === 'fr' ? (cat.name_fr || cat.code) : (cat.name_de || cat.code)}</span>
                        <span className="ml-1.5 opacity-60">({scopeLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Quantity */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.step4')}
                </label>
                <div className="relative">
                  <input type="number" value={quantity || ''} onChange={(e) => setQuantity(e.target.value)}
                    data-testid="quantity-input" required step="any" autoFocus={step >= 4}
                    className={`w-full px-4 py-3 pr-16 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`} placeholder="0" />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getUnitLabel(selectedUnit || selectedFactor.default_unit || selectedFactor.input_units?.[0], language)}
                  </span>
                </div>

                {convertedQty && quantity && (
                  <div className={`mt-2 px-3 py-1.5 rounded-lg flex items-center gap-2 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`} data-testid="conversion-indicator">
                    <Info className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>= {convertedQty.value.toFixed(2)} {getUnitLabel(convertedQty.unit, language)}</span>
                  </div>
                )}

                <div className={`mt-3 p-4 rounded-xl ${
                  quantity ? isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                    : isDark ? 'bg-slate-700/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    quantity ? isDark ? 'text-green-400' : 'text-green-600' : isDark ? 'text-slate-600' : 'text-gray-300'
                  }`}>
                    {quantity ? `${(totalEmissions / 1000).toFixed(4)}` : '—'}
                  </span>
                  <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>tCO₂e</span>
                </div>

                {quantity && emissions && emissions.length > 1 && (
                  <div className="mt-2 space-y-1">
                    {emissions.map((e) => {
                      const scopeInfo = scopeColors[e.scope] || { bg: 'bg-gray-500', label: e.scope };
                      return (
                        <div key={e.scope} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${scopeInfo.bg}`}></span>
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{scopeInfo.label}</span>
                          </div>
                          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{(e.emissions / 1000).toFixed(4)} tCO₂e</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {quantity && hasFilteredImpacts && (
                  <div className={`mt-2 p-2 rounded-lg text-xs ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                    {t('guidedEntry.businessRule').replace('{count}', allImpacts.length - (emissions || []).length)}
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('guidedEntry.comment')}
                </label>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2}
                  className={`w-full px-4 py-2 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`} placeholder={t('guidedEntry.commentPlaceholder')} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm transition-all ${
              isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}>
            {t('guidedEntry.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!selectedFactor || !quantity}
            data-testid="submit-entry-btn"
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            {editingActivity ? t('guidedEntry.update') : t('guidedEntry.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
