import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit2, Trash2, Download, Upload, 
  Sparkles, GitBranch, History, Archive, X, Check, Tag, Layers,
  ChevronLeft, ChevronRight, FlaskConical, ChevronDown, ChevronUp, MapPin, Copy
} from 'lucide-react';
import axios from 'axios';
import logger from '../../utils/logger';
import { 
  ALL_CATEGORIES, 
  COMMON_UNITS, 
  getScopeColor 
} from '../../hooks/useAdminData';

import { API_URL } from '../../utils/apiConfig';

const INITIAL_FORM = {
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

const AdminFactorsTab = ({ factors, subcategories, pagination, onPageChange, onRefetch }) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [expertFilter, setExpertFilter] = useState('all'); // 'all' | 'public' | 'expert'

  // Impact types config with translation keys
  const IMPACT_TYPES_CONFIG = [
    { key: 'scope1', labelKey: 'admin.factors.scope1Direct', scope: 'scope1', type: 'direct', descKey: 'scope.scope1Title' },
    { key: 'scope2', labelKey: 'admin.factors.scope2Indirect', scope: 'scope2', type: 'indirect', descKey: 'scope.scope2Title' },
    { key: 'scope3_3', labelKey: 'admin.factors.scope33Upstream', scope: 'scope3_amont', type: 'upstream', descKey: 'scope.scope3AmontTitle', category: 'activites_combustibles_energie' },
    { key: 'scope3', labelKey: 'admin.factors.scope3Other', scope: 'scope3_amont', type: 'upstream', descKey: 'scope.scope3AvalTitle' }
  ];
  
  // Modal states
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Form states
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

  // Server-side search with debounce
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

  // Use factors directly from server (already filtered/paginated)
  const filteredFactors = factors;

  // Get linked categories for subcategory
  const getLinkedCategories = () => {
    if (!factorForm.subcategory) return [];
    const subcat = subcategories.find(s => s.code === factorForm.subcategory);
    return subcat?.categories || [];
  };

  // Get available categories for impact type
  const getCategoriesForImpactType = (impactKey) => {
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
  };

  // Handle subcategory change - auto-generate impacts
  const handleSubcategoryChange = (newSubcategory) => {
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
  };

  // Update impact by key
  const updateImpactByKey = (impactKey, field, value) => {
    setFactorForm(prev => ({
      ...prev,
      impacts: prev.impacts.map(imp => imp.impactKey !== impactKey ? imp : { ...imp, [field]: value })
    }));
  };

  // Input units management
  const addInputUnit = () => setFactorForm(prev => ({ ...prev, input_units: [...prev.input_units, ''] }));
  const removeInputUnit = (index) => {
    if (factorForm.input_units.length <= 1) return;
    setFactorForm(prev => ({ ...prev, input_units: prev.input_units.filter((_, i) => i !== index) }));
  };

  // Reset form
  const resetFactorForm = () => setFactorForm(INITIAL_FORM);

  // CRUD operations
  const handleSaveFactor = async () => {
    try {
      const factorData = {
        ...factorForm,
        name_simple_fr: factorForm.name_simple_fr || null,
        name_simple_de: factorForm.name_simple_de || null,
        source_product_name: factorForm.source_product_name || null,
        reporting_method: factorForm.reporting_method || null,
        popularity_score: parseInt(factorForm.popularity_score) || 50,
        tags: factorForm.tags.split(',').map(t => t.trim()).filter(Boolean),
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
  };

  const handleEditFactor = (factor) => {
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
      impacts: impacts.map((imp, i) => ({
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
  };

  const handleDuplicateFactor = (factor) => {
    setEditingFactor(null); // Mode création (pas édition)
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
  };

  const handleDeleteFactor = async (factorId) => {
    if (!window.confirm(t('confirmations.delete'))) return;
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors/${factorId}`);
      onRefetch();
    } catch (error) {
      logger.error('Failed to delete factor:', error);
      alert(t('errors.generic'));
    }
  };

  const handleSoftDelete = async (factorId) => {
    if (!window.confirm(t('confirmations.archive'))) return;
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors-v2/${factorId}/soft`);
      onRefetch();
    } catch (error) {
      logger.error('Failed to archive factor:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  // Versioning
  const handleCreateNewVersion = (factor) => {
    setVersioningFactor(factor);
    setVersionForm({
      change_reason: '',
      is_correction: false,
      valid_from_year: new Date().getFullYear(),
      impacts: (factor.impacts || []).map(imp => ({ ...imp, value: imp.value?.toString() || '' }))
    });
    setShowVersionModal(true);
  };

  const handleSaveNewVersion = async () => {
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
  };

  const updateVersionImpact = (index, field, value) => {
    setVersionForm(prev => ({
      ...prev,
      impacts: prev.impacts.map((imp, i) => i === index ? { ...imp, [field]: value } : imp)
    }));
  };

  // History
  const handleViewHistory = async (factorId) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/emission-factors-v2/${factorId}/history`);
      setFactorHistory(response.data);
      setShowHistoryModal(true);
    } catch (error) {
      logger.error('Failed to fetch history:', error);
      alert(t('errors.generic') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  // Import/Export
  const handleExportV2 = async () => {
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
  };

  const handleImportV2 = async () => {
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
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            data-testid="factor-search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('common.search') + '...'}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
          />
        </div>
        
        {/* Expert filter */}
        <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
          {[
            { key: 'all', label: language === 'fr' ? 'Tous' : 'Alle' },
            { key: 'public', label: language === 'fr' ? 'Publics' : 'Öffentlich' },
            { key: 'expert', label: 'Experts', icon: FlaskConical }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              data-testid={`filter-${key}`}
              onClick={() => handleFilterChange(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                expertFilter === key
                  ? key === 'expert'
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        <button
          data-testid="add-factor-btn"
          onClick={() => { resetFactorForm(); setEditingFactor(null); setShowFactorModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
        <button 
          data-testid="export-btn"
          onClick={handleExportV2} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <Download className="w-5 h-5" />
          {t('common.export')}
        </button>
        <button 
          data-testid="import-btn"
          onClick={() => setShowImportModal(true)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <Upload className="w-5 h-5" />
          {t('common.import')}
        </button>
      </div>

      {/* Factors Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead>
            <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
              <th className="text-left px-4 py-3 font-medium">{t('common.name')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('admin.factors.subcategory')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('admin.factors.impacts')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('common.version')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('emissionFactors.source')}</th>
              <th className="text-right px-4 py-3 font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredFactors.map(factor => {
              const impacts = factor.impacts || [{ scope: factor.scope, value: factor.value, unit: factor.unit }];
              const isMultiImpact = impacts.length > 1;
              const isArchived = !!factor.deleted_at;
              const isReplaced = !!factor.replaced_by;
              const version = factor.factor_version || 1;
              
              return (
                <tr 
                  key={factor.id}
                  data-testid={`factor-row-${factor.id}`}
                  className={`border-t ${isArchived ? 'opacity-50' : ''} ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{language === 'de' ? (factor.name_simple_de || factor.name_de || factor.name_simple_fr || factor.name_fr || factor.name) : (factor.name_simple_fr || factor.name_fr || factor.name)}</div>
                      {isArchived && <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-500">{t('common.archived')}</span>}
                      {isReplaced && !isArchived && <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">{t('common.replaced')}</span>}
                      {factor.reporting_method && (
                        <span className={`px-1.5 py-0.5 text-xs rounded ${factor.reporting_method === 'market' ? 'bg-purple-500/20 text-purple-500' : 'bg-teal-500/20 text-teal-500'}`}>
                          {factor.reporting_method}
                        </span>
                      )}
                    </div>
                    {factor.source_product_name && <div className={`text-xs truncate max-w-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`} title={factor.source_product_name}>{factor.source_product_name}</div>}
                    {language === 'fr' && (factor.name_simple_de || factor.name_de) && <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.name_simple_de || factor.name_de}</div>}
                    {language === 'de' && (factor.name_simple_fr || factor.name_fr) && <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.name_simple_fr || factor.name_fr}</div>}
                    {factor.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {factor.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>{tag}</span>
                        ))}
                        {factor.tags.length > 3 && <span className="text-xs text-gray-500">+{factor.tags.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{factor.subcategory || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {impacts.slice(0, 2).map((imp, i) => (
                        <div key={`${imp.scope}-${imp.value}-${i}`} className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getScopeColor(imp.scope)}`}>
                            {imp.scope?.replace('_', ' ')}
                          </span>
                          <span className="text-sm">{imp.value} {imp.unit}</span>
                        </div>
                      ))}
                      {impacts.length > 2 && <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>+{impacts.length - 2}</span>}
                      {isMultiImpact && (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-500">
                          <Sparkles className="w-3 h-3" />{t('admin.factors.multiImpact')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        <GitBranch className="w-3 h-3" />v{version}
                      </span>
                      {(factor.valid_from_year || factor.valid_from) && (
                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t('common.since')} {factor.valid_from_year || factor.valid_from?.split('-')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.source}</span>
                    {factor.year && <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{factor.year}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleViewHistory(factor.id)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`} title={t('common.history')}>
                        <History className="w-4 h-4" />
                      </button>
                      {!isArchived && !isReplaced && (
                        <>
                          <button onClick={() => handleCreateNewVersion(factor)} className={`p-2 rounded-lg text-blue-500 ${isDark ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`} title={t('admin.versioning.newVersion')}>
                            <GitBranch className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditFactor(factor)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`} title={t('common.edit')}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicateFactor(factor)} className={`p-2 rounded-lg text-green-500 ${isDark ? 'hover:bg-green-500/20' : 'hover:bg-green-100'}`} title="Dupliquer">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSoftDelete(factor.id)} className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10" title={t('common.archive')}>
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteFactor(factor.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title={t('common.delete')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {((pagination.page - 1) * pagination.page_size) + 1}–{Math.min(pagination.page * pagination.page_size, pagination.total)} {language === 'fr' ? 'sur' : 'von'} {pagination.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              data-testid="pagination-prev"
              onClick={() => {
                const isPublicParam = expertFilter === 'public' ? 'true' : expertFilter === 'expert' ? 'false' : '';
                onPageChange(pagination.page - 1, search, isPublicParam);
              }}
              disabled={pagination.page <= 1}
              className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-medium px-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {pagination.page} / {pagination.total_pages}
            </span>
            <button
              data-testid="pagination-next"
              onClick={() => {
                const isPublicParam = expertFilter === 'public' ? 'true' : expertFilter === 'expert' ? 'false' : '';
                onPageChange(pagination.page + 1, search, isPublicParam);
              }}
              disabled={pagination.page >= pagination.total_pages}
              className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Factor Modal */}
      <AnimatePresence>
        {showFactorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowFactorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            >
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                    {editingFactor ? t('admin.factors.edit') : t('admin.factors.new')}
                  </h3>
                  <button onClick={() => setShowFactorModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Noms simplifiés (principaux) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Noms affichés dans l'application</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom simplifié FR</label>
                      <input
                        type="text"
                        data-testid="input-name-simple-fr"
                        value={factorForm.name_simple_fr}
                        onChange={(e) => setFactorForm(prev => ({ ...prev, name_simple_fr: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="Diesel — Véhicules légers"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom simplifié DE</label>
                      <input
                        type="text"
                        data-testid="input-name-simple-de"
                        value={factorForm.name_simple_de}
                        onChange={(e) => setFactorForm(prev => ({ ...prev, name_simple_de: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        placeholder="Diesel — Leichte Fahrzeuge"
                      />
                    </div>
                  </div>
                </div>

                {/* Source BAFU */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom source BAFU (ecoinvent)</label>
                  <input
                    type="text"
                    data-testid="input-source-product-name"
                    value={factorForm.source_product_name}
                    onChange={(e) => setFactorForm(prev => ({ ...prev, source_product_name: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    placeholder="Light fuel oil, burned in boiler 100kW condensing {CH} MJ"
                  />
                </div>

                {/* Noms techniques (section repliable) */}
                <div className={`rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <span>Noms techniques (import) {factorForm.name_fr && <span className={`ml-2 font-normal ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>— {factorForm.name_fr.substring(0, 40)}{factorForm.name_fr.length > 40 ? '…' : ''}</span>}</span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showAdvanced && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('admin.factors.nameFr')} *</label>
                        <input
                          type="text"
                          data-testid="input-name-fr"
                          value={factorForm.name_fr}
                          onChange={(e) => setFactorForm(prev => ({ ...prev, name_fr: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                          placeholder="Mazout (combustion) — FR"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('admin.factors.nameDe')} *</label>
                        <input
                          type="text"
                          data-testid="input-name-de"
                          value={factorForm.name_de}
                          onChange={(e) => setFactorForm(prev => ({ ...prev, name_de: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                          placeholder="Heizölverbrennung — FR"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Subcategory & Default Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Sous-catégorie *</label>
                    <select
                      value={factorForm.subcategory}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    >
                      <option value="">Sélectionner...</option>
                      {subcategories.map(s => (
                        <option key={s.code} value={s.code}>{s.name_fr} ({s.code})</option>
                      ))}
                    </select>
                    {factorForm.subcategory && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Catégories liées: {getLinkedCategories().join(', ') || 'aucune'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unité par défaut</label>
                    <select
                      value={factorForm.default_unit}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, default_unit: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    >
                      <option value="">Sélectionner...</option>
                      {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Reporting method & Popularity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <MapPin className="w-4 h-4 inline mr-1" />Méthode de reporting
                    </label>
                    <select
                      data-testid="select-reporting-method"
                      value={factorForm.reporting_method}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, reporting_method: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    >
                      <option value="">Non défini</option>
                      <option value="location">Location-based</option>
                      <option value="market">Market-based</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Popularité ({factorForm.popularity_score})
                    </label>
                    <input
                      type="range"
                      data-testid="input-popularity"
                      min="0"
                      max="100"
                      value={factorForm.popularity_score}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, popularity_score: parseInt(e.target.value) }))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className={`flex justify-between text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span>Rare</span>
                      <span>Courant</span>
                    </div>
                  </div>
                </div>

                {/* Input Units */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unités d'entrée acceptées</label>
                  <div className="space-y-2">
                    {factorForm.input_units.map((unit, i) => (
                      <div key={`unit-${i}-${unit}`} className="flex items-center gap-2">
                        <select
                          value={unit}
                          onChange={(e) => setFactorForm(prev => ({
                            ...prev,
                            input_units: prev.input_units.map((u, idx) => idx === i ? e.target.value : u)
                          }))}
                          className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        >
                          <option value="">Sélectionner...</option>
                          {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {factorForm.input_units.length > 1 && (
                          <button onClick={() => removeInputUnit(i)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={addInputUnit} className="text-sm text-blue-500 hover:underline">+ Ajouter une unité</button>
                  </div>
                </div>

                {/* Impacts */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Impacts par scope
                    {factorForm.subcategory && (
                      <span className="ml-2 text-purple-500 font-normal">
                        <Sparkles className="w-4 h-4 inline" /> {factorForm.impacts.length} impact(s) requis
                      </span>
                    )}
                  </label>
                  
                  {!factorForm.subcategory ? (
                    <div className={`p-6 rounded-xl border-2 border-dashed text-center ${isDark ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500'}`}>
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Sélectionnez d'abord une sous-catégorie</p>
                      <p className="text-xs mt-1">Les impacts seront générés automatiquement</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {factorForm.impacts.map((impact) => {
                        const config = IMPACT_TYPES_CONFIG.find(c => c.key === impact.impactKey);
                        const colorClasses = {
                          scope1: 'border-blue-500/50 bg-blue-500/5',
                          scope2: 'border-cyan-500/50 bg-cyan-500/5',
                          scope3_3: 'border-amber-500/50 bg-amber-500/5',
                          scope3: 'border-purple-500/50 bg-purple-500/5'
                        };
                        const headerColors = {
                          scope1: 'bg-blue-500',
                          scope2: 'bg-cyan-500',
                          scope3_3: 'bg-amber-500',
                          scope3: 'bg-purple-500'
                        };
                        const availableCats = getCategoriesForImpactType(impact.impactKey);
                        
                        return (
                          <div key={impact.impactKey} className={`rounded-xl border-2 overflow-hidden ${colorClasses[impact.impactKey] || 'border-gray-300'}`}>
                            <div className={`px-4 py-2 ${headerColors[impact.impactKey] || 'bg-gray-500'} text-white`}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{config ? t(config.labelKey) : impact.impactKey}</span>
                                <span className="text-xs opacity-80">{config ? t(config.descKey) : ''}</span>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Catégorie *</label>
                                  {impact.impactKey === 'scope3_3' ? (
                                    <div className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                      Activités combustibles/énergie (3.3)
                                    </div>
                                  ) : (
                                    <select
                                      value={impact.category}
                                      onChange={(e) => updateImpactByKey(impact.impactKey, 'category', e.target.value)}
                                      className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                                    >
                                      <option value="">Sélectionner...</option>
                                      {availableCats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                  )}
                                </div>
                                <div>
                                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Valeur (kgCO2e) *</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={impact.value === '0' ? '' : impact.value}
                                    onChange={(e) => updateImpactByKey(impact.impactKey, 'value', e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                                    placeholder="ex: 2.68"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Unité complète *</label>
                                  <input
                                    type="text"
                                    value={impact.unit}
                                    onChange={(e) => updateImpactByKey(impact.impactKey, 'unit', e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                                    placeholder="ex: kgCO2e/L"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tags & Metadata */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <Tag className="w-4 h-4 inline mr-1" />Tags (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={factorForm.tags}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, tags: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="diesel, transport, véhicule"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Source</label>
                    <input type="text" value={factorForm.source} onChange={(e) => setFactorForm(prev => ({ ...prev, source: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Région</label>
                    <input type="text" value={factorForm.region} onChange={(e) => setFactorForm(prev => ({ ...prev, region: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année</label>
                    <input type="number" value={factorForm.year} onChange={(e) => setFactorForm(prev => ({ ...prev, year: e.target.value }))} className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                  </div>
                </div>

                {/* Expert toggle */}
                <div className={`flex items-center justify-between p-4 rounded-xl border ${
                  !factorForm.is_public 
                    ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                    : isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <FlaskConical className={`w-5 h-5 ${!factorForm.is_public ? 'text-amber-500' : isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <div>
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {language === 'fr' ? 'Facteur expert' : 'Experten-Faktor'}
                      </span>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'fr' 
                          ? 'Les facteurs experts ne sont visibles que si l\'utilisateur active le mode expert'
                          : 'Experten-Faktoren sind nur im Expertenmodus sichtbar'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="toggle-is-public"
                    onClick={() => setFactorForm(prev => ({ ...prev, is_public: !prev.is_public }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      !factorForm.is_public ? 'bg-amber-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      !factorForm.is_public ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button onClick={() => setShowFactorModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveFactor}
                    disabled={!(factorForm.name_simple_fr || factorForm.name_fr) || !factorForm.subcategory || factorForm.impacts.length === 0 || factorForm.impacts.some(i => !i.value || !i.category || !i.unit)}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {editingFactor ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowImportModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <h3 className="text-xl font-bold">Importer des données V2</h3>
              </div>
              <div className="p-6 space-y-4">
                <textarea value={importData} onChange={(e) => setImportData(e.target.value)} placeholder="Collez ici le JSON exporté..." rows={10} className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={importReplaceAll} onChange={(e) => setImportReplaceAll(e.target.checked)} className="rounded" />
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Remplacer toutes les données existantes</span>
                </label>
              </div>
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
                <button onClick={() => setShowImportModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>Annuler</button>
                <button onClick={handleImportV2} disabled={!importData} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50">Importer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version Modal */}
      <AnimatePresence>
        {showVersionModal && versioningFactor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVersionModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20"><GitBranch className="w-6 h-6 text-blue-500" /></div>
                  <div>
                    <h2 className="text-xl font-bold">Nouvelle version</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{versioningFactor.name_simple_fr || versioningFactor.name_fr} - v{versioningFactor.factor_version || 1} → v{(versioningFactor.factor_version || 1) + 1}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[60vh]">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Raison du changement *</label>
                  <textarea value={versionForm.change_reason} onChange={(e) => setVersionForm(prev => ({ ...prev, change_reason: e.target.value }))} placeholder="Ex: Mise à jour annuelle des facteurs OFEV 2025" rows={2} className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="is_correction" checked={versionForm.is_correction} onChange={(e) => setVersionForm(prev => ({ ...prev, is_correction: e.target.checked }))} className="w-5 h-5 rounded" />
                  <label htmlFor="is_correction"><span className="font-medium">Correction d'erreur</span><span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cocher si cette version corrige une erreur</span></label>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année de début de validité</label>
                  <input type="number" min="2020" max="2100" value={versionForm.valid_from_year} onChange={(e) => setVersionForm(prev => ({ ...prev, valid_from_year: parseInt(e.target.value) || new Date().getFullYear() }))} className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Valeurs des impacts</label>
                  <div className="space-y-3">
                    {versionForm.impacts.map((impact, i) => (
                      <div key={`${impact.scope}-${impact.category || i}`} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getScopeColor(impact.scope)}`}>{impact.scope?.replace('_', ' ')}</span>
                          <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t(`categories.${impact.category}`) || impact.category}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Nouvelle valeur *</label>
                            <input type="number" step="any" value={impact.value === '0' ? '' : impact.value} onChange={(e) => updateVersionImpact(i, 'value', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`} placeholder="2.68" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Unité</label>
                            <input type="text" value={impact.unit} onChange={(e) => updateVersionImpact(i, 'unit', e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`} placeholder="kgCO2e/L" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button onClick={() => setShowVersionModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>Annuler</button>
                  <button onClick={handleSaveNewVersion} disabled={!versionForm.change_reason || versionForm.impacts.some(i => !i.value)} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <GitBranch className="w-5 h-5" />Créer la version {(versioningFactor.factor_version || 1) + 1}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && factorHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className={`w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20"><History className="w-6 h-6 text-purple-500" /></div>
                  <div>
                    <h2 className="text-xl font-bold">Historique des versions</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factorHistory.total_versions} version(s)</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
                {factorHistory.change_history?.length > 0 && (
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h3 className={`font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Journal des modifications</h3>
                    <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                      {factorHistory.change_history.slice().reverse().map((change, i) => (
                        <div key={`v${change.version}-${i}`} className="relative">
                          <div className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-blue-500" />
                          <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            <span className="font-medium">v{change.version}</span>
                            {change.is_correction && <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">Correction</span>}
                            <span className={`block text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{new Date(change.changed_at).toLocaleDateString('fr-CH')} par {change.changed_by}</span>
                            <span className={`block mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{change.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className={`font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Toutes les versions</h3>
                  <div className="space-y-3">
                    {factorHistory.versions?.map((version) => (
                      <div key={version.id} className={`p-4 rounded-xl border ${version.id === factorHistory.factor_id ? isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200' : isDark ? 'bg-slate-700/30 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${version.id === factorHistory.factor_id ? 'bg-blue-500 text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-700'}`}>v{version.factor_version || 1}</span>
                            <span className="font-medium">{version.name_simple_fr || version.name_fr}</span>
                            {version.deleted_at && <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-500">Archivé</span>}
                            {version.replaced_by && !version.deleted_at && <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-500">Remplacé</span>}
                          </div>
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{version.valid_from_year || '?'} → {version.valid_to_year || 'Actuel'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(version.impacts || []).map((imp, j) => (
                            <span key={j} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>{imp.scope?.replace('_', ' ')}: {imp.value} {imp.unit}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button onClick={() => setShowHistoryModal(false)} className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminFactorsTab;
