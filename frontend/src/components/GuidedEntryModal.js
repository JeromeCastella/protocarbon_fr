import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Check, Search, ChevronRight, Info, Sparkles, AlertCircle, RotateCcw, Loader2
} from 'lucide-react';
import { normalizeUnit, filterFactorsByUnitStrict, getAvailableUnitsFromFactors } from '../utils/units';
import { getUnitLabel, formatUnitWithCode } from '../utils/unitLabels';
import FactorSelectionStep from './FactorSelectionStep';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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
  editingActivity = null
}) => {
  // État du parcours
  const [step, setStep] = useState(1);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  
  // Unités disponibles (provenant des facteurs)
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  
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

  // Reset quand on ouvre le modal - différencier création et édition
  useEffect(() => {
    if (isOpen && category) {
      if (editingActivity) {
        // Mode édition : charger toutes les données et aller à l'étape 4
        setIsEditMode(true);
        loadForEditing(editingActivity);
      } else {
        // Mode création : reset et parcours normal
        setIsEditMode(false);
        resetState();
        fetchSubcategories();
      }
    }
  }, [isOpen, category, editingActivity?.id]);

  const resetState = () => {
    setStep(1);
    setSelectedSubcategory(null);
    setSelectedUnit('');
    setSelectedFactor(null);
    setFactorSearch('');
    setQuantity('');
    setComments('');
    setFactors([]);
    setFilteredFactors([]);
    setAvailableUnits([]);
    setShowFactorList(false);
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
          console.warn('Could not fetch emission factor by ID:', err);
        }
      }
      
      setFactors(allFactors);
      
      // 6. Sélectionner l'unité originale
      const unit = activity.original_unit || activity.unit || '';
      setSelectedUnit(unit);
      
      // 7. Extraire les unités disponibles depuis les facteurs
      const units = getAvailableUnitsFromFactors(allFactors);
      setAvailableUnits(units);
      
      // 8. Filtrer les facteurs compatibles avec l'unité
      const compatible = filterFactorsByUnitStrict(allFactors, unit);
      setFilteredFactors(compatible.length > 0 ? compatible : allFactors);
      
      // 9. Sélectionner le facteur d'émission de l'activité
      setSelectedFactor(factor || null);
      
      // 10. Pré-remplir quantité et commentaires
      setQuantity(activity.quantity?.toString() || '');
      setComments(activity.comments || '');
      
      // 11. Aller directement à l'étape 4 (formulaire final)
      setStep(4);
      setShowFactorList(false);
      
    } catch (error) {
      console.error('Failed to load activity for editing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour revenir modifier un élément en mode édition
  const goBackToStep = (targetStep) => {
    setStep(targetStep);
    if (targetStep === 3) {
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
      console.error('Failed to fetch subcategories:', error);
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
      console.error('Failed to fetch factors:', error);
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
      console.error('Failed to fetch factors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extraction des unités disponibles - MATCHING STRICT
  // Seules les input_units des facteurs sont proposées, sans conversions
  const extractAvailableUnits = (factorsList) => {
    const units = getAvailableUnitsFromFactors(factorsList);
    setAvailableUnits(units);
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
    setShowFactorList(true); // Afficher automatiquement la liste des facteurs
    
    // Filtrer les facteurs compatibles avec cette unité - MATCHING STRICT
    const compatible = filterFactorsByUnitStrict(factors, unit);
    setFilteredFactors(compatible);
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

  // Calculer les émissions estimées avec règles métier
  const calculateEmissions = () => {
    if (!selectedFactor || !quantity) return null;
    
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;
    
    // Normaliser la quantité selon l'unité
    let normalizedQty = qty;
    const defaultUnit = selectedFactor.default_unit || selectedFactor.input_units?.[0];
    
    if (selectedUnit && selectedUnit !== defaultUnit) {
      // Chercher conversion spécifique au facteur
      const convKey = `${selectedUnit}_to_${defaultUnit}`;
      if (selectedFactor.unit_conversions?.[convKey]) {
        normalizedQty = qty * selectedFactor.unit_conversions[convKey];
      } else {
        // Chercher conversion globale
        const globalConv = unitConversions.find(c => 
          (c.from_unit === selectedUnit && c.to_unit === defaultUnit) ||
          (c.to_unit === selectedUnit && c.from_unit === defaultUnit)
        );
        if (globalConv) {
          if (globalConv.from_unit === selectedUnit) {
            normalizedQty = qty * globalConv.factor;
          } else {
            normalizedQty = qty / globalConv.factor;
          }
        }
      }
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
    impacts = applyBusinessRules(impacts, scope, category?.code);
    
    return impacts.map(impact => ({
      ...impact,
      emissions: normalizedQty * impact.value
    }));
  };

  const emissions = calculateEmissions();
  const totalEmissions = emissions?.reduce((sum, e) => sum + e.emissions, 0) || 0;
  
  // Vérifier si des impacts ont été filtrés par les règles métier
  const allImpacts = selectedFactor?.impacts || [];
  const filteredImpacts = emissions || [];
  const hasFilteredImpacts = allImpacts.length > filteredImpacts.length;

  const handleSubmit = async () => {
    if (!selectedFactor || !quantity) return;
    
    await onSubmit({
      category_id: category.code,
      subcategory_id: selectedSubcategory?.code,
      scope: scope,
      name: language === 'fr' 
        ? (selectedFactor.name_fr || selectedFactor.name) 
        : (selectedFactor.name_de || selectedFactor.name),
      quantity: parseFloat(quantity),
      unit: selectedUnit || selectedFactor.default_unit || selectedFactor.input_units?.[0],
      emission_factor_id: selectedFactor.id,
      comments: comments,
      // Nouveaux champs pour multi-impacts
      entry_scope: scope,           // Scope de saisie original
      entry_category: category.code // Catégorie de saisie originale
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex:60 }}

      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 ${
            step >= 3 && !selectedFactor ? 'max-w-4xl' : 'max-w-2xl'
          }`}
        >
          {/* Header */}
          <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {editingActivity ? (language === 'fr' ? 'Modifier l\'entrée' : 'Eintrag bearbeiten') : (language === 'fr' ? 'Nouvelle saisie' : 'Neue Eingabe')}
                </h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color }}></div>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {language === 'fr' ? category?.name_fr : category?.name_de}
                  </span>
                  {selectedSubcategory && (
                    <>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        {language === 'fr' ? selectedSubcategory.name_fr : selectedSubcategory.name_de}
                      </span>
                    </>
                  )}
                  {selectedUnit && (
                    <>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                        {getUnitLabel(selectedUnit, language)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step >= s 
                      ? 'bg-blue-500 text-white' 
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-8 h-1 mx-1 rounded ${
                      step > s ? 'bg-blue-500' : isDark ? 'bg-slate-700' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {isEditMode 
                    ? (language === 'fr' ? 'Chargement des données...' : 'Daten werden geladen...')
                    : (language === 'fr' ? 'Chargement...' : 'Laden...')
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Étape 1: Sous-catégories */}
                {step >= 1 && subcategories.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {language === 'fr' ? '1. Choisir une sous-catégorie' : '1. Unterkategorie wählen'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {subcategories.map(subcat => (
                        <button
                          key={subcat.code}
                          type="button"
                          onClick={() => handleSubcategorySelect(subcat)}
                          data-testid={`subcat-${subcat.code}`}
                          className={`p-4 rounded-xl text-left transition-all border ${
                            selectedSubcategory?.code === subcat.code
                              ? 'bg-blue-500 text-white border-blue-500'
                              : isDark 
                                ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600' 
                                : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'
                          }`}
                        >
                          <span className="font-medium">
                            {language === 'fr' ? subcat.name_fr : subcat.name_de}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 2: Unité de saisie */}
                {step >= 2 && availableUnits.length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {language === 'fr' ? '2. Unité de saisie' : '2. Eingabeeinheit'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableUnits.map(unit => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => handleUnitSelect(unit)}
                          data-testid={`unit-${unit}`}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
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
                  </div>
                )}

                {/* Étape 3: Facteur d'émission - Nouveau composant amélioré */}
                {step >= 3 && (
                  <FactorSelectionStep
                    factors={filteredFactors}
                    selectedFactor={selectedFactor}
                    onSelectFactor={handleFactorSelect}
                    selectedUnit={selectedUnit}
                    language={language}
                    isDark={isDark}
                  />
                )}

                {/* Étape 4: Quantité et résultat */}
                {step >= 4 && selectedFactor && (
                  <>
                    {/* Résumé des sélections en mode édition */}
                    {isEditMode && (
                      <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Info className="w-4 h-4 text-blue-500" />
                          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {language === 'fr' ? 'Éléments sélectionnés' : 'Ausgewählte Elemente'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {/* Sous-catégorie */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'fr' ? 'Sous-catégorie:' : 'Unterkategorie:'}
                              </span>
                              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {selectedSubcategory 
                                  ? (language === 'fr' ? selectedSubcategory.name_fr : selectedSubcategory.name_de)
                                  : '—'}
                              </span>
                            </div>
                            {subcategories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => goBackToStep(1)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                                  isDark 
                                    ? 'text-blue-400 hover:bg-slate-600' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {language === 'fr' ? 'Modifier' : 'Ändern'}
                              </button>
                            )}
                          </div>
                          {/* Unité */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'fr' ? 'Unité:' : 'Einheit:'}
                              </span>
                              <span className={`text-sm font-medium px-2 py-0.5 rounded ${isDark ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                                {getUnitLabel(selectedUnit, language) || '—'}
                              </span>
                            </div>
                            {availableUnits.length > 1 && (
                              <button
                                type="button"
                                onClick={() => goBackToStep(2)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                                  isDark 
                                    ? 'text-blue-400 hover:bg-slate-600' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {language === 'fr' ? 'Modifier' : 'Ändern'}
                              </button>
                            )}
                          </div>
                          {/* Facteur */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`text-sm flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {language === 'fr' ? 'Facteur:' : 'Faktor:'}
                              </span>
                              <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {selectedFactor ? getFactorName(selectedFactor) : '—'}
                              </span>
                            </div>
                            {filteredFactors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => goBackToStep(3)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors flex-shrink-0 ${
                                  isDark 
                                    ? 'text-blue-400 hover:bg-slate-600' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {language === 'fr' ? 'Modifier' : 'Ändern'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`p-4 rounded-xl ${
                      isDark 
                        ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20 border border-blue-500/30' 
                        : 'bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200'
                    }`}>
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {isEditMode 
                          ? (language === 'fr' ? 'Quantité' : 'Menge')
                          : (language === 'fr' ? '4. Quantité' : '4. Menge')
                        }
                      </label>
                      
                      <div className="flex items-center gap-4">
                        {/* Input quantité */}
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="number"
                              value={quantity || ''}
                              onChange={(e) => setQuantity(e.target.value)}
                              data-testid="quantity-input"
                              required
                              step="any"
                              autoFocus
                              className={`w-full px-4 py-3 pr-16 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                                isDark 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-gray-200 text-gray-900'
                              }`}
                              placeholder="0"
                            />
                            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                              {selectedUnit || selectedFactor.default_unit || selectedFactor.input_units?.[0]}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className={`w-6 h-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />

                        {/* Résultat */}
                        <div className="flex-1">
                          <div className={`px-4 py-3 rounded-xl ${
                            quantity 
                              ? isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-100 border border-green-300'
                              : isDark ? 'bg-slate-700 border border-slate-600' : 'bg-gray-100 border border-gray-200'
                          }`}>
                            <span className={`text-lg font-bold ${
                              quantity 
                                ? isDark ? 'text-green-400' : 'text-green-600'
                                : isDark ? 'text-slate-500' : 'text-gray-400'
                            }`}>
                              {quantity 
                                ? `${(totalEmissions / 1000).toFixed(4)} tCO₂e`
                                : '— tCO₂e'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Détail multi-impacts */}
                      {quantity && emissions && emissions.length > 0 && (
                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-500" />
                              <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                {emissions.length > 1 
                                  ? (language === 'fr' ? 'Répartition multi-impacts' : 'Mehrfach-Auswirkungen')
                                  : (language === 'fr' ? 'Impact comptabilisé' : 'Berücksichtigte Auswirkung')
                                }
                              </span>
                            </div>
                            {hasFilteredImpacts && (
                              <div className="flex items-center gap-1">
                                <Info className="w-3 h-3 text-amber-500" />
                                <span className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                  {language === 'fr' 
                                    ? `Règle métier appliquée (${allImpacts.length - filteredImpacts.length} impact(s) exclu(s))` 
                                    : `Geschäftsregel angewendet (${allImpacts.length - filteredImpacts.length} Auswirkung(en) ausgeschlossen)`
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={`grid ${emissions.length > 2 ? 'grid-cols-3' : emissions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                            {emissions.map((e, i) => {
                              const scopeInfo = scopeColors[e.scope] || { bg: 'bg-gray-500', label: e.scope };
                              return (
                                <div 
                                  key={i}
                                  className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'} border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${scopeInfo.bg}`}></span>
                                    <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      {scopeInfo.label}
                                    </span>
                                    {e.type && e.type !== 'direct' && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                        {e.type === 'upstream' ? (language === 'fr' ? 'amont' : 'Vorkette') : e.type}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {(e.emissions / 1000).toFixed(4)} <span className="text-sm font-normal">tCO₂e</span>
                                  </p>
                                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {e.value} {e.unit}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Explication des règles métier */}
                          {hasFilteredImpacts && (
                            <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                              <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                {scope?.startsWith('scope3') && scope !== 'scope3_amont'
                                  ? (language === 'fr' 
                                      ? '📋 Saisie en Scope 3 : seuls les impacts Scope 3 sont comptabilisés (hors amont énergie).' 
                                      : '📋 Scope 3 Eingabe: Nur Scope 3 Auswirkungen werden berücksichtigt (ohne Energievorkette).')
                                  : (language === 'fr'
                                      ? '📋 Saisie en Scope 1/2 : les impacts Scope 1, 2 et Scope 3.3 (amont énergie) sont comptabilisés.'
                                      : '📋 Scope 1/2 Eingabe: Scope 1, 2 und Scope 3.3 (Energievorkette) Auswirkungen werden berücksichtigt.')
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Commentaire */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {language === 'fr' ? 'Commentaire (optionnel)' : 'Kommentar (optional)'}
                      </label>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={2}
                        className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                          isDark 
                            ? 'bg-slate-700 border-slate-600 text-white' 
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                        placeholder={language === 'fr' ? 'Notes, source des données...' : 'Notizen, Datenquelle...'}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
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
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {editingActivity 
                  ? (language === 'fr' ? 'Modifier' : 'Speichern')
                  : (language === 'fr' ? 'Enregistrer' : 'Speichern')
                }
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedEntryModal;
