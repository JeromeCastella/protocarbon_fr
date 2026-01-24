import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Check, Search, ChevronRight, Info, Sparkles, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Modal de saisie guidée pour les données d'activité
 * Parcours: Catégorie → Sous-catégorie → Unité → Facteur → Quantité
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
  
  // Conversions d'unités globales
  const [unitConversions, setUnitConversions] = useState([]);
  
  // Chargement
  const [loading, setLoading] = useState(false);

  // Reset quand on ouvre le modal
  useEffect(() => {
    if (isOpen && category) {
      resetState();
      fetchSubcategories();
      fetchUnitConversions();
      
      // Si édition, pré-remplir
      if (editingActivity) {
        prefillFromActivity(editingActivity);
      }
    }
  }, [isOpen, category]);

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

  const prefillFromActivity = async (activity) => {
    setQuantity(activity.quantity?.toString() || '');
    setComments(activity.comments || '');
    
    if (activity.subcategory_id) {
      // Charger les sous-catégories et sélectionner celle de l'activité
      const res = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
      const subcats = res.data || [];
      const subcat = subcats.find(s => s.code === activity.subcategory_id);
      if (subcat) {
        setSelectedSubcategory(subcat);
        setStep(2);
      }
    }
    
    if (activity.original_unit || activity.unit) {
      setSelectedUnit(activity.original_unit || activity.unit);
    }
    
    if (activity.emission_factor_id) {
      // Charger le facteur
      const factorsRes = await axios.get(`${API_URL}/api/emission-factors/search?category=${category.code}`);
      const factor = factorsRes.data?.find(f => f.id === activity.emission_factor_id);
      if (factor) {
        setSelectedFactor(factor);
      }
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

  const fetchUnitConversions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/unit-conversions`);
      setUnitConversions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch unit conversions:', error);
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
      const response = await axios.get(`${API_URL}/api/emission-factors/search?subcategory=${subcatCode}`);
      let allFactors = response.data || [];
      
      // Si pas de résultats, essayer avec la catégorie
      if (allFactors.length === 0) {
        const catResponse = await axios.get(`${API_URL}/api/emission-factors/search?category=${category.code}`);
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

  const extractAvailableUnits = (factorsList) => {
    const units = new Set();
    
    factorsList.forEach(f => {
      // Format V2 : input_units
      if (f.input_units && Array.isArray(f.input_units)) {
        f.input_units.forEach(u => units.add(u));
      }
      // Format V1 : extraire de l'unité (kgCO2e/L -> L)
      else if (f.unit) {
        const match = f.unit.match(/kgCO2e\/(.+)/);
        if (match) {
          units.add(match[1]);
        } else {
          units.add(f.unit);
        }
      }
      // Ajouter les unités convertibles
      if (f.unit_conversions) {
        Object.keys(f.unit_conversions).forEach(key => {
          const parts = key.split('_to_');
          if (parts.length === 2) {
            units.add(parts[0]);
            units.add(parts[1]);
          }
        });
      }
    });
    
    // Ajouter les unités des conversions globales
    unitConversions.forEach(conv => {
      // Vérifier si une conversion existe pour nos unités
      if (units.has(conv.from_unit) || units.has(conv.to_unit)) {
        units.add(conv.from_unit);
        units.add(conv.to_unit);
      }
    });
    
    setAvailableUnits(Array.from(units).sort());
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
    
    // Filtrer les facteurs compatibles avec cette unité
    filterFactorsByUnit(unit);
  };

  const filterFactorsByUnit = (unit) => {
    const compatible = factors.filter(f => {
      // V2 : vérifier input_units
      if (f.input_units && Array.isArray(f.input_units)) {
        if (f.input_units.includes(unit)) return true;
        
        // Vérifier les conversions spécifiques au facteur
        if (f.unit_conversions) {
          for (const key of Object.keys(f.unit_conversions)) {
            const parts = key.split('_to_');
            if (parts.includes(unit)) return true;
          }
        }
      }
      
      // V1 : vérifier l'unité directe
      if (f.unit) {
        const factorUnit = f.unit.match(/kgCO2e\/(.+)/)?.[1] || f.unit;
        if (factorUnit === unit) return true;
      }
      
      // Vérifier conversions globales
      const canConvert = unitConversions.some(conv => {
        const hasFrom = f.input_units?.includes(conv.from_unit) || f.input_units?.includes(conv.to_unit);
        const targetMatch = conv.from_unit === unit || conv.to_unit === unit;
        return hasFrom && targetMatch;
      });
      
      return canConvert;
    });
    
    setFilteredFactors(compatible.length > 0 ? compatible : factors);
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
      filterFactorsByUnit(selectedUnit);
    } else {
      setFilteredFactors(factors);
    }
  }, [factorSearch]);

  // Calculer les émissions estimées
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
    
    // Calculer pour chaque impact
    const impacts = selectedFactor.impacts || [{
      scope: selectedFactor.scope,
      category: selectedFactor.category,
      value: selectedFactor.value,
      unit: selectedFactor.unit,
      type: 'direct'
    }];
    
    return impacts.map(impact => ({
      ...impact,
      emissions: normalizedQty * impact.value
    }));
  };

  const emissions = calculateEmissions();
  const totalEmissions = emissions?.reduce((sum, e) => sum + e.emissions, 0) || 0;

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
      comments: comments
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
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
                        {selectedUnit}
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
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Étape 1: Sous-catégories */}
                {step === 1 && subcategories.length > 0 && (
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
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 3: Facteur d'émission */}
                {step >= 3 && (
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {language === 'fr' ? '3. Facteur d\'émission' : '3. Emissionsfaktor'}
                    </label>
                    
                    {/* Recherche */}
                    <div className="relative mb-3">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        value={factorSearch}
                        onChange={(e) => {
                          setFactorSearch(e.target.value);
                          setShowFactorList(true);
                        }}
                        onFocus={() => setShowFactorList(true)}
                        placeholder={language === 'fr' ? 'Rechercher par nom ou tag...' : 'Nach Name oder Tag suchen...'}
                        data-testid="factor-search"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                          isDark 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>

                    {/* Liste des facteurs */}
                    {showFactorList && filteredFactors.length > 0 && (
                      <div className={`rounded-xl border overflow-hidden max-h-64 overflow-y-auto ${
                        isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
                      }`}>
                        {filteredFactors.map(factor => {
                          const impacts = factor.impacts || [{
                            scope: factor.scope,
                            category: factor.category,
                            value: factor.value,
                            unit: factor.unit
                          }];
                          
                          return (
                            <button
                              key={factor.id}
                              type="button"
                              onClick={() => handleFactorSelect(factor)}
                              data-testid={`factor-${factor.id}`}
                              className={`w-full px-4 py-3 text-left border-b last:border-b-0 transition-all ${
                                selectedFactor?.id === factor.id
                                  ? 'bg-blue-500 text-white'
                                  : isDark 
                                    ? 'border-slate-600 hover:bg-slate-600 text-white' 
                                    : 'border-gray-100 hover:bg-gray-50 text-gray-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <span className="font-medium">{getFactorName(factor)}</span>
                                  {factor.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {factor.tags.slice(0, 3).map(tag => (
                                        <span 
                                          key={tag} 
                                          className={`text-xs px-1.5 py-0.5 rounded ${
                                            selectedFactor?.id === factor.id
                                              ? 'bg-white/20'
                                              : isDark ? 'bg-slate-600' : 'bg-gray-100'
                                          }`}
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  {impacts.slice(0, 2).map((impact, i) => {
                                    const scopeInfo = scopeColors[impact.scope] || { bg: 'bg-gray-500', label: impact.scope };
                                    return (
                                      <span 
                                        key={i}
                                        className={`px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap ${
                                          selectedFactor?.id === factor.id ? 'bg-white/30' : scopeInfo.bg
                                        }`}
                                      >
                                        {scopeInfo.label}: {impact.value}
                                      </span>
                                    );
                                  })}
                                  {impacts.length > 2 && (
                                    <span className={`text-xs ${selectedFactor?.id === factor.id ? 'text-white/70' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      +{impacts.length - 2} {language === 'fr' ? 'autre(s)' : 'weitere'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {showFactorList && filteredFactors.length === 0 && (
                      <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                          {language === 'fr' ? 'Aucun facteur trouvé' : 'Kein Faktor gefunden'}
                        </p>
                      </div>
                    )}

                    {/* Facteur sélectionné */}
                    {selectedFactor && (
                      <div className={`mt-3 p-4 rounded-xl ${isDark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {getFactorName(selectedFactor)}
                            </p>
                            <div className={`text-sm mt-2 space-y-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {(selectedFactor.impacts || [{
                                scope: selectedFactor.scope,
                                category: selectedFactor.category,
                                value: selectedFactor.value,
                                unit: selectedFactor.unit
                              }]).map((impact, i) => {
                                const scopeInfo = scopeColors[impact.scope] || { bg: 'bg-gray-500', text: 'text-gray-500', label: impact.scope };
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${scopeInfo.bg}`}></span>
                                    <span>{scopeInfo.label}: {impact.value} {impact.unit}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {selectedFactor.source && (
                              <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                Source: {selectedFactor.source} ({selectedFactor.region})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 4: Quantité et résultat */}
                {step >= 4 && selectedFactor && (
                  <>
                    <div className={`p-4 rounded-xl ${
                      isDark 
                        ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20 border border-blue-500/30' 
                        : 'bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200'
                    }`}>
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {language === 'fr' ? '4. Quantité' : '4. Menge'}
                      </label>
                      
                      <div className="flex items-center gap-4">
                        {/* Input quantité */}
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="number"
                              value={quantity}
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
                      {quantity && emissions && emissions.length > 1 && (
                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                              {language === 'fr' ? 'Répartition multi-impacts' : 'Mehrfach-Auswirkungen'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {emissions.map((e, i) => {
                              const scopeInfo = scopeColors[e.scope] || { bg: 'bg-gray-500', label: e.scope };
                              return (
                                <div 
                                  key={i}
                                  className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${scopeInfo.bg}`}></span>
                                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      {scopeInfo.label}
                                    </span>
                                  </div>
                                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {(e.emissions / 1000).toFixed(4)} tCO₂e
                                  </p>
                                </div>
                              );
                            })}
                          </div>
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
