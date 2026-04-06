import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL as API } from '../utils/apiConfig';

export const useCurationWorkbench = () => {
  const { t } = useLanguage();

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
  const [reportingMethodFilter, setReportingMethodFilter] = useState('');
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
  const [copyLoading, setCopyLoading] = useState(false);
  const [translateModal, setTranslateModal] = useState(null);
  const [linkPanelFactor, setLinkPanelFactor] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchDebounced, subcategory, curationStatus, isPublic, defaultUnit, reportingMethodFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/curation/stats`);
      setStats(res.data);
    } catch (e) { logger.error(e); }
  }, []);

  const fetchFactors = useCallback(async () => {
    setLoadingFactors(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder });
      if (searchDebounced) params.set('search', searchDebounced);
      if (subcategory) params.set('subcategory', subcategory);
      if (curationStatus) params.set('curation_status', curationStatus);
      if (isPublic) params.set('is_public', isPublic);
      if (defaultUnit) params.set('default_unit', defaultUnit);
      if (reportingMethodFilter) params.set('reporting_method', reportingMethodFilter);

      const res = await axios.get(`${API}/api/curation/factors?${params}`);
      setFactors(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (e) { logger.error(e); }
    setLoadingFactors(false);
  }, [page, pageSize, searchDebounced, subcategory, curationStatus, isPublic, defaultUnit, reportingMethodFilter, sortBy, sortOrder]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchFactors(); }, [fetchFactors]);

  // Load subcategories + units once
  useEffect(() => {
    const fetchAllSubcategories = async () => {
      try {
        const res = await axios.get(`${API}/api/subcategories`);
        setSubcategoriesList(res.data.map(sc => ({ code: sc.code, name_fr: sc.name_fr || sc.code })).sort((a, b) => a.name_fr.localeCompare(b.name_fr)));
      } catch (e) { logger.error(e); }
    };
    const fetchUnits = async () => {
      try {
        const res = await axios.get(`${API}/api/curation/units`);
        setUnitsList(res.data);
      } catch (e) { logger.error(e); }
    };
    fetchAllSubcategories();
    fetchUnits();
  }, []);

  const inlineEdit = useCallback(async (factorId, field, value) => {
    try {
      const res = await axios.patch(`${API}/api/curation/factors/${factorId}`, { [field]: value });
      setFactors(prev => prev.map(f => f.id === factorId ? res.data : f));
      fetchStats();
    } catch (e) { logger.error(e); }
  }, [fetchStats]);

  const handleBulkAction = async (changes) => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/api/curation/bulk-preview`, { factor_ids: selectedIds, changes });
      setBulkPreview(res.data);
      setPendingBulkChanges(changes);
    } catch (e) { logger.error(e); }
    setBulkLoading(false);
  };

  const confirmBulkApply = async () => {
    setBulkLoading(true);
    try {
      await axios.post(`${API}/api/curation/bulk-apply`, { factor_ids: selectedIds, changes: pendingBulkChanges });
      setSelectedIds([]);
      setBulkPreview(null);
      setPendingBulkChanges(null);
      fetchFactors();
      fetchStats();
    } catch (e) { logger.error(e); }
    setBulkLoading(false);
  };

  const handleAISuggestApply = async (suggestions) => {
    setShowAISuggest(false);
    for (const s of suggestions) {
      await inlineEdit(s.factor_id, 'name_simple_fr', s.name_simple_fr);
      await inlineEdit(s.factor_id, 'name_simple_de', s.name_simple_de);
    }
    fetchFactors();
    fetchStats();
  };

  const handleCopyOriginals = async (lang, sourceField = 'original') => {
    setCopyLoading(true);
    try {
      const res = await axios.post(`${API}/api/curation/bulk-copy-originals`, { factor_ids: selectedIds, lang, source_field: sourceField });
      alert(t('curation.alerts.namesCopied').replace('{modified}', res.data.modified_count).replace('{skipped}', res.data.skipped_count));
      fetchFactors();
      fetchStats();
    } catch (e) { logger.error(e); }
    setCopyLoading(false);
  };

  const handleLinkLocation = (factorId, locationFactorId) => inlineEdit(factorId, 'location_factor_id', locationFactorId);
  const handleUnlinkLocation = (factorId) => inlineEdit(factorId, 'location_factor_id', null);

  const handleTranslateApply = (modifiedCount) => {
    setTranslateModal(null);
    alert(t('curation.alerts.translationsApplied').replace('{count}', modifiedCount));
    fetchFactors();
    fetchStats();
  };

  const handleCellNavigate = useCallback((cellId, direction) => {
    const match = cellId.match(/row-(\d+)-col-(\d+)/);
    if (!match) return;
    let rowIdx = parseInt(match[1]);
    let colIdx = parseInt(match[2]);

    if (direction === 'next' || direction === 'down') {
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
      if (factors[rowIdx]) {
        inlineEdit(factors[rowIdx].id, 'curation_status', 'reviewed');
      }
      rowIdx++;
      colIdx = 0;
    }

    if (rowIdx >= 0 && rowIdx < factors.length) {
      const targetId = `row-${rowIdx}-col-${colIdx}`;
      setTimeout(() => {
        const el = document.querySelector(`[data-cell-id="${targetId}"]`);
        if (el) el.click();
      }, 50);
    }
  }, [factors, inlineEdit]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const pageIds = factors.map(f => f.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };
  const allPageSelected = factors.length > 0 && factors.every(f => selectedIds.includes(f.id));

  return {
    stats, factors, total, totalPages,
    page, setPage, search, setSearch, subcategory, setSubcategory,
    curationStatus, setCurationStatus, isPublic, setIsPublic,
    defaultUnit, setDefaultUnit, reportingMethodFilter, setReportingMethodFilter,
    unitsList, sortBy, sortOrder, toggleSort,
    selectedIds, setSelectedIds, toggleSelect, toggleSelectAll, allPageSelected,
    loadingFactors, bulkLoading, copyLoading, bulkPreview, setBulkPreview,
    pendingBulkChanges, setPendingBulkChanges, showAISuggest, setShowAISuggest,
    jsonModalFactor, setJsonModalFactor, subcategoriesList,
    translateModal, setTranslateModal, linkPanelFactor, setLinkPanelFactor,
    inlineEdit, handleBulkAction, confirmBulkApply,
    handleAISuggestApply, handleCopyOriginals,
    handleLinkLocation, handleUnlinkLocation, handleTranslateApply,
    handleCellNavigate, t,
  };
};
