import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Shield, 
  Users, 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Upload,
  Search,
  Check,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Admin = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('factors');
  const [loading, setLoading] = useState(true);
  
  // Emission factors state
  const [factors, setFactors] = useState([]);
  const [factorSearch, setFactorSearch] = useState('');
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState(null);
  
  // V2 Factor form with multi-impacts
  const [factorForm, setFactorForm] = useState({
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
    year: 2024
  });
  
  // Subcategories state
  const [subcategories, setSubcategories] = useState([]);
  const [subcatSearch, setSubcatSearch] = useState('');
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [editingSubcat, setEditingSubcat] = useState(null);
  const [subcatForm, setSubcatForm] = useState({
    code: '',
    name_fr: '',
    name_de: '',
    categories: [],
    icon: 'circle',
    order: 0
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  
  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importReplaceAll, setImportReplaceAll] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [factorsRes, usersRes, subcatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/emission-factors`),
        axios.get(`${API_URL}/api/admin/users`),
        axios.get(`${API_URL}/api/admin/subcategories`)
      ]);
      setFactors(factorsRes.data || []);
      setUsers(usersRes.data || []);
      setSubcategories(subcatsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categories for dropdown
  const allCategories = [
    { value: 'combustion_mobile', label: 'Combustion mobile', scope: 'scope1' },
    { value: 'combustion_fixe', label: 'Combustion fixe', scope: 'scope1' },
    { value: 'emissions_procedes', label: 'Procédés industriels', scope: 'scope1' },
    { value: 'emissions_fugitives', label: 'Émissions fugitives', scope: 'scope1' },
    { value: 'electricite', label: 'Électricité', scope: 'scope2' },
    { value: 'chaleur_vapeur', label: 'Chaleur / Vapeur', scope: 'scope2' },
    { value: 'refroidissement', label: 'Refroidissement', scope: 'scope2' },
    { value: 'biens_services_achetes', label: 'Biens et services achetés', scope: 'scope3_amont' },
    { value: 'biens_equipement', label: 'Biens d\'équipement', scope: 'scope3_amont' },
    { value: 'activites_combustibles_energie', label: 'Activités combustibles/énergie (3.3)', scope: 'scope3_amont' },
    { value: 'transport_distribution_amont', label: 'Transport amont', scope: 'scope3_amont' },
    { value: 'dechets_operations', label: 'Déchets des opérations', scope: 'scope3_amont' },
    { value: 'deplacements_professionnels', label: 'Déplacements professionnels', scope: 'scope3_amont' },
    { value: 'deplacements_domicile_travail', label: 'Déplacements domicile-travail', scope: 'scope3_amont' },
    { value: 'actifs_loues_amont', label: 'Actifs loués amont', scope: 'scope3_amont' },
    { value: 'transport_distribution_aval', label: 'Transport aval', scope: 'scope3_aval' },
    { value: 'transformation_produits', label: 'Transformation des produits', scope: 'scope3_aval' },
    { value: 'utilisation_produits', label: 'Utilisation des produits', scope: 'scope3_aval' },
    { value: 'fin_vie_produits', label: 'Fin de vie des produits', scope: 'scope3_aval' },
    { value: 'actifs_loues_aval', label: 'Actifs loués aval', scope: 'scope3_aval' },
    { value: 'franchises', label: 'Franchises', scope: 'scope3_aval' },
    { value: 'investissements', label: 'Investissements', scope: 'scope3_aval' }
  ];

  const scopes = [
    { value: 'scope1', label: 'Scope 1', color: 'blue' },
    { value: 'scope2', label: 'Scope 2', color: 'cyan' },
    { value: 'scope3_amont', label: 'Scope 3 Amont', color: 'purple' },
    { value: 'scope3_aval', label: 'Scope 3 Aval', color: 'indigo' }
  ];

  const impactTypes = [
    { value: 'direct', label: 'Direct (Scope 1)' },
    { value: 'indirect', label: 'Indirect (Scope 2)' },
    { value: 'upstream', label: 'Amont (Scope 3 amont)' },
    { value: 'downstream', label: 'Aval (Scope 3 aval)' }
  ];

  const commonUnits = ['L', 'kWh', 'MWh', 'kg', 't', 'km', 'm3', 'GJ', 'tep', 'passager.km', 'CHF', 'kCHF'];

  // Get categories linked to selected subcategory
  const getLinkedCategories = () => {
    if (!factorForm.subcategory) return [];
    const subcat = subcategories.find(s => s.code === factorForm.subcategory);
    return subcat?.categories || [];
  };

  // Check if subcategory has Scope 1 or Scope 2 categories (for 3.3 rule)
  const hasScope1Or2Category = () => {
    const linkedCats = getLinkedCategories();
    return allCategories.some(cat => 
      linkedCats.includes(cat.value) && (cat.scope === 'scope1' || cat.scope === 'scope2')
    );
  };

  // Get available scopes based on subcategory's linked categories
  const getAvailableScopes = () => {
    const linkedCats = getLinkedCategories();
    if (!factorForm.subcategory || linkedCats.length === 0) {
      return scopes; // All scopes if no subcategory
    }

    // Find which scopes have at least one linked category
    const availableScopeValues = new Set();
    linkedCats.forEach(catValue => {
      const cat = allCategories.find(c => c.value === catValue);
      if (cat) {
        availableScopeValues.add(cat.scope);
      }
    });

    // Special rule: If scope1 or scope2 is available, also allow scope3_amont (for 3.3)
    if (availableScopeValues.has('scope1') || availableScopeValues.has('scope2')) {
      availableScopeValues.add('scope3_amont');
    }

    return scopes.filter(s => availableScopeValues.has(s.value));
  };

  // Get available categories for an impact based on scope and subcategory
  const getAvailableCategoriesForImpact = (impactScope) => {
    const linkedCats = getLinkedCategories();
    
    if (!factorForm.subcategory || linkedCats.length === 0) {
      // No subcategory selected: show all categories of the selected scope
      return allCategories.filter(c => c.scope === impactScope);
    }

    // Filter categories that are linked to the subcategory AND match the scope
    let availableCats = allCategories.filter(cat => 
      linkedCats.includes(cat.value) && cat.scope === impactScope
    );

    // Special rule for Scope 3 amont: add activites_combustibles_energie (3.3) 
    // IF the subcategory has at least one Scope 1 or Scope 2 category
    // This is for upstream energy impacts (amont énergie)
    if (impactScope === 'scope3_amont' && hasScope1Or2Category()) {
      const scope33 = allCategories.find(c => c.value === 'activites_combustibles_energie');
      if (scope33 && !availableCats.some(c => c.value === 'activites_combustibles_energie')) {
        availableCats = [...availableCats, scope33];
      }
    }

    return availableCats;
  };

  // ==================== FACTOR CRUD ====================
  const handleSaveFactor = async () => {
    try {
      // Build V2 factor data
      const factorData = {
        name_fr: factorForm.name_fr,
        name_de: factorForm.name_de,
        subcategory: factorForm.subcategory,
        input_units: factorForm.input_units.filter(u => u),
        default_unit: factorForm.default_unit || factorForm.input_units[0],
        impacts: factorForm.impacts.map(imp => ({
          scope: imp.scope,
          category: imp.category,
          value: parseFloat(imp.value),
          unit: imp.unit,
          type: imp.type
        })).filter(imp => imp.value && imp.category),
        unit_conversions: factorForm.unit_conversions,
        tags: factorForm.tags.split(',').map(t => t.trim()).filter(t => t),
        source: factorForm.source,
        region: factorForm.region,
        year: parseInt(factorForm.year)
      };

      if (editingFactor) {
        await axios.put(`${API_URL}/api/admin/emission-factors-v2/${editingFactor.id}`, factorData);
      } else {
        await axios.post(`${API_URL}/api/admin/emission-factors-v2`, factorData);
      }
      
      setShowFactorModal(false);
      setEditingFactor(null);
      resetFactorForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save factor:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditFactor = (factor) => {
    setEditingFactor(factor);
    
    // Handle both V1 and V2 formats
    const impacts = factor.impacts || [{
      scope: factor.scope || 'scope1',
      category: factor.category || '',
      value: factor.value?.toString() || '',
      unit: factor.unit || 'kgCO2e/',
      type: 'direct'
    }];
    
    setFactorForm({
      name_fr: factor.name_fr || factor.name || '',
      name_de: factor.name_de || '',
      subcategory: factor.subcategory || '',
      input_units: factor.input_units?.length ? factor.input_units : [''],
      default_unit: factor.default_unit || factor.input_units?.[0] || '',
      impacts: impacts.map(imp => ({
        scope: imp.scope || 'scope1',
        category: imp.category || '',
        value: imp.value?.toString() || '',
        unit: imp.unit || 'kgCO2e/',
        type: imp.type || 'direct'
      })),
      unit_conversions: factor.unit_conversions || {},
      tags: factor.tags?.join(', ') || '',
      source: factor.source || 'OFEV',
      region: factor.region || 'Suisse',
      year: factor.year || 2024
    });
    setShowFactorModal(true);
  };

  const handleDeleteFactor = async (factorId) => {
    if (!window.confirm('Supprimer ce facteur d\'émission ?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors/${factorId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete factor:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetFactorForm = () => {
    setFactorForm({
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
      year: 2024
    });
  };

  // Add/remove impacts
  const addImpact = () => {
    setFactorForm(prev => ({
      ...prev,
      impacts: [...prev.impacts, { scope: 'scope1', category: '', value: '', unit: 'kgCO2e/', type: 'direct' }]
    }));
  };

  const removeImpact = (index) => {
    if (factorForm.impacts.length <= 1) return;
    setFactorForm(prev => ({
      ...prev,
      impacts: prev.impacts.filter((_, i) => i !== index)
    }));
  };

  const updateImpact = (index, field, value) => {
    setFactorForm(prev => ({
      ...prev,
      impacts: prev.impacts.map((imp, i) => {
        if (i !== index) return imp;
        // If scope changes, reset category to avoid invalid state
        if (field === 'scope') {
          return { ...imp, [field]: value, category: '' };
        }
        return { ...imp, [field]: value };
      })
    }));
  };

  // When subcategory changes, reset all impact categories
  const handleSubcategoryChange = (newSubcategory) => {
    setFactorForm(prev => ({
      ...prev,
      subcategory: newSubcategory,
      impacts: prev.impacts.map(imp => ({ ...imp, category: '' }))
    }));
  };

  // Add/remove input units
  const addInputUnit = () => {
    setFactorForm(prev => ({
      ...prev,
      input_units: [...prev.input_units, '']
    }));
  };

  const removeInputUnit = (index) => {
    if (factorForm.input_units.length <= 1) return;
    setFactorForm(prev => ({
      ...prev,
      input_units: prev.input_units.filter((_, i) => i !== index)
    }));
  };

  // ==================== SUBCATEGORY CRUD ====================
  const handleSaveSubcat = async () => {
    try {
      if (editingSubcat) {
        await axios.put(`${API_URL}/api/admin/subcategories/${editingSubcat.id}`, subcatForm);
      } else {
        await axios.post(`${API_URL}/api/admin/subcategories`, subcatForm);
      }
      
      setShowSubcatModal(false);
      setEditingSubcat(null);
      resetSubcatForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save subcategory:', error);
      alert('Erreur: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditSubcat = (subcat) => {
    setEditingSubcat(subcat);
    setSubcatForm({
      code: subcat.code || '',
      name_fr: subcat.name_fr || '',
      name_de: subcat.name_de || '',
      categories: subcat.categories || [],
      icon: subcat.icon || 'circle',
      order: subcat.order || 0
    });
    setShowSubcatModal(true);
  };

  const handleDeleteSubcat = async (subcatId) => {
    if (!window.confirm('Supprimer cette sous-catégorie ?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/subcategories/${subcatId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetSubcatForm = () => {
    setSubcatForm({
      code: '',
      name_fr: '',
      name_de: '',
      categories: [],
      icon: 'circle',
      order: 0
    });
  };

  const toggleCategory = (catValue) => {
    setSubcatForm(prev => ({
      ...prev,
      categories: prev.categories.includes(catValue)
        ? prev.categories.filter(c => c !== catValue)
        : [...prev.categories, catValue]
    }));
  };

  // ==================== USER ROLE MANAGEMENT ====================
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (userId === user?.id && newRole === 'user') {
      if (!window.confirm('Vous allez retirer vos droits admin. Continuer ?')) return;
    }
    
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/role`, { role: newRole });
      fetchData();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  // ==================== IMPORT/EXPORT ====================
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
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const handleImportV2 = async () => {
    try {
      const data = JSON.parse(importData);
      await axios.post(`${API_URL}/api/admin/emission-factors-v2/import`, {
        ...data,
        replace_all: importReplaceAll
      });
      setShowImportModal(false);
      setImportData('');
      fetchData();
      alert('Import réussi !');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Erreur lors de l\'import: ' + error.message);
    }
  };

  // Filter data
  const filteredFactors = factors.filter(f => {
    const search = factorSearch.toLowerCase();
    return (f.name_fr || f.name || '').toLowerCase().includes(search) ||
           (f.name_de || '').toLowerCase().includes(search) ||
           f.tags?.some(t => t.toLowerCase().includes(search)) ||
           (f.subcategory || '').toLowerCase().includes(search);
  });

  const filteredSubcats = subcategories.filter(s => {
    const search = subcatSearch.toLowerCase();
    return s.code?.toLowerCase().includes(search) ||
           s.name_fr?.toLowerCase().includes(search) ||
           s.name_de?.toLowerCase().includes(search);
  });

  // Scope badge color
  const getScopeColor = (scope) => {
    const colors = {
      scope1: 'bg-blue-500',
      scope2: 'bg-cyan-500',
      scope3_amont: 'bg-purple-500',
      scope3_aval: 'bg-indigo-500'
    };
    return colors[scope] || 'bg-gray-500';
  };

  // Check access
  if (user?.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Accès refusé
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
          <Shield className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Gestion des facteurs d'émission, sous-catégories et utilisateurs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <button
          onClick={() => setActiveTab('factors')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'factors'
              ? 'bg-blue-500 text-white'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="w-5 h-5" />
          Facteurs ({factors.length})
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'subcategories'
              ? 'bg-purple-500 text-white'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="w-5 h-5" />
          Sous-catégories ({subcategories.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-green-500 text-white'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-5 h-5" />
          Utilisateurs ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* ==================== FACTORS TAB ==================== */}
          {activeTab === 'factors' && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-64">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={factorSearch}
                    onChange={(e) => setFactorSearch(e.target.value)}
                    placeholder="Rechercher par nom, tag ou sous-catégorie..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  />
                </div>
                <button
                  onClick={() => { resetFactorForm(); setEditingFactor(null); setShowFactorModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter
                </button>
                <button onClick={handleExportV2} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <Download className="w-5 h-5" />
                  Exporter
                </button>
                <button onClick={() => setShowImportModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <Upload className="w-5 h-5" />
                  Importer
                </button>
              </div>

              {/* Factors Table */}
              <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                      <th className="text-left px-4 py-3 font-medium">Nom</th>
                      <th className="text-left px-4 py-3 font-medium">Sous-catégorie</th>
                      <th className="text-left px-4 py-3 font-medium">Impacts</th>
                      <th className="text-left px-4 py-3 font-medium">Unités</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFactors.map(factor => {
                      const impacts = factor.impacts || [{ scope: factor.scope, value: factor.value, unit: factor.unit }];
                      const isMultiImpact = impacts.length > 1;
                      
                      return (
                        <tr key={factor.id} className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{factor.name_fr || factor.name}</div>
                            {factor.name_de && <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.name_de}</div>}
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
                            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {factor.subcategory || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {impacts.slice(0, 2).map((imp, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getScopeColor(imp.scope)}`}>
                                    {imp.scope?.replace('_', ' ')}
                                  </span>
                                  <span className="text-sm">{imp.value} {imp.unit}</span>
                                </div>
                              ))}
                              {impacts.length > 2 && (
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>+{impacts.length - 2} autre(s)</span>
                              )}
                              {isMultiImpact && (
                                <span className="inline-flex items-center gap-1 text-xs text-purple-500">
                                  <Sparkles className="w-3 h-3" />
                                  Multi-impact
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(factor.input_units || [factor.unit?.split('/')[1]]).filter(Boolean).map(u => (
                                <span key={u} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{u}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{factor.source}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditFactor(factor)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}>
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteFactor(factor.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
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
            </div>
          )}

          {/* ==================== SUBCATEGORIES TAB ==================== */}
          {activeTab === 'subcategories' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-64">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={subcatSearch}
                    onChange={(e) => setSubcatSearch(e.target.value)}
                    placeholder="Rechercher une sous-catégorie..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  />
                </div>
                <button
                  onClick={() => { resetSubcatForm(); setEditingSubcat(null); setShowSubcatModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter
                </button>
              </div>

              <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                      <th className="text-left px-4 py-3 font-medium">Code</th>
                      <th className="text-left px-4 py-3 font-medium">Nom FR</th>
                      <th className="text-left px-4 py-3 font-medium">Nom DE</th>
                      <th className="text-left px-4 py-3 font-medium">Catégories liées</th>
                      <th className="text-left px-4 py-3 font-medium">Ordre</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubcats.map(subcat => (
                      <tr key={subcat.id} className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <code className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>{subcat.code}</code>
                        </td>
                        <td className="px-4 py-3 font-medium">{subcat.name_fr}</td>
                        <td className="px-4 py-3">{subcat.name_de}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(subcat.categories || []).slice(0, 3).map(cat => (
                              <span key={cat} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                {cat}
                              </span>
                            ))}
                            {(subcat.categories || []).length > 3 && (
                              <span className="text-xs text-gray-500">+{subcat.categories.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{subcat.order}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEditSubcat(subcat)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteSubcat(subcat.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== USERS TAB ==================== */}
          {activeTab === 'users' && (
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              <table className="w-full">
                <thead>
                  <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Nom</th>
                    <th className="text-left px-4 py-3 font-medium">Rôle</th>
                    <th className="text-left px-4 py-3 font-medium">Date création</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' 
                            ? 'bg-amber-500/20 text-amber-500' 
                            : isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                        </span>
                        {u.id === user?.id && (
                          <span className={`ml-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>(Vous)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className={`px-3 py-1 rounded text-sm ${
                            u.role === 'admin'
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                              : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          }`}
                        >
                          {u.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ==================== FACTOR MODAL V2 ==================== */}
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
                    {editingFactor ? 'Modifier le facteur' : 'Nouveau facteur V2'}
                  </h3>
                  <button onClick={() => setShowFactorModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom FR *</label>
                    <input
                      type="text"
                      value={factorForm.name_fr}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, name_fr: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Diesel - Véhicules légers"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom DE *</label>
                    <input
                      type="text"
                      value={factorForm.name_de}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, name_de: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Diesel - Leichte Fahrzeuge"
                    />
                  </div>
                </div>

                {/* Subcategory & Units */}
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
                      {commonUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* Input Units */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unités d'entrée acceptées</label>
                  <div className="space-y-2">
                    {factorForm.input_units.map((unit, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={unit}
                          onChange={(e) => setFactorForm(prev => ({
                            ...prev,
                            input_units: prev.input_units.map((u, idx) => idx === i ? e.target.value : u)
                          }))}
                          className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                        >
                          <option value="">Sélectionner...</option>
                          {commonUnits.map(u => <option key={u} value={u}>{u}</option>)}
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

                {/* Impacts (Multi-impact) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Impacts (multi-scope)
                    <span className="ml-2 text-purple-500 font-normal">
                      <Sparkles className="w-4 h-4 inline" /> {factorForm.impacts.length} impact(s)
                    </span>
                  </label>
                  <div className="space-y-3">
                    {factorForm.impacts.map((impact, i) => (
                      <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Impact #{i + 1}</span>
                          {factorForm.impacts.length > 1 && (
                            <button onClick={() => removeImpact(i)} className="text-red-500 text-sm hover:underline">Supprimer</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500">Scope</label>
                            <select
                              value={impact.scope}
                              onChange={(e) => updateImpact(i, 'scope', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                            >
                              {scopes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Catégorie</label>
                            <select
                              value={impact.category}
                              onChange={(e) => updateImpact(i, 'category', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                            >
                              <option value="">Sélectionner...</option>
                              {getAvailableCategoriesForImpact(impact.scope).map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                            {factorForm.subcategory && getAvailableCategoriesForImpact(impact.scope).length === 0 && (
                              <p className="text-xs text-amber-500 mt-1">
                                Aucune catégorie {impact.scope} liée à cette sous-catégorie
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Valeur</label>
                            <input
                              type="number"
                              step="any"
                              value={impact.value}
                              onChange={(e) => updateImpact(i, 'value', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                              placeholder="2.68"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Unité</label>
                            <input
                              type="text"
                              value={impact.unit}
                              onChange={(e) => updateImpact(i, 'unit', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                              placeholder="kgCO2e/L"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500">Type d'impact</label>
                            <select
                              value={impact.type}
                              onChange={(e) => updateImpact(i, 'type', e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`}
                            >
                              {impactTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addImpact} className="w-full py-2 border-2 border-dashed border-purple-500/50 text-purple-500 rounded-xl hover:bg-purple-500/10">
                      + Ajouter un impact
                    </button>
                  </div>
                </div>

                {/* Tags & Metadata */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <Tag className="w-4 h-4 inline mr-1" />
                      Tags (séparés par des virgules)
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
                    <input
                      type="text"
                      value={factorForm.source}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, source: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Région</label>
                    <input
                      type="text"
                      value={factorForm.region}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, region: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Année</label>
                    <input
                      type="number"
                      value={factorForm.year}
                      onChange={(e) => setFactorForm(prev => ({ ...prev, year: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button onClick={() => setShowFactorModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveFactor}
                    disabled={!factorForm.name_fr || !factorForm.subcategory || factorForm.impacts.every(i => !i.value)}
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

      {/* ==================== SUBCATEGORY MODAL ==================== */}
      <AnimatePresence>
        {showSubcatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSubcatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            >
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Layers className="w-6 h-6 text-purple-500" />
                    {editingSubcat ? 'Modifier la sous-catégorie' : 'Nouvelle sous-catégorie'}
                  </h3>
                  <button onClick={() => setShowSubcatModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Code *</label>
                    <input
                      type="text"
                      value={subcatForm.code}
                      onChange={(e) => setSubcatForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="voitures"
                      disabled={!!editingSubcat}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom FR *</label>
                    <input
                      type="text"
                      value={subcatForm.name_fr}
                      onChange={(e) => setSubcatForm(prev => ({ ...prev, name_fr: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Voitures"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom DE *</label>
                    <input
                      type="text"
                      value={subcatForm.name_de}
                      onChange={(e) => setSubcatForm(prev => ({ ...prev, name_de: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Autos"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Icône</label>
                    <input
                      type="text"
                      value={subcatForm.icon}
                      onChange={(e) => setSubcatForm(prev => ({ ...prev, icon: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="car"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Ordre</label>
                    <input
                      type="number"
                      value={subcatForm.order}
                      onChange={(e) => setSubcatForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Catégories liées (relation N-N) *
                  </label>
                  <div className={`max-h-64 overflow-y-auto rounded-xl border p-3 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-2 gap-2">
                      {allCategories.map(cat => (
                        <label
                          key={cat.value}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            subcatForm.categories.includes(cat.value)
                              ? 'bg-purple-500/20 border border-purple-500'
                              : isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={subcatForm.categories.includes(cat.value)}
                            onChange={() => toggleCategory(cat.value)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${
                            subcatForm.categories.includes(cat.value) ? 'bg-purple-500 text-white' : isDark ? 'bg-slate-500' : 'bg-gray-300'
                          }`}>
                            {subcatForm.categories.includes(cat.value) && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm">{cat.label}</span>
                          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${getScopeColor(cat.scope)} text-white`}>
                            {cat.scope.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {subcatForm.categories.length} catégorie(s) sélectionnée(s)
                  </p>
                </div>
              </div>

              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button onClick={() => setShowSubcatModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveSubcat}
                    disabled={!subcatForm.code || !subcatForm.name_fr || !subcatForm.name_de || subcatForm.categories.length === 0}
                    className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {editingSubcat ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== IMPORT MODAL ==================== */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
            >
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <h3 className="text-xl font-bold">Importer des données V2</h3>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Collez ici le JSON exporté..."
                  rows={10}
                  className={`w-full px-4 py-3 rounded-xl border font-mono text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={importReplaceAll}
                    onChange={(e) => setImportReplaceAll(e.target.checked)}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Remplacer toutes les données existantes
                  </span>
                </label>
              </div>
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
                <button onClick={() => setShowImportModal(false)} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                  Annuler
                </button>
                <button onClick={handleImportV2} disabled={!importData} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50">
                  Importer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
