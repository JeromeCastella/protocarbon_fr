import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Link2, Unlink, Loader2, Filter, ChevronRight } from 'lucide-react';
import { API_URL as API } from '../../utils/apiConfig';

/**
 * Side panel for linking a market-based factor to a location-based factor.
 * Pre-filters by the same subcategory with option to widen the search.
 */
export default function LocationLinkPanel({
  isOpen,
  onClose,
  factor,         // the market-based factor being linked
  isDark,
  token,
  subcategoriesList,
  onLink,         // (factorId, locationFactorId) => void
  onUnlink,       // (factorId) => void
}) {
  const [query, setQuery] = useState('');
  const [subcatFilter, setSubcatFilter] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Pre-set subcategory filter when factor changes
  useEffect(() => {
    if (factor) {
      setSubcatFilter(factor.subcategory || '');
      setQuery('');
      setResults([]);
      setInitialLoaded(false);
    }
  }, [factor?.id]);

  // Auto-focus the search input when panel opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Fetch results
  const fetchResults = useCallback(async (searchQuery, subcat) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (searchQuery && searchQuery.length >= 2) params.set('q', searchQuery);
      if (subcat) params.set('subcategory', subcat);

      const res = await fetch(`${API}/api/curation/factors/search-location?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setInitialLoaded(true);
  }, [token]);

  // Initial load with subcategory pre-filter
  useEffect(() => {
    if (isOpen && factor && !initialLoaded) {
      fetchResults('', factor.subcategory || '');
    }
  }, [isOpen, factor, initialLoaded, fetchResults]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || !initialLoaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, subcatFilter);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, subcatFilter, isOpen, initialLoaded, fetchResults]);

  if (!isOpen || !factor) return null;

  const factorDisplayName = factor.name_simple_fr || factor.name_fr || factor.id;
  const linkedId = factor.location_factor_id;
  const linkedName = factor._locationName;

  const handleSelect = (locFactor) => {
    onLink(factor.id, locFactor.id);
    onClose();
  };

  const handleUnlink = () => {
    onUnlink(factor.id);
    onClose();
  };

  const formatImpact = (impacts) => {
    if (!impacts || !impacts.length) return '—';
    const imp = impacts[0];
    if (imp.value < 0.001) return `${imp.value.toExponential(2)} ${imp.unit}`;
    return `${imp.value.toFixed(4)} ${imp.unit}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        data-testid="location-panel-backdrop"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${isDark ? 'bg-slate-900 border-l border-slate-700' : 'bg-white border-l border-gray-200'}`}
        data-testid="location-link-panel"
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-500" />
              <h2 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Lier un facteur location
              </h2>
            </div>
            <button
              onClick={onClose}
              data-testid="location-panel-close"
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current factor info */}
          <div className={`rounded-lg p-3 mb-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-[10px] uppercase tracking-wider mb-1 ${isDark ? 'text-amber-400/60' : 'text-amber-600/60'}`}>
              Facteur market-based
            </p>
            <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              {factorDisplayName}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/50' : 'text-amber-600/50'}`}>
              {factor.subcategory} · {factor.default_unit || '—'}
            </p>
          </div>

          {/* Current link status */}
          {linkedId && (
            <div className={`rounded-lg p-3 mb-3 flex items-center gap-2 ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
              <Link2 className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-green-400/60' : 'text-green-600/60'}`}>
                  Actuellement lié a
                </p>
                <p className={`text-sm font-medium truncate ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                  {linkedName || linkedId}
                </p>
              </div>
              <button
                onClick={handleUnlink}
                data-testid="unlink-factor-btn"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                  isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                title="Supprimer le lien"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un facteur location..."
              data-testid="location-panel-search"
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm ${
                isDark
                  ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
            />
          </div>

          {/* Subcategory filter */}
          <div className="mt-2 flex items-center gap-2">
            <Filter className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <select
              value={subcatFilter}
              onChange={e => setSubcatFilter(e.target.value)}
              data-testid="location-panel-subcat-filter"
              className={`flex-1 text-xs rounded-lg border py-1.5 px-2 ${
                isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <option value="">Toutes sous-categories</option>
              {subcategoriesList.map(sc => (
                <option key={sc.code} value={sc.code}>{sc.name_fr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-3 py-2" data-testid="location-panel-results">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Recherche...</span>
            </div>
          )}

          {!loading && results.length === 0 && initialLoaded && (
            <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun facteur location trouve</p>
              <p className="text-xs mt-1">Essayez d'elargir la recherche ou de changer la sous-categorie</p>
            </div>
          )}

          {!loading && results.map(loc => {
            const locName = loc.name_simple_fr || loc.name_fr || loc.id;
            const isCurrentlyLinked = linkedId === loc.id;
            return (
              <button
                key={loc.id}
                onClick={() => !isCurrentlyLinked && handleSelect(loc)}
                disabled={isCurrentlyLinked}
                data-testid={`location-result-${loc.id}`}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1.5 border transition-all ${
                  isCurrentlyLinked
                    ? isDark
                      ? 'bg-green-500/10 border-green-500/20 cursor-default'
                      : 'bg-green-50 border-green-200 cursor-default'
                    : isDark
                      ? 'border-slate-700/50 hover:border-blue-500/40 hover:bg-blue-500/5 active:bg-blue-500/10'
                      : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 active:bg-blue-100/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <ChevronRight className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                    isCurrentlyLinked
                      ? 'text-green-500'
                      : isDark ? 'text-slate-600' : 'text-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isCurrentlyLinked
                        ? isDark ? 'text-green-400' : 'text-green-700'
                        : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {locName}
                    </p>
                    {loc.name_simple_fr && loc.name_fr && loc.name_simple_fr !== loc.name_fr && (
                      <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {loc.name_fr}
                      </p>
                    )}
                    <div className={`flex items-center gap-2 mt-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                        {loc.subcategory}
                      </span>
                      <span>{loc.default_unit || '—'}</span>
                      <span className="font-mono">{formatImpact(loc.impacts)}</span>
                      {loc.is_public && (
                        <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                          public
                        </span>
                      )}
                      {isCurrentlyLinked && (
                        <span className={`px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                          lie
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
            {results.length} resultat(s) · Cliquez pour lier
          </p>
        </div>
      </div>
    </>
  );
}
