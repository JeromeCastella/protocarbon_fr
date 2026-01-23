import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Upload, 
  Download,
  Truck,
  Flame,
  Factory,
  Wind,
  Zap,
  Thermometer,
  Snowflake,
  ShoppingCart,
  Wrench,
  Fuel,
  Trash2,
  Plane,
  Car,
  Building,
  Settings,
  Power,
  Recycle,
  Home,
  Store,
  TrendingUp,
  X,
  Check,
  Search,
  ChevronRight,
  Info,
  Sparkles
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const iconMap = {
  truck: Truck, flame: Flame, factory: Factory, wind: Wind, zap: Zap,
  thermometer: Thermometer, snowflake: Snowflake, 'shopping-cart': ShoppingCart,
  tool: Wrench, fuel: Fuel, trash: Trash2, plane: Plane, car: Car,
  building: Building, settings: Settings, power: Power, recycle: Recycle,
  home: Home, store: Store, 'trending-up': TrendingUp,
};

const DataEntry = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [activeScope, setActiveScope] = useState('scope1');
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [excludedCategories, setExcludedCategories] = useState([]);
  const fileInputRef = useRef(null);

  // Modal state for guided flow
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [availableFactors, setAvailableFactors] = useState([]);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [factorSearch, setFactorSearch] = useState('');
  const [showFactorDropdown, setShowFactorDropdown] = useState(false);
  
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    comments: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, activitiesRes, summaryRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/activities`),
        axios.get(`${API_URL}/dashboard/summary`),
        axios.get(`${API_URL}/dashboard/category-stats`)
      ]);
      setCategories(categoriesRes.data || []);
      setActivities(activitiesRes.data || []);
      setSummary(summaryRes.data);
      setCategoryStats(statsRes.data || {});
      setExcludedCategories(summaryRes.data?.excluded_categories || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch subcategories when category is selected
  const fetchSubcategories = async (categoryCode) => {
    try {
      const response = await axios.get(`${API_URL}/subcategories?category=${categoryCode}`);
      setSubcategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    }
  };

  // Fetch emission factors based on filters
  const fetchFactors = async (subcatCode, unit, search) => {
    try {
      let url = `${API_URL}/emission-factors/search?`;
      if (subcatCode) url += `subcategory=${subcatCode}&`;
      if (unit) url += `unit=${unit}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedCategory) url += `category=${selectedCategory.code}`;
      
      const response = await axios.get(url);
      setAvailableFactors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch factors:', error);
    }
  };

  useEffect(() => {
    if (selectedSubcategory || selectedUnit || factorSearch) {
      fetchFactors(selectedSubcategory?.code, selectedUnit, factorSearch);
    }
  }, [selectedSubcategory, selectedUnit, factorSearch]);

  const scopes = [
    { id: 'scope1', name: t('scope.scope1'), subtitle: t('scope.scope1Title'), color: 'bg-blue-500' },
    { id: 'scope2', name: t('scope.scope2'), subtitle: t('scope.scope2Title'), color: 'bg-cyan-500' },
    { id: 'scope3_amont', name: t('scope.scope3Amont'), subtitle: t('scope.scope3AmontTitle'), color: 'bg-purple-500' },
    { id: 'scope3_aval', name: t('scope.scope3Aval'), subtitle: t('scope.scope3AvalTitle'), color: 'bg-indigo-500' },
  ];

  const scopeCategories = categories.filter(c => 
    c.scope === activeScope && !excludedCategories.includes(c.code)
  );

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelectedUnit('');
    setSelectedFactor(null);
    setFactorSearch('');
    setAvailableFactors([]);
    setActivityForm({
      name: '',
      description: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0],
      source: '',
      comments: ''
    });
    fetchSubcategories(category.code);
    setShowModal(true);
  };

  const handleSubcategorySelect = (subcat) => {
    setSelectedSubcategory(subcat);
    setSelectedUnit('');
    setSelectedFactor(null);
    setFactorSearch('');
    fetchFactors(subcat.code, null, null);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setSelectedFactor(null);
    fetchFactors(selectedSubcategory?.code, unit, factorSearch);
  };

  const handleFactorSelect = (factor) => {
    setSelectedFactor(factor);
    setShowFactorDropdown(false);
    setActivityForm(prev => ({
      ...prev,
      name: factor.name
    }));
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.quantity || !selectedFactor) return;
    
    try {
      await axios.post(`${API_URL}/activities`, {
        category_id: selectedCategory.code,
        subcategory_id: selectedSubcategory?.code,
        scope: activeScope,
        name: activityForm.name || selectedFactor.name,
        description: activityForm.description,
        quantity: parseFloat(activityForm.quantity),
        unit: selectedUnit || selectedFactor.default_unit,
        emission_factor_id: selectedFactor.id,
        date: activityForm.date,
        source: activityForm.source,
        comments: activityForm.comments
      });
      
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };

  // Get all unique units from available factors
  const availableUnits = [...new Set(availableFactors.flatMap(f => f.input_units || []))];

  // Calculate estimated emissions
  const estimatedEmissions = selectedFactor && activityForm.quantity
    ? selectedFactor.impacts?.reduce((total, impact) => {
        return total + (parseFloat(activityForm.quantity) * impact.value);
      }, 0) || 0
    : 0;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/import/csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to import CSV:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/export/csv`);
      const blob = new Blob([response.data.csv_content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="data-entry-page" className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.title')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('dataEntry.subtitle')}
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-element-btn"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('dataEntry.addElement')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
            <MessageSquare className="w-4 h-4" />
            {t('dataEntry.addComment')}
          </button>
        </div>

        {/* Scope Tabs */}
        <div className={`flex gap-2 p-1 rounded-xl mb-6 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {scopes.map(scope => (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id)}
              data-testid={`scope-tab-${scope.id}`}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeScope === scope.id
                  ? `${scope.color} text-white shadow-lg`
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="text-sm">{scope.name}</div>
              <div className="text-xs opacity-80">{scope.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scopeCategories.map((category, index) => {
            const IconComponent = iconMap[category.icon] || Factory;
            const count = categoryStats[category.code] || 0;
            
            return (
              <motion.div
                key={category.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category)}
                data-testid={`category-card-${category.code}`}
                className="category-card relative cursor-pointer"
              >
                <div
                  className="p-6 rounded-2xl text-white min-h-[140px] flex flex-col justify-between"
                  style={{ backgroundColor: category.color }}
                >
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg" style={{ color: category.color }}>
                      {count}
                    </div>
                  )}
                  <IconComponent className="w-10 h-10 opacity-90" />
                  <div>
                    <p className="font-medium text-sm leading-tight">
                      {language === 'fr' ? category.name_fr : category.name_de}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar - Progress */}
      <div className="w-80 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        >
          <p className="text-blue-100 text-sm">{t('dataEntry.totalBalance')}</p>
          <h2 className="text-4xl font-bold mt-1" data-testid="sidebar-total-emissions">
            {summary?.total_emissions?.toLocaleString() || 0}
          </h2>
          <p className="text-blue-200 text-sm">tCO₂e</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary?.total_emissions || 0) / 100)}%` }}
              />
            </div>
            <span className="text-sm">
              {Math.round(Object.values(summary?.scope_completion || {}).reduce((a, b) => a + b.percentage, 0) / 4)}% {t('dataEntry.completed')}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.progressByScope')}
          </h3>
          <div className="space-y-4">
            {Object.entries(summary?.scope_completion || {}).map(([scope, data]) => {
              const scopeConfig = scopes.find(s => s.id === scope);
              return (
                <div key={scope} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scopeConfig?.name}
                    </span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {summary?.scope_emissions?.[scope]?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {data.categories_filled}/{data.total_categories} {t('dataEntry.categories')}
                    </span>
                    <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {data.percentage}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.percentage}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${scopeConfig?.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.quickActions')}
          </h3>
          <div className="space-y-3">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="import-csv-btn"
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5 text-blue-500" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('dataEntry.importCSV')}</span>
            </button>
            <button
              onClick={handleExport}
              data-testid="export-data-btn"
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Download className="w-5 h-5 text-green-500" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('dataEntry.exportData')}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* ========== NOUVEAU MODAL GUIDÉ ========== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            >
              {/* Modal Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {t('dataEntry.addElement')}
                    </h3>
                    {selectedCategory && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color }}></div>
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {language === 'fr' ? selectedCategory.name_fr : selectedCategory.name_de}
                        </span>
                        {selectedSubcategory && (
                          <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {language === 'fr' ? selectedSubcategory.name_fr : selectedSubcategory.name_de}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmitActivity} className="space-y-6">
                  
                  {/* Step 1: Sous-catégorie */}
                  {subcategories.length > 0 && (
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        1. Sous-catégorie
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {subcategories.map(subcat => (
                          <button
                            key={subcat.code}
                            type="button"
                            onClick={() => handleSubcategorySelect(subcat)}
                            className={`p-3 rounded-xl text-left transition-all ${
                              selectedSubcategory?.code === subcat.code
                                ? 'bg-blue-500 text-white'
                                : isDark 
                                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                            }`}
                          >
                            <span className="font-medium text-sm">
                              {language === 'fr' ? subcat.name_fr : subcat.name_de}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Unité de saisie */}
                  {(selectedSubcategory || subcategories.length === 0) && availableUnits.length > 0 && (
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        2. Unité de saisie
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableUnits.map(unit => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => handleUnitSelect(unit)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              selectedUnit === unit
                                ? 'bg-blue-500 text-white'
                                : isDark 
                                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                            }`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Facteur d'émission avec recherche */}
                  {(selectedSubcategory || subcategories.length === 0) && (
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        3. Facteur d'émission
                      </label>
                      
                      {/* Search input */}
                      <div className="relative mb-3">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                        <input
                          type="text"
                          value={factorSearch}
                          onChange={(e) => {
                            setFactorSearch(e.target.value);
                            setShowFactorDropdown(true);
                          }}
                          onFocus={() => setShowFactorDropdown(true)}
                          placeholder="Rechercher par nom ou tag..."
                          data-testid="factor-search-input"
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                      </div>

                      {/* Dropdown list */}
                      {showFactorDropdown && availableFactors.length > 0 && (
                        <div className={`rounded-xl border overflow-hidden max-h-48 overflow-y-auto ${
                          isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
                        }`}>
                          {availableFactors.map(factor => (
                            <button
                              key={factor.id}
                              type="button"
                              onClick={() => handleFactorSelect(factor)}
                              className={`w-full p-3 text-left border-b last:border-b-0 transition-all ${
                                selectedFactor?.id === factor.id
                                  ? 'bg-blue-500 text-white'
                                  : isDark 
                                    ? 'border-slate-600 hover:bg-slate-600 text-white' 
                                    : 'border-gray-100 hover:bg-gray-50 text-gray-900'
                              }`}
                            >
                              <div className="font-medium text-sm">{factor.name}</div>
                              <div className={`text-xs mt-1 ${selectedFactor?.id === factor.id ? 'text-blue-100' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {factor.impacts?.map(i => `${i.value} ${i.unit}`).join(' + ')} • {factor.source}
                              </div>
                              {factor.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {factor.tags.slice(0, 4).map(tag => (
                                    <span key={tag} className={`px-2 py-0.5 rounded text-xs ${
                                      selectedFactor?.id === factor.id
                                        ? 'bg-blue-400/30'
                                        : isDark ? 'bg-slate-600' : 'bg-gray-100'
                                    }`}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Selected factor display */}
                      {selectedFactor && (
                        <div className={`mt-3 p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedFactor.name}</p>
                              <div className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                {selectedFactor.impacts?.map((impact, idx) => (
                                  <span key={idx} className="block">
                                    • {impact.scope.replace('_', ' ')}: {impact.value} {impact.unit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Quantité et détails */}
                  {selectedFactor && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            4. Quantité *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={activityForm.quantity}
                              onChange={(e) => setActivityForm({ ...activityForm, quantity: e.target.value })}
                              data-testid="activity-quantity-input"
                              required
                              step="any"
                              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                                isDark 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-gray-200 text-gray-900'
                              }`}
                              placeholder="0"
                            />
                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {selectedUnit || selectedFactor.default_unit}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            Date
                          </label>
                          <input
                            type="date"
                            value={activityForm.date}
                            onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                              isDark 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-gray-200 text-gray-900'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                          Commentaire (optionnel)
                        </label>
                        <textarea
                          value={activityForm.comments}
                          onChange={(e) => setActivityForm({ ...activityForm, comments: e.target.value })}
                          rows={2}
                          className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-slate-700 border-slate-600 text-white' 
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                          placeholder="Notes, source des données..."
                        />
                      </div>

                      {/* Estimation des émissions */}
                      {activityForm.quantity && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl ${isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-green-500" />
                            <div>
                              <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                                Émissions estimées
                              </p>
                              <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                {(estimatedEmissions / 1000).toFixed(4)} tCO₂e
                              </p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-green-400/70' : 'text-green-600/70'}`}>
                                {selectedFactor.impacts?.length > 1 && `Réparti sur ${selectedFactor.impacts.length} scopes`}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                      isDark 
                        ? 'border-slate-600 hover:bg-slate-700 text-white' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSubmitActivity}
                    disabled={!selectedFactor || !activityForm.quantity}
                    data-testid="submit-activity-btn"
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataEntry;
