import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Users, 
  Square, 
  Banknote,
  Layers,
  Check,
  Save,
  Loader2,
  Info,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Car,
  Flame,
  Zap,
  Package,
  Truck,
  Plane,
  Trash2,
  Recycle,
  Factory,
  ShoppingCart,
  Home,
  Briefcase as BriefcaseIcon,
  Pencil,
  ChevronDown,
  ChevronUp,
  Building,
  Key,
  Store,
  Snowflake,
  PiggyBank,
  Wind
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const GeneralInfo = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [company, setCompany] = useState({
    name: '',
    location: '',
    sector: '',
    entity_type: 'private_company',
    employees: 0,
    surface_area: 0,
    revenue: 0,
    consolidation_approach: 'operational_control',
    excluded_categories: [],
    fiscal_year_start_month: 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState([]);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({
    hasVehicles: null,
    hasCombustion: null,
    hasFugitiveEmissions: null,
    hasProcessEmissions: null,
    usesElectricity: null,
    usesHeating: null,
    usesCooling: null,
    buysMaterials: null,
    hasWaste: null,
    hasFreight: null,
    hasBusinessTravel: null,
    hasCommuting: null,
    hasLeasedAssetsUpstream: null,
    sellsProducts: null, // Couvre les 3 catégories: transformation, utilisation, fin de vie
    hasDownstreamTransport: null,
    hasLeasedAssetsDownstream: null,
    hasFranchises: null,
    hasInvestments: null
  });

  // Codes des catégories "Produits vendus" groupées (3.10, 3.11, 3.12)
  const PRODUCT_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companyRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/companies`),
        axios.get(`${API_URL}/api/categories`)
      ]);
      if (companyRes.data) {
        setCompany({
          ...companyRes.data,
          entity_type: companyRes.data.entity_type || 'private_company',
          fiscal_year_start_month: companyRes.data.fiscal_year_start_month || 1
        });
      }
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (company.id) {
        await axios.put(`${API_URL}/api/companies`, company);
      } else {
        const response = await axios.post(`${API_URL}/api/companies`, company);
        setCompany(response.data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryCode) => {
    setCompany(prev => ({
      ...prev,
      excluded_categories: prev.excluded_categories?.includes(categoryCode)
        ? prev.excluded_categories.filter(c => c !== categoryCode)
        : [...(prev.excluded_categories || []), categoryCode]
    }));
  };

  // Toggle groupé pour les 3 catégories "Produits vendus" (3.10, 3.11, 3.12)
  const toggleProductCategories = () => {
    const allProductsIncluded = PRODUCT_CATEGORIES.every(
      code => !company.excluded_categories?.includes(code)
    );
    
    setCompany(prev => {
      if (allProductsIncluded) {
        // Si toutes sont incluses, on les exclut toutes
        return {
          ...prev,
          excluded_categories: [...(prev.excluded_categories || []), ...PRODUCT_CATEGORIES]
        };
      } else {
        // Sinon, on les inclut toutes (retire des exclus)
        return {
          ...prev,
          excluded_categories: (prev.excluded_categories || []).filter(
            c => !PRODUCT_CATEGORIES.includes(c)
          )
        };
      }
    });
  };

  // Vérifie si les catégories produits sont activées (pour l'affichage de la checkbox)
  const areProductCategoriesIncluded = () => {
    return PRODUCT_CATEGORIES.every(
      code => !company.excluded_categories?.includes(code)
    );
  };

  // ==================== WIZARD CONFIGURATION ====================
  
  const wizardSteps = [
    {
      id: 'intro',
      title: 'Configuration guidée',
      subtitle: 'Répondez à quelques questions pour configurer automatiquement votre périmètre',
      questions: []
    },
    {
      id: 'scope1',
      title: 'Scope 1 - Émissions directes',
      subtitle: 'Identifions vos sources d\'émissions directes',
      questions: [
        {
          key: 'hasVehicles',
          icon: Car,
          text: 'Possédez-vous des véhicules d\'entreprise ?',
          hint: 'Voitures, camions, engins de chantier...',
          categories: ['combustion_mobile']
        },
        {
          key: 'hasCombustion',
          icon: Flame,
          text: 'Avez-vous des installations de combustion sur site ?',
          hint: 'Chaudières, générateurs, fours industriels...',
          categories: ['combustion_fixe']
        },
        {
          key: 'hasFugitiveEmissions',
          icon: Factory,
          text: 'Avez-vous des fuites potentielles de fluides réfrigérants ?',
          hint: 'Climatisation, réfrigération de machines...',
          categories: ['emissions_fugitives']
        },
        {
          key: 'hasProcessEmissions',
          icon: Wind,
          text: 'Avez-vous des fuites potentielles de gaz à effet de serre dans vos procédés ?',
          hint: 'Procédés chimiques, solvants, gaz de procédés industriels...',
          categories: ['emissions_procedes']
        }
      ]
    },
    {
      id: 'scope2',
      title: 'Scope 2 - Énergie achetée',
      subtitle: 'Identifions vos achats d\'énergie',
      questions: [
        {
          key: 'usesElectricity',
          icon: Zap,
          text: 'Etes-vous propriétaires des locaux consommant de l\'électricité ?',
          hint: 'Bureaux, ateliers, éclairage...',
          categories: ['electricite']
        },
        {
          key: 'usesHeating',
          icon: Flame,
          text: 'Achetez-vous de la chaleur ou de la vapeur via un réseau ?',
          hint: 'Chauffage urbain, vapeur industrielle...',
          categories: ['chaleur_vapeur']
        },
        {
          key: 'usesCooling',
          icon: Snowflake,
          text: 'Achetez-vous du refroidissement via un réseau de froid ?',
          hint: 'Refroidissement urbain, froid industriel...',
          categories: ['refroidissement']
        }
      ]
    },
    {
      id: 'scope3_amont',
      title: 'Scope 3 Amont - Chaîne de valeur',
      subtitle: 'Émissions liées à vos achats et activités',
      questions: [
        {
          key: 'buysMaterials',
          icon: Package,
          text: 'Achetez-vous des biens ou services nécessaires à vos opérations susceptibles de générer des émissions significatives sur leur cycle de vie ?',
          hint: 'Matières premières, fournitures, services...',
          categories: ['biens_services_achetes', 'biens_equipement']
        },
        {
          key: 'hasWaste',
          icon: Trash2,
          text: 'Générez-vous des déchets de manière significative ou des déchets spéciaux ?',
          hint: 'Déchets de production, emballages, papiers...',
          categories: ['dechets_operations']
        },
        {
          key: 'hasFreight',
          icon: Truck,
          text: 'Faites-vous transporter des marchandises (fret) par des prestataires externes ?',
          hint: 'Transport de matières premières, composants...',
          categories: ['transport_distribution_amont']
        },
        {
          key: 'hasBusinessTravel',
          icon: Plane,
          text: 'Vos employés font-ils des déplacements professionnels ?',
          hint: 'Voyages d\'affaires, visites clients...',
          categories: ['deplacements_professionnels']
        },
        {
          key: 'hasCommuting',
          icon: Home,
          text: 'Vos employés se déplacent-ils entre leur domicile et le travail ?',
          hint: 'Trajets quotidiens des employés',
          categories: ['deplacements_domicile_travail']
        },
        {
          key: 'hasLeasedAssetsUpstream',
          icon: Building,
          text: 'Utilisez-vous des locaux, bâtiments, véhicules, machines ou équipements loués ?',
          hint: 'Actifs que vous louez à un tiers pour votre usage',
          categories: ['actifs_loues_amont']
        }
      ]
    },
    {
      id: 'scope3_aval',
      title: 'Scope 3 Aval - Produits vendus',
      subtitle: 'Émissions liées à vos produits après vente',
      questions: [
        {
          key: 'sellsProducts',
          icon: ShoppingCart,
          text: 'Vendez-vous des produits physiques ?',
          hint: 'Ceci active les 3 catégories : transformation, utilisation et fin de vie des produits vendus',
          categories: ['transformation_produits', 'utilisation_produits', 'fin_vie_produits']
        },
        {
          key: 'hasDownstreamTransport',
          icon: Truck,
          text: 'Faites-vous livrer vos produits aux clients ?',
          hint: 'Distribution, livraison finale...',
          categories: ['transport_distribution_aval']
        },
        {
          key: 'hasLeasedAssetsDownstream',
          icon: Key,
          text: 'Louez-vous à des clients des actifs (produits, équipements, véhicules, bâtiments) que vous possédez, et qui consomment de l\'énergie ou génèrent des émissions ?',
          hint: 'Actifs mis en location à des tiers',
          categories: ['actifs_loues_aval']
        },
        {
          key: 'hasFranchises',
          icon: Store,
          text: 'Votre organisation exploite-t-elle un réseau de franchises (en tant que franchiseur) ?',
          hint: 'Réseau de franchisés opérant sous votre marque',
          categories: ['franchises']
        },
        {
          key: 'hasInvestments',
          icon: PiggyBank,
          text: 'Votre organisation détient-elle des investissements financiers ou des participations susceptibles d\'être associés à des émissions ?',
          hint: 'Actions, obligations, prêts, fonds, capital-risque...',
          categories: ['investissements']
        }
      ]
    },
    {
      id: 'summary',
      title: 'Récapitulatif',
      subtitle: 'Voici les catégories sélectionnées selon vos réponses',
      questions: []
    }
  ];

  const handleWizardAnswer = (key, value) => {
    setWizardAnswers(prev => ({ ...prev, [key]: value }));
  };

  const getSelectedCategoriesFromWizard = () => {
    const selected = new Set();
    
    wizardSteps.forEach(step => {
      step.questions?.forEach(q => {
        if (wizardAnswers[q.key] === true) {
          q.categories.forEach(cat => selected.add(cat));
        }
      });
    });
    
    // Always include energy upstream (3.3) if any scope 1 or 2 categories are selected
    const scope1or2 = ['combustion_mobile', 'combustion_fixe', 'emissions_fugitives', 'emissions_procedes', 'electricite', 'chaleur_vapeur', 'refroidissement'];
    if (scope1or2.some(cat => selected.has(cat))) {
      selected.add('activites_combustibles_energie');
    }
    
    return selected;
  };

  const applyWizardResults = () => {
    const selectedCategories = getSelectedCategoriesFromWizard();
    const allCategoryCodes = categories.map(c => c.code);
    
    // Categories NOT selected by wizard should be excluded
    const newExcluded = allCategoryCodes.filter(code => !selectedCategories.has(code));
    
    setCompany(prev => ({
      ...prev,
      excluded_categories: newExcluded
    }));
    
    setShowWizard(false);
    setWizardStep(0);
  };

  const resetWizard = () => {
    setWizardStep(0);
    setWizardAnswers({
      hasVehicles: null,
      hasCombustion: null,
      hasFugitiveEmissions: null,
      hasProcessEmissions: null,
      usesElectricity: null,
      usesHeating: null,
      usesCooling: null,
      buysMaterials: null,
      hasWaste: null,
      hasFreight: null,
      hasBusinessTravel: null,
      hasCommuting: null,
      hasLeasedAssetsUpstream: null,
      sellsProducts: null, // Couvre les 3 catégories produits
      hasDownstreamTransport: null,
      hasLeasedAssetsDownstream: null,
      hasFranchises: null,
      hasInvestments: null
    });
  };

  const openWizard = () => {
    resetWizard();
    setShowWizard(true);
  };

  // Check if entity is private company (shows revenue and consolidation fields)
  const isPrivateCompany = company.entity_type === 'private_company';

  const entityTypes = [
    { value: 'private_company', label: language === 'fr' ? 'Entreprise privée' : 'Privatunternehmen' },
    { value: 'public_admin', label: language === 'fr' ? 'Administration publique' : 'Öffentliche Verwaltung' },
    { value: 'association', label: language === 'fr' ? 'Association' : 'Verein' },
    { value: 'foundation', label: language === 'fr' ? 'Fondation' : 'Stiftung' },
    { value: 'other', label: language === 'fr' ? 'Autre' : 'Andere' }
  ];

  const sectors = [
    'manufacturing', 'services', 'technology', 'retail', 'construction',
    'transport', 'energy', 'agriculture', 'healthcare', 'education',
    'finance', 'hospitality', 'other'
  ];

  const consolidationApproaches = [
    { value: 'operational_control', label: t('company.operationalControl') },
    { value: 'financial_control', label: t('company.financialControl') },
    { value: 'equity_share', label: t('company.equityShare') }
  ];

  const scopeCategories = {
    scope1: categories.filter(c => c.scope === 'scope1'),
    scope2: categories.filter(c => c.scope === 'scope2'),
    scope3_amont: categories.filter(c => c.scope === 'scope3_amont'),
    scope3_aval: categories.filter(c => c.scope === 'scope3_aval'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="general-info-page" className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('nav.generalInfo')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('company.subtitle')}
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.95 }}
          data-testid="save-company-btn"
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            saved 
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          } disabled:opacity-50`}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              {t('common.success')}
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {t('common.save')}
            </>
          )}
        </motion.button>
      </div>

      {/* Company Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('company.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <Building2 className="w-4 h-4" />
              {t('company.name')}
            </label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              data-testid="company-name-input"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              placeholder="Entreprise Demo"
            />
          </div>

          {/* Location */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <MapPin className="w-4 h-4" />
              {t('company.location')}
            </label>
            <input
              type="text"
              value={company.location}
              onChange={(e) => setCompany({ ...company, location: e.target.value })}
              data-testid="company-location-input"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              placeholder="Fribourg, Suisse"
            />
          </div>

          {/* Sector */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <Briefcase className="w-4 h-4" />
              {t('company.sector')}
            </label>
            <select
              value={company.sector}
              onChange={(e) => setCompany({ ...company, sector: e.target.value })}
              data-testid="company-sector-select"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="">{t('company.selectSector')}</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{t(`sectors.${sector}`)}</option>
              ))}
            </select>
          </div>

          {/* Entity Type */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <Building2 className="w-4 h-4" />
              {language === 'fr' ? "Type d'entité" : 'Unternehmenstyp'}
            </label>
            <select
              value={company.entity_type || 'private_company'}
              onChange={(e) => setCompany({ ...company, entity_type: e.target.value })}
              data-testid="company-entity-type-select"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {entityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Employees */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <Users className="w-4 h-4" />
              {t('company.employees')}
            </label>
            <input
              type="number"
              value={company.employees === 0 ? '' : company.employees}
              onChange={(e) => setCompany({ ...company, employees: parseInt(e.target.value) || 0 })}
              placeholder="0"
              data-testid="company-employees-input"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* Surface Area */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <Square className="w-4 h-4" />
              {t('company.surfaceArea')}
            </label>
            <input
              type="number"
              value={company.surface_area === 0 ? '' : company.surface_area}
              onChange={(e) => setCompany({ ...company, surface_area: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              data-testid="company-surface-input"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* Revenue - Only for private companies */}
          {isPrivateCompany && (
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <Banknote className="w-4 h-4" />
                {t('company.revenue')} (kCHF)
              </label>
              <input
                type="number"
                value={company.revenue === 0 ? '' : company.revenue}
                onChange={(e) => setCompany({ ...company, revenue: parseFloat(e.target.value) || 0 })}
                data-testid="company-revenue-input"
                placeholder="ex: 1500"
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              />
            </div>
          )}

          {/* Consolidation Approach - Only for private companies */}
          {isPrivateCompany && (
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                <Layers className="w-4 h-4" />
                {t('company.consolidationApproach')}
              </label>
              <select
                value={company.consolidation_approach}
                onChange={(e) => setCompany({ ...company, consolidation_approach: e.target.value })}
                data-testid="company-consolidation-select"
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                {consolidationApproaches.map(approach => (
                  <option key={approach.value} value={approach.value}>{approach.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Scope Perimeter Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
      >
        <div className="flex items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('scope.perimeter')}
            </h2>
          </div>
        </div>
        <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('scope.perimeterDesc')}
        </p>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={openWizard}
            data-testid="wizard-config-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/30"
          >
            <Wand2 className="w-4 h-4" />
            Configuration guidée
          </button>
          <button
            onClick={() => setShowManualConfig(!showManualConfig)}
            data-testid="manual-config-btn"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              showManualConfig
                ? isDark 
                  ? 'bg-slate-600 text-white hover:bg-slate-500' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : isDark 
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Pencil className="w-4 h-4" />
            Configuration manuelle
            {showManualConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>



        {/* Manual Configuration Section */}
        <AnimatePresence>
          {showManualConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Scope 1 */}
              <div className="mb-6">
                <h3 className="text-blue-500 font-semibold mb-3">{t('scope.scope1')} - {t('scope.scope1Title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scopeCategories.scope1.map(cat => (
                    <label
                      key={cat.code}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        !company.excluded_categories?.includes(cat.code)
                          ? isDark ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-200'
                          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!company.excluded_categories?.includes(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {language === 'fr' ? cat.name_fr : cat.name_de}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scope 2 */}
              <div className="mb-6">
                <h3 className="text-cyan-500 font-semibold mb-3">{t('scope.scope2')} - {t('scope.scope2Title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scopeCategories.scope2.map(cat => (
                    <label
                      key={cat.code}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        !company.excluded_categories?.includes(cat.code)
                          ? isDark ? 'bg-cyan-500/20 border-2 border-cyan-500' : 'bg-cyan-50 border-2 border-cyan-200'
                          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!company.excluded_categories?.includes(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="w-5 h-5 rounded text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {language === 'fr' ? cat.name_fr : cat.name_de}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scope 3 Amont */}
              <div className="mb-6">
                <h3 className="text-purple-500 font-semibold mb-3">{t('scope.scope3Amont')} </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scopeCategories.scope3_amont.map(cat => (
                    <label
                      key={cat.code}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        !company.excluded_categories?.includes(cat.code)
                          ? isDark ? 'bg-purple-500/20 border-2 border-purple-500' : 'bg-purple-50 border-2 border-purple-200'
                          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!company.excluded_categories?.includes(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500"
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {language === 'fr' ? cat.name_fr : cat.name_de}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scope 3 Aval */}
              <div>
                <h3 className="text-indigo-500 font-semibold mb-3">{t('scope.scope3Aval')} </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Checkbox groupée "Produits vendus" pour les 3 catégories 3.10, 3.11, 3.12 */}
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all md:col-span-2 ${
                      areProductCategoriesIncluded()
                        ? isDark ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-indigo-50 border-2 border-indigo-200'
                        : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={areProductCategoriesIncluded()}
                      onChange={toggleProductCategories}
                      className="w-5 h-5 rounded text-indigo-500 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'fr' ? 'Produits vendus' : 'Verkaufte Produkte'}
                      </span>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'fr' 
                          ? 'Inclut : Transformation (3.10), Utilisation (3.11), Fin de vie (3.12)' 
                          : 'Enthält: Verarbeitung (3.10), Nutzung (3.11), Lebensende (3.12)'}
                      </p>
                    </div>
                  </label>
                  
                  {/* Autres catégories Scope 3 Aval (hors produits vendus) */}
                  {scopeCategories.scope3_aval
                    .filter(cat => !PRODUCT_CATEGORIES.includes(cat.code))
                    .map(cat => (
                    <label
                      key={cat.code}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        !company.excluded_categories?.includes(cat.code)
                          ? isDark ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-indigo-50 border-2 border-indigo-200'
                          : isDark ? 'bg-slate-700 border-2 border-slate-600' : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!company.excluded_categories?.includes(cat.code)}
                        onChange={() => toggleCategory(cat.code)}
                        className="w-5 h-5 rounded text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {language === 'fr' ? cat.name_fr : cat.name_de}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ==================== WIZARD MODAL ==================== */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with progress */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-purple-500/20">
                    <Wand2 className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{wizardSteps[wizardStep]?.title}</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {wizardSteps[wizardStep]?.subtitle}
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="flex gap-1">
                  {wizardSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= wizardStep ? 'bg-purple-500' : isDark ? 'bg-slate-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 max-h-[55vh]">
                {/* Intro step */}
                {wizardStep === 0 && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Wand2 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Configurons votre périmètre
                    </h3>
                    <p className={`max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      En quelques questions simples, nous allons identifier les catégories d'émissions 
                      pertinentes pour votre organisation. Vous pourrez ajuster le résultat ensuite.
                    </p>
                    <div className={`mt-8 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'} inline-flex items-center gap-3`}>
                      <Info className="w-5 h-5 text-blue-500" />
                      <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        Environ 2-3 minutes
                      </span>
                    </div>
                  </div>
                )}

                {/* Question steps */}
                {wizardStep > 0 && wizardStep < wizardSteps.length - 1 && (
                  <div className="space-y-4">
                    {wizardSteps[wizardStep].questions.map((q) => {
                      const IconComponent = q.icon;
                      const isAnswered = wizardAnswers[q.key] !== null;
                      const isYes = wizardAnswers[q.key] === true;
                      const isNo = wizardAnswers[q.key] === false;
                      
                      return (
                        <div
                          key={q.key}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isAnswered
                              ? isYes
                                ? isDark ? 'bg-green-500/10 border-green-500/50' : 'bg-green-50 border-green-200'
                                : isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                              : isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              isYes ? 'bg-green-500/20' : isDark ? 'bg-slate-600' : 'bg-gray-100'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${isYes ? 'text-green-500' : isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {q.text}
                              </p>
                              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {q.hint}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-4 ml-12">
                            <button
                              onClick={() => handleWizardAnswer(q.key, true)}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                isYes
                                  ? 'bg-green-500 text-white'
                                  : isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => handleWizardAnswer(q.key, false)}
                              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                isNo
                                  ? isDark ? 'bg-slate-500 text-white' : 'bg-gray-300 text-gray-700'
                                  : isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary step */}
                {wizardStep === wizardSteps.length - 1 && (
                  <div>
                    <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Check className="w-6 h-6 text-green-500" />
                        <span className={`font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                          Configuration terminée !
                        </span>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
                        {getSelectedCategoriesFromWizard().size} catégories seront activées selon vos réponses.
                      </p>
                    </div>
                    
                    <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Catégories sélectionnées :
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(getSelectedCategoriesFromWizard()).map(code => {
                        const cat = categories.find(c => c.code === code);
                        if (!cat) return null;
                        const scopeColor = cat.scope === 'scope1' ? 'blue' : cat.scope === 'scope2' ? 'cyan' : cat.scope === 'scope3_amont' ? 'amber' : 'indigo';
                        return (
                          <div
                            key={code}
                            className={`px-3 py-2 rounded-lg text-sm ${
                              isDark ? `bg-${scopeColor}-500/20 text-${scopeColor}-300` : `bg-${scopeColor}-50 text-${scopeColor}-700`
                            }`}
                          >
                            {language === 'fr' ? cat.name_fr : cat.name_de}
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className={`mt-6 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Vous pourrez modifier ces sélections manuellement après avoir appliqué les résultats.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  {wizardStep > 0 && (
                    <button
                      onClick={() => setWizardStep(prev => prev - 1)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Retour
                    </button>
                  )}
                  
                  <div className="flex-1" />
                  
                  {wizardStep < wizardSteps.length - 1 ? (
                    <button
                      onClick={() => setWizardStep(prev => prev + 1)}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600"
                    >
                      {wizardStep === 0 ? 'Commencer' : 'Suivant'}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={applyWizardResults}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600"
                    >
                      <Check className="w-5 h-5" />
                      Appliquer
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeneralInfo;
