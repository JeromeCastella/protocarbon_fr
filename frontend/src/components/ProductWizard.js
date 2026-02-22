import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ArrowRight, 
  ArrowLeft,
  Check,
  X,
  Plus,
  Trash2,
  Zap,
  Fuel,
  Thermometer,
  Wind,
  Recycle,
  Factory,
  Leaf,
  Info,
  Search
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ProductWizard = ({ isOpen, onClose, onProductCreated, editingProduct = null }) => {
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Emission factors
  const [materials, setMaterials] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [electricityFactors, setElectricityFactors] = useState([]);
  const [fuelFactors, setFuelFactors] = useState([]);
  const [carburantFactors, setCarburantFactors] = useState([]);
  const [refrigerantFactors, setRefrigerantFactors] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: General info
    name: '',
    description: '',
    product_type: 'finished',
    unit: 'unit',
    lifespan_years: 1,
    
    // Step 2: Materials composition
    materials: [],
    
    // Step 3: Transformation (if semi-finished)
    transformation: {
      electricity_kwh: 0,
      electricity_factor_id: '',
      fuel_kwh: 0,
      fuel_factor_id: '',
      region: 'France'
    },
    
    // Step 4: Usage
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
    }
  });
  
  // Calculated emissions preview
  const [emissionsPreview, setEmissionsPreview] = useState({
    transformation: 0,
    usage: 0,
    disposal: 0,
    total: 0
  });

  // Load emission factors on mount
  useEffect(() => {
    if (isOpen) {
      loadEmissionFactors();
      if (editingProduct) {
        loadProductData(editingProduct);
      }
    }
  }, [isOpen, editingProduct]);

  // Calculate preview when form changes
  useEffect(() => {
    calculateEmissionsPreview();
  }, [formData, materials, treatments, electricityFactors, fuelFactors, carburantFactors, refrigerantFactors]);

  const loadEmissionFactors = async () => {
    try {
      const [matRes, treatRes, elecRes] = await Promise.all([
        axios.get(`${API_URL}/api/emission-factors/by-category/materiaux`),
        axios.get(`${API_URL}/api/emission-factors/by-category/fin_vie_produits`),
        axios.get(`${API_URL}/api/emission-factors/by-category/electricite`)
      ]);
      
      setMaterials(matRes.data || []);
      setTreatments(treatRes.data || []);
      setElectricityFactors(elecRes.data || []);
      
      // Load fuel factors (combustible)
      const fuelRes = await axios.get(`${API_URL}/api/emission-factors/by-tags?tags=combustible`);
      setFuelFactors(fuelRes.data || []);
      
      // Load carburant factors
      const carbuRes = await axios.get(`${API_URL}/api/emission-factors/by-tags?tags=carburant`);
      setCarburantFactors(carbuRes.data || []);
      
      // Load refrigerant factors
      const refrigRes = await axios.get(`${API_URL}/api/emission-factors/by-category/refrigerants`);
      setRefrigerantFactors(refrigRes.data || []);
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
      materials: product.materials || [],
      transformation: product.transformation || {
        electricity_kwh: 0,
        electricity_factor_id: '',
        fuel_kwh: 0,
        fuel_factor_id: '',
        region: 'France'
      },
      usage: product.usage || {
        electricity_kwh_per_cycle: 0,
        electricity_factor_id: '',
        fuel_kwh_per_cycle: 0,
        fuel_factor_id: '',
        carburant_l_per_cycle: 0,
        carburant_factor_id: '',
        refrigerant_kg_per_cycle: 0,
        refrigerant_factor_id: '',
        cycles_per_year: 1
      }
    });
  };

  const calculateEmissionsPreview = () => {
    let transformation = 0;
    let usage = 0;
    let disposal = 0;
    
    // Transformation
    if (formData.product_type === 'semi_finished') {
      const elecFactor = electricityFactors.find(f => f.id === formData.transformation.electricity_factor_id);
      const fuelFactor = fuelFactors.find(f => f.id === formData.transformation.fuel_factor_id);
      transformation = (formData.transformation.electricity_kwh * (elecFactor?.value || 0.0569)) +
                       (formData.transformation.fuel_kwh * (fuelFactor?.value || 0.205));
    }
    
    // Usage
    const totalCycles = formData.lifespan_years * formData.usage.cycles_per_year;
    const elecUsageFactor = electricityFactors.find(f => f.id === formData.usage.electricity_factor_id);
    const fuelUsageFactor = fuelFactors.find(f => f.id === formData.usage.fuel_factor_id);
    const carbuFactor = carburantFactors.find(f => f.id === formData.usage.carburant_factor_id);
    const refrigFactor = refrigerantFactors.find(f => f.id === formData.usage.refrigerant_factor_id);
    
    usage = (formData.usage.electricity_kwh_per_cycle * (elecUsageFactor?.value || 0.0569) * totalCycles) +
            (formData.usage.fuel_kwh_per_cycle * (fuelUsageFactor?.value || 0.205) * totalCycles) +
            (formData.usage.carburant_l_per_cycle * (carbuFactor?.value || 2.68) * totalCycles) +
            (formData.usage.refrigerant_kg_per_cycle * (refrigFactor?.value || 1430) * totalCycles);
    
    // Disposal
    formData.materials.forEach(mat => {
      const treatFactor = treatments.find(t => t.id === mat.treatment_emission_factor_id);
      disposal += mat.weight_kg * (treatFactor?.value || 0.51);
    });
    
    setEmissionsPreview({
      transformation: Math.round(transformation * 1000) / 1000,
      usage: Math.round(usage * 1000) / 1000,
      disposal: Math.round(disposal * 1000) / 1000,
      total: Math.round((transformation + usage + disposal) * 1000) / 1000
    });
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, {
        material_name: '',
        emission_factor_id: '',
        weight_kg: 0,
        treatment_type: 'incineration',
        treatment_emission_factor_id: '',
        recyclability_percent: 0
      }]
    }));
  };

  const updateMaterial = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((mat, i) => 
        i === index ? { ...mat, [field]: value } : mat
      )
    }));
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
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
        materials: formData.materials,
        transformation: formData.product_type === 'semi_finished' ? formData.transformation : null,
        usage: formData.usage
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
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      description: '',
      product_type: 'finished',
      unit: 'unit',
      lifespan_years: 1,
      materials: [],
      transformation: {
        electricity_kwh: 0,
        electricity_factor_id: '',
        fuel_kwh: 0,
        fuel_factor_id: '',
        region: 'France'
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
      }
    });
    onClose();
  };

  const steps = [
    { number: 1, title: 'Informations générales', icon: Package },
    { number: 2, title: 'Composition matières', icon: Factory },
    { number: 3, title: 'Transformation', icon: Zap, condition: formData.product_type === 'semi_finished' },
    { number: 4, title: 'Utilisation', icon: Leaf },
    { number: 5, title: 'Résumé', icon: Check }
  ].filter(step => step.condition !== false);

  const currentStepIndex = steps.findIndex(s => s.number === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoNext = currentStep === 1 ? formData.name.trim() !== '' : true;

  const goNext = () => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.number);
    }
  };

  const goPrev = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.number);
    }
  };

  if (!isOpen) return null;

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
            <button onClick={handleClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Steps indicator */}
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
                    currentStepIndex > index 
                      ? 'bg-green-500' 
                      : isDark ? 'bg-slate-700' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: General Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Machine à laver XYZ"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Description du produit..."
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Type de produit
                    </label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="finished">Produit fini</option>
                      <option value="semi_finished">Produit semi-fini</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Unité de vente
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      <option value="unit">Pièce/Unité</option>
                      <option value="kg">Kilogramme</option>
                      <option value="m2">Mètre carré</option>
                      <option value="m3">Mètre cube</option>
                      <option value="L">Litre</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Durée de vie estimée (années)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.lifespan_years === 0 ? '' : formData.lifespan_years}
                    onChange={(e) => setFormData({ ...formData, lifespan_years: parseFloat(e.target.value) || 1 })}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    placeholder="1"
                  />
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

            {/* Step 2: Materials Composition */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Composition du produit
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Définissez les matières composant le produit pour calculer les émissions de fin de vie
                    </p>
                  </div>
                  <button
                    onClick={addMaterial}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                
                {formData.materials.length === 0 ? (
                  <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                    <Factory className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      Aucune matière définie. Cliquez sur &quot;Ajouter&quot; pour commencer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.materials.map((mat, index) => (
                      <div key={index} className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Matière {index + 1}
                          </span>
                          <button
                            onClick={() => removeMaterial(index)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              Matière
                            </label>
                            <select
                              value={mat.emission_factor_id}
                              onChange={(e) => {
                                const factor = materials.find(m => m.id === e.target.value);
                                updateMaterial(index, 'emission_factor_id', e.target.value);
                                updateMaterial(index, 'material_name', factor?.name || '');
                              }}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                                isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                              }`}
                            >
                              <option value="">Sélectionner...</option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.value} {m.unit})</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              Poids (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={mat.weight_kg === 0 ? '' : mat.weight_kg}
                              onChange={(e) => updateMaterial(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                                isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                              }`}
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              Traitement fin de vie
                            </label>
                            <select
                              value={mat.treatment_emission_factor_id}
                              onChange={(e) => {
                                const factor = treatments.find(t => t.id === e.target.value);
                                updateMaterial(index, 'treatment_emission_factor_id', e.target.value);
                                updateMaterial(index, 'treatment_type', factor?.name || 'incineration');
                              }}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                                isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                              }`}
                            >
                              <option value="">Sélectionner...</option>
                              {treatments.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.value} {t.unit})</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              Recyclabilité (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mat.recyclability_percent === 0 ? '' : mat.recyclability_percent}
                              onChange={(e) => updateMaterial(index, 'recyclability_percent', parseFloat(e.target.value) || 0)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                                isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                              }`}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Transformation (only for semi-finished) */}
            {currentStep === 3 && formData.product_type === 'semi_finished' && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Énergie de transformation
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Définissez l&apos;énergie nécessaire pour transformer ce produit semi-fini
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Électricité</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Consommation (kWh/unité)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.transformation.electricity_kwh === 0 ? '' : formData.transformation.electricity_kwh}
                        onChange={(e) => setFormData({
                          ...formData,
                          transformation: { ...formData.transformation, electricity_kwh: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Facteur d&apos;émission
                      </label>
                      <select
                        value={formData.transformation.electricity_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          transformation: { ...formData.transformation, electricity_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Sélectionner...</option>
                        {electricityFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.value} {f.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Fuel className="w-5 h-5 text-orange-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Combustible (gaz, fioul)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Consommation (kWh/unité)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.transformation.fuel_kwh === 0 ? '' : formData.transformation.fuel_kwh}
                        onChange={(e) => setFormData({
                          ...formData,
                          transformation: { ...formData.transformation, fuel_kwh: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Facteur d&apos;émission
                      </label>
                      <select
                        value={formData.transformation.fuel_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          transformation: { ...formData.transformation, fuel_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Sélectionner...</option>
                        {fuelFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.value} {f.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Usage */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Consommations en phase d&apos;utilisation
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Définissez les consommations par cycle d&apos;utilisation
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className={`block text-xs mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                        Nombre de cycles par an
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.usage.cycles_per_year === 0 ? '' : formData.usage.cycles_per_year}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, cycles_per_year: parseInt(e.target.value) || 1 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="1"
                      />
                    </div>
                    <div className={`text-center px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total cycles sur la vie</p>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {Math.round(formData.lifespan_years * formData.usage.cycles_per_year)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Electricity */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Électricité</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        kWh par cycle
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={formData.usage.electricity_kwh_per_cycle === 0 ? '' : formData.usage.electricity_kwh_per_cycle}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, electricity_kwh_per_cycle: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Facteur d&apos;émission
                      </label>
                      <select
                        value={formData.usage.electricity_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, electricity_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Par défaut (France)</option>
                        {electricityFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.value} {f.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Combustible */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer className="w-5 h-5 text-orange-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Combustible (gaz, fioul)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        kWh par cycle
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={formData.usage.fuel_kwh_per_cycle === 0 ? '' : formData.usage.fuel_kwh_per_cycle}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, fuel_kwh_per_cycle: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Facteur d&apos;émission
                      </label>
                      <select
                        value={formData.usage.fuel_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, fuel_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Par défaut (Gaz naturel)</option>
                        {fuelFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.value} {f.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Carburant */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Fuel className="w-5 h-5 text-red-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Carburant (essence, diesel)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Litres par cycle
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={formData.usage.carburant_l_per_cycle === 0 ? '' : formData.usage.carburant_l_per_cycle}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, carburant_l_per_cycle: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Facteur d&apos;émission
                      </label>
                      <select
                        value={formData.usage.carburant_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, carburant_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Par défaut (Diesel)</option>
                        {carburantFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.value} {f.unit})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Refrigerants */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Wind className="w-5 h-5 text-cyan-500" />
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Réfrigérants (fuites)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        kg par cycle (fuites)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={formData.usage.refrigerant_kg_per_cycle === 0 ? '' : formData.usage.refrigerant_kg_per_cycle}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, refrigerant_kg_per_cycle: parseFloat(e.target.value) || 0 }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Type de réfrigérant
                      </label>
                      <select
                        value={formData.usage.refrigerant_factor_id}
                        onChange={(e) => setFormData({
                          ...formData,
                          usage: { ...formData.usage, refrigerant_factor_id: e.target.value }
                        })}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="">Sélectionner...</option>
                        {refrigerantFactors.map(f => (
                          <option key={f.id} value={f.id}>{f.name} (GWP: {f.value})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Summary */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Résumé de la fiche produit
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Vérifiez les informations avant de sauvegarder
                  </p>
                </div>
                
                {/* Product info */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formData.name}
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {formData.product_type === 'semi_finished' ? 'Produit semi-fini' : 'Produit fini'} • 
                        Durée de vie: {formData.lifespan_years} an(s) • 
                        {formData.materials.length} matière(s)
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Emissions breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {formData.product_type === 'semi_finished' && (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Factory className="w-5 h-5 text-orange-500" />
                        <span className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Transformation</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-500">
                        {emissionsPreview.transformation.toFixed(3)}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>kgCO₂e/unité</p>
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-5 h-5 text-green-500" />
                      <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>Utilisation</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">
                      {emissionsPreview.usage.toFixed(3)}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-600'}`}>kgCO₂e/unité</p>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-5 h-5 text-blue-500" />
                      <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Fin de vie</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">
                      {emissionsPreview.disposal.toFixed(3)}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>kgCO₂e/unité</p>
                  </div>
                </div>
                
                {/* Total */}
                <div className={`p-6 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">Émissions totales par unité vendue</p>
                      <p className="text-4xl font-bold mt-1">
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
                
                {/* Info */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'} flex items-start gap-3`}>
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Lors de l&apos;enregistrement d&apos;une vente, les émissions seront automatiquement ventilées 
                    dans les catégories <strong>Transformation</strong>, <strong>Utilisation</strong> et <strong>Fin de vie</strong> des produits vendus (Scope 3 Aval).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                currentStepIndex === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
              } ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </button>
            
            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductWizard;
