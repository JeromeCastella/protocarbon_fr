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
  Sparkles,
  Edit3,
  Table,
  ArrowRight,
  Package,
  ShoppingBag
} from 'lucide-react';
import ProductSaleModal from '../components/ProductSaleModal';
import GuidedEntryModal from '../components/GuidedEntryModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Categories that should open product sale modal instead of regular entry
const PRODUCT_SALE_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    // Display in tonnes if >= 10 tonnes
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'tCO₂e'
    };
  } else {
    // Display in kg if < 10 tonnes
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      unit: 'kgCO₂e'
    };
  }
};

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

  // Table view state
  const [showTableView, setShowTableView] = useState(false);
  const [tableViewScope, setTableViewScope] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState(null);

  // Product sale modal state
  const [showProductSaleModal, setShowProductSaleModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, activitiesRes, summaryRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/activities?limit=500`), // Get up to 500 activities
        axios.get(`${API_URL}/api/dashboard/summary`),
        axios.get(`${API_URL}/api/dashboard/category-stats`)
      ]);
      setCategories(categoriesRes.data || []);
      // Handle paginated response
      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      setActivities(activitiesData);
      setSummary(summaryRes.data);
      setCategoryStats(statsRes.data || {});
      setExcludedCategories(summaryRes.data?.excluded_categories || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    // Check if this is a product-related category
    if (PRODUCT_SALE_CATEGORIES.includes(category.code)) {
      setShowProductSaleModal(true);
      return;
    }
    
    setSelectedCategory(category);
    setEditingActivityData(null);
    setShowModal(true);
  };

  // Open modal in edit mode with pre-filled data
  const handleEditActivityInModal = (activity) => {
    const category = categories.find(c => c.code === activity.category_id);
    if (!category) return;

    setSelectedCategory(category);
    setEditingActivityData(activity);
    setShowTableView(false);
    setShowModal(true);
  };

  // Handle activity submission from the guided modal
  const handleActivitySubmit = async (activityData) => {
    try {
      if (editingActivityData) {
        await axios.put(`${API_URL}/api/activities/${editingActivityData.id}`, activityData);
      } else {
        await axios.post(`${API_URL}/api/activities`, activityData);
      }
      fetchData();
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };
  
  // Table view functions
  const openTableView = (scope) => {
    setTableViewScope(scope);
    setShowTableView(true);
  };

  // Open full view (all scopes) when clicking on total
  const openFullTableView = () => {
    setTableViewScope(null);
    setShowTableView(true);
  };

  const getScopeActivities = (scope) => {
    if (scope === null) {
      return activities;
    }
    return activities.filter(a => a.scope === scope);
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await axios.delete(`${API_URL}/api/activities/${activityId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  const handleUpdateActivity = async (activityId, updates) => {
    try {
      await axios.put(`${API_URL}/api/activities/${activityId}`, updates);
      setEditingActivity(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  const getCategoryName = (categoryCode) => {
    const cat = categories.find(c => c.code === categoryCode);
    return cat ? (language === 'fr' ? cat.name_fr : cat.name_de) : categoryCode;
  };

  const scopeLabels = {
    scope1: { name: 'Scope 1', subtitle: 'Émissions directes', color: 'blue' },
    scope2: { name: 'Scope 2', subtitle: 'Énergie indirecte', color: 'cyan' },
    scope3_amont: { name: 'Scope 3 Amont', subtitle: 'Amont', color: 'purple' },
    scope3_aval: { name: 'Scope 3 Aval', subtitle: 'Aval', color: 'indigo' },
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/api/import/csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to import CSV:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/export/csv`);
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
          onClick={openFullTableView}
          data-testid="total-balance-card"
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-blue-100 text-sm">{t('dataEntry.totalBalance')}</p>
            <Table className="w-5 h-5 text-blue-200" />
          </div>
          <h2 className="text-4xl font-bold mt-1" data-testid="sidebar-total-emissions">
            {formatEmissions(summary?.total_emissions).value}
          </h2>
          <p className="text-blue-200 text-sm">{formatEmissions(summary?.total_emissions).unit}</p>
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
          <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            Cliquer pour voir le détail complet
          </p>
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
              const scopeActivitiesCount = getScopeActivities(scope).length;
              return (
                <div 
                  key={scope} 
                  onClick={() => openTableView(scope)}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scopeConfig?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatEmissions(summary?.scope_emissions?.[scope]).value}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {formatEmissions(summary?.scope_emissions?.[scope]).unit}
                      </span>
                      {scopeActivitiesCount > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${scopeConfig?.color} text-white`}>
                          {scopeActivitiesCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {data.categories_filled}/{data.total_categories} {t('dataEntry.categories')}
                    </span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {data.percentage}%
                      <ArrowRight className="w-3 h-3" />
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

      {/* ========== GUIDED ENTRY MODAL ========== */}
      <GuidedEntryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingActivityData(null);
        }}
        category={selectedCategory}
        scope={activeScope}
        language={language}
        isDark={isDark}
        onSubmit={handleActivitySubmit}
        editingActivity={editingActivityData}
      />


      {/* ========== TABLE VIEW MODAL ========== */}
      <AnimatePresence>
        {showTableView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTableView(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-6xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[85vh] overflow-hidden flex flex-col`}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tableViewScope === null ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                      tableViewScope === 'scope1' ? 'bg-blue-500' :
                      tableViewScope === 'scope2' ? 'bg-cyan-500' :
                      tableViewScope?.includes('amont') ? 'bg-purple-500' : 'bg-indigo-500'
                    }`}>
                      <Table className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {tableViewScope === null ? 'Bilan complet' : scopeLabels[tableViewScope]?.name}
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {getScopeActivities(tableViewScope).length} entrées • {
                          formatEmissions(tableViewScope === null 
                            ? summary?.total_emissions
                            : summary?.scope_emissions?.[tableViewScope]).value
                        } {formatEmissions(tableViewScope === null 
                            ? summary?.total_emissions
                            : summary?.scope_emissions?.[tableViewScope]).unit}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTableView(false)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto p-6">
                {getScopeActivities(tableViewScope).length === 0 ? (
                  <div className="text-center py-16">
                    <Table className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Aucune donnée saisie {tableViewScope === null ? '' : 'pour ce scope'}
                    </p>
                    <p className={`text-sm mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      Cliquez sur une catégorie pour ajouter des données
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                        <th className={`text-left py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Activité
                        </th>
                        {tableViewScope === null && (
                          <th className={`text-left py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Scope
                          </th>
                        )}
                        <th className={`text-left py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Catégorie
                        </th>
                        <th className={`text-right py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Quantité
                        </th>
                        <th className={`text-right py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Émissions
                        </th>
                        <th className={`text-right py-3 px-4 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getScopeActivities(tableViewScope).map((activity, index) => {
                        const activityScope = activity.scope || 'scope1';
                        const scopeColor = 
                          activityScope === 'scope1' ? 'text-blue-500' :
                          activityScope === 'scope2' ? 'text-cyan-500' :
                          activityScope?.includes('amont') ? 'text-purple-500' : 'text-indigo-500';
                        const scopeBgColor = 
                          activityScope === 'scope1' ? 'bg-blue-500' :
                          activityScope === 'scope2' ? 'bg-cyan-500' :
                          activityScope?.includes('amont') ? 'bg-purple-500' : 'bg-indigo-500';
                        
                        return (
                          <motion.tr
                            key={activity.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`border-b ${isDark ? 'border-slate-700/50 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                          >
                            <td className="py-4 px-4">
                              <div>
                                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.name || activity.emission_factor_name || '—'}
                                </p>
                                {activity.comments && (
                                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {activity.comments}
                                  </p>
                                )}
                              </div>
                            </td>
                            {tableViewScope === null && (
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium text-white ${scopeBgColor}`}>
                                  {scopeLabels[activityScope]?.name || activityScope}
                                </span>
                              </td>
                            )}
                            <td className="py-4 px-4">
                              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                                {getCategoryName(activity.category_id)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {activity.quantity?.toLocaleString()} {activity.original_unit || activity.unit}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-bold ${scopeColor}`}>
                                {formatEmissions(activity.emissions).value} {formatEmissions(activity.emissions).unit}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditActivityInModal(activity)}
                                  data-testid={`edit-activity-${activity.id}`}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isDark ? 'hover:bg-slate-600 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-500'
                                  }`}
                                  title="Modifier dans le formulaire"
                                >
                                  <Edit3 className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                                </button>
                                <button
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  data-testid={`delete-activity-${activity.id}`}
                                  className={`p-2 rounded-lg transition-colors hover:bg-red-500/10`}
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={`${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                        <td colSpan={tableViewScope === null ? 4 : 3} className={`py-4 px-4 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {tableViewScope === null ? 'Total général' : `Total ${scopeLabels[tableViewScope]?.name}`}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-lg font-bold ${
                            tableViewScope === null ? 'text-blue-500' :
                            tableViewScope === 'scope1' ? 'text-blue-500' :
                            tableViewScope === 'scope2' ? 'text-cyan-500' :
                            'text-purple-500'
                          }`}>
                            {formatEmissions(getScopeActivities(tableViewScope).reduce((sum, a) => sum + (a.emissions || 0), 0)).value} {formatEmissions(getScopeActivities(tableViewScope).reduce((sum, a) => sum + (a.emissions || 0), 0)).unit}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowTableView(false)}
                    className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                      isDark 
                        ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Sale Modal (for transformation/utilisation/fin_vie categories) */}
      <ProductSaleModal
        isOpen={showProductSaleModal}
        onClose={() => setShowProductSaleModal(false)}
        onSaleRecorded={fetchData}
      />
    </div>
  );
};

export default DataEntry;
