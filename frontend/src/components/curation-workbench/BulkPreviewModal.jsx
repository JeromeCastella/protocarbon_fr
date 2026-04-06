import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const BulkPreviewModal = ({ preview, isDark, onConfirm, onCancel, loading }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`} data-testid="bulk-preview-modal">
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('curation.bulkPreview.title')}</h3>
        <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <strong>{preview.count}</strong> {t('curation.bulkPreview.factorsModified')}
        </p>
        <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
          {Object.entries(preview.changes).map(([k, v]) => (
            <p key={k} className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              <strong>{k}</strong> {'\u2192'} {String(v)}
            </p>
          ))}
        </div>
        <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {t('curation.bulkPreview.examples')} {preview.sample?.map(s => s.name_fr).join(', ')}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100'}`}>{t('common.cancel')}</button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkPreviewModal;
