import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';
import { 
  Calendar,
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
  ShoppingBag,
  RefreshCw,
  FileText,
  PlusCircle
} from 'lucide-react';
import ProductSaleModal from '../components/ProductSaleModal';
import GuidedEntryModal from '../components/GuidedEntryModal';
import SaleEditModal from '../components/SaleEditModal';
import Scope3AvalChoiceModal from '../components/Scope3AvalChoiceModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Categories that should open product sale modal instead of regular entry
const PRODUCT_SALE_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

// Virtual "Produits vendus" card that replaces the 3 separate product categories
const PRODUITS_VENDUS_CARD = {
  code: 'produits_vendus',
  name_fr: 'Produits vendus',
  name_de: 'Verkaufte Produkte',
  scope: 'scope3_aval',
  icon: 'package',
  color: '#7c3aed' // Purple color
};

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    // Display in tonnes if >= 10 tonnes
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'tCO₂e'
    };
  } else {
    // Display in kg if < 10 tonnes
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'kgCO₂e'
    };
  }
};

/**
 * Formatage des émissions pour la TableView avec uniformisation des unités
 * L'unité est déterminée par le total (si >= 10t, tout en tonnes)
 * Affiche toujours 2 décimales pour la cohérence
 */
const formatEmissionsForTable = (valueInKg, totalEmissionsKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return '0.00 kgCO₂e';
  }
  
  // Décider de l'unité basé sur le total (même seuil que formatEmissions: 10 tonnes)
  const totalTonnes = (totalEmissionsKg || 0) / 1000;
  const useTonnes = totalTonnes >= 10;
  
  if (useTonnes) {
    const tonnes = valueInKg / 1000;
    return `${tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO₂e`;
  } else {
    return `${valueInKg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO₂e`;
  }
};

const iconMap = {
  truck: Truck, flame: Flame, factory: Factory, wind: Wind, zap: Zap,
  thermometer: Thermometer, snowflake: Snowflake, 'shopping-cart': ShoppingCart,
  tool: Wrench, fuel: Fuel, trash: Trash2, plane: Plane, car: Car,
  building: Building, settings: Settings, power: Power, recycle: Recycle,
  home: Home, store: Store, 'trending-up': TrendingUp, package: Package
};

