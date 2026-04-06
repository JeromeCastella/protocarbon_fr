import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';
import {
  PRODUCT_SALE_CATEGORIES, PRODUITS_VENDUS_CARD, normalizeScope,
} from '../components/data-entry/dataEntryConstants';

export const useDataEntry = () => {
  const { t, language } = useLanguage();
  const { currentFiscalYear, fiscalYears } = useFiscalYear();
  const { token } = useAuth();

  const [activeScope, setActiveScope] = useState('scope1');
  const [categories, setCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [excludedCategories, setExcludedCategories] = useState([]);

  const [showTableView, setShowTableView] = useState(false);
  const [tableViewScope, setTableViewScope] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [showProductSaleModal, setShowProductSaleModal] = useState(false);
  const [showScope3AvalChoice, setShowScope3AvalChoice] = useState(false);
  const [showSaleEditModal, setShowSaleEditModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  const [showExpertFactors, setShowExpertFactors] = useState(() => localStorage.getItem('showExpertFactors') === 'true');
  const [preSelectedFactor, setPreSelectedFactor] = useState(null);
  const [showCategory33Message, setShowCategory33Message] = useState(false);

  const toggleExpertFactors = () => {
    setShowExpertFactors(prev => { const next = !prev; localStorage.setItem('showExpertFactors', String(next)); return next; });
  };

  const handleSearchFactorSelect = (factor) => {
    const factorScope = factor.scope || factor.impact?.scope || 'scope1';
    const subcat = allSubcategories.find(s => s.code === factor.subcategory);
    const subcatCategoryCodes = subcat?.categories || [];
    const possibleCategories = subcatCategoryCodes.map(code => categories.find(c => c.code === code)).filter(Boolean);

    if (possibleCategories.length === 1) {
      setSelectedCategory(possibleCategories[0]);
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: null });
    } else if (possibleCategories.length > 1) {
      setSelectedCategory(possibleCategories[0]);
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: possibleCategories });
    } else {
      const fallbackCat = categories.find(c => c.code === factor.category);
      setSelectedCategory(fallbackCat || { code: factor.category || 'unknown', scope: factorScope });
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: null });
    }
    setEditingActivityData(null);
    setShowModal(true);
  };

  const fetchData = useCallback(async () => {
    try {
      const fiscalYearParam = currentFiscalYear?.id ? `&fiscal_year_id=${currentFiscalYear.id}` : '';
      const [categoriesRes, activitiesRes, summaryRes, statsRes, subcatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/activities?limit=500${fiscalYearParam}`),
        axios.get(`${API_URL}/api/dashboard/summary${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`),
        axios.get(`${API_URL}/api/dashboard/category-stats${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`),
        axios.get(`${API_URL}/api/subcategories`),
      ]);
      setCategories(categoriesRes.data || []);
      setAllSubcategories(subcatsRes.data || []);
      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      setActivities(activitiesData);
      setSummary(summaryRes.data);
      setCategoryStats(statsRes.data || {});
      setExcludedCategories(summaryRes.data?.excluded_categories || []);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFiscalYear?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const scopes = [
    { id: 'scope1', name: t('scope.scope1'), subtitle: t('scope.scope1Title'), color: 'bg-blue-500' },
    { id: 'scope2', name: t('scope.scope2'), subtitle: t('scope.scope2Title'), color: 'bg-cyan-500' },
    { id: 'scope3_amont', name: t('scope.scope3Amont'), subtitle: t('scope.scope3AmontTitle'), color: 'bg-purple-500' },
    { id: 'scope3_aval', name: t('scope.scope3Aval'), subtitle: t('scope.scope3AvalTitle'), color: 'bg-indigo-500' },
  ];

  const baseScopeCategories = categories.filter(c =>
    c.scope === activeScope && !excludedCategories.includes(c.code) && !PRODUCT_SALE_CATEGORIES.includes(c.code)
  );

  const scopeCategories = (() => {
    if (activeScope !== 'scope3_aval') return baseScopeCategories;
    const idx = baseScopeCategories.findIndex(c => c.code === 'actifs_loues_aval');
    if (idx !== -1) { const r = [...baseScopeCategories]; r.splice(idx + 1, 0, PRODUITS_VENDUS_CARD); return r; }
    return [...baseScopeCategories, PRODUITS_VENDUS_CARD];
  })();

  const getProductSalesCount = () => {
    const saleIds = new Set();
    let directCount = 0;
    (activities || []).forEach(a => {
      if (PRODUCT_SALE_CATEGORIES.includes(a.category_id)) {
        if (a.sale_id) saleIds.add(a.sale_id);
        else if (!a.group_index || a.group_index === 0) directCount++;
      }
    });
    return saleIds.size + directCount;
  };

  const handleCategoryClick = (category) => {
    if (category.code === 'activites_combustibles_energie') { setShowCategory33Message(true); return; }
    if (category.code === 'produits_vendus' || PRODUCT_SALE_CATEGORIES.includes(category.code)) { setShowScope3AvalChoice(true); return; }
    setSelectedCategory(category);
    setEditingActivityData(null);
    setShowModal(true);
  };

  const handleEditActivityInModal = async (activity) => {
    if (activity.sale_id && activity.product_id) {
      setEditingSaleId(activity.sale_id);
      setEditingProductId(activity.product_id);
      setShowSaleEditModal(true);
      return;
    }
    let activityToEdit = activity;
    if (activity.group_id && activity.group_index > 0) {
      try {
        const response = await axios.get(`${API_URL}/api/activities/groups/${activity.group_id}`);
        const main = response.data.activities.find(a => a.group_index === 0);
        if (main) activityToEdit = { ...main, _groupActivities: response.data.activities };
      } catch (error) { logger.error('Failed to load activity group:', error); }
    }
    const categoryCode = activityToEdit.entry_category || activityToEdit.category_id;
    const category = categories.find(c => c.code === categoryCode);
    if (!category) return;
    setSelectedCategory(category);
    setEditingActivityData(activityToEdit);
    setShowTableView(false);
    setShowModal(true);
  };

  const handleActivitySubmit = async (activityData) => {
    try {
      const dataWithFiscalYear = { ...activityData, fiscal_year_id: currentFiscalYear?.id };
      if (editingActivityData) {
        const groupId = editingActivityData.group_id;
        if (groupId) await axios.put(`${API_URL}/api/activities/groups/${groupId}`, dataWithFiscalYear);
        else await axios.put(`${API_URL}/api/activities/${editingActivityData.id}`, dataWithFiscalYear);
      } else {
        const response = await axios.post(`${API_URL}/api/activities`, dataWithFiscalYear);
        if (response.data.count > 1) logger.log(`Cree ${response.data.count} activites (groupe ${response.data.group_id})`);
      }
      fetchData();
    } catch (error) {
      logger.error('Failed to save activity:', error);
      if (error.response?.data?.detail) alert(error.response.data.detail);
    }
  };

  const openTableView = (scope) => { setTableViewScope(scope); setShowTableView(true); };
  const openFullTableView = () => { setTableViewScope(null); setShowTableView(true); };

  const getScopeActivities = (scope) => {
    const list = scope === null ? [...activities] : activities.filter(a => normalizeScope(a.scope, a.category_id) === scope);
    return list.sort((a, b) => (b.emissions || 0) - (a.emissions || 0));
  };

  const handleDeleteActivity = async (activity) => {
    const performDelete = async () => {
      try {
        if (activity.group_id && activity.group_size > 1) await axios.delete(`${API_URL}/api/activities/groups/${activity.group_id}`);
        else await axios.delete(`${API_URL}/api/activities/${activity.id}`);
        fetchData();
      } catch (error) { logger.error('Failed to delete activity:', error); }
    };
    if (activity.group_id && activity.group_size > 1) {
      setConfirmDialog({ isOpen: true, title: t('dataEntry.deleteGroup'), message: `Cette saisie contient ${activity.group_size} impacts lies. Voulez-vous supprimer les ${activity.group_size} activites ?`, onConfirm: performDelete });
    } else { await performDelete(); }
  };

  const handleUpdateActivity = async (activityId, updates) => {
    try {
      await axios.put(`${API_URL}/api/activities/${activityId}`, updates);
      setEditingActivity(null);
      fetchData();
    } catch (error) { logger.error('Failed to update activity:', error); }
  };

  const getCategoryName = (categoryCode) => {
    const cat = categories.find(c => c.code === categoryCode);
    return cat ? (language === 'fr' ? cat.name_fr : cat.name_de) : categoryCode;
  };

  const scopeLabels = {
    scope1: { name: t('dataEntry.scopeLabels.scope1'), subtitle: t('dataEntry.scopeLabels.scope1Sub'), color: 'blue' },
    scope2: { name: t('dataEntry.scopeLabels.scope2'), subtitle: t('dataEntry.scopeLabels.scope2Sub'), color: 'cyan' },
    scope3_amont: { name: t('dataEntry.scopeLabels.scope3_amont'), subtitle: t('dataEntry.scopeLabels.scope3_amontSub'), color: 'purple' },
    scope3_aval: { name: t('dataEntry.scopeLabels.scope3_aval'), subtitle: t('dataEntry.scopeLabels.scope3_avalSub'), color: 'indigo' },
  };

  return {
    t, language, token, fiscalYears, currentFiscalYear,
    activeScope, setActiveScope, categories, activities, summary, categoryStats, loading,
    showModal, setShowModal, selectedCategory, setSelectedCategory,
    showTableView, setShowTableView, tableViewScope, editingActivity, editingActivityData, setEditingActivityData,
    confirmDialog, setConfirmDialog,
    showProductSaleModal, setShowProductSaleModal,
    showScope3AvalChoice, setShowScope3AvalChoice,
    showSaleEditModal, setShowSaleEditModal, editingSaleId, setEditingSaleId, editingProductId, setEditingProductId,
    showExpertFactors, toggleExpertFactors, preSelectedFactor, setPreSelectedFactor,
    showCategory33Message, setShowCategory33Message,
    scopes, scopeCategories, scopeLabels,
    getProductSalesCount, handleCategoryClick, handleEditActivityInModal, handleActivitySubmit,
    openTableView, openFullTableView, getScopeActivities,
    handleDeleteActivity, handleUpdateActivity, getCategoryName,
    handleSearchFactorSelect, fetchData,
  };
};
