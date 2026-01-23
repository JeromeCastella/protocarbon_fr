import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Trash2, 
  Factory, 
  Leaf, 
  Recycle,
  ShoppingBag,
  X,
  Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Products = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    manufacturing_emissions: 0,
    usage_emissions: 0,
    disposal_emissions: 0,
    unit: 'unit'
  });
  const [saleQuantity, setSaleQuantity] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/products`, productForm);
      setShowModal(false);
      setProductForm({
        name: '',
        description: '',
        manufacturing_emissions: 0,
        usage_emissions: 0,
        disposal_emissions: 0,
        unit: 'unit'
      });
      fetchProducts();
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleRecordSale = async () => {
    if (!selectedProduct) return;
    try {
      await axios.post(`${API_URL}/products/${selectedProduct.id}/sales`, {
        product_id: selectedProduct.id,
        quantity: saleQuantity
      });
      setShowSaleModal(false);
      setSaleQuantity(1);
      fetchProducts();
    } catch (error) {
      console.error('Failed to record sale:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await axios.delete(`${API_URL}/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="products-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('products.title')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('products.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          data-testid="add-product-btn"
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" />
          {t('products.addProduct')}
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            Aucun produit défini. Ajoutez votre premier produit pour commencer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  data-testid={`delete-product-${product.id}`}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {product.name}
              </h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {product.description || 'Pas de description'}
              </p>

              {/* Emissions breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-orange-500" />
                    Fabrication
                  </span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {product.manufacturing_emissions} kgCO₂e
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-500" />
                    Utilisation
                  </span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {product.usage_emissions} kgCO₂e
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Recycle className="w-4 h-4 text-blue-500" />
                    Fin de vie
                  </span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>
                    {product.disposal_emissions} kgCO₂e
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className={`p-3 rounded-xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('products.totalPerUnit')}
                  </span>
                  <span className="text-lg font-bold text-purple-500">
                    {product.total_emissions_per_unit} kgCO₂e
                  </span>
                </div>
              </div>

              {/* Sales info */}
              {product.sales && product.sales.length > 0 && (
                <div className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {product.sales.reduce((acc, sale) => acc + sale.quantity, 0)} unités vendues
                  ({(product.sales.reduce((acc, sale) => acc + sale.emissions, 0) / 1000).toFixed(2)} tCO₂e)
                </div>
              )}

              {/* Record Sale Button */}
              <button
                onClick={() => {
                  setSelectedProduct(product);
                  setShowSaleModal(true);
                }}
                data-testid={`record-sale-${product.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
              >
                <ShoppingBag className="w-5 h-5" />
                {t('products.recordSale')}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('products.addProduct')}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('products.productName')} *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    data-testid="product-name-input"
                    required
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('products.manufacturingEmissions')}
                  </label>
                  <input
                    type="number"
                    value={productForm.manufacturing_emissions}
                    onChange={(e) => setProductForm({ ...productForm, manufacturing_emissions: parseFloat(e.target.value) || 0 })}
                    data-testid="product-manufacturing-input"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('products.usageEmissions')}
                  </label>
                  <input
                    type="number"
                    value={productForm.usage_emissions}
                    onChange={(e) => setProductForm({ ...productForm, usage_emissions: parseFloat(e.target.value) || 0 })}
                    data-testid="product-usage-input"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('products.disposalEmissions')}
                  </label>
                  <input
                    type="number"
                    value={productForm.disposal_emissions}
                    onChange={(e) => setProductForm({ ...productForm, disposal_emissions: parseFloat(e.target.value) || 0 })}
                    data-testid="product-disposal-input"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                      isDark 
                        ? 'border-slate-600 hover:bg-slate-700' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-product-btn"
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Sale Modal */}
      <AnimatePresence>
        {showSaleModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSaleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('products.recordSale')}
                </h3>
                <button
                  onClick={() => setShowSaleModal(false)}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedProduct.name}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {selectedProduct.total_emissions_per_unit} kgCO₂e par unité
                </p>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('products.quantity')}
                </label>
                <input
                  type="number"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                  data-testid="sale-quantity-input"
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                  Émissions totales pour cette vente:
                </p>
                <p className="text-2xl font-bold text-green-500">
                  {(saleQuantity * selectedProduct.total_emissions_per_unit / 1000).toFixed(3)} tCO₂e
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaleModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                    isDark 
                      ? 'border-slate-600 hover:bg-slate-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRecordSale}
                  data-testid="confirm-sale-btn"
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
