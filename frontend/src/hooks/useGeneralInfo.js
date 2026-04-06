import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';
import {
  Car, Flame, Factory, Wind, Snowflake,
  Trash2, Truck, Plane, Home, Building,
  ShoppingCart, Key, Store, PiggyBank,
} from 'lucide-react';

const INITIAL_WIZARD_ANSWERS = {
  hasVehicles: null, hasCombustion: null, hasFugitiveEmissions: null,
  hasProcessEmissions: null, usesHeating: null, usesCooling: null,
  hasWaste: null, hasFreight: null, hasBusinessTravel: null,
  hasCommuting: null, hasLeasedAssetsUpstream: null, sellsProducts: null,
  hasDownstreamTransport: null, hasLeasedAssetsDownstream: null,
  hasFranchises: null, hasInvestments: null,
};

const PRODUCT_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

export const useGeneralInfo = () => {
  const { t, language } = useLanguage();
  const { currentFiscalYear: selectedFiscalYear, fiscalYears } = useFiscalYear();

  const [company, setCompany] = useState({
    name: '', location: '', sector: '',
    entity_type: 'private_company',
    consolidation_approach: 'operational_control',
    fiscal_year_start_month: 1,
  });
  const [fiscalYearContext, setFiscalYearContext] = useState({
    employees: 0, revenue: 0, surface_area: 0, excluded_categories: [],
  });
  const [contextLoading, setContextLoading] = useState(false);
  const [contextReadonly, setContextReadonly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedContext, setSavedContext] = useState(false);
  const [savedPerimeter, setSavedPerimeter] = useState(false);
  const [savedWizard, setSavedWizard] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState(INITIAL_WIZARD_ANSWERS);

  const fetchData = useCallback(async () => {
    try {
      const [companyRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/companies`),
        axios.get(`${API_URL}/api/categories`),
      ]);
      if (companyRes.data) {
        setCompany({
          name: companyRes.data.name || '', location: companyRes.data.location || '',
          sector: companyRes.data.sector || '',
          entity_type: companyRes.data.entity_type || 'private_company',
          consolidation_approach: companyRes.data.consolidation_approach || 'operational_control',
          fiscal_year_start_month: companyRes.data.fiscal_year_start_month || 1,
          id: companyRes.data.id,
        });
      }
      setCategories(categoriesRes.data || []);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFiscalYearContext = useCallback(async (fiscalYearId) => {
    setContextLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/fiscal-years/${fiscalYearId}/context`);
      const ctx = response.data.context || {};
      setFiscalYearContext({
        employees: ctx.employees || 0, revenue: ctx.revenue || 0,
        surface_area: ctx.surface_area || 0,
        excluded_categories: ctx.excluded_categories || [],
      });
      setContextReadonly(response.data.is_readonly || false);
    } catch (error) {
      logger.error('Failed to fetch fiscal year context:', error);
    } finally {
      setContextLoading(false);
    }
  }, []);

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
      logger.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContext = async () => {
    if (!selectedFiscalYear?.id || contextReadonly) return;
    setSavingContext(true);
    try {
      await axios.put(`${API_URL}/api/fiscal-years/${selectedFiscalYear.id}/context`, fiscalYearContext);
      setSavedContext(true);
      setTimeout(() => setSavedContext(false), 2000);
    } catch (error) {
      logger.error('Failed to save fiscal year context:', error);
    } finally {
      setSavingContext(false);
    }
  };

  const toggleCategory = async (categoryCode) => {
    if (contextReadonly) return;
    const newExcluded = fiscalYearContext.excluded_categories?.includes(categoryCode)
      ? fiscalYearContext.excluded_categories.filter(c => c !== categoryCode)
      : [...(fiscalYearContext.excluded_categories || []), categoryCode];
    setFiscalYearContext(prev => ({ ...prev, excluded_categories: newExcluded }));
    try {
      await axios.put(`${API_URL}/api/fiscal-years/${selectedFiscalYear.id}/context`, {
        ...fiscalYearContext, excluded_categories: newExcluded,
      });
      setSavedPerimeter(true);
      setTimeout(() => setSavedPerimeter(false), 2000);
    } catch (error) {
      logger.error('Failed to auto-save category:', error);
    }
  };

  const toggleProductCategories = async () => {
    if (contextReadonly) return;
    const allIncluded = PRODUCT_CATEGORIES.every(
      code => !fiscalYearContext.excluded_categories?.includes(code),
    );
    const newExcluded = allIncluded
      ? [...(fiscalYearContext.excluded_categories || []), ...PRODUCT_CATEGORIES]
      : (fiscalYearContext.excluded_categories || []).filter(c => !PRODUCT_CATEGORIES.includes(c));
    setFiscalYearContext(prev => ({ ...prev, excluded_categories: newExcluded }));
    try {
      await axios.put(`${API_URL}/api/fiscal-years/${selectedFiscalYear.id}/context`, {
        ...fiscalYearContext, excluded_categories: newExcluded,
      });
      setSavedPerimeter(true);
      setTimeout(() => setSavedPerimeter(false), 2000);
    } catch (error) {
      logger.error('Failed to auto-save categories:', error);
    }
  };

  const areProductCategoriesIncluded = () =>
    PRODUCT_CATEGORIES.every(code => !fiscalYearContext.excluded_categories?.includes(code));

  // ---- Wizard ----
  const wizardSteps = [
    { id: 'intro', title: 'Configuration guidée', subtitle: 'Répondez à quelques questions pour configurer automatiquement votre périmètre', questions: [] },
    { id: 'scope1', title: 'Scope 1 - Émissions directes', subtitle: "Identifions vos sources d'émissions directes", questions: [
      { key: 'hasVehicles', icon: Car, text: "Possédez-vous des véhicules d'entreprise ?", hint: 'Voitures, camions, engins de chantier...', categories: ['combustion_mobile'] },
      { key: 'hasCombustion', icon: Flame, text: 'Avez-vous des installations de combustion sur site ?', hint: 'Chaudières, générateurs, fours industriels...', categories: ['combustion_fixe'] },
      { key: 'hasFugitiveEmissions', icon: Factory, text: 'Avez-vous des fuites potentielles de fluides réfrigérants ?', hint: 'Climatisation, réfrigération de machines...', categories: ['emissions_fugitives'] },
      { key: 'hasProcessEmissions', icon: Wind, text: "Avez-vous des fuites potentielles de gaz à effet de serre dans vos procédés ?", hint: 'Procédés chimiques, solvants, gaz de procédés industriels...', categories: ['emissions_procedes'] },
    ]},
    { id: 'scope2', title: 'Scope 2 - Énergie achetée', subtitle: "Identifions vos achats d'énergie", questions: [
      { key: 'usesHeating', icon: Flame, text: 'Achetez-vous de la chaleur ou de la vapeur via un réseau ?', hint: 'Chauffage urbain, vapeur industrielle...', categories: ['chaleur_vapeur'] },
      { key: 'usesCooling', icon: Snowflake, text: 'Achetez-vous du refroidissement via un réseau de froid ?', hint: 'Refroidissement urbain, froid industriel...', categories: ['refroidissement'] },
    ]},
    { id: 'scope3_amont', title: 'Scope 3 Amont - Chaîne de valeur', subtitle: 'Émissions liées à vos achats et activités', questions: [
      { key: 'hasWaste', icon: Trash2, text: 'Générez-vous des déchets de manière significative ou des déchets spéciaux ?', hint: 'Déchets de production, emballages, papiers...', categories: ['dechets_operations'] },
      { key: 'hasFreight', icon: Truck, text: 'Faites-vous transporter des marchandises (fret) par des prestataires externes ?', hint: 'Transport de matières premières, composants...', categories: ['transport_distribution_amont'] },
      { key: 'hasBusinessTravel', icon: Plane, text: 'Vos employés font-ils des déplacements professionnels ?', hint: "Voyages d'affaires, visites clients...", categories: ['deplacements_professionnels'] },
      { key: 'hasCommuting', icon: Home, text: 'Vos employés se déplacent-ils entre leur domicile et le travail ?', hint: 'Trajets quotidiens des employés', categories: ['deplacements_domicile_travail'] },
      { key: 'hasLeasedAssetsUpstream', icon: Building, text: 'Utilisez-vous des locaux, bâtiments, véhicules, machines ou équipements loués ?', hint: "Si vous louez vos locaux sans avoir le détail des charges énergétiques, ou si vous louez des véhicules, machines ou équipements, les émissions associées iront dans cette catégorie.", categories: ['actifs_loues_amont'] },
    ]},
    { id: 'scope3_aval', title: 'Scope 3 Aval - Produits vendus', subtitle: 'Émissions liées à vos produits après vente', questions: [
      { key: 'sellsProducts', icon: ShoppingCart, text: 'Vendez-vous des produits physiques ?', hint: 'Ceci active les 3 catégories : transformation, utilisation et fin de vie des produits vendus', categories: ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'] },
      { key: 'hasDownstreamTransport', icon: Truck, text: 'Faites-vous livrer vos produits aux clients ?', hint: 'Distribution, livraison finale...', categories: ['transport_distribution_aval'] },
      { key: 'hasLeasedAssetsDownstream', icon: Key, text: "Louez-vous à des clients des actifs que vous possédez, et qui consomment de l'énergie ou génèrent des émissions ?", hint: 'Actifs mis en location à des tiers', categories: ['actifs_loues_aval'] },
      { key: 'hasFranchises', icon: Store, text: 'Votre organisation exploite-t-elle un réseau de franchises (en tant que franchiseur) ?', hint: 'Réseau de franchisés opérant sous votre marque', categories: ['franchises'] },
      { key: 'hasInvestments', icon: PiggyBank, text: "Votre organisation détient-elle des investissements financiers ou des participations susceptibles d'être associés à des émissions ?", hint: 'Actions, obligations, prêts, fonds, capital-risque...', categories: ['investissements'] },
    ]},
    { id: 'summary', title: 'Récapitulatif', subtitle: 'Voici les catégories sélectionnées selon vos réponses', questions: [] },
  ];

  const handleWizardAnswer = (key, value) => setWizardAnswers(prev => ({ ...prev, [key]: value }));

  const getSelectedCategoriesFromWizard = () => {
    const selected = new Set();
    wizardSteps.forEach(step => {
      step.questions?.forEach(q => {
        if (wizardAnswers[q.key] === true) q.categories.forEach(cat => selected.add(cat));
      });
    });
    selected.add('electricite');
    selected.add('biens_services_achetes');
    selected.add('biens_equipement');
    const scope1or2 = ['combustion_mobile', 'combustion_fixe', 'emissions_fugitives', 'emissions_procedes', 'electricite', 'chaleur_vapeur', 'refroidissement'];
    if (scope1or2.some(cat => selected.has(cat))) selected.add('activites_combustibles_energie');
    return selected;
  };

  const applyWizardResults = async () => {
    const selectedCategories = getSelectedCategoriesFromWizard();
    const allCategoryCodes = categories.map(c => c.code);
    const newExcluded = allCategoryCodes.filter(code => !selectedCategories.has(code));
    setFiscalYearContext(prev => ({ ...prev, excluded_categories: newExcluded }));
    if (selectedFiscalYear?.id && !contextReadonly) {
      try {
        await axios.put(`${API_URL}/api/fiscal-years/${selectedFiscalYear.id}/context`, {
          ...fiscalYearContext, excluded_categories: newExcluded,
        });
      } catch (error) {
        logger.error('Failed to save wizard results:', error);
      }
    }
    setShowWizard(false);
    setWizardStep(0);
    setSavedWizard(true);
    setTimeout(() => setSavedWizard(false), 2000);
  };

  const resetWizard = () => { setWizardStep(0); setWizardAnswers(INITIAL_WIZARD_ANSWERS); };
  const openWizard = () => { resetWizard(); setShowWizard(true); };

  const isPrivateCompany = company.entity_type === 'private_company';

  const entityTypes = [
    { value: 'private_company', label: t('generalInfo.entityTypes.privateCompany') },
    { value: 'public_admin', label: t('generalInfo.entityTypes.publicAdmin') },
    { value: 'association', label: t('generalInfo.entityTypes.association') },
    { value: 'foundation', label: t('generalInfo.entityTypes.foundation') },
    { value: 'other', label: t('generalInfo.entityTypes.other') },
  ];

  const sectors = [
    'manufacturing', 'services', 'technology', 'retail', 'construction',
    'transport', 'energy', 'agriculture', 'healthcare', 'education',
    'finance', 'hospitality', 'other',
  ];

  const consolidationApproaches = [
    { value: 'operational_control', label: t('company.operationalControl') },
    { value: 'financial_control', label: t('company.financialControl') },
    { value: 'equity_share', label: t('company.equityShare') },
  ];

  const scopeCategories = {
    scope1: categories.filter(c => c.scope === 'scope1'),
    scope2: categories.filter(c => c.scope === 'scope2'),
    scope3_amont: categories.filter(c => c.scope === 'scope3_amont'),
    scope3_aval: categories.filter(c => c.scope === 'scope3_aval'),
  };

  return {
    // data
    company, setCompany, fiscalYearContext, setFiscalYearContext,
    categories, selectedFiscalYear, fiscalYears, language,
    // status
    loading, saving, savingContext, saved, savedContext,
    savedPerimeter, savedWizard, contextLoading, contextReadonly,
    // actions
    fetchData, fetchFiscalYearContext, handleSave, handleSaveContext,
    toggleCategory, toggleProductCategories, areProductCategoriesIncluded,
    // wizard
    showWizard, setShowWizard, showManualConfig, setShowManualConfig,
    wizardStep, setWizardStep, wizardAnswers, wizardSteps,
    handleWizardAnswer, getSelectedCategoriesFromWizard,
    applyWizardResults, openWizard,
    // derived
    isPrivateCompany, entityTypes, sectors, consolidationApproaches,
    scopeCategories, PRODUCT_CATEGORIES,
    // i18n
    t,
  };
};
