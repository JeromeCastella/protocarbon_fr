import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Languages, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import { API_URL as API } from '../../utils/apiConfig';

const TranslatePreviewModal = ({ factorIds, direction, isDark, onApply, onClose }) => {
  const { t } = useLanguage();
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [targetField, setTargetField] = useState('');
  const [skipped, setSkipped] = useState(0);

  const dirLabels = {
    'fr_to_de': t('curation.translate.frToDe'),
    'de_to_fr': t('curation.translate.deToFr'),
    'source_to_fr': t('curation.translate.sourceToFr'),
    'source_to_de': t('curation.translate.sourceToDe'),
  };
  const dirLabel = dirLabels[direction] || direction;

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const res = await axios.post(`${API}/api/curation/translate-preview`, { factor_ids: factorIds, direction });
        setTranslations(res.data.translations || []);
        setTargetField(res.data.target_field || '');
        setSkipped(res.data.skipped || 0);
        const sel = {};
        (res.data.translations || []).forEach(tr => { sel[tr.factor_id] = true; });
        setSelected(sel);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, [factorIds, direction]);

  const handleApply = async () => {
    const toApply = translations.filter(tr => selected[tr.factor_id]);
    if (toApply.length === 0) return;
    setApplying(true);
    try {
      const res = await axios.post(`${API}/api/curation/translate-apply`, {
        translations: toApply.map(tr => ({ factor_id: tr.factor_id, value: tr.translation })),
        target_field: targetField,
      });
      onApply(res.data.modified_count);
    } catch (err) {
      setError(err.message);
    }
    setApplying(false);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        data-testid="translate-preview-modal">
        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Languages className="w-5 h-5 text-sky-500" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('curation.translate.title')} {dirLabel}</h3>
          {skipped > 0 && <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({skipped} {t('curation.translate.skippedNote')})</span>}
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /><span className="ml-3 text-sm">{t('curation.translate.translating')}</span></div>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!loading && !error && translations.length === 0 && (
            <p className={`text-sm text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('curation.translate.noFactorToTranslate')}
            </p>
          )}
          {!loading && !error && translations.map(tr => (
            <div key={tr.factor_id} className={`mb-3 p-3 rounded-xl border ${selected[tr.factor_id] ? isDark ? 'border-sky-500/30 bg-sky-500/5' : 'border-sky-200 bg-sky-50' : isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-start gap-2">
                <button onClick={() => setSelected(p => ({ ...p, [tr.factor_id]: !p[tr.factor_id] }))}
                  className="mt-0.5 flex-shrink-0">
                  {selected[tr.factor_id] ? <CheckSquare className="w-4 h-4 text-sky-500" /> : <Square className="w-4 h-4 text-slate-500" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Source: {tr.source_name}</p>
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{'\u2192'} {tr.translation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!loading && !error && translations.length > 0 && (
          <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>{t('common.cancel')}</button>
            <button onClick={handleApply} disabled={applying || selectedCount === 0}
              className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm hover:bg-sky-600 disabled:opacity-50 flex items-center gap-2">
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
              {t('curation.translate.applyTranslations').replace('{count}', selectedCount)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslatePreviewModal;
