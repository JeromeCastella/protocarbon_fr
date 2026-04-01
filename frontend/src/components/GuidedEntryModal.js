import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Check, Search, ChevronRight, Info, Sparkles, AlertCircle, RotateCcw, Loader2
} from 'lucide-react';
import { normalizeUnit, filterFactorsByUnitStrict, filterFactorsByDimension, getAvailableUnitsWithConversions, findDimension, convertUnit, findFactorNativeUnit, getDimensionLabel } from '../utils/units';
import { getUnitLabel, formatUnitWithCode } from '../utils/unitLabels';
import FactorSelectionStep from './FactorSelectionStep';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

/**
 * Modal de saisie guidée pour les données d'activité
 * Parcours: Catégorie → Sous-catégorie → Unité → Facteur → Quantité
 * En mode édition: va directement à l'étape 4 avec toutes les données pré-remplies
 */
const GuidedEntryModal = ({
  isOpen,
  onClose,
  category,
  scope,
  language,
  isDark,
  onSubmit,
  editingActivity = null,
  preSelectedFactor = null,
  showExpertFactors = false,
  onToggleExpert = null,
}) => {
  // État du parcours
  const [step, setStep] = useState(1);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  
  // Unités disponibles (provenant des facteurs)
  const [availableUnits, setAvailableUnits] = useState([]);
  const [nativeUnits, setNativeUnits] = useState([]);
  const [convertedUnits, setConvertedUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isConvertedUnit, setIsConvertedUnit] = useState(false);
  
  // Facteurs d'émission
  const [factors, setFactors] = useState([]);
  const [filteredFactors, setFilteredFactors] = useState([]);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [factorSearch, setFactorSearch] = useState('');
  const [showFactorList, setShowFactorList] = useState(false);
  
  // Formulaire
  const [quantity, setQuantity] = useState('');
  const [comments, setComments] = useState('');
  
  // Chargement
  const [loading, setLoading] = useState(false);
  
  // Mode édition
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Category resolution for search-selected factors
  const [pendingCategoryChoice, setPendingCategoryChoice] = useState(null); // array of category objects or null
  const [resolvedCategory, setResolvedCategory] = useState(null); // user-picked category when ambiguous
  
  // Effective category and scope (resolved > prop)
  const effectiveCategory = resolvedCategory || category;
  const effectiveScope = resolvedCategory?.scope || scope;

  // Reset quand on ouvre le modal - différencier création et édition
  useEffect(() => {
    if (isOpen && category) {
      if (editingActivity) {
        // Mode édition : charger toutes les données et aller à l'étape 4
        setIsEditMode(true);
        loadForEditing(editingActivity);
      } else if (preSelectedFactor) {
        // Mode recherche : facteur pré-sélectionné, aller directement à l'étape 4
        setIsEditMode(false);
        loadForPreSelectedFactor(preSelectedFactor);
      } else {
        // Mode création : reset et parcours normal
        setIsEditMode(false);
        resetState();
        fetchSubcategories();
      }
    }
  }, [isOpen, category, editingActivity?.id, preSelectedFactor?.id]);

  const resetState = () => {
    setStep(1);
    setSelectedSubcategory(null);
    setSelectedUnit('');
    setIsConvertedUnit(false);
    setSelectedFactor(null);
    setFactorSearch('');
    setQuantity('');
    setComments('');
    setFactors([]);
    setFilteredFactors([]);
    setAvailableUnits([]);
    setNativeUnits([]);
    setConvertedUnits([]);
    setShowFactorList(false);
    setPendingCategoryChoice(null);
    setResolvedCategory(null);
  };

  /**
   * Charge toutes les données nécessaires pour le mode édition
   * et passe directement à l'étape 4 (formulaire final)
   */
  const loadForEditing = async (activity) => {
    setLoading(true);
    try {
      // 1. Charger les sous-catégories
      const subcatsRes = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
      const subcats = subcatsRes.data || [];
      setSubcategories(subcats);
      
      // 2. Sélectionner la sous-catégorie de l'activité
      const subcat = subcats.find(s => s.code === activity.subcategory_id);
      setSelectedSubcategory(subcat || null);
      
      // 3. Charger tous les facteurs d'émission
      const factorsRes = await axios.get(`${API_URL}/api/emission-factors/search?category=${category.code}`);
      let allFactors = factorsRes.data || [];
      
      // 4. Chercher le facteur de l'activité dans les résultats
      let factor = allFactors.find(f => f.id === activity.emission_factor_id);
      
      // 5. Si le facteur n'est pas trouvé (limite de 100 résultats dépassée), le récupérer par ID
      if (!factor && activity.emission_factor_id) {
        try {
          const factorRes = await axios.get(`${API_URL}/api/emission-factors/${activity.emission_factor_id}`);
          if (factorRes.data) {
            factor = factorRes.data;
            // Ajouter le facteur aux résultats pour qu'il soit disponible dans les listes
            allFactors = [factor, ...allFactors];
          }
        } catch (err) {
          logger.warn('Could not fetch emission factor by ID:', err);
        }
      }
      
      setFactors(allFactors);
      
      // 6. Sélectionner l'unité originale (l'unité de saisie de l'utilisateur)
      const unit = activity.original_unit || activity.unit || '';
      setSelectedUnit(unit);
      
      // 7. Extraire les unités disponibles avec conversions
      const unitsResult = getAvailableUnitsWithConversions(allFactors);
      setNativeUnits(unitsResult.native);
      setConvertedUnits(unitsResult.converted);
      setAvailableUnits(unitsResult.all);
      
      // 8. Déterminer si l'unité est convertie
      const unitIsConverted = unitsResult.converted.includes(unit);
      setIsConvertedUnit(unitIsConverted);
      
      // 9. Filtrer les facteurs compatibles
      const compatible = unitIsConverted 
        ? filterFactorsByDimension(allFactors, unit)
        : filterFactorsByUnitStrict(allFactors, unit);
      setFilteredFactors(compatible.length > 0 ? compatible : allFactors);
      
      // 10. Sélectionner le facteur d'émission de l'activité
      setSelectedFactor(factor || null);
      
      // 11. Pré-remplir quantité (utiliser original_quantity si disponible) et commentaires
      const displayQty = activity.original_quantity || activity.quantity;
      setQuantity(displayQty?.toString() || '');
      setComments(activity.comments || '');
      
      // 11. Aller directement à l'étape 4 (formulaire final)
      setStep(4);
      setShowFactorList(false);
      
    } catch (error) {
      logger.error('Failed to load activity for editing:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge un facteur pré-sélectionné depuis la recherche globale
   * et passe directement à l'étape 4 (formulaire final)
   * Si _resolvedCategories est présent, affiche un sélecteur de catégorie d'abord
   */
  const loadForPreSelectedFactor = async (factor) => {
    setLoading(true);
    try {
      // 1. Fetch the full factor data (the search index has minimal fields)
      let fullFactor = factor;
      try {
        const factorRes = await axios.get(`${API_URL}/api/emission-factors/${factor.id}`);
        if (factorRes.data) fullFactor = { ...factorRes.data, scope: factor.scope };
      } catch (err) {
        logger.warn('Could not fetch full factor, using search data:', err);
      }

      // 2. Set the factor and its units
      setSelectedFactor(fullFactor);
      setFactors([fullFactor]);
      setFilteredFactors([fullFactor]);

      // 3. Set default unit
      const unit = fullFactor.default_unit || '';
      setSelectedUnit(unit);
      setIsConvertedUnit(false);

      // 4. Extract available units
      const unitsResult = getAvailableUnitsWithConversions([fullFactor]);
      setNativeUnits(unitsResult.native);
      setConvertedUnits(unitsResult.converted);
      setAvailableUnits(unitsResult.all);

      // 5. Set subcategory if available
      if (fullFactor.subcategory) {
        try {
          const subcatsRes = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
          const subcats = subcatsRes.data || [];
          setSubcategories(subcats);
          const subcat = subcats.find(s => s.code === fullFactor.subcategory);
          setSelectedSubcategory(subcat || null);
        } catch (err) {
          logger.warn('Could not fetch subcategories:', err);
        }
      }

      // 6. Reset input fields
      setQuantity('');
      setComments('');

      // 7. Check if we need user to pick a category
      if (factor._resolvedCategories && factor._resolvedCategories.length > 1) {
        setPendingCategoryChoice(factor._resolvedCategories);
        setStep(4); // show step 4 with category picker overlay
      } else {
        setPendingCategoryChoice(null);
        setStep(4);
      }
      setShowFactorList(false);

    } catch (error) {
      logger.error('Failed to load pre-selected factor:', error);
    } finally {
      setLoading(false);
    }
  };


  // Fonction pour revenir modifier un élément (création et édition)
  const goBackToStep = (targetStep) => {
    setStep(targetStep);
    if (targetStep <= 1) {
      setSelectedUnit('');
      setIsConvertedUnit(false);
      setSelectedFactor(null);
      setShowFactorList(false);
    } else if (targetStep <= 2) {
      setSelectedFactor(null);
      setIsConvertedUnit(false);
      setShowFactorList(false);
    } else if (targetStep === 3) {
      setShowFactorList(true);
    }
  };

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
      const subcats = response.data || [];
      setSubcategories(subcats);
      
      // Si pas de sous-catégories, passer directement aux facteurs
      if (subcats.length === 0) {
        setStep(2);
        await fetchFactorsForCategory();
      }
    } catch (error) {
      logger.error('Failed to fetch subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFactorsForCategory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/emission-factors/search?category=${category.code}`);
      const allFactors = response.data || [];
      setFactors(allFactors);
      setFilteredFactors(allFactors);
      
      // Extraire les unités disponibles
      extractAvailableUnits(allFactors);
    } catch (error) {
      logger.error('Failed to fetch factors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFactorsForSubcategory = async (subcatCode) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/emission-factors?subcategory=${subcatCode}`);
      let allFactors = response.data || [];
      
      // Si pas de résultats, essayer avec la catégorie
      if (allFactors.length === 0) {
        const catResponse = await axios.get(`${API_URL}/api/emission-factors/by-category/${category.code}`);
        allFactors = catResponse.data || [];
        
        // Filtrer par sous-catégorie dans le nom ou les tags
        const subcatLower = subcatCode.toLowerCase();
        allFactors = allFactors.filter(f => 
          f.subcategory === subcatCode ||
          f.name?.toLowerCase().includes(subcatLower) ||
          f.name_fr?.toLowerCase().includes(subcatLower) ||
          f.tags?.some(tag => tag.toLowerCase().includes(subcatLower))
        );
        
        // Si toujours rien, montrer tous les facteurs de la catégorie
        if (allFactors.length === 0) {
          allFactors = catResponse.data || [];
        }
      }
      
      setFactors(allFactors);
      setFilteredFactors(allFactors);
      extractAvailableUnits(allFactors);
    } catch (error) {
      logger.error('Failed to fetch factors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extraction des unités disponibles avec conversions
  const extractAvailableUnits = (factorsList) => {
    const result = getAvailableUnitsWithConversions(factorsList);
    setNativeUnits(result.native);
    setConvertedUnits(result.converted);
    setAvailableUnits(result.all);
  };

  const handleSubcategorySelect = (subcat) => {
    setSelectedSubcategory(subcat);
    setSelectedUnit('');
    setSelectedFactor(null);
    setStep(2);
    fetchFactorsForSubcategory(subcat.code);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setSelectedFactor(null);
    setStep(3);
    setShowFactorList(true);
    
    const isConverted = convertedUnits.includes(unit);
    setIsConvertedUnit(isConverted);
    
    if (isConverted) {
      // Unité convertible : filtrer par dimension (trouver facteurs compatibles)
      const compatible = filterFactorsByDimension(factors, unit);
      setFilteredFactors(compatible);
    } else {
      // Unité native : filtrage strict
      const compatible = filterFactorsByUnitStrict(factors, unit);
      setFilteredFactors(compatible);
    }
  };

  const handleFactorSelect = (factor) => {
    setSelectedFactor(factor);
    setShowFactorList(false);
    setStep(4);
  };

  // Filtrer par recherche
  useEffect(() => {
    if (factorSearch) {
      const search = factorSearch.toLowerCase();
      const filtered = factors.filter(f => 
        f.name?.toLowerCase().includes(search) ||
        f.name_fr?.toLowerCase().includes(search) ||
        f.name_de?.toLowerCase().includes(search) ||
        f.tags?.some(tag => tag.toLowerCase().includes(search))
      );
      setFilteredFactors(filtered);
    } else if (selectedUnit) {
      filterFactorsByUnitStrict(selectedUnit);
    } else {
      setFilteredFactors(factors);
    }
  }, [factorSearch]);

  // Normaliser les différentes notations de scope vers un format standard
  const normalizeScope = (scope) => {
    if (!scope) return '';
    const scopeLower = scope.toLowerCase().trim();
    
    // Normalisation du Scope 3.3 (amont énergie) - catégorie spécifique du GHG Protocol
    // NOTE: scope3_amont (Scope 3 Amont) n'est PAS scope3_3 (catégorie 3.3)
    if (['scope3_3', 'scope3.3', 'scope33'].includes(scopeLower)) {
      return 'scope3_3';
    }
    return scopeLower;
  };

  // Appliquer les règles métier pour filtrer les impacts selon le scope sélectionné
  // Règles GHG Protocol :
  // - Saisie Scope 1 ou 2 → inclure impacts scope1, scope2, scope3_3
  // - Saisie Scope 3.3 (catégorie activites_combustibles_energie) → inclure uniquement scope3_3
  // - Saisie Scope 3 (autres) → inclure uniquement impact scope3
  // - Si value = 0 → exclure
  const applyBusinessRules = (impacts, selectedScope, selectedCategory) => {
    if (!impacts || impacts.length === 0) return impacts;
    
    const normalizedScope = normalizeScope(selectedScope);
    const isScope1or2Entry = ['scope1', 'scope2'].includes(normalizedScope);
    
    // Catégorie 3.3 du GHG Protocol : activités liées aux combustibles et à l'énergie
    const isScope3_3Entry = (
      selectedCategory === 'activites_combustibles_energie' || 
      normalizedScope === 'scope3_3'
    );
    
    // Autres catégories Scope 3
    const isScope3Entry = (
      normalizedScope?.startsWith('scope3') && 
      !isScope3_3Entry
    );
    
    return impacts.filter(impact => {
      const impactScope = normalizeScope(impact.scope);
      const impactValue = impact.value || 0;
      
      // Exclure les impacts avec valeur = 0
      if (impactValue === 0) return false;
      
      if (isScope1or2Entry) {
        // Saisie Scope 1 ou 2 : inclure scope1, scope2, scope3_3
        return ['scope1', 'scope2', 'scope3_3'].includes(impactScope);
      } else if (isScope3_3Entry) {
        // Saisie Scope 3.3 (amont énergie) : inclure uniquement scope3_3
        return impactScope === 'scope3_3';
      } else if (isScope3Entry) {
        // Saisie Scope 3 (autres) : inclure uniquement scope3
        return impactScope === 'scope3';
      }
      
      // Fallback : inclure tous les impacts non-nuls
      return true;
    });
  };

  // Calculer les émissions estimées avec règles métier et conversion d'unités
  const calculateEmissions = () => {
    if (!selectedFactor || !quantity) return null;
    
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;
    
    // Déterminer l'unité native du facteur
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    
    // Convertir la quantité si l'unité sélectionnée diffère de l'unité native
    let normalizedQty = qty;
    if (selectedUnit && selectedUnit !== factorNativeUnit) {
      normalizedQty = convertUnit(qty, selectedUnit, factorNativeUnit);
    }
    
    // Récupérer les impacts du facteur
    let impacts = selectedFactor.impacts || [{
      scope: selectedFactor.scope,
      category: selectedFactor.category,
      value: selectedFactor.value,
      unit: selectedFactor.unit,
      type: 'direct'
    }];
    
    // Appliquer les règles métier pour filtrer les impacts
    impacts = applyBusinessRules(impacts, effectiveScope, effectiveCategory?.code);
    
    return impacts.map(impact => ({
      ...impact,
      emissions: normalizedQty * impact.value
    }));
  };

  // Calculer la quantité convertie pour l'affichage
  const getConvertedQuantity = () => {
    if (!selectedFactor || !quantity || !isConvertedUnit) return null;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    if (selectedUnit === factorNativeUnit) return null;
    return {
      value: convertUnit(qty, selectedUnit, factorNativeUnit),
      unit: factorNativeUnit
    };
  };

  const convertedQty = getConvertedQuantity();

  const emissions = calculateEmissions();
  const totalEmissions = emissions?.reduce((sum, e) => sum + e.emissions, 0) || 0;
  
  // Vérifier si des impacts ont été filtrés par les règles métier
  const allImpacts = selectedFactor?.impacts || [];
  const filteredImpacts = emissions || [];
  const hasFilteredImpacts = allImpacts.length > filteredImpacts.length;

  const handleSubmit = async () => {
    if (!selectedFactor || !quantity) return;
    
    const qty = parseFloat(quantity);
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    const needsConversion = selectedUnit && selectedUnit !== factorNativeUnit;
    
    // Si conversion nécessaire, envoyer la quantité convertie + les infos originales
    const convertedQtyValue = needsConversion ? convertUnit(qty, selectedUnit, factorNativeUnit) : qty;
    const conversionFactor = needsConversion ? convertedQtyValue / qty : null;
    
    await onSubmit({
      category_id: effectiveCategory.code,
      subcategory_id: selectedSubcategory?.code,
      scope: effectiveScope,
      name: language === 'fr' 
        ? (selectedFactor.name_fr || selectedFactor.name) 
        : (selectedFactor.name_de || selectedFactor.name),
      quantity: convertedQtyValue,           // Quantité convertie (pour calcul)
      unit: factorNativeUnit,                // Unité du facteur
      original_quantity: qty,                // Valeur saisie par l'utilisateur
      original_unit: selectedUnit || factorNativeUnit,  // Unité saisie
      conversion_factor: conversionFactor,   // Facteur de conversion (pour audit)
      emission_factor_id: selectedFactor.id,
      comments: comments,
      entry_scope: effectiveScope,
      entry_category: effectiveCategory.code
    });
    
    onClose();
  };

  // Obtenir le nom du facteur selon la langue
  const getFactorName = (factor) => {
    if (language === 'de' && factor.name_de) return factor.name_de;
    return factor.name_fr || factor.name;
  };

  // Couleurs des scopes
  const scopeColors = {
    'scope1': { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Scope 1' },
    'scope2': { bg: 'bg-cyan-500', text: 'text-cyan-500', label: 'Scope 2' },
    'scope3_3': { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Scope 3.3' },
    'scope3': { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Scope 3' },
    'scope3_amont': { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Scope 3 Amont' },
    'scope3_aval': { bg: 'bg-indigo-500', text: 'text-indigo-500', label: 'Scope 3 Aval' }
  };

  if (!isOpen) return null;

  // Left panel: shows context and form when factor is selected
  const renderLeftPanel = () => (
    <div className={`w-full flex flex-col h-full border-r ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {editingActivity ? (language === 'fr' ? 'Modifier l\'entrée' : 'Eintrag bearbeiten') : (language === 'fr' ? 'Nouvelle saisie' : 'Neue Eingabe')}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg lg:hidden ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: effectiveCategory?.color }}></div>
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {language === 'fr' ? effectiveCategory?.name_fr : effectiveCategory?.name_de}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' ? 'Chargement...' : 'Laden...'}
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Subcategory */}
            {subcategories.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? '1. Sous-catégorie' : '1. Unterkategorie'}
                </label>
                {selectedSubcategory && step >= 2 ? (
                  <button
                    type="button"
                    onClick={() => subcategories.length > 1 && goBackToStep(1)}
                    data-testid="change-subcategory-btn"
                    className={`w-full p-3 rounded-xl border flex items-center justify-between group ${
                      isDark ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {language === 'fr' ? selectedSubcategory.name_fr : selectedSubcategory.name_de}
                    </span>
                    {subcategories.length > 1 && (
                      <RotateCcw className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    )}
                  </button>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {subcategories.map(subcat => (
                      <button
                        key={subcat.code}
                        type="button"
                        onClick={() => handleSubcategorySelect(subcat)}
                        data-testid={`subcat-${subcat.code}`}
                        className={`p-3 rounded-xl text-left text-sm transition-all border ${
                          selectedSubcategory?.code === subcat.code
                            ? 'bg-blue-500 text-white border-blue-500'
                            : isDark 
                              ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' 
                              : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'
                        }`}
                      >
                        {language === 'fr' ? subcat.name_fr : subcat.name_de}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Unit */}
            {step >= 2 && availableUnits.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? '2. Unité' : '2. Einheit'}
                </label>
                {selectedUnit && step >= 3 ? (
                  <button
                    type="button"
                    onClick={() => availableUnits.length > 1 && goBackToStep(2)}
                    data-testid="change-unit-btn"
                    className={`w-full p-3 rounded-xl border flex items-center justify-between group ${
                      isDark ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span className={`font-medium text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {formatUnitWithCode(selectedUnit, language, true)}
                    </span>
                    {availableUnits.length > 1 && (
                      <RotateCcw className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    )}
                  </button>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {nativeUnits.map(unit => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => handleUnitSelect(unit)}
                          data-testid={`unit-${unit}`}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedUnit === unit
                              ? 'bg-blue-500 text-white'
                              : isDark 
                                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          {formatUnitWithCode(unit, language, true)}
                        </button>
                      ))}
                    </div>
                    {convertedUnits.length > 0 && (
                      <div className="mt-2">
                        <p className={`text-xs mb-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {language === 'fr' ? 'Conversion auto' : 'Auto. Konvertierung'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {convertedUnits.map(unit => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => handleUnitSelect(unit)}
                              data-testid={`unit-${unit}`}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border border-dashed ${
                                selectedUnit === unit
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : isDark 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                              }`}
                            >
                              {formatUnitWithCode(unit, language, true)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected factor recap */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? '3. Facteur sélectionné' : '3. Ausgewählter Faktor'}
                </label>
                <button
                  type="button"
                  onClick={() => goBackToStep(3)}
                  className={`w-full p-3 rounded-xl border text-left group ${
                    isDark ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' : 'bg-green-50 border-green-200 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-medium text-sm leading-tight ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                      {getFactorName(selectedFactor)}
                    </span>
                    <RotateCcw className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  {selectedFactor.is_public === false && (
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                      Expert
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Separator */}
            {selectedFactor && (
              <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
            )}

            {/* Category picker — shown when search found multiple possible categories */}
            {selectedFactor && pendingCategoryChoice && pendingCategoryChoice.length > 1 && (
              <div data-testid="category-picker">
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? 'Catégorie' : 'Kategorie'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {pendingCategoryChoice.map(cat => {
                    const isSelected = effectiveCategory?.code === cat.code;
                    const scopeLabel = scopeColors[cat.scope]?.label || cat.scope;
                    return (
                      <button
                        key={cat.code}
                        type="button"
                        onClick={() => setResolvedCategory(cat)}
                        data-testid={`category-choice-${cat.code}`}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? (isDark ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-blue-400 bg-blue-50 text-blue-700')
                            : (isDark ? 'border-slate-600 hover:border-slate-500 text-slate-400' : 'border-gray-200 hover:border-gray-300 text-gray-600')
                        }`}
                      >
                        <span>{language === 'fr' ? (cat.name_fr || cat.code) : (cat.name_de || cat.code)}</span>
                        <span className={`ml-1.5 opacity-60`}>({scopeLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Quantity — always visible when factor selected */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? '4. Quantité' : '4. Menge'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(e.target.value)}
                    data-testid="quantity-input"
                    required
                    step="any"
                    autoFocus={step >= 4}
                    className={`w-full px-4 py-3 pr-16 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    placeholder="0"
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getUnitLabel(selectedUnit || selectedFactor.default_unit || selectedFactor.input_units?.[0], language)}
                  </span>
                </div>
                
                {/* Conversion indicator */}
                {convertedQty && quantity && (
                  <div className={`mt-2 px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                    isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
                  }`} data-testid="conversion-indicator">
                    <Info className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      = {convertedQty.value.toFixed(2)} {getUnitLabel(convertedQty.unit, language)}
                    </span>
                  </div>
                )}

                {/* Live emissions result */}
                <div className={`mt-3 p-4 rounded-xl ${
                  quantity 
                    ? isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                    : isDark ? 'bg-slate-700/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <span className={`text-2xl font-bold ${
                    quantity 
                      ? isDark ? 'text-green-400' : 'text-green-600'
                      : isDark ? 'text-slate-600' : 'text-gray-300'
                  }`}>
                    {quantity 
                      ? `${(totalEmissions / 1000).toFixed(4)}`
                      : '—'
                    }
                  </span>
                  <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>tCO₂e</span>
                </div>

                {/* Multi-impact detail */}
                {quantity && emissions && emissions.length > 1 && (
                  <div className="mt-2 space-y-1">
                    {emissions.map((e, i) => {
                      const scopeInfo = scopeColors[e.scope] || { bg: 'bg-gray-500', label: e.scope };
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${scopeInfo.bg}`}></span>
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{scopeInfo.label}</span>
                          </div>
                          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {(e.emissions / 1000).toFixed(4)} tCO₂e
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Business rule notice */}
                {quantity && hasFilteredImpacts && (
                  <div className={`mt-2 p-2 rounded-lg text-xs ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                    {language === 'fr' 
                      ? `Règle métier: ${allImpacts.length - filteredImpacts.length} impact(s) exclu(s)`
                      : `Geschäftsregel: ${allImpacts.length - filteredImpacts.length} Auswirkung(en) ausgeschlossen`}
                  </div>
                )}
              </div>
            )}

            {/* Comment */}
            {selectedFactor && (
              <div>
                <label className={`block text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? 'Commentaire' : 'Kommentar'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                  placeholder={language === 'fr' ? 'Notes, source...' : 'Notizen, Quelle...'}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-3 rounded-xl border text-sm transition-all ${
              isDark 
                ? 'border-slate-600 hover:bg-slate-700 text-white' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}
          >
            {language === 'fr' ? 'Annuler' : 'Abbrechen'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFactor || !quantity}
            data-testid="submit-entry-btn"
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {editingActivity 
              ? (language === 'fr' ? 'Modifier' : 'Speichern')
              : (language === 'fr' ? 'Enregistrer' : 'Speichern')
            }
          </button>
        </div>
      </div>
    </div>
  );

  // Right panel: factor selection (full height)
  const renderRightPanel = () => (
    <div className="w-full flex flex-col h-full">
      {/* Right header */}
      <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step >= s 
                  ? 'bg-blue-500 text-white' 
                  : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
            ))}
          </div>
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {step === 1 && (language === 'fr' ? 'Sous-catégorie' : 'Unterkategorie')}
            {step === 2 && (language === 'fr' ? 'Unité' : 'Einheit')}
            {step >= 3 && (language === 'fr' ? 'Facteur d\'émission' : 'Emissionsfaktor')}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col min-h-0">
        {step < 3 ? (
          /* Placeholder before step 3 */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <Search className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            </div>
            <p className={`text-base font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {step === 1 
                ? (language === 'fr' ? 'Sélectionnez une sous-catégorie' : 'Wählen Sie eine Unterkategorie')
                : (language === 'fr' ? 'Sélectionnez une unité' : 'Wählen Sie eine Einheit')
              }
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {language === 'fr' 
                ? 'Les facteurs d\'émission s\'afficheront ici'
                : 'Emissionsfaktoren werden hier angezeigt'}
            </p>
          </div>
        ) : (
          /* Step 3: Factor selection - full space */
          <div className="flex-1 flex flex-col min-h-0">
            <FactorSelectionStep
              factors={filteredFactors}
              selectedFactor={selectedFactor}
              onSelectFactor={handleFactorSelect}
              selectedUnit={selectedUnit}
              language={language}
              isDark={isDark}
              showExpertFactors={showExpertFactors}
              onToggleExpert={onToggleExpert}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30"
        style={{ zIndex: 60 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-y-0 right-0 w-[94%] max-w-[1600px] ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl flex flex-row`}
        >
          {/* Left column — context, form, submit */}
          <div className="w-[32%] min-w-[320px] flex-shrink-0">
            {renderLeftPanel()}
          </div>

          {/* Right column — factor selection */}
          <div className="flex-1">
            {renderRightPanel()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedEntryModal;
