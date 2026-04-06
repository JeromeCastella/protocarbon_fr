import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { useLanguage } from '../context/LanguageContext';
import { ALL_CATEGORIES } from './useAdminData';
import { API_URL } from '../utils/apiConfig';

export const INITIAL_FORM = {
  name_simple_fr: '',
  name_simple_de: '',
  source_product_name: '',
  name_fr: '',
  name_de: '',
  subcategory: '',
  input_units: [''],
  default_unit: '',
  impacts: [{ scope: 'scope1', category: '', value: '', unit: 'kgCO2e/', type: 'direct' }],
  unit_conversions: {},
  tags: '',
  source: 'OFEV',
  region: 'Suisse',
  year: 2024,
  is_public: true,
  reporting_method: '',
  popularity_score: 50
};

export const IMPACT_TYPES_CONFIG = [
  { key: 'scope1', labelKey: 'admin.factors.scope1Direct', scope: 'scope1', type: 'direct', descKey: 'scope.scope1Title' },
  { key: 'scope2', labelKey: 'admin.factors.scope2Indirect', scope: 'scope2', type: 'indirect', descKey: 'scope.scope2Title' },
  { key: 'scope3_3', labelKey: 'admin.factors.scope33Upstream', scope: 'scope3_amont', type: 'upstream', descKey: 'scope.scope3AmontTitle', category: 'activites_combustibles_energie' },
  { key: 'scope3', labelKey: 'admin.factors.scope3Other', scope: 'scope3_amont', type: 'upstream', descKey: 'scope.scope3AvalTitle' }
];

