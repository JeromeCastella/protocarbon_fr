import { useState, useEffect } from 'react';
import axios from 'axios';
import { INITIAL_FORM } from './wizardConstants';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const enrichFactors = (factors) => factors.map(f => {
  const impacts = f.impacts || [];
  const totalValue = impacts.reduce((sum, imp) => sum + (imp.value || 0), 0);
  const unit = impacts[0]?.unit || f.default_unit || '';
  return { ...f, value: Math.round(totalValue * 1e6) / 1e6, unit };
});

export const useProductWizard = (isOpen, editingProduct) => {
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [eolSearch, setEolSearch] = useState('');

  // Emission factors
  const [treatments, setTreatments] = useState([]);
  const [electricityFactors, setElectricityFactors] = useState([]);
  const [fuelFactors, setFuelFactors] = useState([]);
  const [carburantFactors, setCarburantFactors] = useState([]);
  const [refrigerantFactors, setRefrigerantFactors] = useState([]);

  // Emissions preview
  const [emissionsPreview, setEmissionsPreview] = useState({ transformation: 0, usage: 0, disposal: 0, total: 0 });

  useEffect(() => {
    if (isOpen) {
      loadEmissionFactors();
      if (editingProduct) loadProductData(editingProduct);
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    calculateEmissionsPreview();
  }, [formData, treatments, electricityFactors, fuelFactors, carburantFactors, refrigerantFactors]);

  const loadEmissionFactors = async () => {
    try {
      const [treatRes, elecRes, fuelRes, carbuRes, refrigRes] = await Promise.all([
        axios.get(`${API_URL}/api/emission-factors/by-category/fin_vie_produits`),
        axios.get(`${API_URL}/api/emission-factors/by-category/electricite`),
        axios.get(`${API_URL}/api/emission-factors/by-category/combustion_fixe`),
        axios.get(`${API_URL}/api/emission-factors/by-tags?tags=carburant`),
        axios.get(`${API_URL}/api/emission-factors/by-category/emissions_fugitives`)
      ]);
      setTreatments(enrichFactors(treatRes.data || []));
      setElectricityFactors(enrichFactors(elecRes.data || []));
      setFuelFactors(enrichFactors(fuelRes.data || []));
      setCarburantFactors(enrichFactors(carbuRes.data || []));
      setRefrigerantFactors(enrichFactors(refrigRes.data || []));

      if (!editingProduct) {
        const elecData = elecRes.data || [];
        const swissMix = elecData.find(f =>
          (f.name_simple_fr || f.name_fr || '').toLowerCase().includes('suisse') ||
          (f.name_fr || '').toLowerCase().includes('schweiz')
        ) || elecData[0];
        if (swissMix) {
          setFormData(prev => ({
            ...prev,
            transformation: { ...prev.transformation, electricity_factor_id: swissMix.id },
            usage: { ...prev.usage, electricity_factor_id: swissMix.id }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load emission factors:', error);
    }
  };

  const loadProductData = (product) => {
    setFormData({
      name: product.name || '',
      description: product.description || '',
      product_type: product.product_type || 'finished',
      unit: product.unit || 'unit',
      lifespan_years: product.lifespan_years || 1,
      transformation: product.transformation || { ...INITIAL_FORM.transformation },
      usage: product.usage || { ...INITIAL_FORM.usage },
      end_of_life: product.end_of_life || []
    });
  };

  const calculateEmissionsPreview = () => {
    let transformation = 0, usage = 0, disposal = 0;
    if (formData.product_type === 'semi_finished') {
      const t = formData.transformation;
      for (const [list, fid, qty] of [[electricityFactors, t.electricity_factor_id, t.electricity_kwh], [fuelFactors, t.fuel_factor_id, t.fuel_kwh]]) {
        if (fid && qty > 0) { const f = list.find(x => x.id === fid); if (f) transformation += qty * (f.value || 0); }
      }
    }
    const totalCycles = formData.lifespan_years * formData.usage.cycles_per_year;
    const u = formData.usage;
    for (const [list, fid, qpc] of [
      [electricityFactors, u.electricity_factor_id, u.electricity_kwh_per_cycle],
      [fuelFactors, u.fuel_factor_id, u.fuel_kwh_per_cycle],
      [carburantFactors, u.carburant_factor_id, u.carburant_l_per_cycle],
      [refrigerantFactors, u.refrigerant_factor_id, u.refrigerant_kg_per_cycle],
    ]) {
      if (fid && qpc > 0) { const f = list.find(x => x.id === fid); if (f) usage += qpc * totalCycles * (f.value || 0); }
    }
    formData.end_of_life.forEach(entry => {
      if (entry.emission_factor_id && entry.quantity > 0) { const f = treatments.find(t => t.id === entry.emission_factor_id); if (f) disposal += entry.quantity * (f.value || 0); }
    });
    setEmissionsPreview({
      transformation: Math.round(transformation * 1000) / 1000,
      usage: Math.round(usage * 1000) / 1000,
      disposal: Math.round(disposal * 1000) / 1000,
      total: Math.round((transformation + usage + disposal) * 1000) / 1000
    });
  };

  // End of life helpers
  const addEndOfLifeEntry = () => setFormData(prev => ({ ...prev, end_of_life: [...prev.end_of_life, { name: '', quantity: 0, unit: 'kg', emission_factor_id: '' }] }));
  const updateEndOfLifeEntry = (index, field, value) => setFormData(prev => ({ ...prev, end_of_life: prev.end_of_life.map((e, i) => i === index ? { ...e, [field]: value } : e) }));
  const removeEndOfLifeEntry = (index) => setFormData(prev => ({ ...prev, end_of_life: prev.end_of_life.filter((_, i) => i !== index) }));

  // Steps definition
  const steps = [
    { number: 1, title: 'Informations' },
    { number: 2, title: 'Transformation (3.10)', condition: formData.product_type === 'semi_finished' },
    { number: 3, title: 'Utilisation (3.11)' },
    { number: 4, title: 'Fin de vie (3.12)' },
    { number: 5, title: 'Résumé' }
  ].filter(s => s.condition !== false);

  const currentStepIndex = steps.findIndex(s => s.number === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;

  // Validation
  const validateStep = (stepNum) => {
    const errors = [];
    if (stepNum === 1) {
      if (!formData.name.trim()) errors.push('Le nom du produit est obligatoire.');
      if (formData.lifespan_years <= 0) errors.push('La durée de vie doit être > 0.');
    }
    if (stepNum === 3 && formData.usage.cycles_per_year <= 0) errors.push('Cycles/an doit être > 0.');
    if (stepNum === 4) {
      formData.end_of_life.forEach((e, i) => {
        if (!e.emission_factor_id) errors.push(`Ligne ${i + 1} : sélectionnez un facteur.`);
        if (!e.quantity || e.quantity <= 0) errors.push(`Ligne ${i + 1} : quantité doit être > 0.`);
      });
    }
    return errors;
  };

  const canGoNext = validationErrors.length === 0 && (currentStep === 1 ? formData.name.trim() !== '' : true);
  const goNext = () => { const e = validateStep(currentStep); if (e.length > 0) { setValidationErrors(e); return; } setValidationErrors([]); const ns = steps[currentStepIndex + 1]; if (ns) setCurrentStep(ns.number); };
  const goPrev = () => { setValidationErrors([]); const ps = steps[currentStepIndex - 1]; if (ps) setCurrentStep(ps.number); };
  const goToStep = (n) => { setValidationErrors([]); setCurrentStep(n); };

  const handleSubmit = async (onProductCreated, onClose) => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name, description: formData.description, product_type: formData.product_type,
        unit: formData.unit, lifespan_years: formData.lifespan_years,
        transformation: formData.product_type === 'semi_finished' ? formData.transformation : null,
        usage: formData.usage, end_of_life: formData.end_of_life
      };
      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/enhanced/${editingProduct.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/products/enhanced`, payload);
      }
      onProductCreated?.();
      resetAndClose(onClose);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = detail?.errors ? detail.errors.join('\n') : (typeof detail === 'string' ? detail : 'Une erreur est survenue.');
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = (onClose) => {
    setCurrentStep(1); setShowCloseConfirm(false); setErrorToast(null); setEolSearch('');
    setFormData({ ...INITIAL_FORM, transformation: { ...INITIAL_FORM.transformation }, usage: { ...INITIAL_FORM.usage }, end_of_life: [] });
    onClose();
  };

  const hasUnsavedChanges = () => formData.name.trim() !== '' || formData.end_of_life.length > 0;

  // Filtered treatments
  const filteredTreatments = eolSearch.trim()
    ? treatments.filter(t => {
        const label = (t.name_simple_fr || t.name_fr || t.name || '').toLowerCase();
        const tags = (t.search_tags || []).join(' ').toLowerCase();
        const q = eolSearch.toLowerCase();
        return label.includes(q) || tags.includes(q);
      })
    : treatments;

  return {
    formData, setFormData, loading, errorToast, setErrorToast, validationErrors,
    currentStep, showCloseConfirm, setShowCloseConfirm, eolSearch, setEolSearch,
    emissionsPreview, steps, currentStepIndex, isLastStep, canGoNext,
    goNext, goPrev, goToStep, handleSubmit, resetAndClose, hasUnsavedChanges,
    addEndOfLifeEntry, updateEndOfLifeEntry, removeEndOfLifeEntry,
    electricityFactors, fuelFactors, carburantFactors, refrigerantFactors,
    treatments, filteredTreatments
  };
};
