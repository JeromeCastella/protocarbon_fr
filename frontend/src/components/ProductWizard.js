import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ArrowRight, ArrowLeft, Check, X, Plus, Trash2,
  Zap, Fuel, Thermometer, Wind, Recycle, Factory, Leaf,
  Info, Search, AlertTriangle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const INITIAL_FORM = {
  name: '',
  description: '',
  product_type: 'finished',
  unit: 'unit',
  lifespan_years: 1,
  transformation: {
    electricity_kwh: 0,
    electricity_factor_id: '',
    fuel_kwh: 0,
    fuel_factor_id: '',
    carburant_l: 0,
    carburant_factor_id: '',
    refrigerant_kg: 0,
    refrigerant_factor_id: '',
  },
  usage: {
    electricity_kwh_per_cycle: 0,
    electricity_factor_id: '',
    fuel_kwh_per_cycle: 0,
    fuel_factor_id: '',
    carburant_l_per_cycle: 0,
    carburant_factor_id: '',
    refrigerant_kg_per_cycle: 0,
    refrigerant_factor_id: '',
    cycles_per_year: 1
  },
  end_of_life: []
};

const ProductWizard = ({ isOpen, onClose, onProductCreated, editingProduct = null }) => {
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Emission factors
  const [treatments, setTreatments] = useState([]);
  const [electricityFactors, setElectricityFactors] = useState([]);
  const [fuelFactors, setFuelFactors] = useState([]);
  const [carburantFactors, setCarburantFactors] = useState([]);
  const [refrigerantFactors, setRefrigerantFactors] = useState([]);
  
  // End of life factor search
  const [eolSearch, setEolSearch] = useState('');

  // Enrich factors with a flattened total value from impacts[]
  const enrichFactors = (factors) => factors.map(f => {
    const impacts = f.impacts || [];
    const totalValue = impacts.reduce((sum, imp) => sum + (imp.value || 0), 0);
    const unit = impacts[0]?.unit || f.default_unit || '';
    return { ...f, value: Math.round(totalValue * 1e6) / 1e6, unit };
  });
  
  // Form data
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  
  // Calculated emissions preview
  const [emissionsPreview, setEmissionsPreview] = useState({
    transformation: 0,
    usage: 0,
    disposal: 0,
    total: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadEmissionFactors();
      if (editingProduct) {
        loadProductData(editingProduct);
      }
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
      
      // Smart defaults: pre-select Swiss electricity mix (only on creation)
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
    let transformation = 0;
    let usage = 0;
    let disposal = 0;
    
    // Transformation (3.10) — semi-finished only
    if (formData.product_type === 'semi_finished') {
      const t = formData.transformation;
      const pairs = [
        [electricityFactors, t.electricity_factor_id, t.electricity_kwh],
        [fuelFactors, t.fuel_factor_id, t.fuel_kwh],
      ];
      for (const [list, fid, qty] of pairs) {
        if (fid && qty > 0) {
          const f = list.find(x => x.id === fid);
          if (f) transformation += qty * (f.value || 0);
        }
      }
    }
    
    // Usage (3.11)
    const totalCycles = formData.lifespan_years * formData.usage.cycles_per_year;
    const u = formData.usage;
    const usagePairs = [
      [electricityFactors, u.electricity_factor_id, u.electricity_kwh_per_cycle],
      [fuelFactors, u.fuel_factor_id, u.fuel_kwh_per_cycle],
      [carburantFactors, u.carburant_factor_id, u.carburant_l_per_cycle],
      [refrigerantFactors, u.refrigerant_factor_id, u.refrigerant_kg_per_cycle],
    ];
    for (const [list, fid, qtyPerCycle] of usagePairs) {
      if (fid && qtyPerCycle > 0) {
        const f = list.find(x => x.id === fid);
        if (f) usage += qtyPerCycle * totalCycles * (f.value || 0);
      }
    }
    
    // End of life (3.12)
    formData.end_of_life.forEach(entry => {
      if (entry.emission_factor_id && entry.quantity > 0) {
        const f = treatments.find(t => t.id === entry.emission_factor_id);
        if (f) disposal += entry.quantity * (f.value || 0);
      }
    });
    
    setEmissionsPreview({
      transformation: Math.round(transformation * 1000) / 1000,
      usage: Math.round(usage * 1000) / 1000,
      disposal: Math.round(disposal * 1000) / 1000,
      total: Math.round((transformation + usage + disposal) * 1000) / 1000
    });
  };

  // ── End of Life entry management ──
  const addEndOfLifeEntry = () => {
    setFormData(prev => ({
      ...prev,
      end_of_life: [...prev.end_of_life, { name: '', quantity: 0, unit: 'kg', emission_factor_id: '' }]
    }));
  };

  const updateEndOfLifeEntry = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      end_of_life: prev.end_of_life.map((e, i) => i === index ? { ...e, [field]: value } : e)
    }));
  };

  const removeEndOfLifeEntry = (index) => {
    setFormData(prev => ({
      ...prev,
      end_of_life: prev.end_of_life.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        product_type: formData.product_type,
        unit: formData.unit,
        lifespan_years: formData.lifespan_years,
        transformation: formData.product_type === 'semi_finished' ? formData.transformation : null,
        usage: formData.usage,
        end_of_life: formData.end_of_life
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/enhanced/${editingProduct.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/products/enhanced`, payload);
      }
      
      onProductCreated && onProductCreated();
      handleClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      const detail = error.response?.data?.detail;
      let msg;
      if (detail?.errors) {
        msg = detail.errors.join('\n');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else {
        msg = 'Une erreur est survenue lors de la sauvegarde.';
      }
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setShowCloseConfirm(false);
    setErrorToast(null);
    setEolSearch('');
    setFormData({ ...INITIAL_FORM, transformation: { ...INITIAL_FORM.transformation }, usage: { ...INITIAL_FORM.usage }, end_of_life: [] });
    onClose();
  };

  const hasUnsavedChanges = () => {
    return formData.name.trim() !== '' || formData.end_of_life.length > 0;
  };

  const handleCloseRequest = () => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirm(true);
    } else {
      handleClose();
    }
  };

  // ── Steps definition ──
  const steps = [
    { number: 1, title: 'Informations', icon: Package },
    { number: 2, title: 'Transformation (3.10)', icon: Zap, condition: formData.product_type === 'semi_finished' },
    { number: 3, title: 'Utilisation (3.11)', icon: Leaf },
    { number: 4, title: 'Fin de vie (3.12)', icon: Recycle },
    { number: 5, title: 'Résumé', icon: Check }
  ].filter(step => step.condition !== false);

  const currentStepIndex = steps.findIndex(s => s.number === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;

  // ── Validation ──
  const validateStep = (stepNum) => {
    const errors = [];
    if (stepNum === 1) {
      if (!formData.name.trim()) errors.push('Le nom du produit est obligatoire.');
      if (formData.lifespan_years <= 0) errors.push('La durée de vie doit être supérieure à 0.');
    }
    if (stepNum === 3) {
      if (formData.usage.cycles_per_year <= 0) errors.push('Le nombre de cycles par an doit être supérieur à 0.');
    }
    if (stepNum === 4) {
      formData.end_of_life.forEach((e, i) => {
        if (!e.emission_factor_id) errors.push(`Ligne ${i + 1} : sélectionnez un facteur d'émission.`);
        if (!e.quantity || e.quantity <= 0) errors.push(`Ligne ${i + 1} : la quantité doit être supérieure à 0.`);
      });
    }
    return errors;
  };

  const canGoNext = validationErrors.length === 0 && (
    currentStep === 1 ? formData.name.trim() !== '' : true
  );

  const goNext = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) setCurrentStep(nextStep.number);
  };

  const goToStep = (stepNum) => {
    setValidationErrors([]);
    setCurrentStep(stepNum);
  };

  const goPrev = () => {
    setValidationErrors([]);
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) setCurrentStep(prevStep.number);
  };

  // Filtered treatments for end-of-life search
  const filteredTreatments = eolSearch.trim()
    ? treatments.filter(t => {
        const label = (t.name_simple_fr || t.name_fr || t.name || '').toLowerCase();
        const tags = (t.search_tags || []).join(' ').toLowerCase();
        const q = eolSearch.toLowerCase();
        return label.includes(q) || tags.includes(q);
      })
    : treatments;

  if (!isOpen) return null;

  // ── Shared input classes ──
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'}`;
  const inputClsLg = `w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`;
  const labelCls = `block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const sectionCls = `p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header with steps */}
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingProduct ? 'Modifier le produit' : 'Créer une fiche produit'}
            </h2>
            <button onClick={handleCloseRequest} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`} data-testid="wizard-close-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep === step.number 
                      ? 'bg-blue-500 text-white' 
                      : currentStepIndex > index
                        ? 'bg-green-500 text-white'
                        : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStepIndex > index ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-medium hidden md:block ${
                    currentStep === step.number 
                      ? isDark ? 'text-white' : 'text-gray-900'
                      : isDark ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStepIndex > index ? 'bg-green-500' : isDark ? 'bg-slate-700' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {validationErrors.length > 0 && (
            <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-red-500/15 border border-red-500/30' : 'bg-red-50 border border-red-200'}`} data-testid="validation-errors">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <ul className="text-sm space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i} className={isDark ? 'text-red-300' : 'text-red-600'}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ═══ Step 1: General Info ═══ */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Renseignez les informations de base de votre produit. Seul le nom est obligatoire pour continuer.
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Nom du produit *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Machine à laver XYZ" className={inputClsLg} data-testid="product-name-input" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3} placeholder="Description du produit..." className={inputClsLg} data-testid="product-description-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Type de produit</label>
                    <select value={formData.product_type} onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className={inputClsLg} data-testid="product-type-select">
                      <option value="finished">Produit fini</option>
                      <option value="semi_finished">Produit semi-fini</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Unité de vente</label>
                    <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className={inputClsLg} data-testid="product-unit-select">
                      <option value="unit">Pièce/Unité</option>
                      <option value="kg">Kilogramme</option>
                      <option value="m2">Mètre carré</option>
                      <option value="m3">Mètre cube</option>
                      <option value="L">Litre</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Durée de vie estimée (années)</label>
                  <input type="number" min="0.1" step="0.1" value={formData.lifespan_years === 0 ? '' : formData.lifespan_years}
                    onChange={(e) => setFormData({ ...formData, lifespan_years: parseFloat(e.target.value) || 1 })}
                    className={inputClsLg} placeholder="1" data-testid="product-lifespan-input" />
                </div>
                {formData.product_type === 'semi_finished' && (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'} flex items-start gap-3`}>
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Un produit semi-fini nécessite une transformation chez le client avant utilisation. 
                      Une étape supplémentaire sera ajoutée pour définir l&apos;énergie de transformation.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Step 2: Transformation (3.10) — semi-finished only ═══ */}
            {currentStep === 2 && formData.product_type === 'semi_finished' && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Énergie de transformation (Scope 3.10)</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Définissez l&apos;énergie nécessaire pour transformer ce produit semi-fini chez le client.
                  </p>
                </div>
                
                {/* Electricity */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Consommation électrique</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Kilowattheures par unité produite</label>
                      <input type="number" min="0" step="0.01"
                        value={formData.transformation.electricity_kwh === 0 ? '' : formData.transformation.electricity_kwh}
                        onChange={(e) => setFormData({ ...formData, transformation: { ...formData.transformation, electricity_kwh: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} placeholder="0" data-testid="trans-elec-kwh" />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur d&apos;émission</label>
                      <select value={formData.transformation.electricity_factor_id}
                        onChange={(e) => setFormData({ ...formData, transformation: { ...formData.transformation, electricity_factor_id: e.target.value } })}
                        className={inputCls} data-testid="trans-elec-factor">
                        <option value="">Sélectionner...</option>
                        {electricityFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Fuel */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Fuel className="w-5 h-5 text-orange-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Combustible (gaz, fioul)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Consommation (kWh/unité)</label>
                      <input type="number" min="0" step="0.01"
                        value={formData.transformation.fuel_kwh === 0 ? '' : formData.transformation.fuel_kwh}
                        onChange={(e) => setFormData({ ...formData, transformation: { ...formData.transformation, fuel_kwh: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} data-testid="trans-fuel-kwh" />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur d&apos;émission</label>
                      <select value={formData.transformation.fuel_factor_id}
                        onChange={(e) => setFormData({ ...formData, transformation: { ...formData.transformation, fuel_factor_id: e.target.value } })}
                        className={inputCls} data-testid="trans-fuel-factor">
                        <option value="">Sélectionner...</option>
                        {fuelFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ Step 3: Usage (3.11) ═══ */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Consommations en phase d&apos;utilisation (Scope 3.11)</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Estimez ce que consomme votre produit à chaque utilisation (un cycle de lavage, un trajet, une journée de fonctionnement...).
                  </p>
                </div>
                
                {/* Cycles */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Nombre de cycles par an</label>
                      <input type="number" min="1" value={formData.usage.cycles_per_year === 0 ? '' : formData.usage.cycles_per_year}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, cycles_per_year: parseInt(e.target.value) || 1 } })}
                        className={inputCls} placeholder="1" data-testid="usage-cycles-input" />
                    </div>
                    <div className={`text-center px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total cycles sur la vie</p>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="usage-total-cycles">
                        {Math.round(formData.lifespan_years * formData.usage.cycles_per_year)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Electricity */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Consommation électrique</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Kilowattheures par cycle d'utilisation</label>
                      <input type="number" min="0" step="0.001"
                        value={formData.usage.electricity_kwh_per_cycle === 0 ? '' : formData.usage.electricity_kwh_per_cycle}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, electricity_kwh_per_cycle: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} placeholder="0" data-testid="usage-elec-kwh" />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur d&apos;émission</label>
                      <select value={formData.usage.electricity_factor_id}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, electricity_factor_id: e.target.value } })}
                        className={inputCls} data-testid="usage-elec-factor">
                        <option value="">Par défaut (mix national)</option>
                        {electricityFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Fuel */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer className="w-5 h-5 text-orange-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Combustible (gaz, fioul)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>kWh par cycle</label>
                      <input type="number" min="0" step="0.001"
                        value={formData.usage.fuel_kwh_per_cycle === 0 ? '' : formData.usage.fuel_kwh_per_cycle}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, fuel_kwh_per_cycle: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} placeholder="0" data-testid="usage-fuel-kwh" />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur d&apos;émission</label>
                      <select value={formData.usage.fuel_factor_id}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, fuel_factor_id: e.target.value } })}
                        className={inputCls} data-testid="usage-fuel-factor">
                        <option value="">Par défaut (Gaz naturel)</option>
                        {fuelFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Carburant */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Fuel className="w-5 h-5 text-red-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Carburant (essence, diesel)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Litres par cycle</label>
                      <input type="number" min="0" step="0.001"
                        value={formData.usage.carburant_l_per_cycle === 0 ? '' : formData.usage.carburant_l_per_cycle}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, carburant_l_per_cycle: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} placeholder="0" data-testid="usage-carbu-l" />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur d&apos;émission</label>
                      <select value={formData.usage.carburant_factor_id}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, carburant_factor_id: e.target.value } })}
                        className={inputCls} data-testid="usage-carbu-factor">
                        <option value="">Par défaut (Diesel)</option>
                        {carburantFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} ({f.value} {f.unit})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Refrigerants */}
                <div className={sectionCls}>
                  <div className="flex items-center gap-2 mb-4">
                    <Wind className="w-5 h-5 text-cyan-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Réfrigérants (fuites)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>kg par cycle (fuites estimées)</label>
                      <input type="number" min="0" step="0.0001"
                        value={formData.usage.refrigerant_kg_per_cycle === 0 ? '' : formData.usage.refrigerant_kg_per_cycle}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, refrigerant_kg_per_cycle: parseFloat(e.target.value) || 0 } })}
                        className={inputCls} placeholder="0" data-testid="usage-refrig-kg" />
                    </div>
                    <div>
                      <label className={labelCls}>Type de réfrigérant</label>
                      <select value={formData.usage.refrigerant_factor_id}
                        onChange={(e) => setFormData({ ...formData, usage: { ...formData.usage, refrigerant_factor_id: e.target.value } })}
                        className={inputCls} data-testid="usage-refrig-factor">
                        <option value="">Sélectionner...</option>
                        {refrigerantFactors.map(f => <option key={f.id} value={f.id}>{f.name_simple_fr || f.name_fr || f.name} (GWP: {f.value})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ Step 4: End of Life (3.12) ═══ */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fin de vie du produit (Scope 3.12)</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Définissez les traitements en fin de vie : incinération, mise en décharge, recyclage, etc.
                    </p>
                  </div>
                  <button onClick={addEndOfLifeEntry} data-testid="eol-add-btn"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex-shrink-0">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>

                <div className={`p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Sélectionnez un facteur d'émission par type de déchet (ex: incinération de plastiques) et indiquez la quantité en kg par unité de produit. Cette étape est optionnelle si votre produit n'a pas de composants à traiter.
                  </p>
                </div>

                {/* Search */}
                {treatments.length > 0 && (
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <input type="text" value={eolSearch} onChange={(e) => setEolSearch(e.target.value)}
                      placeholder="Rechercher un facteur de fin de vie..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 placeholder:text-gray-400'}`}
                      data-testid="eol-search-input" />
                  </div>
                )}

                {formData.end_of_life.length === 0 ? (
                  <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                    <Recycle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      Aucun traitement de fin de vie défini. Cliquez sur &quot;Ajouter&quot; pour commencer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.end_of_life.map((entry, index) => {
                      const selectedFactor = treatments.find(t => t.id === entry.emission_factor_id);
                      const factorLabel = selectedFactor ? (selectedFactor.name_simple_fr || selectedFactor.name_fr || selectedFactor.name) : `Ligne ${index + 1}`;
                      const entryEmissions = selectedFactor && entry.quantity > 0 ? entry.quantity * (selectedFactor.value || 0) : 0;

                      return (
                        <div key={index} className={sectionCls} data-testid={`eol-entry-${index}`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Recycle className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{factorLabel}</span>
                              {entryEmissions > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'}`}
                                  data-testid={`eol-emissions-${index}`}>
                                  {entryEmissions.toFixed(3)} kgCO₂e
                                </span>
                              )}
                            </div>
                            <button onClick={() => removeEndOfLifeEntry(index)} data-testid={`eol-remove-${index}`}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                              <label className={labelCls}>Facteur d'émission (traitement)</label>
                              <select value={entry.emission_factor_id}
                                onChange={(e) => {
                                  const factor = treatments.find(t => t.id === e.target.value);
                                  updateEndOfLifeEntry(index, 'emission_factor_id', e.target.value);
                                  if (factor) {
                                    updateEndOfLifeEntry(index, 'name', factor.name_simple_fr || factor.name_fr || factor.name || '');
                                    updateEndOfLifeEntry(index, 'unit', factor.default_unit || 'kg');
                                  }
                                }}
                                className={inputCls} data-testid={`eol-factor-select-${index}`}>
                                <option value="">Sélectionner un traitement...</option>
                                {filteredTreatments.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name_simple_fr || t.name_fr || t.name} ({t.value} {t.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Quantité ({entry.unit || 'kg'}) par unité</label>
                              <input type="number" min="0" step="0.01"
                                value={entry.quantity === 0 ? '' : entry.quantity}
                                onChange={(e) => updateEndOfLifeEntry(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className={inputCls} placeholder="0" data-testid={`eol-quantity-${index}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Step 5: Summary ═══ */}
            {currentStep === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Résumé de la fiche produit</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Vérifiez les informations avant de sauvegarder</p>
                </div>
                
                {/* Product info */}
                <div className={sectionCls}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.name}</h4>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {formData.product_type === 'semi_finished' ? 'Produit semi-fini' : 'Produit fini'} · 
                          Durée de vie : {formData.lifespan_years} an(s)
                          {formData.end_of_life.length > 0 && ` · ${formData.end_of_life.length} traitement(s) fin de vie`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => goToStep(1)} data-testid="summary-edit-step1"
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}>
                      Modifier
                    </button>
                  </div>
                </div>
                
                {/* Emissions breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Répartition des émissions</h4>
                    <div className="flex gap-2">
                      {formData.product_type === 'semi_finished' && (
                        <button onClick={() => goToStep(2)} data-testid="summary-edit-step2"
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}>
                          Transformation
                        </button>
                      )}
                      <button onClick={() => goToStep(3)} data-testid="summary-edit-step3"
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}>
                        Utilisation
                      </button>
                      <button onClick={() => goToStep(4)} data-testid="summary-edit-step4"
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-600' : 'text-blue-600 hover:bg-blue-50'}`}>
                        Fin de vie
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {formData.product_type === 'semi_finished' && (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Factory className="w-5 h-5 text-orange-500" />
                          <span className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Transformation</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-500">{emissionsPreview.transformation.toFixed(3)}</p>
                        <p className={`text-xs ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>kgCO₂e/unité</p>
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="w-5 h-5 text-green-500" />
                        <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>Utilisation</span>
                      </div>
                      <p className="text-2xl font-bold text-green-500">{emissionsPreview.usage.toFixed(3)}</p>
                      <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-600'}`}>kgCO₂e/unité</p>
                    </div>
                    
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Recycle className="w-5 h-5 text-blue-500" />
                        <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Fin de vie</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-500">{emissionsPreview.disposal.toFixed(3)}</p>
                      <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>kgCO₂e/unité</p>
                    </div>
                  </div>
                </div>
                
                {/* Total */}
                <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">Émissions totales par unité vendue</p>
                      <p className="text-4xl font-bold mt-1" data-testid="summary-total-emissions">
                        {emissionsPreview.total.toFixed(3)} kgCO₂e
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-200 text-sm">Soit pour 100 unités</p>
                      <p className="text-2xl font-bold">
                        {(emissionsPreview.total * 100 / 1000).toFixed(2)} tCO₂e
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'} flex items-start gap-3`}>
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Lors de l&apos;enregistrement d&apos;une vente, les émissions seront automatiquement ventilées 
                    dans les catégories <strong>Transformation (3.10)</strong>, <strong>Utilisation (3.11)</strong> et <strong>Fin de vie (3.12)</strong> des produits vendus (Scope 3 Aval).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <button onClick={goPrev} disabled={currentStepIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                currentStepIndex === 0 ? 'opacity-50 cursor-not-allowed' : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              } ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="wizard-prev-btn">
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            
            {isLastStep ? (
              <button onClick={handleSubmit} disabled={loading} data-testid="wizard-submit-btn"
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
              </button>
            ) : (
              <button onClick={goNext} disabled={!canGoNext} data-testid="wizard-next-btn"
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50">
                Suivant <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Close confirmation dialog */}
      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
            onClick={() => setShowCloseConfirm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl mx-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              data-testid="close-confirm-dialog">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quitter sans sauvegarder ?</h3>
              </div>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Les données saisies seront perdues.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCloseConfirm(false)} data-testid="close-confirm-cancel"
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  Continuer l'édition
                </button>
                <button onClick={handleClose} data-testid="close-confirm-discard"
                  className="px-4 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {errorToast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-[70] max-w-sm" data-testid="error-toast">
            <div className="flex items-start gap-3 p-4 rounded-xl shadow-2xl bg-red-600 text-white">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Erreur de sauvegarde</p>
                <p className="text-xs mt-1 text-red-200">{errorToast}</p>
              </div>
              <button onClick={() => setErrorToast(null)} className="p-1 rounded-lg hover:bg-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductWizard;