const useAdminFactors = ({ subcategories, onPageChange, onRefetch }) => {
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [expertFilter, setExpertFilter] = useState('all');

  const [showFactorModal, setShowFactorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [editingFactor, setEditingFactor] = useState(null);
  const [factorForm, setFactorForm] = useState(INITIAL_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importData, setImportData] = useState('');
  const [importReplaceAll, setImportReplaceAll] = useState(false);
  const [versioningFactor, setVersioningFactor] = useState(null);
  const [versionForm, setVersionForm] = useState({
    change_reason: '',
    is_correction: false,
    valid_from_year: new Date().getFullYear(),
    impacts: []
  });
  const [factorHistory, setFactorHistory] = useState(null);

  // Debounced search
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const isPublicParam = expertFilter === 'public' ? 'true' : expertFilter === 'expert' ? 'false' : '';
    const timeout = setTimeout(() => {
      onPageChange(1, value, isPublicParam);
    }, 400);
    setSearchTimeout(timeout);
  }, [onPageChange, searchTimeout, expertFilter]);

  const handleFilterChange = useCallback((filter) => {
    setExpertFilter(filter);
    const isPublicParam = filter === 'public' ? 'true' : filter === 'expert' ? 'false' : '';
    onPageChange(1, search, isPublicParam);
  }, [onPageChange, search]);

  useEffect(() => {
    return () => { if (searchTimeout) clearTimeout(searchTimeout); };
  }, [searchTimeout]);

  // Linked categories helpers
  const getLinkedCategories = useCallback(() => {
    if (!factorForm.subcategory) return [];
    const subcat = subcategories.find(s => s.code === factorForm.subcategory);
    return subcat?.categories || [];
  }, [factorForm.subcategory, subcategories]);

  const getCategoriesForImpactType = useCallback((impactKey) => {
    const linkedCats = getLinkedCategories();
    const config = IMPACT_TYPES_CONFIG.find(c => c.key === impactKey);
    if (!config) return [];

    if (impactKey === 'scope3_3') {
      return [{ value: 'activites_combustibles_energie', label: t('categories.activites_combustibles_energie') }];
    }

    return ALL_CATEGORIES.filter(cat => {
      if (impactKey === 'scope1') return linkedCats.includes(cat.value) && cat.scope === 'scope1';
      if (impactKey === 'scope2') return linkedCats.includes(cat.value) && cat.scope === 'scope2';
      if (impactKey === 'scope3') {
        return linkedCats.includes(cat.value) &&
               (cat.scope === 'scope3_amont' || cat.scope === 'scope3_aval') &&
               cat.value !== 'activites_combustibles_energie';
      }
      return false;
    }).map(cat => ({ ...cat, label: t(`categories.${cat.value}`) }));
  }, [getLinkedCategories, t]);

  // Subcategory change - auto-generate impacts
  const handleSubcategoryChange = useCallback((newSubcategory) => {
    const subcat = subcategories.find(s => s.code === newSubcategory);
    const linkedCats = subcat?.categories || [];

    const hasScope1 = ALL_CATEGORIES.some(cat => linkedCats.includes(cat.value) && cat.scope === 'scope1');
    const hasScope2 = ALL_CATEGORIES.some(cat => linkedCats.includes(cat.value) && cat.scope === 'scope2');
    const hasScope1Or2 = hasScope1 || hasScope2;
    const hasOtherScope3 = linkedCats.some(catValue => {
      const cat = ALL_CATEGORIES.find(c => c.value === catValue);
      return cat && (cat.scope === 'scope3_amont' || cat.scope === 'scope3_aval') &&
             catValue !== 'activites_combustibles_energie';
    });

    const newImpacts = [];
    if (hasScope1) {
      const scope1Cat = ALL_CATEGORIES.find(c => linkedCats.includes(c.value) && c.scope === 'scope1');
      newImpacts.push({ impactKey: 'scope1', scope: 'scope1', category: scope1Cat?.value || '', value: '', unit: 'kgCO2e/', type: 'direct' });
    }
    if (hasScope2) {
      const scope2Cat = ALL_CATEGORIES.find(c => linkedCats.includes(c.value) && c.scope === 'scope2');
      newImpacts.push({ impactKey: 'scope2', scope: 'scope2', category: scope2Cat?.value || '', value: '', unit: 'kgCO2e/', type: 'indirect' });
    }
    if (hasScope1Or2) {
      newImpacts.push({ impactKey: 'scope3_3', scope: 'scope3_amont', category: 'activites_combustibles_energie', value: '', unit: 'kgCO2e/', type: 'upstream' });
    }
    if (hasOtherScope3) {
      const scope3Cat = ALL_CATEGORIES.find(c => linkedCats.includes(c.value) && (c.scope === 'scope3_amont' || c.scope === 'scope3_aval') && c.value !== 'activites_combustibles_energie');
      newImpacts.push({ impactKey: 'scope3', scope: scope3Cat?.scope || 'scope3_amont', category: scope3Cat?.value || '', value: '', unit: 'kgCO2e/', type: 'upstream' });
    }

    if (newImpacts.length === 0) {
      newImpacts.push({ impactKey: 'scope1', scope: 'scope1', category: '', value: '', unit: 'kgCO2e/', type: 'direct' });
    }

    setFactorForm(prev => ({ ...prev, subcategory: newSubcategory, impacts: newImpacts }));
  }, [subcategories]);

  const updateImpactByKey = useCallback((impactKey, field, value) => {
    setFactorForm(prev => ({
      ...prev,
      impacts: prev.impacts.map(imp => imp.impactKey !== impactKey ? imp : { ...imp, [field]: value })
    }));
  }, []);

  const addInputUnit = useCallback(() => {
    setFactorForm(prev => ({ ...prev, input_units: [...prev.input_units, ''] }));
  }, []);

  const removeInputUnit = useCallback((index) => {
    if (factorForm.input_units.length <= 1) return;
    setFactorForm(prev => ({ ...prev, input_units: prev.input_units.filter((_, i) => i !== index) }));
  }, [factorForm.input_units.length]);

  const resetFactorForm = useCallback(() => setFactorForm(INITIAL_FORM), []);

  // CRUD
  const handleSaveFactor = useCallback(async () => {
    try {
      const factorData = {
        ...factorForm,
        name_simple_fr: factorForm.name_simple_fr || null,
        name_simple_de: factorForm.name_simple_de || null,
        source_product_name: factorForm.source_product_name || null,
        reporting_method: factorForm.reporting_method || null,
        popularity_score: parseInt(factorForm.popularity_score) || 50,
        tags: factorForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        impacts: factorForm.impacts.map(imp => ({
          scope: imp.scope,
          category: imp.category,
          value: parseFloat(imp.value),
          unit: imp.unit,
          type: imp.type
        })),
        input_units: factorForm.input_units.filter(Boolean),
        is_public: factorForm.is_public
      };

      if (editingFactor) {
        await axios.put(`${API_URL}/api/admin/emission-factors-v2/${editingFactor.id}`, factorData);
      } else {
        await axios.post(`${API_URL}/api/admin/emission-factors-v2`, factorData);
      }

      setShowFactorModal(false);
      setEditingFactor(null);
      resetFactorForm();
      onRefetch();
    } catch (error) {
      logger.error('Failed to save factor:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  }, [factorForm, editingFactor, resetFactorForm, onRefetch, t]);

  const handleEditFactor = useCallback((factor) => {
    setEditingFactor(factor);
    const impacts = factor.impacts || [{ scope: factor.scope, category: factor.category, value: factor.value, unit: factor.unit }];

    setFactorForm({
      name_simple_fr: factor.name_simple_fr || '',
      name_simple_de: factor.name_simple_de || '',
      source_product_name: factor.source_product_name || '',
      name_fr: factor.name_fr || factor.name || '',
      name_de: factor.name_de || '',
      subcategory: factor.subcategory || '',
      input_units: factor.input_units?.length ? factor.input_units : [''],
      default_unit: factor.default_unit || '',
      impacts: impacts.map((imp) => ({
        impactKey: imp.scope === 'scope1' ? 'scope1' : imp.scope === 'scope2' ? 'scope2' : imp.category === 'activites_combustibles_energie' ? 'scope3_3' : 'scope3',
        ...imp,
        value: imp.value?.toString() || ''
      })),
      unit_conversions: factor.unit_conversions || {},
      tags: (factor.tags || []).join(', '),
      source: factor.source || 'OFEV',
      region: factor.region || 'Suisse',
      year: factor.year || 2024,
      is_public: factor.is_public !== false,
      reporting_method: factor.reporting_method || '',
      popularity_score: factor.popularity_score ?? 50
    });
    setShowFactorModal(true);
  }, []);

  const handleDuplicateFactor = useCallback((factor) => {
    setEditingFactor(null);
    const impacts = factor.impacts || [{ scope: factor.scope, category: factor.category, value: factor.value, unit: factor.unit }];

    setFactorForm({
      name_simple_fr: factor.name_simple_fr ? `${factor.name_simple_fr} (copie)` : '',
      name_simple_de: factor.name_simple_de ? `${factor.name_simple_de} (Kopie)` : '',
      source_product_name: factor.source_product_name || '',
      name_fr: factor.name_fr ? `${factor.name_fr} (copie)` : '',
      name_de: factor.name_de ? `${factor.name_de} (Kopie)` : '',
      subcategory: factor.subcategory || '',
      input_units: factor.input_units?.length ? [...factor.input_units] : [''],
      default_unit: factor.default_unit || '',
      impacts: impacts.map((imp) => ({
        impactKey: imp.scope === 'scope1' ? 'scope1' : imp.scope === 'scope2' ? 'scope2' : imp.category === 'activites_combustibles_energie' ? 'scope3_3' : 'scope3',
        ...imp,
        value: imp.value?.toString() || ''
      })),
      unit_conversions: factor.unit_conversions ? { ...factor.unit_conversions } : {},
      tags: (factor.tags || []).join(', '),
      source: factor.source || 'OFEV',
      region: factor.region || 'Suisse',
      year: factor.year || 2024,
      is_public: factor.is_public !== false,
      reporting_method: factor.reporting_method || '',
      popularity_score: factor.popularity_score ?? 50
    });
    setShowFactorModal(true);
  }, []);

  const handleDeleteFactor = useCallback(async (factorId) => {
    if (!window.confirm(t('confirmations.delete'))) return;
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors/${factorId}`);
      onRefetch();
    } catch (error) {
      logger.error('Failed to delete factor:', error);
      alert(t('errors.generic'));
    }
  }, [onRefetch, t]);

  const handleSoftDelete = useCallback(async (factorId) => {
    if (!window.confirm(t('confirmations.archive'))) return;
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors-v2/${factorId}/soft`);
      onRefetch();
    } catch (error) {
      logger.error('Failed to archive factor:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  }, [onRefetch, t]);

  // Versioning
  const handleCreateNewVersion = useCallback((factor) => {
    setVersioningFactor(factor);
    setVersionForm({
      change_reason: '',
      is_correction: false,
      valid_from_year: new Date().getFullYear(),
      impacts: (factor.impacts || []).map(imp => ({ ...imp, value: imp.value?.toString() || '' }))
    });
    setShowVersionModal(true);
  }, []);

  const handleSaveNewVersion = useCallback(async () => {
    if (!versioningFactor) return;
    try {
      const payload = {
        change_reason: versionForm.change_reason,
        is_correction: versionForm.is_correction,
        valid_from_year: versionForm.valid_from_year,
        impacts: versionForm.impacts.map(imp => ({
          scope: imp.scope,
          category: imp.category,
          value: parseFloat(imp.value),
          unit: imp.unit,
          type: imp.type || 'direct'
        }))
      };
      await axios.post(`${API_URL}/api/admin/emission-factors-v2/${versioningFactor.id}/new-version`, payload);
      setShowVersionModal(false);
      setVersioningFactor(null);
      onRefetch();
    } catch (error) {
      logger.error('Failed to create new version:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  }, [versioningFactor, versionForm, onRefetch, t]);

  const updateVersionImpact = useCallback((index, field, value) => {
    setVersionForm(prev => ({
      ...prev,
      impacts: prev.impacts.map((imp, i) => i === index ? { ...imp, [field]: value } : imp)
    }));
  }, []);

  // History
  const handleViewHistory = useCallback(async (factorId) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/emission-factors-v2/${factorId}/history`);
      setFactorHistory(response.data);
      setShowHistoryModal(true);
    } catch (error) {
      logger.error('Failed to fetch history:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  }, [t]);

  // Import/Export
  const handleExportV2 = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/emission-factors-v2/export`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emission_factors_v2_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      logger.error('Export failed:', error);
      alert(t('errors.generic'));
    }
  }, [t]);

  const handleImportV2 = useCallback(async () => {
    try {
      const data = JSON.parse(importData);
      await axios.post(`${API_URL}/api/admin/emission-factors-v2/import`, { ...data, replace_all: importReplaceAll });
      setShowImportModal(false);
      setImportData('');
      onRefetch();
      alert(t('admin.import.success'));
    } catch (error) {
      logger.error('Import failed:', error);
      alert(t('errors.generic') + ': ' + error.message);
    }
  }, [importData, importReplaceAll, onRefetch, t]);

  const openNewFactorModal = useCallback(() => {
    resetFactorForm();
    setEditingFactor(null);
    setShowFactorModal(true);
  }, [resetFactorForm]);

  return {
    search, handleSearchChange,
    expertFilter, handleFilterChange,
    showFactorModal, setShowFactorModal,
    showImportModal, setShowImportModal,
    showVersionModal, setShowVersionModal,
    showHistoryModal, setShowHistoryModal,
    editingFactor, factorForm, setFactorForm,
    showAdvanced, setShowAdvanced,
    openNewFactorModal,
    handleSaveFactor, handleEditFactor, handleDuplicateFactor,
    handleDeleteFactor, handleSoftDelete,
    handleSubcategoryChange, updateImpactByKey,
    addInputUnit, removeInputUnit,
    getLinkedCategories, getCategoriesForImpactType,
    versioningFactor, versionForm, setVersionForm,
    handleCreateNewVersion, handleSaveNewVersion, updateVersionImpact,
    factorHistory, handleViewHistory,
    importData, setImportData,
    importReplaceAll, setImportReplaceAll,
    handleExportV2, handleImportV2,
  };
};

export default useAdminFactors;