const DataEntry = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { currentFiscalYear, fiscalYears } = useFiscalYear();
  const [activeScope, setActiveScope] = useState('scope1');
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [excludedCategories, setExcludedCategories] = useState([]);

  // Table view state
  const [showTableView, setShowTableView] = useState(false);
  const [tableViewScope, setTableViewScope] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState(null);

  // Confirm dialog state (remplace window.confirm qui est bloqué en sandbox)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Product sale modal state
  const [showProductSaleModal, setShowProductSaleModal] = useState(false);

  // Scope 3 Aval choice modal state (FEAT-04)
  const [showScope3AvalChoice, setShowScope3AvalChoice] = useState(false);

  // Sale edit modal state (for editing linked sale activities)
  const [showSaleEditModal, setShowSaleEditModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  // Reload data when fiscal year changes
  useEffect(() => {
    fetchData();
  }, [currentFiscalYear?.id]);

  const fetchData = async () => {
    try {
      // Build query params with fiscal year filter
      const fiscalYearParam = currentFiscalYear?.id ? `&fiscal_year_id=${currentFiscalYear.id}` : '';
      
      const [categoriesRes, activitiesRes, summaryRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/activities?limit=500${fiscalYearParam}`),
        axios.get(`${API_URL}/api/dashboard/summary${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`),
        axios.get(`${API_URL}/api/dashboard/category-stats${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`)
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

  // Filter categories for the active scope, excluding product sale categories (they will be merged)
  const baseScopeCategories = categories.filter(c => 
    c.scope === activeScope && 
    !excludedCategories.includes(c.code) &&
    !PRODUCT_SALE_CATEGORIES.includes(c.code) // Exclude the 3 product categories
  );
  
  // Add the merged "Produits vendus" card if we're on scope3_aval
  // Insert it after "actifs_loues_aval" to maintain proper GHG Protocol order
  const scopeCategories = (() => {
    if (activeScope !== 'scope3_aval') {
      return baseScopeCategories;
    }
    
    // Find the index of "actifs_loues_aval" to insert "Produits vendus" after it
    const actifsLouesIndex = baseScopeCategories.findIndex(c => c.code === 'actifs_loues_aval');
    
    if (actifsLouesIndex !== -1) {
      // Insert after "actifs_loues_aval"
      const result = [...baseScopeCategories];
      result.splice(actifsLouesIndex + 1, 0, PRODUITS_VENDUS_CARD);
      return result;
    }
    
    // Fallback: add at the end if "actifs_loues_aval" not found
    return [...baseScopeCategories, PRODUITS_VENDUS_CARD];
  })();
  
  // Calculate activity count for the merged "Produits vendus" card
  // Includes both product sheet sales (unique sale_id) and direct entry activities
  const getProductSalesCount = () => {
    const productSaleIds = new Set();
    let directEntryCount = 0;
    (activities || []).forEach(activity => {
      if (PRODUCT_SALE_CATEGORIES.includes(activity.category_id)) {
        if (activity.sale_id) {
          productSaleIds.add(activity.sale_id);
        } else if (!activity.group_index || activity.group_index === 0) {
          // Count direct entries (non-grouped or primary in group)
          directEntryCount++;
        }
      }
    });
    return productSaleIds.size + directEntryCount;
  };

  // Category 3.3 message state
  const [showCategory33Message, setShowCategory33Message] = useState(false);

  const handleCategoryClick = (category) => {
    // Check if this is category 3.3 (auto-calculated from Scope 1 & 2)
    if (category.code === 'activites_combustibles_energie') {
      setShowCategory33Message(true);
      return;
    }
    
    // Check if this is the merged "Produits vendus" card or individual product category
    // FEAT-04: Show choice modal instead of directly opening ProductSaleModal
    if (category.code === 'produits_vendus' || PRODUCT_SALE_CATEGORIES.includes(category.code)) {
      setShowScope3AvalChoice(true);
      return;
    }
    
    setSelectedCategory(category);
    setEditingActivityData(null);
    setShowModal(true);
  };

  // Open modal in edit mode with pre-filled data
  const handleEditActivityInModal = async (activity) => {
    // Check if this activity is part of a linked sale (has sale_id)
    if (activity.sale_id && activity.product_id) {
      // Open the Sale Edit Modal for grouped editing
      setEditingSaleId(activity.sale_id);
      setEditingProductId(activity.product_id);
      setShowSaleEditModal(true);
      return;
    }
    
    // Déterminer l'activité à éditer (principale du groupe si multi-impacts)
    let activityToEdit = activity;
    
    // Si l'activité fait partie d'un groupe et n'est pas la principale
    if (activity.group_id && activity.group_index > 0) {
      try {
        // Charger le groupe complet pour récupérer l'activité principale
        const response = await axios.get(`${API_URL}/api/activities/groups/${activity.group_id}`);
        const mainActivity = response.data.activities.find(a => a.group_index === 0);
        if (mainActivity) {
          activityToEdit = {
            ...mainActivity,
            // Garder une référence au groupe complet pour l'affichage
            _groupActivities: response.data.activities
          };
        }
      } catch (error) {
        console.error('Failed to load activity group:', error);
      }
    }
    
    // Utiliser entry_category pour trouver la catégorie de saisie originale
    const categoryCode = activityToEdit.entry_category || activityToEdit.category_id;
    const category = categories.find(c => c.code === categoryCode);
    if (!category) return;

    setSelectedCategory(category);
    setEditingActivityData(activityToEdit);
    setShowTableView(false);
    setShowModal(true);
  };

  // Handle activity submission from the guided modal
  const handleActivitySubmit = async (activityData) => {
    try {
      // Add fiscal year ID to associate activity with selected fiscal year
      const dataWithFiscalYear = {
        ...activityData,
        fiscal_year_id: currentFiscalYear?.id
      };
      
      if (editingActivityData) {
        // Mode édition : utiliser l'endpoint de groupe si l'activité fait partie d'un groupe
        const groupId = editingActivityData.group_id;
        if (groupId) {
          await axios.put(`${API_URL}/api/activities/groups/${groupId}`, dataWithFiscalYear);
        } else {
          await axios.put(`${API_URL}/api/activities/${editingActivityData.id}`, dataWithFiscalYear);
        }
      } else {
        // Création : peut retourner plusieurs activités si multi-impacts
        const response = await axios.post(`${API_URL}/api/activities`, dataWithFiscalYear);
        
        // Log pour debug (multi-impacts)
        if (response.data.count > 1) {
          console.log(`Créé ${response.data.count} activités (groupe ${response.data.group_id})`);
        }
      }
      fetchData();
    } catch (error) {
      console.error('Failed to save activity:', error);
      // TODO: Afficher toast d'erreur avec le message
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      }
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

  // Catégories Scope 3 Amont (pour le mapping de scope3 générique)
  const SCOPE3_AMONT_CATEGORIES = new Set([
    'biens_services_achetes', 'biens_equipement', 'activites_combustibles_energie',
    'transport_distribution_amont', 'dechets_operations', 'deplacements_professionnels',
    'deplacements_domicile_travail', 'actifs_loues_amont'
  ]);

  // Fonction pour normaliser le scope pour l'affichage (comme le backend)
  const normalizeScope = (scope, categoryId) => {
    if (!scope) return 'scope1';
    if (['scope1', 'scope2', 'scope3_amont', 'scope3_aval'].includes(scope)) return scope;
    if (scope === 'scope3_3') return 'scope3_amont'; // 3.3 = amont énergie
    if (scope === 'scope3') {
      return SCOPE3_AMONT_CATEGORIES.has(categoryId) ? 'scope3_amont' : 'scope3_aval';
    }
    return 'scope1';
  };

  const getScopeActivities = (scope) => {
    const list = scope === null
      ? [...activities]
      : activities.filter(a => normalizeScope(a.scope, a.category_id) === scope);
    return list.sort((a, b) => (b.emissions || 0) - (a.emissions || 0));
  };

  // Suppression d'une activité (gère les groupes)
  const handleDeleteActivity = async (activity) => {
    // Fonction de suppression effective
    const performDelete = async () => {
      try {
        if (activity.group_id && activity.group_size > 1) {
          await axios.delete(`${API_URL}/api/activities/groups/${activity.group_id}`);
        } else {
          await axios.delete(`${API_URL}/api/activities/${activity.id}`);
        }
        fetchData();
      } catch (error) {
        console.error('Failed to delete activity:', error);
      }
    };

    // Si l'activité fait partie d'un groupe multi-impacts, demander confirmation
    if (activity.group_id && activity.group_size > 1) {
      setConfirmDialog({
        isOpen: true,
        title: 'Supprimer le groupe',
        message: `Cette saisie contient ${activity.group_size} impacts liés. Voulez-vous supprimer les ${activity.group_size} activités ?`,
        onConfirm: performDelete,
      });
    } else {
      // Pour une activité simple, supprimer directement
      await performDelete();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Empty state: No fiscal year created
  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div data-testid="data-entry-empty-state" className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-lg w-full text-center p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-xl`}
        >
          {/* Illustration */}
          <div className="relative mb-6">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Calendar className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className={`absolute -bottom-1 -right-1 left-1/2 ml-6 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}
            >
              <PlusCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {language === 'fr' ? 'Créez votre premier exercice fiscal' : 'Erstellen Sie Ihr erstes Geschäftsjahr'}
          </h2>

          {/* Description */}
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {language === 'fr' 
              ? 'Pour commencer à saisir vos données d\'émissions, vous devez d\'abord créer un exercice fiscal. Cela permettra d\'organiser vos données par période.'
              : 'Um mit der Eingabe Ihrer Emissionsdaten zu beginnen, müssen Sie zunächst ein Geschäftsjahr erstellen. Dadurch können Ihre Daten nach Zeitraum organisiert werden.'
            }
          </p>

          {/* Info box */}
          <div className={`rounded-xl p-4 mb-6 text-left ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' 
                  ? 'Un exercice fiscal correspond généralement à une année calendaire (janvier-décembre) ou à l\'année comptable de votre entreprise.'
                  : 'Ein Geschäftsjahr entspricht in der Regel einem Kalenderjahr (Januar-Dezember) oder dem Buchhaltungsjahr Ihres Unternehmens.'
                }
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/general-info"
            data-testid="create-fiscal-year-btn"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            <PlusCircle className="w-5 h-5" />
            {language === 'fr' ? 'Créer un exercice fiscal' : 'Geschäftsjahr erstellen'}
          </Link>

          {/* Secondary link */}
          <p className={`mt-4 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            {language === 'fr' ? 'Vous serez redirigé vers les ' : 'Sie werden zu den '}
            <Link to="/general-info" className="text-blue-500 hover:underline">
              {language === 'fr' ? 'informations générales' : 'allgemeinen Informationen'}
            </Link>
          </p>
        </motion.div>
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

        <div className="h-8"></div>

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
            // For the merged "Produits vendus" card, use unique sale count
            const count = category.code === 'produits_vendus' 
              ? getProductSalesCount() 
              : (categoryStats[category.code]?.count || 0);
            
            return (
              <motion.div
                key={category.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category)}
                data-testid={`category-card-${category.code}`}
                className="relative cursor-pointer"
              >
                <div
                  className="p-6 rounded-2xl text-white min-h-[140px] flex flex-col justify-between"
                  style={{ backgroundColor: category.color }}
                >
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10" style={{ color: category.color }}>
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
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
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
                      {(() => {
                        // Calculer le total une fois pour uniformiser l'unité dans toute la table
                        const tableActivities = getScopeActivities(tableViewScope);
                        const tableTotalEmissions = tableActivities.reduce((sum, a) => sum + (a.emissions || 0), 0);
                        
                        return tableActivities.map((activity, index) => {
                        const activityScope = activity.scope || 'scope1';
                        const scopeColor = 
                          activityScope === 'scope1' ? 'text-blue-500' :
                          activityScope === 'scope2' ? 'text-cyan-500' :
                          activityScope === 'scope3_3' ? 'text-amber-500' :
                          activityScope?.includes('amont') || activityScope === 'scope3' ? 'text-purple-500' : 'text-indigo-500';
                        const scopeBgColor = 
                          activityScope === 'scope1' ? 'bg-blue-500' :
                          activityScope === 'scope2' ? 'bg-cyan-500' :
                          activityScope === 'scope3_3' ? 'bg-amber-500' :
                          activityScope?.includes('amont') || activityScope === 'scope3' ? 'bg-purple-500' : 'bg-indigo-500';
                        
                        // Indicateurs de groupe multi-impacts
                        const isGrouped = activity.group_size > 1;
                        const isSecondary = activity.group_index > 0;
                        
                        // Une activité est "liée" si elle est secondaire dans un groupe
                        // Ces lignes sont en lecture seule
                        const isLinkedActivity = isSecondary;
                        
                        return (
                          <motion.tr
                            key={activity.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`border-b ${isDark ? 'border-slate-700/50' : 'border-gray-100'} transition-colors ${
                              isLinkedActivity 
                                ? (isDark ? 'bg-slate-700/40' : 'bg-gray-100/80') 
                                : (isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50')
                            }`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {/* Indicateur de ligne liée (activité secondaire) */}
                                {isLinkedActivity ? (
                                  <span 
                                    className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
                                    title="Ligne créée automatiquement (amont énergie)"
                                  >
                                    ↳
                                  </span>
                                ) : isGrouped ? (
                                  <span 
                                    className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}
                                    title={`Groupe de ${activity.group_size} impacts`}
                                  >
                                    🔗 {activity.group_size}
                                  </span>
                                ) : null}
                                <div>
                                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-70' : ''}`}>
                                    {activity.name || activity.emission_factor_name || '—'}
                                  </p>
                                  {activity.comments && (
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                      {activity.comments}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {tableViewScope === null && (
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium text-white ${scopeBgColor}`}>
                                  {activityScope === 'scope3_3' ? 'Scope 3.3' : (scopeLabels[activityScope]?.name || activityScope)}
                                </span>
                              </td>
                            )}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'} ${isLinkedActivity ? 'opacity-70' : ''}`}>
                                  {getCategoryName(activity.category_id)}
                                </span>
                                {/* FEAT-04: Badge de traçabilité pour les activités Scope 3 Aval */}
                                {PRODUCT_SALE_CATEGORIES.includes(activity.category_id) && !isLinkedActivity && (
                                  activity.sale_id ? (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                      isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                                    }`} data-testid={`badge-product-sheet-${activity.id}`} title={language === 'fr' ? 'Activité liée à une fiche produit' : 'Verknüpft mit Produktblatt'}>
                                      <Package className="w-3 h-3 inline mr-0.5" />
                                      {language === 'fr' ? 'Fiche' : 'Blatt'}
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                      isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                                    }`} data-testid={`badge-direct-entry-${activity.id}`} title={language === 'fr' ? 'Saisie directe (sans fiche produit)' : 'Direkteingabe (ohne Produktblatt)'}>
                                      <FileText className="w-3 h-3 inline mr-0.5" />
                                      {language === 'fr' ? 'Direct' : 'Direkt'}
                                    </span>
                                  )
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-70' : ''}`}>
                                {activity.quantity?.toLocaleString()} {activity.original_unit || activity.unit}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-bold ${scopeColor} ${isLinkedActivity ? 'opacity-80' : ''}`}>
                                {formatEmissionsForTable(activity.emissions, tableTotalEmissions)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {/* Boutons d'action masqués pour les lignes liées (lecture seule) */}
                              {isLinkedActivity ? (
                                <span 
                                  className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
                                  title="Modifiable via l'activité principale"
                                >
                                  Auto
                                </span>
                              ) : (
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
                                  onClick={() => {
                                    // If this is a linked sale activity, open the sale edit modal instead of deleting directly
                                    if (activity.sale_id && activity.product_id) {
                                      handleEditActivityInModal(activity);
                                    } else {
                                      handleDeleteActivity(activity);
                                    }
                                  }}
                                  data-testid={`delete-activity-${activity.id}`}
                                  className={`p-2 rounded-lg transition-colors hover:bg-red-500/10`}
                                  title={activity.sale_id ? "Gérer la vente" : (isGrouped ? `Supprimer le groupe (${activity.group_size} impacts)` : "Supprimer")}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                              )}
                            </td>
                          </motion.tr>
                        );
                      });
                      })()}
                    </tbody>
                    <tfoot>
                      {(() => {
                        // Recalculer le total pour le pied de table avec la même logique
                        const footerActivities = getScopeActivities(tableViewScope);
                        const footerTotalEmissions = footerActivities.reduce((sum, a) => sum + (a.emissions || 0), 0);
                        
                        return (
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
                            {formatEmissionsForTable(footerTotalEmissions, footerTotalEmissions)}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                        );
                      })()}
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

      {/* ========== SCOPE 3 AVAL CHOICE MODAL (FEAT-04) ========== */}
      <Scope3AvalChoiceModal
        isOpen={showScope3AvalChoice}
        onClose={() => setShowScope3AvalChoice(false)}
        onChooseProductSheet={() => setShowProductSaleModal(true)}
        onChooseDirectEntry={(categoryCode) => {
          // Find the real category object from the full categories list
          const cat = categories.find(c => c.code === categoryCode);
          if (cat) {
            setSelectedCategory(cat);
            setEditingActivityData(null);
            setShowModal(true);
          }
        }}
        language={language}
        isDark={isDark}
      />

      {/* Product Sale Modal (for transformation/utilisation/fin_vie categories) */}
      <ProductSaleModal
        isOpen={showProductSaleModal}
        onClose={() => setShowProductSaleModal(false)}
        onSaleRecorded={fetchData}
      />

      {/* Category 3.3 Information Modal */}
      <AnimatePresence>
        {showCategory33Message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCategory33Message(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
            >
              {/* Header with icon */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('dataEntry.category33.title')}</h3>
                    <p className="text-white/80 text-sm">Scope 3.3</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <p className={`${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t('dataEntry.category33.message')}
                </p>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <RefreshCw className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                      {t('dataEntry.category33.autoCalculated')}
                    </p>
                  </div>
                </div>
                
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('dataEntry.category33.noAction')}
                </p>
              </div>
              
              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setShowCategory33Message(false)}
                  className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Edit Modal (for editing/deleting linked sale activities) */}
      <SaleEditModal
        isOpen={showSaleEditModal}
        onClose={() => {
          setShowSaleEditModal(false);
          setEditingSaleId(null);
          setEditingProductId(null);
        }}
        saleId={editingSaleId}
        productId={editingProductId}
        onSaleUpdated={fetchData}
      />

      {/* Dialog de confirmation (remplace window.confirm bloqué en sandbox) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Supprimer"
        cancelText="Annuler"
        isDark={isDark}
        variant="danger"
      />
    </div>
  );
};

export default DataEntry;
