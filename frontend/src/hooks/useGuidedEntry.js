import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { normalizeUnit, filterFactorsByUnitStrict, filterFactorsByDimension, getAvailableUnitsWithConversions, findDimension, convertUnit, findFactorNativeUnit } from '../utils/units';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

const useGuidedEntry = ({
  isOpen, category, scope, language, onSubmit, onClose,
  editingActivity, preSelectedFactor, showExpertFactors
}) => {
  const [step, setStep] = useState(1);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [nativeUnits, setNativeUnits] = useState([]);
  const [convertedUnits, setConvertedUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isConvertedUnit, setIsConvertedUnit] = useState(false);
  const [factors, setFactors] = useState([]);
  const [filteredFactors, setFilteredFactors] = useState([]);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [factorSearch, setFactorSearch] = useState('');
  const [showFactorList, setShowFactorList] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingCategoryChoice, setPendingCategoryChoice] = useState(null);
  const [resolvedCategory, setResolvedCategory] = useState(null);

  const effectiveCategory = resolvedCategory || category;
  const effectiveScope = resolvedCategory?.scope || scope;

  const resetState = useCallback(() => {
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
  }, []);

  const extractAvailableUnits = (factorsList) => {
    const result = getAvailableUnitsWithConversions(factorsList);
    setNativeUnits(result.native);
    setConvertedUnits(result.converted);
    setAvailableUnits(result.all);
  };

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
      const subcats = response.data || [];
      setSubcategories(subcats);
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
      if (allFactors.length === 0) {
        const catResponse = await axios.get(`${API_URL}/api/emission-factors/by-category/${category.code}`);
        allFactors = catResponse.data || [];
        const subcatLower = subcatCode.toLowerCase();
        allFactors = allFactors.filter(f =>
          f.subcategory === subcatCode ||
          f.name?.toLowerCase().includes(subcatLower) ||
          f.name_fr?.toLowerCase().includes(subcatLower) ||
          f.tags?.some(tag => tag.toLowerCase().includes(subcatLower))
        );
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

  const loadForEditing = async (activity) => {
    setLoading(true);
    try {
      const subcatsRes = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
      const subcats = subcatsRes.data || [];
      setSubcategories(subcats);
      setSelectedSubcategory(subcats.find(s => s.code === activity.subcategory_id) || null);

      const factorsRes = await axios.get(`${API_URL}/api/emission-factors/search?category=${category.code}`);
      let allFactors = factorsRes.data || [];
      let factor = allFactors.find(f => f.id === activity.emission_factor_id);
      if (!factor && activity.emission_factor_id) {
        try {
          const factorRes = await axios.get(`${API_URL}/api/emission-factors/${activity.emission_factor_id}`);
          if (factorRes.data) { factor = factorRes.data; allFactors = [factor, ...allFactors]; }
        } catch (err) { logger.warn('Could not fetch emission factor by ID:', err); }
      }
      setFactors(allFactors);

      const unit = activity.original_unit || activity.unit || '';
      setSelectedUnit(unit);
      const unitsResult = getAvailableUnitsWithConversions(allFactors);
      setNativeUnits(unitsResult.native);
      setConvertedUnits(unitsResult.converted);
      setAvailableUnits(unitsResult.all);
      const unitIsConverted = unitsResult.converted.includes(unit);
      setIsConvertedUnit(unitIsConverted);

      const compatible = unitIsConverted
        ? filterFactorsByDimension(allFactors, unit)
        : filterFactorsByUnitStrict(allFactors, unit);
      setFilteredFactors(compatible.length > 0 ? compatible : allFactors);
      setSelectedFactor(factor || null);

      const displayQty = activity.original_quantity || activity.quantity;
      setQuantity(displayQty?.toString() || '');
      setComments(activity.comments || '');
      setStep(4);
      setShowFactorList(false);
    } catch (error) {
      logger.error('Failed to load activity for editing:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadForPreSelectedFactor = async (factor) => {
    setLoading(true);
    try {
      let fullFactor = factor;
      try {
        const factorRes = await axios.get(`${API_URL}/api/emission-factors/${factor.id}`);
        if (factorRes.data) fullFactor = { ...factorRes.data, scope: factor.scope };
      } catch (err) { logger.warn('Could not fetch full factor, using search data:', err); }

      setSelectedFactor(fullFactor);
      setFactors([fullFactor]);
      setFilteredFactors([fullFactor]);
      setSelectedUnit(fullFactor.default_unit || '');
      setIsConvertedUnit(false);

      const unitsResult = getAvailableUnitsWithConversions([fullFactor]);
      setNativeUnits(unitsResult.native);
      setConvertedUnits(unitsResult.converted);
      setAvailableUnits(unitsResult.all);

      if (fullFactor.subcategory) {
        try {
          const subcatsRes = await axios.get(`${API_URL}/api/subcategories?category=${category.code}`);
          const subcats = subcatsRes.data || [];
          setSubcategories(subcats);
          setSelectedSubcategory(subcats.find(s => s.code === fullFactor.subcategory) || null);
        } catch (err) { logger.warn('Could not fetch subcategories:', err); }
      }
      setQuantity('');
      setComments('');

      if (factor._resolvedCategories && factor._resolvedCategories.length > 1) {
        setPendingCategoryChoice(factor._resolvedCategories);
      } else {
        setPendingCategoryChoice(null);
      }
      setStep(4);
      setShowFactorList(false);
    } catch (error) {
      logger.error('Failed to load pre-selected factor:', error);
    } finally {
      setLoading(false);
    }
  };

  // Init effect
  useEffect(() => {
    if (isOpen && category) {
      if (editingActivity) {
        setIsEditMode(true);
        loadForEditing(editingActivity);
      } else if (preSelectedFactor) {
        setIsEditMode(false);
        loadForPreSelectedFactor(preSelectedFactor);
      } else {
        setIsEditMode(false);
        resetState();
        fetchSubcategories();
      }
    }
  }, [isOpen, category, editingActivity?.id, preSelectedFactor?.id]);

  // Search filter
  useEffect(() => {
    if (factorSearch) {
      const search = factorSearch.toLowerCase();
      setFilteredFactors(factors.filter(f =>
        f.name?.toLowerCase().includes(search) ||
        f.name_simple_fr?.toLowerCase().includes(search) ||
        f.name_simple_de?.toLowerCase().includes(search) ||
        f.name_fr?.toLowerCase().includes(search) ||
        f.name_de?.toLowerCase().includes(search) ||
        f.tags?.some(tag => tag.toLowerCase().includes(search))
      ));
    } else if (selectedUnit) {
      filterFactorsByUnitStrict(selectedUnit);
    } else {
      setFilteredFactors(factors);
    }
  }, [factorSearch]);

  const goBackToStep = (targetStep) => {
    setStep(targetStep);
    if (targetStep <= 1) { setSelectedUnit(''); setIsConvertedUnit(false); setSelectedFactor(null); setShowFactorList(false); }
    else if (targetStep <= 2) { setSelectedFactor(null); setIsConvertedUnit(false); setShowFactorList(false); }
    else if (targetStep === 3) { setShowFactorList(true); }
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
    const compatible = isConverted
      ? filterFactorsByDimension(factors, unit)
      : filterFactorsByUnitStrict(factors, unit);
    setFilteredFactors(compatible);
  };

  const handleFactorSelect = (factor) => {
    setSelectedFactor(factor);
    setShowFactorList(false);
    setStep(4);
  };

  // Business logic
  const normalizeScope = (s) => {
    if (!s) return '';
    const sl = s.toLowerCase().trim();
    if (['scope3_3', 'scope3.3', 'scope33'].includes(sl)) return 'scope3_3';
    return sl;
  };

  const applyBusinessRules = (impacts, selectedScope, selectedCategory) => {
    if (!impacts || impacts.length === 0) return impacts;
    const ns = normalizeScope(selectedScope);
    const isScope1or2 = ['scope1', 'scope2'].includes(ns);
    const isScope3_3 = selectedCategory === 'activites_combustibles_energie' || ns === 'scope3_3';
    const isScope3 = ns?.startsWith('scope3') && !isScope3_3;
    return impacts.filter(impact => {
      const is = normalizeScope(impact.scope);
      if ((impact.value || 0) === 0) return false;
      if (isScope1or2) return ['scope1', 'scope2', 'scope3_3'].includes(is);
      if (isScope3_3) return is === 'scope3_3';
      if (isScope3) return is === 'scope3';
      return true;
    });
  };

  const calculateEmissions = () => {
    if (!selectedFactor || !quantity) return null;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    let normalizedQty = qty;
    if (selectedUnit && selectedUnit !== factorNativeUnit) {
      normalizedQty = convertUnit(qty, selectedUnit, factorNativeUnit);
    }
    let impacts = selectedFactor.impacts || [{
      scope: selectedFactor.scope, category: selectedFactor.category,
      value: selectedFactor.value, unit: selectedFactor.unit, type: 'direct'
    }];
    impacts = applyBusinessRules(impacts, effectiveScope, effectiveCategory?.code);
    return impacts.map(impact => ({ ...impact, emissions: normalizedQty * impact.value }));
  };

  const getConvertedQuantity = () => {
    if (!selectedFactor || !quantity || !isConvertedUnit) return null;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return null;
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    if (selectedUnit === factorNativeUnit) return null;
    return { value: convertUnit(qty, selectedUnit, factorNativeUnit), unit: factorNativeUnit };
  };

  const emissions = calculateEmissions();
  const totalEmissions = emissions?.reduce((sum, e) => sum + e.emissions, 0) || 0;
  const convertedQty = getConvertedQuantity();
  const allImpacts = selectedFactor?.impacts || [];
  const hasFilteredImpacts = allImpacts.length > (emissions || []).length;

  const getFactorName = (factor) => {
    if (language === 'de') return factor.name_simple_de || factor.name_de || factor.name_simple_fr || factor.name_fr || factor.name;
    return factor.name_simple_fr || factor.name_fr || factor.name;
  };

  const handleSubmit = async () => {
    if (!selectedFactor || !quantity) return;
    const qty = parseFloat(quantity);
    const factorNativeUnit = findFactorNativeUnit(selectedFactor, selectedUnit);
    const needsConversion = selectedUnit && selectedUnit !== factorNativeUnit;
    const convertedQtyValue = needsConversion ? convertUnit(qty, selectedUnit, factorNativeUnit) : qty;
    const conversionFactor = needsConversion ? convertedQtyValue / qty : null;
    await onSubmit({
      category_id: effectiveCategory.code,
      subcategory_id: selectedSubcategory?.code,
      scope: effectiveScope,
      name: language === 'fr'
        ? (selectedFactor.name_simple_fr || selectedFactor.name_fr || selectedFactor.name)
        : (selectedFactor.name_simple_de || selectedFactor.name_de || selectedFactor.name),
      quantity: convertedQtyValue, unit: factorNativeUnit,
      original_quantity: qty, original_unit: selectedUnit || factorNativeUnit,
      conversion_factor: conversionFactor,
      emission_factor_id: selectedFactor.id,
      comments, entry_scope: effectiveScope, entry_category: effectiveCategory.code
    });
    onClose();
  };

  const scopeColors = {
    'scope1': { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Scope 1' },
    'scope2': { bg: 'bg-cyan-500', text: 'text-cyan-500', label: 'Scope 2' },
    'scope3_3': { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Scope 3.3' },
    'scope3': { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Scope 3' },
    'scope3_amont': { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Scope 3 Amont' },
    'scope3_aval': { bg: 'bg-indigo-500', text: 'text-indigo-500', label: 'Scope 3 Aval' }
  };

  return {
    step, subcategories, selectedSubcategory, availableUnits, nativeUnits,
    convertedUnits, selectedUnit, isConvertedUnit, factors, filteredFactors,
    selectedFactor, factorSearch, setFactorSearch, showFactorList,
    quantity, setQuantity, comments, setComments, loading, isEditMode,
    pendingCategoryChoice, effectiveCategory, effectiveScope,
    emissions, totalEmissions, convertedQty, allImpacts, hasFilteredImpacts,
    scopeColors, resolvedCategory, setResolvedCategory,
    goBackToStep, handleSubcategorySelect, handleUnitSelect,
    handleFactorSelect, handleSubmit, getFactorName
  };
};

export default useGuidedEntry;
