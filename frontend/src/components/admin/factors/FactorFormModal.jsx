import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Check, Tag, Layers, FlaskConical,
  ChevronDown, ChevronUp, MapPin
} from 'lucide-react';
import { COMMON_UNITS } from '../../../hooks/useAdminData';
import { IMPACT_TYPES_CONFIG } from '../../../hooks/useAdminFactors';

const FactorFormModal = ({
  show, onClose,
  editingFactor,
  factorForm, setFactorForm,
  showAdvanced, setShowAdvanced,
  subcategories,
  onSubcategoryChange, onUpdateImpact,
  onAddInputUnit, onRemoveInputUnit,
  getLinkedCategories, getCategoriesForImpactType,
  onSave
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const isValid = (factorForm.name_simple_fr || factorForm.name_fr) &&
    factorForm.subcategory &&
    factorForm.impacts.length > 0 &&
    !factorForm.impacts.some(i => !i.value || !i.category || !i.unit);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-3xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  {editingFactor ? t('admin.factors.edit') : t('admin.factors.new')}
                </h3>
                <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Simplified names */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Noms affichés dans l'application</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom simplifié FR</label>
                    <input
                      type="text"
                      data-testid="input-name-simple-fr"
                      value={factorForm.name_simple_fr}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, name_simple_fr: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Diesel — Véhicules légers"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom simplifié DE</label>
                    <input
                      type="text"
                      data-testid="input-name-simple-de"
                      value={factorForm.name_simple_de}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, name_simple_de: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Diesel — Leichte Fahrzeuge"
                    />
                  </div>
                </div>
              </div>

              {/* Source BAFU */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom source BAFU (ecoinvent)</label>
                <input
                  type="text"
                  data-testid="input-source-product-name"
                  value={factorForm.source_product_name}
                  onChange={(e) => setFactorForm(prev => ({ ...prev, source_product_name: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  placeholder="Light fuel oil, burned in boiler 100kW condensing {CH} MJ"
                />
              </div>

              {/* Technical names (collapsible) */}
              <div className={`rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span>Noms techniques (import) {factorForm.name_fr && <span className={`ml-2 font-normal ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>— {factorForm.name_fr.substring(0, 40)}{factorForm.name_fr.length > 40 ? '…' : ''}</span>}</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('admin.factors.nameFr')} *</label>
                      <input
                        type="text"
                        data-testid="input-name-fr"
                        value={factorForm.name_fr}
                        onChange={(e) => setFactorForm(prev => ({ ...prev, name_fr: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="Mazout (combustion) — FR"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('admin.factors.nameDe')} *</label>
                      <input
                        type="text"
                        data-testid="input-name-de"
                        value={factorForm.name_de}
                        onChange={(e) => setFactorForm(prev => ({ ...prev, name_de: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="Heizölverbrennung — FR"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Subcategory & Default Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Sous-catégorie *</label>
                  <select
                    value={factorForm.subcategory}
                    onChange={(e) => onSubcategoryChange(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="">Sélectionner...</option>
                    {subcategories.map(s => (
                      <option key={s.code} value={s.code}>{s.name_fr} ({s.code})</option>
                    ))}
                  </select>
                  {factorForm.subcategory && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Catégories liées: {getLinkedCategories().join(', ') || 'aucune'}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unité par défaut</label>
                  <select
                    value={factorForm.default_unit}
                    onChange={(e) => setFactorForm(prev => ({ ...prev, default_unit: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="">Sélectionner...</option>
                    {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Reporting method & Popularity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <MapPin className="w-4 h-4 inline mr-1" />Méthode de reporting
                  </label>
                  <select
                    data-testid="select-reporting-method"
                    value={factorForm.reporting_method}
                    onChange={(e) => setFactorForm(prev => ({ ...prev, reporting_method: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="">Non défini</option>
                    <option value="location">Location-based</option>
                    <option value="market">Market-based</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Popularité ({factorForm.popularity_score})
                  </label>
                  <input
                    type="range"
                    data-testid="input-popularity"
                    min="0"
                    max="100"
                    value={factorForm.popularity_score}
                    onChange={(e) => setFactorForm(prev => ({ ...prev, popularity_score: parseInt(e.target.value) }))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className={`flex justify-between text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    <span>Rare</span>
                    <span>Courant</span>
                  </div>
                </div>
              </div>

              {/* Input Units */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unités d'entrée acceptées</label>
                <div className="space-y-2">
                  {factorForm.input_units.map((unit, i) => (
                    <div key={`unit-${i}-${unit}`} className="flex items-center gap-2">
                      <select
                        value={unit}
                        onChange={(e) => setFactorForm(prev => ({
                          ...prev,
                          input_units: prev.input_units.map((u, idx) => idx === i ? e.target.value : u)
                        }))}
                        className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      >
                        <option value="">Sélectionner...</option>
                        {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {factorForm.input_units.length > 1 && (
                        <button onClick={() => onRemoveInputUnit(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={onAddInputUnit} className="text-sm text-blue-500 hover:underline">+ Ajouter une unité</button>
                </div>
              </div>

              {/* Impacts */}
              <ImpactsSection
                factorForm={factorForm}
                onUpdateImpact={onUpdateImpact}
                getCategoriesForImpactType={getCategoriesForImpactType}
              />

              {/* Tags & Metadata */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Tag className="w-4 h-4 inline mr-1" />Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={factorForm.tags}
                    onChange={(e) => setFactorForm(prev => ({ ...prev, tags: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    placeholder="diesel, transport, véhicule"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Source</label>
                  <input type="text" value={factorForm.source} onChange={(e) => setFactorForm(prev => ({ ...prev, source: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Région</label>
                  <input type="text" value={factorForm.region} onChange={(e) => setFactorForm(prev => ({ ...prev, region: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année</label>
                  <input type="number" value={factorForm.year} onChange={(e) => setFactorForm(prev => ({ ...prev, year: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                </div>
              </div>

              {/* Expert toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                !factorForm.is_public
                  ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  : isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <FlaskConical className={`w-5 h-5 ${!factorForm.is_public ? 'text-amber-500' : isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <div>
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                      {t('admin.factors.expertFactor')}
                    </span>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {t('admin.factors.expertFactorDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="toggle-is-public"
                  onClick={() => setFactorForm(prev => ({ ...prev, is_public: !prev.is_public }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !factorForm.is_public ? 'bg-amber-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    !factorForm.is_public ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex gap-3">
                <button onClick={onClose} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  Annuler
                </button>
                <button
                  onClick={onSave}
                  disabled={!isValid}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {editingFactor ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* Sub-component for the impacts section inside the form */
const ImpactsSection = ({ factorForm, onUpdateImpact, getCategoriesForImpactType }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const colorClasses = {
    scope1: 'border-blue-500/50 bg-blue-500/5',
    scope2: 'border-cyan-500/50 bg-cyan-500/5',
    scope3_3: 'border-amber-500/50 bg-amber-500/5',
    scope3: 'border-purple-500/50 bg-purple-500/5'
  };
  const headerColors = {
    scope1: 'bg-blue-500',
    scope2: 'bg-cyan-500',
    scope3_3: 'bg-amber-500',
    scope3: 'bg-purple-500'
  };

  return (
    <div>
      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        Impacts par scope
        {factorForm.subcategory && (
          <span className="ml-2 text-purple-500 font-normal">
            <Sparkles className="w-4 h-4 inline" /> {factorForm.impacts.length} impact(s) requis
          </span>
        )}
      </label>

      {!factorForm.subcategory ? (
        <div className={`p-6 rounded-xl border-2 border-dashed text-center ${isDark ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Sélectionnez d'abord une sous-catégorie</p>
          <p className="text-xs mt-1">Les impacts seront générés automatiquement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {factorForm.impacts.map((impact) => {
            const config = IMPACT_TYPES_CONFIG.find(c => c.key === impact.impactKey);
            const availableCats = getCategoriesForImpactType(impact.impactKey);

            return (
              <div key={impact.impactKey} className={`rounded-xl border-2 overflow-hidden ${colorClasses[impact.impactKey] || 'border-gray-300'}`}>
                <div className={`px-4 py-2 ${headerColors[impact.impactKey] || 'bg-gray-500'} text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{config ? t(config.labelKey) : impact.impactKey}</span>
                    <span className="text-xs opacity-80">{config ? t(config.descKey) : ''}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Catégorie *</label>
                      {impact.impactKey === 'scope3_3' ? (
                        <div className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                          Activités combustibles/énergie (3.3)
                        </div>
                      ) : (
                        <select
                          value={impact.category}
                          onChange={(e) => onUpdateImpact(impact.impactKey, 'category', e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        >
                          <option value="">Sélectionner...</option>
                          {availableCats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Valeur (kgCO2e) *</label>
                      <input
                        type="number"
                        step="any"
                        value={impact.value === '0' ? '' : impact.value}
                        onChange={(e) => onUpdateImpact(impact.impactKey, 'value', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="ex: 2.68"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Unité complète *</label>
                      <input
                        type="text"
                        value={impact.unit}
                        onChange={(e) => onUpdateImpact(impact.impactKey, 'unit', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="ex: kgCO2e/L"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FactorFormModal;
