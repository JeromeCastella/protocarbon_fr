import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Users, 
  Square, 
  DollarSign,
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
  Briefcase as BriefcaseIcon
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Months for fiscal year configuration
const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' }
];

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
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({
    hasVehicles: null,
    hasCombustion: null,
    hasFugitiveEmissions: null,
    usesElectricity: null,
    usesHeating: null,
    buysMaterials: null,
    hasWaste: null,
    hasFreight: null,
    hasBusinessTravel: null,
    hasCommuting: null,
    sellsProducts: null,
    hasDownstreamTransport: null,
    hasProductUse: null,
    hasEndOfLife: null
  });

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
        await axios.put(`${API_URL}/api/companies/${company.id}`, company);
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
          text: 'Utilisez-vous des gaz réfrigérants ou des procédés industriels ?',
          hint: 'Climatisation, réfrigération, procédés chimiques...',
          categories: ['emissions_fugitives', 'procedes_industriels']
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
          text: 'Consommez-vous de l\'électricité ?',
          hint: 'Bureaux, ateliers, éclairage...',
          categories: ['electricite']
        },
        {
          key: 'usesHeating',
          icon: Flame,
          text: 'Achetez-vous de la chaleur, vapeur ou froid ?',
          hint: 'Chauffage urbain, vapeur industrielle...',
          categories: ['chaleur_vapeur_froid']
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
          text: 'Achetez-vous des biens ou services ?',
          hint: 'Matières premières, fournitures, services...',
          categories: ['achats_biens_services', 'biens_immobilises']
        },
        {
          key: 'hasWaste',
          icon: Trash2,
          text: 'Générez-vous des déchets ?',
          hint: 'Déchets de production, emballages, papiers...',
          categories: ['dechets']
        },
        {
          key: 'hasFreight',
          icon: Truck,
          text: 'Faites-vous transporter des marchandises (fret) ?',
          hint: 'Transport de matières premières, composants...',
          categories: ['fret_amont']
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
          hint: 'Produits manufacturés, biens de consommation...',
          categories: ['transformation_produits']
        },
        {
          key: 'hasDownstreamTransport',
          icon: Truck,
          text: 'Faites-vous livrer vos produits aux clients ?',
          hint: 'Distribution, livraison finale...',
          categories: ['fret_aval']
        },
        {
          key: 'hasProductUse',
          icon: Zap,
          text: 'Vos produits consomment-ils de l\'énergie lors de leur utilisation ?',
          hint: 'Appareils électriques, véhicules, machines...',
          categories: ['utilisation_produits']
        },
        {
          key: 'hasEndOfLife',
          icon: Recycle,
          text: 'Vos produits génèrent-ils des émissions en fin de vie ?',
          hint: 'Recyclage, incinération, mise en décharge...',
          categories: ['fin_vie_produits']
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
    const scope1or2 = ['combustion_mobile', 'combustion_fixe', 'emissions_fugitives', 'procedes_industriels', 'electricite', 'chaleur_vapeur_froid'];
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
      usesElectricity: null,
      usesHeating: null,
      buysMaterials: null,
      hasWaste: null,
      hasFreight: null,
      hasBusinessTravel: null,
      hasCommuting: null,
      sellsProducts: null,
      hasDownstreamTransport: null,
      hasProductUse: null,
      hasEndOfLife: null
    });
  };

  const openWizard = () => {
    resetWizard();
    setShowWizard(true);
  };

  // Calculate fiscal year end date based on start month
  const getFiscalYearEndMonth = () => {
    const startMonth = company.fiscal_year_start_month || 1;
    
    // End month is the month before start month
    let endMonth = startMonth - 1;
    if (endMonth < 1) {
      endMonth = 12;
    }
    
    return endMonth;
  };

  const endMonth = getFiscalYearEndMonth();
  
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
              value={company.employees}
              onChange={(e) => setCompany({ ...company, employees: parseInt(e.target.value) || 0 })}
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
              value={company.surface_area}
              onChange={(e) => setCompany({ ...company, surface_area: parseFloat(e.target.value) || 0 })}
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
                <DollarSign className="w-4 h-4" />
                {t('company.revenue')} (kCHF)
              </label>
              <input
                type="number"
                value={company.revenue}
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

      {/* Fiscal Year Configuration Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Configuration de l&apos;année fiscale
          </h2>
        </div>
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Définissez la période de vos exercices comptables. Cette configuration s&apos;applique à tous les exercices.
        </p>

        <div className="max-w-md">
          {/* Start Month */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Mois de début de l&apos;exercice
            </label>
            <select
              value={company.fiscal_year_start_month}
              onChange={(e) => setCompany({ ...company, fiscal_year_start_month: parseInt(e.target.value) })}
              data-testid="fiscal-year-month-select"
              className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              {MONTHS.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'} flex items-start gap-3`}>
          <Info className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <p className={`font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
              Exemple pour l&apos;exercice 2024 :
            </p>
            <p className={`text-sm ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
              {MONTHS.find(m => m.value === company.fiscal_year_start_month)?.label} 2024 → {MONTHS.find(m => m.value === endMonth)?.label} {company.fiscal_year_start_month === 1 ? '2024' : '2025'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Scope Perimeter Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('scope.perimeter')}
            </h2>
          </div>
          <button
            onClick={openWizard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/30"
          >
            <Wand2 className="w-4 h-4" />
            Configuration guidée
          </button>
        </div>
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('scope.perimeterDesc')}
        </p>

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
          <h3 className="text-purple-500 font-semibold mb-3">{t('scope.scope3Amont')} - {t('scope.scope3AmontTitle')}</h3>
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
          <h3 className="text-indigo-500 font-semibold mb-3">{t('scope.scope3Aval')} - {t('scope.scope3AvalTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scopeCategories.scope3_aval.map(cat => (
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
    </div>
  );
};

export default GeneralInfo;
