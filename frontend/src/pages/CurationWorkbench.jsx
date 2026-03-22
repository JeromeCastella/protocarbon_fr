import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, X, Filter, CheckSquare, Square, ChevronLeft, ChevronRight,
  BarChart3, Eye, EyeOff, Flag, CheckCircle2, CircleDot, Sparkles,
  ArrowUpDown, ArrowUp, ArrowDown, Layers, Save, Loader2, Code2, Copy, Check
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ==================== STATS DASHBOARD ====================
const StatsDashboard = ({ stats, isDark, onSubcategoryClick, activeSubcategory }) => {
  if (!stats) return null;
  const g = stats.global;
  return (
    <div className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      {/* Global progress */}
      <div className="px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Progression globale
          </span>
        </div>
        <div className="flex-1 flex items-center gap-3">
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${g.progress_pct}%` }} />
          </div>
          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {g.reviewed}/{g.total} ({g.progress_pct}%)
          </span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{g.reviewed} traités</span>
          <span className="flex items-center gap-1"><Flag className="w-3 h-3 text-amber-500" />{g.flagged} signalés</span>
          <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-slate-400" />{g.untreated} restants</span>
        </div>
      </div>

      {/* Subcategory filter chips */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
        <button
          onClick={() => onSubcategoryClick('')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            !activeSubcategory
              ? 'bg-blue-500 text-white'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous ({g.total})
        </button>
        {stats.by_subcategory.map(sc => (
          <button
            key={sc.subcategory}
            onClick={() => onSubcategoryClick(sc.subcategory)}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all flex items-center gap-1 ${
              activeSubcategory === sc.subcategory
                ? 'bg-blue-500 text-white'
                : isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {sc.name_fr}
            <span className={`font-mono ${activeSubcategory === sc.subcategory ? 'text-blue-200' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {sc.reviewed}/{sc.total}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==================== BULK ACTIONS BAR ====================
const BulkActionsBar = ({ selectedIds, isDark, onClearSelection, onBulkAction, loading, subcategoriesList }) => {
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
      <span className="text-sm font-medium text-blue-500">{selectedIds.length} sélectionné(s)</span>
      <button onClick={onClearSelection} className="text-xs text-blue-400 hover:text-blue-300">Désélectionner</button>
      <div className="flex-1" />

      <select
        value={bulkField}
        onChange={e => { setBulkField(e.target.value); setBulkValue(''); }}
        className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
      >
        <option value="">Action en masse...</option>
        <option value="curation_status">Statut de curation</option>
        <option value="is_public">Public / Expert</option>
        <option value="popularity_score">Score de popularité</option>
        <option value="subcategory">Sous-catégorie</option>
      </select>

      {bulkField === 'curation_status' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Choisir...</option>
          <option value="reviewed">Traité</option>
          <option value="flagged">Signalé</option>
          <option value="untreated">Non traité</option>
        </select>
      )}
      {bulkField === 'is_public' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Choisir...</option>
          <option value="true">Public</option>
          <option value="false">Expert</option>
        </select>
      )}
      {bulkField === 'popularity_score' && (
        <input type="number" min={0} max={100} placeholder="Score (0-100)" value={bulkValue}
          onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border w-24 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
        />
      )}
      {bulkField === 'subcategory' && (
        <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
          className={`text-xs rounded-lg px-2 py-1.5 border max-w-[200px] ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Choisir...</option>
          {subcategoriesList.map(sc => (
            <option key={sc.code} value={sc.code}>{sc.name_fr}</option>
          ))}
        </select>
      )}

      {bulkField && bulkValue && (
        <button onClick={handleApply} disabled={loading}
          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 flex items-center gap-1.5 disabled:opacity-50">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Appliquer
        </button>
      )}
    </div>
  );
};

// ==================== INLINE EDITABLE CELL ====================
const EditableCell = ({ value, onSave, isDark, placeholder = '', className = '', type = 'text', cellId = '', onNavigate }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);
  const committedRef = useRef(false);
  const lastSavedRef = useRef(null);

  // Sync draft from value ONLY when not editing (prevents overwrite during typing)
  useEffect(() => {
    if (!editing) {
      setDraft(value || '');
    }
  }, [value, editing]);

  // Clear optimistic display when API responds (value changes)
  useEffect(() => {
    lastSavedRef.current = null;
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
      committedRef.current = false;
    }
  }, [editing]);

  const commit = (navigateDir) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const currentDraft = draft;
    setEditing(false);
    if (currentDraft !== (value || '')) {
      const saveValue = type === 'number' ? Number(currentDraft) : currentDraft;
      lastSavedRef.current = String(saveValue);
      onSave(saveValue);
    }
    if (navigateDir && onNavigate) onNavigate(cellId, navigateDir);
  };

  // Show optimistic value while API hasn't responded yet
  const displayValue = lastSavedRef.current !== null ? lastSavedRef.current : value;

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        data-cell-id={cellId}
        title="Cliquer pour éditer"
        className={`cursor-text min-h-[24px] ${!displayValue ? `italic ${isDark ? 'text-slate-600' : 'text-gray-300'}` : ''} ${className}`}
      >
        {displayValue || placeholder}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      data-cell-id={cellId}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => commit(null)}
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          commit(e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          commit('mark-reviewed');
        } else if (e.key === 'Enter') {
          commit('down');
        } else if (e.key === 'Escape') {
          setDraft(value || '');
          committedRef.current = true;
          setEditing(false);
        }
      }}
      className={`w-full bg-transparent border-b-2 border-blue-500 outline-none text-xs py-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}
    />
  );
};

// ==================== STATUS BADGE ====================
const StatusBadge = ({ status, isDark, onCycle }) => {
  const configs = {
    reviewed: { icon: CheckCircle2, label: 'Traité', cls: 'text-green-500 bg-green-500/10' },
    flagged: { icon: Flag, label: 'Signalé', cls: 'text-amber-500 bg-amber-500/10' },
    untreated: { icon: CircleDot, label: 'À traiter', cls: isDark ? 'text-slate-500 bg-slate-700' : 'text-gray-400 bg-gray-100' },
  };
  const s = status || 'untreated';
  const c = configs[s] || configs.untreated;
  const Icon = c.icon;
  const next = s === 'untreated' ? 'reviewed' : s === 'reviewed' ? 'flagged' : 'untreated';

  return (
    <button onClick={() => onCycle(next)} title={`Passer à: ${configs[next].label}`}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${c.cls} hover:opacity-80`}>
      <Icon className="w-3 h-3" />{c.label}
    </button>
  );
};

// ==================== AI SUGGEST MODAL ====================
const AISuggestModal = ({ factorIds, isDark, token, onApply, onClose }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${API}/api/curation/suggest-titles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ factor_ids: factorIds }),
        });
        if (!res.ok) throw new Error('Erreur IA');
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
  }, [factorIds, token]);

  const handleApply = () => {
    const toApply = suggestions.filter(s => selected[s.factor_id]);
    onApply(toApply);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Suggestions IA — Titres simplifiés</h3>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /><span className="ml-3 text-sm">Génération en cours...</span></div>}
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
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>Annuler</button>
            <button onClick={handleApply} className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm hover:bg-purple-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />Appliquer {Object.values(selected).filter(Boolean).length} suggestion(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== BULK PREVIEW MODAL ====================
const BulkPreviewModal = ({ preview, isDark, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
    <div onClick={e => e.stopPropagation()} className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`} data-testid="bulk-preview-modal">
      <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Confirmer la modification en masse</h3>
      <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <strong>{preview.count}</strong> facteur(s) seront modifiés :
      </p>
      <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
        {Object.entries(preview.changes).map(([k, v]) => (
          <p key={k} className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            <strong>{k}</strong> → {String(v)}
          </p>
        ))}
      </div>
      <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        Exemples : {preview.sample?.map(s => s.name_fr).join(', ')}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className={`px-4 py-2 rounded-xl text-sm ${isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-100'}`}>Annuler</button>
        <button onClick={onConfirm} disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Confirmer
        </button>
      </div>
    </div>
  </div>
);

// ==================== MAIN CURATION PAGE ====================
export default function CurationWorkbench() {
  const { isDark } = useTheme();
  const { token } = useAuth();

  // Data state
  const [stats, setStats] = useState(null);
  const [factors, setFactors] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [curationStatus, setCurationStatus] = useState('');
  const [isPublic, setIsPublic] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('');
  const [unitsList, setUnitsList] = useState([]);
  const [sortBy, setSortBy] = useState('subcategory');
  const [sortOrder, setSortOrder] = useState('asc');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // UI
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [pendingBulkChanges, setPendingBulkChanges] = useState(null);
  const [showAISuggest, setShowAISuggest] = useState(false);
  const [jsonModalFactor, setJsonModalFactor] = useState(null);
  const [subcategoriesList, setSubcategoriesList] = useState([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchDebounced, subcategory, curationStatus, isPublic, defaultUnit]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/curation/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch factors
  const fetchFactors = useCallback(async () => {
    setLoadingFactors(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder });
      if (searchDebounced) params.set('search', searchDebounced);
      if (subcategory) params.set('subcategory', subcategory);
      if (curationStatus) params.set('curation_status', curationStatus);
      if (isPublic) params.set('is_public', isPublic);
      if (defaultUnit) params.set('default_unit', defaultUnit);

      const res = await fetch(`${API}/api/curation/factors?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFactors(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      }
    } catch (e) { console.error(e); }
    setLoadingFactors(false);
  }, [token, page, pageSize, searchDebounced, subcategory, curationStatus, isPublic, defaultUnit, sortBy, sortOrder]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchFactors(); }, [fetchFactors]);

  // Extract subcategories list from stats for dropdown
  useEffect(() => {
    const fetchAllSubcategories = async () => {
      try {
        const res = await fetch(`${API}/api/subcategories`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setSubcategoriesList(data.map(sc => ({ code: sc.code, name_fr: sc.name_fr || sc.code })).sort((a, b) => a.name_fr.localeCompare(b.name_fr)));
        }
      } catch (e) { console.error(e); }
    };
    const fetchUnits = async () => {
      try {
        const res = await fetch(`${API}/api/curation/units`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setUnitsList(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchAllSubcategories();
    fetchUnits();
  }, [token]);

  // Inline edit
  const inlineEdit = async (factorId, field, value) => {
    try {
      const res = await fetch(`${API}/api/curation/factors/${factorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFactors(prev => prev.map(f => f.id === factorId ? updated : f));
        fetchStats();
      }
    } catch (e) { console.error(e); }
  };

  // Bulk action
  const handleBulkAction = async (changes) => {
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/api/curation/bulk-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ factor_ids: selectedIds, changes }),
      });
      if (res.ok) {
        const preview = await res.json();
        setBulkPreview(preview);
        setPendingBulkChanges(changes);
      }
    } catch (e) { console.error(e); }
    setBulkLoading(false);
  };

  const confirmBulkApply = async () => {
    setBulkLoading(true);
    try {
      await fetch(`${API}/api/curation/bulk-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ factor_ids: selectedIds, changes: pendingBulkChanges }),
      });
      setSelectedIds([]);
      setBulkPreview(null);
      setPendingBulkChanges(null);
      fetchFactors();
      fetchStats();
    } catch (e) { console.error(e); }
    setBulkLoading(false);
  };

  // AI suggest apply
  const handleAISuggestApply = async (suggestions) => {
    setShowAISuggest(false);
    for (const s of suggestions) {
      await inlineEdit(s.factor_id, 'name_simple_fr', s.name_simple_fr);
      await inlineEdit(s.factor_id, 'name_simple_de', s.name_simple_de);
    }
    fetchFactors();
    fetchStats();
  };

  // Cell navigation: cellId format = "row-{idx}-col-{colIdx}" where col 0=FR, 1=DE
  const handleCellNavigate = useCallback((cellId, direction) => {
    const match = cellId.match(/row-(\d+)-col-(\d+)/);
    if (!match) return;
    let rowIdx = parseInt(match[1]);
    let colIdx = parseInt(match[2]);

    if (direction === 'next' || direction === 'down') {
      // Tab: next cell (FR→DE→next row FR) / Enter: same col next row
      if (direction === 'next') {
        colIdx++;
        if (colIdx > 1) { colIdx = 0; rowIdx++; }
      } else {
        rowIdx++;
      }
    } else if (direction === 'prev') {
      colIdx--;
      if (colIdx < 0) { colIdx = 1; rowIdx--; }
    } else if (direction === 'mark-reviewed') {
      // Mark current row as reviewed then move to next row FR
      if (factors[rowIdx]) {
        inlineEdit(factors[rowIdx].id, 'curation_status', 'reviewed');
      }
      rowIdx++;
      colIdx = 0;
    }

    // Focus the target cell
    if (rowIdx >= 0 && rowIdx < factors.length) {
      const targetId = `row-${rowIdx}-col-${colIdx}`;
      setTimeout(() => {
        const el = document.querySelector(`[data-cell-id="${targetId}"]`);
        if (el) el.click();
      }, 50);
    }
  }, [factors, inlineEdit]);

  // Sort toggle
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Selection helpers
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const pageIds = factors.map(f => f.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };
  const allPageSelected = factors.length > 0 && factors.every(f => selectedIds.includes(f.id));

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`} data-testid="curation-workbench">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-4 flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <Layers className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-bold">Atelier de curation</h1>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{total} facteur(s)</span>
        <div className="flex-1" />

        {/* Filters */}
        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="curation-search"
            className={`pl-8 pr-8 py-1.5 rounded-lg border text-xs w-56 ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-300 placeholder:text-gray-400'}`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select value={curationStatus} onChange={e => setCurationStatus(e.target.value)}
          data-testid="filter-curation-status"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Tous statuts</option>
          <option value="untreated">Non traités</option>
          <option value="reviewed">Traités</option>
          <option value="flagged">Signalés</option>
        </select>

        <select value={isPublic} onChange={e => setIsPublic(e.target.value)}
          data-testid="filter-is-public"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Tous</option>
          <option value="true">Publics</option>
          <option value="false">Experts</option>
        </select>

        <select value={defaultUnit} onChange={e => setDefaultUnit(e.target.value)}
          data-testid="filter-unit"
          className={`text-xs rounded-lg px-2 py-1.5 border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}>
          <option value="">Toutes unités</option>
          {unitsList.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        {selectedIds.length > 0 && (
          <button onClick={() => setShowAISuggest(true)} data-testid="ai-suggest-btn"
            className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />IA Titres ({Math.min(selectedIds.length, 20)})
          </button>
        )}
      </div>

      {/* Stats dashboard */}
      <StatsDashboard stats={stats} isDark={isDark} onSubcategoryClick={setSubcategory} activeSubcategory={subcategory} />

      {/* Bulk actions bar */}
      <BulkActionsBar selectedIds={selectedIds} isDark={isDark} onClearSelection={() => setSelectedIds([])} onBulkAction={handleBulkAction} loading={bulkLoading} subcategoriesList={subcategoriesList} />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left" data-testid="curation-table">
          <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <tr className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              <th className="py-2 px-2 w-8">
                <button onClick={toggleSelectAll} data-testid="select-all-btn">
                  {allPageSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5" />}
                </button>
              </th>
              <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('name_fr')}>
                <div className="flex items-center gap-1">Nom original <SortIcon field="name_fr" /></div>
              </th>
              <th className="py-2 px-2">Nom simplifié FR</th>
              <th className="py-2 px-2">Nom simplifié DE</th>
              <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('subcategory')}>
                <div className="flex items-center gap-1">Sous-catégorie <SortIcon field="subcategory" /></div>
              </th>
              <th className="py-2 px-2 cursor-pointer text-center" onClick={() => toggleSort('is_public')}>
                <div className="flex items-center gap-1 justify-center"><Eye className="w-3 h-3" /><SortIcon field="is_public" /></div>
              </th>
              <th className="py-2 px-2 cursor-pointer text-center" onClick={() => toggleSort('popularity_score')}>
                <div className="flex items-center gap-1 justify-center">Pop. <SortIcon field="popularity_score" /></div>
              </th>
              <th className="py-2 px-2">Unité</th>
              <th className="py-2 px-2">Valeur</th>
              <th className="py-2 px-2 cursor-pointer" onClick={() => toggleSort('curation_status')}>
                <div className="flex items-center gap-1">Statut <SortIcon field="curation_status" /></div>
              </th>
              <th className="py-2 px-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loadingFactors ? (
              <tr><td colSpan={11} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
            ) : factors.length === 0 ? (
              <tr><td colSpan={11} className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Aucun facteur trouvé</td></tr>
            ) : factors.map((f, rowIdx) => {
              const isSelected = selectedIds.includes(f.id);
              const nameChanged = f.name_simple_fr && f.name_simple_fr !== f.name_fr;
              const impact = f.impacts?.[0];
              return (
                <tr key={f.id} data-testid={`factor-row-${f.id}`}
                  className={`border-b transition-colors ${
                    isSelected
                      ? isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'
                      : isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-gray-100 hover:bg-gray-50'
                  }`}>
                  <td className="py-1.5 px-2">
                    <button onClick={() => toggleSelect(f.id)}>
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  </td>
                  <td className={`py-1.5 px-2 text-xs max-w-[220px] truncate ${isDark ? 'text-slate-300' : 'text-gray-700'}`} title={f.name_fr}>
                    {f.name_fr}
                  </td>
                  <td className={`py-1.5 px-2 text-xs max-w-[200px] ${nameChanged ? 'font-medium' : ''} ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <EditableCell
                      value={nameChanged ? f.name_simple_fr : ''}
                      placeholder="—"
                      isDark={isDark}
                      onSave={v => inlineEdit(f.id, 'name_simple_fr', v)}
                      cellId={`row-${rowIdx}-col-0`}
                      onNavigate={handleCellNavigate}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-xs max-w-[200px]">
                    <EditableCell
                      value={f.name_simple_de !== f.name_de ? f.name_simple_de : ''}
                      placeholder="—"
                      isDark={isDark}
                      onSave={v => inlineEdit(f.id, 'name_simple_de', v)}
                      cellId={`row-${rowIdx}-col-1`}
                      onNavigate={handleCellNavigate}
                    />
                  </td>
                  <td className={`py-1.5 px-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <select
                      value={f.subcategory || ''}
                      onChange={e => inlineEdit(f.id, 'subcategory', e.target.value)}
                      data-testid={`subcat-select-${f.id}`}
                      className={`w-full text-[11px] rounded border py-0.5 px-1 cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {subcategoriesList.map(sc => (
                        <option key={sc.code} value={sc.code}>{sc.name_fr}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <button onClick={() => inlineEdit(f.id, 'is_public', !f.is_public)}
                      className={`p-1 rounded ${f.is_public ? 'text-green-500' : isDark ? 'text-slate-600' : 'text-gray-300'}`}
                      title={f.is_public ? 'Public' : 'Expert'}>
                      {f.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className={`py-1.5 px-2 text-center font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <EditableCell
                      value={String(f.popularity_score || 0)}
                      isDark={isDark}
                      type="number"
                      onSave={v => inlineEdit(f.id, 'popularity_score', v)}
                      className="text-center w-10 mx-auto"
                    />
                  </td>
                  <td className={`py-1.5 px-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <select
                      value={f.default_unit || ''}
                      onChange={e => inlineEdit(f.id, 'default_unit', e.target.value)}
                      data-testid={`unit-select-${f.id}`}
                      className={`w-full text-[11px] rounded border py-0.5 px-1 cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {unitsList.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className={`py-1.5 px-2 font-mono text-[11px] whitespace-nowrap ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {impact ? `${impact.value < 0.001 ? impact.value.toExponential(2) : impact.value.toFixed(4)} ${impact.unit}` : '—'}
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusBadge status={f.curation_status} isDark={isDark} onCycle={s => inlineEdit(f.id, 'curation_status', s)} />
                  </td>
                  <td className="py-1.5 px-1">
                    <button onClick={() => setJsonModalFactor(f)} title="Voir JSON complet"
                      data-testid={`json-btn-${f.id}`}
                      className={`p-1 rounded transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-700' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}>
                      <Code2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination + keyboard hints */}
      <div className={`px-4 py-2 border-t flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Page {page}/{totalPages} — {total} facteur(s)
          </span>
          <div className={`flex items-center gap-3 text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-300'}`} data-testid="keyboard-hints">
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Tab</kbd> cellule suivante</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Enter</kbd> ligne suivante</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Shift+Enter</kbd> traité + suivant</span>
            <span><kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>Esc</kbd> annuler</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            data-testid="page-prev"
            className={`p-1.5 rounded-lg ${page <= 1 ? 'opacity-30' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="number" value={page} min={1} max={totalPages}
            onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setPage(v); }}
            className={`w-14 text-center text-xs rounded-lg border py-1 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
          />
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            data-testid="page-next"
            className={`p-1.5 rounded-lg ${page >= totalPages ? 'opacity-30' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {bulkPreview && (
        <BulkPreviewModal preview={bulkPreview} isDark={isDark} loading={bulkLoading}
          onConfirm={confirmBulkApply} onCancel={() => { setBulkPreview(null); setPendingBulkChanges(null); }} />
      )}
      {showAISuggest && (
        <AISuggestModal factorIds={selectedIds.slice(0, 20)} isDark={isDark} token={token}
          onApply={handleAISuggestApply} onClose={() => setShowAISuggest(false)} />
      )}

      {/* JSON viewer modal */}
      {jsonModalFactor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setJsonModalFactor(null)}>
          <div onClick={e => e.stopPropagation()} data-testid="json-modal"
            className={`w-full max-w-3xl mx-4 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <Code2 className="w-5 h-5 text-blue-500" />
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{jsonModalFactor.name_fr}</h3>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>ID: {jsonModalFactor.id}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(jsonModalFactor, null, 2)); }}
                title="Copier JSON"
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => setJsonModalFactor(null)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {JSON.stringify(jsonModalFactor, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
