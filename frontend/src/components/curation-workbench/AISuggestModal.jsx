import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { API_URL as API } from '../../utils/apiConfig';

const AISuggestModal = ({ factorIds, isDark, onApply, onClose }) => {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const { token: authToken } = useAuth();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${API}/api/curation/suggest-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ factor_ids: factorIds }),
        });
        if (!res.ok) throw new Error(t('curation.aiSuggest.aiError'));
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        const sel = {};
        (data.suggestions || []).forEach(s => { sel[s.factor_id] = true; });
        setSelected(sel);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [factorIds, authToken, t]);

  const handleApply = () => {
    const toApply = suggestions.filter(s => selected[s.factor_id]);
    onApply(toApply);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('curation.aiSuggest.title')}</h3>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /><span className="ml-3 text-sm">{t('curation.aiSuggest.generating')}</span></div>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!loading && !error && suggestions.map(s => (
            <div key={s.factor_id} className={`mb-3 p-3 rounded-xl border ${selected[s.factor_id] ? isDark ? 'border-purple-500/30 bg-purple-500/5' : 'border-purple-200 bg-purple-50' : isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-start gap-2">
                <button onClick={() => setSelected(p => ({ ...p, [s.factor_id]: !p[s.factor_id] }))}
                  className="mt-0.5 flex-shrink-0">
                  {selected[s.factor_id] ? <CheckSquare className="w-4 h-4 text-purple-500" /> : <Square className="w-4 h-4 text-slate-500" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.name_fr_original}</p>
                  <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>FR: {s.name_simple_fr}</p>
                  <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>DE: {s.name_simple_de}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!loading && !error && suggestions.length > 0 && (
          <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>{t('common.cancel')}</button>
            <button onClick={handleApply} className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm hover:bg-purple-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />{t('curation.aiSuggest.applySuggestions').replace('{count}', Object.values(selected).filter(Boolean).length)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestModal;
