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
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const iconMap = {
  truck: Truck,
  flame: Flame,
  factory: Factory,
  wind: Wind,
  zap: Zap,
  thermometer: Thermometer,
  snowflake: Snowflake,
  'shopping-cart': ShoppingCart,
  tool: Wrench,
  fuel: Fuel,
  trash: Trash2,
  plane: Plane,
  car: Car,
  building: Building,
  settings: Settings,
  power: Power,
  recycle: Recycle,
  home: Home,
  store: Store,
  'trending-up': TrendingUp,
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
  const [emissionFactors, setEmissionFactors] = useState([]);
  const fileInputRef = useRef(null);

  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit: 'kWh',
    emission_factor_id: '',
    manual_emission_factor: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    comments: ''
  });
  const [excludedCategories, setExcludedCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, activitiesRes, summaryRes, statsRes, factorsRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/activities`),
        axios.get(`${API_URL}/dashboard/summary`),
        axios.get(`${API_URL}/dashboard/category-stats`),
        axios.get(`${API_URL}/emission-factors`)
      ]);
      setCategories(categoriesRes.data || []);
      setActivities(activitiesRes.data || []);
      setSummary(summaryRes.data);
      setCategoryStats(statsRes.data || {});
      setEmissionFactors(factorsRes.data || []);
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

  // Filter categories: only show active (non-excluded) categories for the current scope
  const scopeCategories = categories.filter(c => 
    c.scope === activeScope && !excludedCategories.includes(c.code)
  );

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setActivityForm({
      ...activityForm,
      category_id: category.code,
      scope: activeScope
    });
    setShowModal(true);
  };

  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/activities`, {
        ...activityForm,
        category_id: selectedCategory.code,
        scope: activeScope
      });
      setShowModal(false);
      setActivityForm({
        name: '',
        description: '',
        quantity: 0,
        unit: 'kWh',
        emission_factor_id: '',
        manual_emission_factor: '',
        date: new Date().toISOString().split('T')[0],
        source: '',
        comments: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };

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

  const units = ['kWh', 'MWh', 'L', 'm3', 'kg', 't', 'km', 'passager.km', 'unit', '€'];

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
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.title')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('dataEntry.subtitle')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-element-btn"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('dataEntry.addElement')}
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
          >
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
        {/* Total Balance */}
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

        {/* Progress by Scope */}
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
                      {scopeConfig?.name} {scopeConfig?.id.includes('scope3') ? '' : ''} 
                      {scope === 'scope3_amont' && '- Amont'}
                      {scope === 'scope3_aval' && '- Aval'}
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="import-csv-btn"
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isDark 
                  ? 'border-slate-700 hover:bg-slate-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5 text-blue-500" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('dataEntry.importCSV')}</span>
            </button>
            <button
              onClick={handleExport}
              data-testid="export-data-btn"
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isDark 
                  ? 'border-slate-700 hover:bg-slate-700' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Download className="w-5 h-5 text-green-500" />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{t('dataEntry.exportData')}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Activity Modal */}
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
              className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('dataEntry.addElement')}
                  {selectedCategory && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      - {language === 'fr' ? selectedCategory.name_fr : selectedCategory.name_de}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitActivity} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('activity.name')} *
                  </label>
                  <input
                    type="text"
                    value={activityForm.name}
                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                    data-testid="activity-name-input"
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {t('activity.quantity')} *
                    </label>
                    <input
                      type="number"
                      value={activityForm.quantity}
                      onChange={(e) => setActivityForm({ ...activityForm, quantity: parseFloat(e.target.value) || 0 })}
                      data-testid="activity-quantity-input"
                      required
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {t('activity.unit')}
                    </label>
                    <select
                      value={activityForm.unit}
                      onChange={(e) => setActivityForm({ ...activityForm, unit: e.target.value })}
                      data-testid="activity-unit-select"
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('activity.emissionFactor')}
                  </label>
                  <select
                    value={activityForm.emission_factor_id}
                    onChange={(e) => setActivityForm({ ...activityForm, emission_factor_id: e.target.value })}
                    data-testid="activity-ef-select"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">{t('activity.selectEmissionFactor')}</option>
                    {emissionFactors
                      .filter(ef => !selectedCategory || ef.category === selectedCategory.code)
                      .map(ef => (
                        <option key={ef.id} value={ef.id}>
                          {ef.name} ({ef.value} {ef.unit})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('activity.orEnterManually')} - {t('activity.manualFactor')}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={activityForm.manual_emission_factor}
                    onChange={(e) => setActivityForm({ ...activityForm, manual_emission_factor: e.target.value })}
                    data-testid="activity-manual-ef-input"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('activity.date')}
                  </label>
                  <input
                    type="date"
                    value={activityForm.date}
                    onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                    data-testid="activity-date-input"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('activity.comments')}
                  </label>
                  <textarea
                    value={activityForm.comments}
                    onChange={(e) => setActivityForm({ ...activityForm, comments: e.target.value })}
                    data-testid="activity-comments-input"
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                      isDark 
                        ? 'border-slate-600 hover:bg-slate-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-activity-btn"
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataEntry;
