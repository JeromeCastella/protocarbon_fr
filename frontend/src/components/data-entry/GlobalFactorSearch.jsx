import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import Fuse from 'fuse.js';
import logger from '../../utils/logger';
import { API_URL } from '../../utils/apiConfig';

const normalize = (str) => typeof str === 'string' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;

const FUSE_OPTIONS = {
  keys: [
    { name: 'name_simple_fr', weight: 4 },
    { name: 'name_simple_de', weight: 4 },
    { name: 'name_fr', weight: 2 },
    { name: 'name_de', weight: 2 },
    { name: 'category_names_fr', weight: 2 },
    { name: 'category_names_de', weight: 2 },
    { name: 'source_product_name', weight: 1.5 },
    { name: 'subcategory', weight: 1.5 },
    { name: 'tags', weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  getFn: (obj, path) => {
    const val = Fuse.config.getFn(obj, path);
    if (Array.isArray(val)) return val.map(v => normalize(v));
    return normalize(val);
  },
};

const GlobalFactorSearch = ({ isDark, showExpertFactors, onToggleExpert, onSelectFactor }) => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allFactors, setAllFactors] = useState(null);
  const [fuseAll, setFuseAll] = useState(null);
  const [fusePublic, setFusePublic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadFactors = async () => {
    if (allFactors || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emission-factors/search-index`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllFactors(data);
      setFuseAll(new Fuse(data, FUSE_OPTIONS));
      setFusePublic(new Fuse(data.filter(f => f.is_public), FUSE_OPTIONS));
    } catch (err) {
      logger.error('Failed to load search index:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const fuseIndex = showExpertFactors ? fuseAll : fusePublic;
    if (!query || query.length < 2 || !fuseIndex) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      const raw = fuseIndex.search(normalize(query), { limit: 300 });
      const diversified = [];
      const subCounts = {};
      for (const r of raw) {
        const sub = r.item.subcategory || '_other';
        subCounts[sub] = (subCounts[sub] || 0) + 1;
        if (subCounts[sub] <= 3) diversified.push(r);
        if (diversified.length >= 20) break;
      }
      setResults(diversified);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fuseAll, fusePublic, showExpertFactors]);

  const handleSelect = (factor) => { setQuery(''); setResults([]); setIsFocused(false); onSelectFactor(factor); };

  const getDisplayName = (f) => {
    if (language === 'fr') return f.name_simple_fr || f.name_fr || f.source_product_name || '—';
    return f.name_simple_de || f.name_de || f.source_product_name || '—';
  };

  const getImpactText = (f) => {
    if (!f.impact) return '';
    const v = f.impact.value;
    if (v == null) return '';
    return `${v >= 0.01 ? v.toFixed(4) : v.toExponential(2)} ${f.impact.unit || ''}`;
  };

  return (
    <div ref={containerRef} className="relative" data-testid="global-factor-search">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        isFocused
          ? (isDark ? 'border-blue-500 bg-slate-800 ring-2 ring-blue-500/20' : 'border-blue-400 bg-white ring-2 ring-blue-400/20')
          : (isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white')
      }`}>
        <Search className={`w-5 h-5 flex-shrink-0 ${isFocused ? 'text-blue-500' : (isDark ? 'text-slate-500' : 'text-gray-400')}`} />
        <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => { setIsFocused(true); loadFactors(); }}
          placeholder={t('dataEntry.globalSearchPlaceholder')}
          className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
          data-testid="global-search-input" />
        {isLoading && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pl-2 border-l border-slate-600/30">
          <button onClick={onToggleExpert} data-testid="expert-toggle-btn"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              showExpertFactors ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                : (isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
            }`}>
            <Sparkles className="w-3 h-3" />{language === 'fr' ? 'Expert' : 'Experte'}
            <div className={`w-6 h-3.5 rounded-full transition-colors ${showExpertFactors ? 'bg-amber-500' : (isDark ? 'bg-slate-600' : 'bg-gray-300')}`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${showExpertFactors ? 'translate-x-3' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFocused && (query.length >= 2 || isLoading) && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
            data-testid="search-results-dropdown">
            {isLoading ? (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />{t('dataEntry.loadingIndex')}
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {language === 'fr'
                  ? `Aucun résultat pour "${query}"${!showExpertFactors ? ' — Activez le mode Expert pour élargir la recherche' : ''}`
                  : `Keine Ergebnisse für "${query}"${!showExpertFactors ? ' — Expertenmodus aktivieren für erweiterte Suche' : ''}`}
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((r, idx) => {
                  const f = r.item;
                  return (
                    <button key={f.id} onClick={() => handleSelect(f)} data-testid={`search-result-${idx}`}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0 ${isDark ? 'border-slate-700/50 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-blue-50/50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{getDisplayName(f)}</p>
                          {!f.is_public && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Expert</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{f.subcategory || f.category}</span>
                          {f.default_unit && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{f.default_unit}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{getImpactText(f)}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalFactorSearch;
