import React, { useState } from 'react';
import { Save, Loader2, CopyPlus, Languages } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const BulkActionsBar = ({ selectedIds, isDark, onClearSelection, onBulkAction, loading, subcategoriesList, onCopyOriginals, onTranslate }) => {
  const { t } = useLanguage();
  const [bulkField, setBulkField] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  if (selectedIds.length === 0) return null;

  const handleApply = () => {
    if (!bulkField) return;
    let value = bulkValue;
    if (bulkField === 'is_public') value = bulkValue === 'true';
    if (bulkField === 'popularity_score') value = parseInt(bulkValue) || 50;
    onBulkAction({ [bulkField]: value });
    setBulkField('');
    setBulkValue('');
  };

  return (
    <div className={`sticky top-0 z-20 px-4 py-2 flex items-center gap-3 border-b ${
      isDark ? 'bg-blue-900/30 border-blue-500/30' : 'bg-blue-50 border-blue-200'
    }`}>
      <span className="text-sm font-medium text-blue-500">{selectedIds.length} {t('curation.bulk.selected')}</span>
      <button onClick={onClearSelection} className="text-xs text-blue-400 hover:text-blue-300">{t('curation.bulk.deselect')}</button>
      <div className="flex-1" />

      <select
        value={bulkField}
        onChange={e => { setBulkField(e.target.value); setBulkValue(''); }}
        className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
      >
        <option value="">{t('curation.bulk.bulkAction')}</option>
        <option value="curation_status">{t('curation.bulk.curationStatus')}</option>
        <option value="is_public">{t('curation.bulk.publicExpert')}</option>
        <option value="popularity_score">{t('curation.bulk.popularityScore')}</option>
        <option value="subcategory">{t('curation.bulk.subcategory')}</option>
        <option value="reporting_method">{t('curation.bulk.reportingMethod')}</option>
      </select>

      {bulkField === 'curation_status' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{t('curation.bulk.choose')}</option>
          <option value="reviewed">{t('curation.bulk.treated')}</option>
          <option value="flagged">{t('curation.bulk.flaggedLabel')}</option>
          <option value="untreated">{t('curation.bulk.untreated')}</option>
        </select>
      )}
      {bulkField === 'is_public' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{t('curation.bulk.choose')}</option>
          <option value="true">{t('curation.bulk.publicLabel')}</option>
          <option value="false">{t('curation.bulk.expertLabel')}</option>
        </select>
      )}
      {bulkField === 'popularity_score' && (
        <input type="number" min={0} max={100} placeholder={t('curation.bulk.scorePlaceholder')} value={bulkValue}
          onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border w-24 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
        />
      )}
      {bulkField === 'subcategory' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border max-w-[200px] ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{t('curation.bulk.choose')}</option>
          {subcategoriesList.map(sc => (
            <option key={sc.code} value={sc.code}>{sc.name_fr}</option>
          ))}
        </select>
      )}
      {bulkField === 'reporting_method' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">{t('curation.bulk.choose')}</option>
          <option value="location">Location</option>
          <option value="market">Market</option>
        </select>
      )}

      {bulkField && bulkValue && (
        <button onClick={handleApply} disabled={loading}
          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {t('curation.bulk.apply')}
        </button>
      )}

      <div className={`mx-1 h-6 w-px ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />

      <button onClick={() => onCopyOriginals('fr', 'original')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
        data-testid="copy-originals-fr-btn" title="Copier name_fr -> name_simple_fr (cellules vides uniquement)">
        <CopyPlus className="w-3 h-3" /> {t('curation.bulk.origToFr')}
      </button>
      <button onClick={() => onCopyOriginals('de', 'original')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
        data-testid="copy-originals-de-btn" title="Copier name_de -> name_simple_de (cellules vides uniquement)">
        <CopyPlus className="w-3 h-3" /> {t('curation.bulk.origToDe')}
      </button>
      <button onClick={() => onCopyOriginals('fr', 'source_product_name')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
        data-testid="copy-source-fr-btn" title="Copier source_product_name -> name_simple_fr (cellules vides uniquement)">
        <CopyPlus className="w-3 h-3" /> {t('curation.bulk.sourceToFr')}
      </button>
      <button onClick={() => onCopyOriginals('de', 'source_product_name')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
        data-testid="copy-source-de-btn" title="Copier source_product_name -> name_simple_de (cellules vides uniquement)">
        <CopyPlus className="w-3 h-3" /> {t('curation.bulk.sourceToDe')}
      </button>

      <div className={`mx-1 h-6 w-px ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />

      <button onClick={() => onTranslate('source_to_fr')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
        data-testid="translate-source-fr-btn" title="Traduire source_product_name -> FR simplifie (IA)">
        <Languages className="w-3 h-3" /> {t('curation.bulk.sourceTransFr')}
      </button>
      <button onClick={() => onTranslate('source_to_de')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
        data-testid="translate-source-de-btn" title="Traduire source_product_name -> DE simplifie (IA)">
        <Languages className="w-3 h-3" /> {t('curation.bulk.sourceTransDe')}
      </button>
      <button onClick={() => onTranslate('fr_to_de')} disabled={loading}
        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'}`}
        data-testid="translate-fr-de-btn" title="Traduire les noms simplifies FR -> DE (IA)">
        <Languages className="w-3 h-3" /> {t('curation.bulk.translateFrDe')}
      </button>
    </div>
  );
};

export default BulkActionsBar;
