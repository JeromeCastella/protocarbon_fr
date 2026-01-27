import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ShoppingBag,
  Check,
  X,
  Factory,
  Leaf,
  Recycle,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const ProductSaleModal = ({ isOpen, onClose, onSaleRecorded, preselectedProduct = null }) => {
  const { isDark } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProduct(preselectedProduct);
    }
  }, [preselectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      // Filter only enhanced products
      const enhancedProducts = (response.data || []).filter(p => p.is_enhanced);
      setProducts(enhancedProducts);
      
      if (preselectedProduct) {
        const found = enhancedProducts.find(p => p.id === preselectedProduct.id);
        if (found) setSelectedProduct(found);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/products/${selectedProduct.id}/sales`, {
        product_id: selectedProduct.id,
        quantity: quantity,
        date: `${year}-01-01`  // Use year as date in YYYY-MM-DD format
      });
      
      onSaleRecorded && onSaleRecorded();
      handleClose();
    } catch (error) {
      console.error('Failed to record sale:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProduct(preselectedProduct || null);
    setQuantity(1);
    setYear(new Date().getFullYear());
    onClose();
  };

  // Calculate emissions preview
  const transformationTotal = selectedProduct ? quantity * (selectedProduct.transformation_emissions || 0) : 0;
  const usageTotal = selectedProduct ? quantity * (selectedProduct.usage_emissions || 0) : 0;
  const disposalTotal = selectedProduct ? quantity * (selectedProduct.disposal_emissions || 0) : 0;
  const totalEmissions = transformationTotal + usageTotal + disposalTotal;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Enregistrer des ventes
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Ventilation automatique dans le Scope 3 Aval
                </p>
              </div>
            </div>
            <button onClick={handleClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                Aucune fiche produit disponible.
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Créez d&apos;abord une fiche produit depuis le menu Produits.
              </p>
            </div>
          ) : (
            <>
              {/* Product selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Produit *
                </label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  disabled={preselectedProduct !== null}
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  } ${preselectedProduct ? 'opacity-75' : ''}`}
                >
                  <option value="">Sélectionner un produit...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({(p.total_emissions_per_unit || 0).toFixed(2)} kgCO₂e/unité)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Quantité vendue *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Année de référence
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Emissions preview */}
              {selectedProduct && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Émissions générées par cette vente :
                  </p>
                  
                  <div className="space-y-2">
                    {transformationTotal > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                        <div className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-orange-500" />
                          <span className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                            Transformation
                          </span>
                        </div>
                        <span className="font-medium text-orange-500">
                          {(transformationTotal / 1000).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    )}
                    
                    {usageTotal > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                        <div className="flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-green-500" />
                          <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                            Utilisation
                          </span>
                        </div>
                        <span className="font-medium text-green-500">
                          {(usageTotal / 1000).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    )}
                    
                    {disposalTotal > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <div className="flex items-center gap-2">
                          <Recycle className="w-4 h-4 text-blue-500" />
                          <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                            Fin de vie
                          </span>
                        </div>
                        <span className="font-medium text-blue-500">
                          {(disposalTotal / 1000).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white`}>
                    <div className="flex items-center justify-between">
                      <span className="text-purple-200">Total</span>
                      <span className="text-2xl font-bold">
                        {(totalEmissions / 1000).toFixed(4)} tCO₂e
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    <ArrowRight className="w-3 h-3" />
                    <span>Les émissions seront automatiquement ajoutées aux catégories Scope 3 Aval correspondantes</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && (
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                  isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedProduct || submitting}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Enregistrer la vente
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ProductSaleModal;
