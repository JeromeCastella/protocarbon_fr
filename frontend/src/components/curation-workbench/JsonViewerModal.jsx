import React from 'react';
import { Code2, Copy, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const JsonViewerModal = ({ factor, isDark, onClose }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} data-testid="json-modal"
        className={`w-full max-w-3xl mx-4 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Code2 className="w-5 h-5 text-blue-500" />
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{factor.name_fr}</h3>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>ID: {factor.id}</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(JSON.stringify(factor, null, 2)); }}
            title={t('curation.link.copyJson')}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {JSON.stringify(factor, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JsonViewerModal;
