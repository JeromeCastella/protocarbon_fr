import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
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
  Edit3,
  Eye,
  Zap,
  Clock,
  Scale,
  History,
  Archive
} from 'lucide-react';
import ProductWizard from '../components/ProductWizard';
import ProductSaleModal from '../components/ProductSaleModal';
import ProductVersionsModal from '../components/ProductVersionsModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Products = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { currentFiscalYear } = useFiscalYear();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [currentFiscalYear]);

  const fetchProducts = async () => {
    try {
      const fiscalYearParam = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const response = await axios.get(`${API_URL}/api/products${fiscalYearParam}`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const confirmMsg = language === 'fr' 
      ? 'Êtes-vous sûr de vouloir supprimer ce produit ?' 
      : 'Sind Sie sicher, dass Sie dieses Produkt löschen möchten?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const response = await axios.delete(`${API_URL}/api/products/${productId}`);
      // Show message if archived instead of deleted
      if (response.data?.archived) {
        alert(language === 'fr' 
          ? 'Le produit a été archivé car il a des ventes enregistrées.' 
          : 'Das Produkt wurde archiviert, da es Verkäufe gibt.');
      }
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleEditProduct = (product) => {
    if (product.is_enhanced) {
      setEditingProduct(product);
      setShowWizard(true);
    }
  };

  const handleRecordSale = (product) => {
    setSelectedProduct(product);
    setShowSaleModal(true);
  };

  const handleManageVersions = (product) => {
    setSelectedProduct(product);
    setShowVersionsModal(true);
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
            {language === 'fr' 
              ? 'Gérez vos fiches produits et leurs impacts carbone sur tout le cycle de vie'
              : 'Verwalten Sie Ihre Produktkarten und deren CO₂-Auswirkungen über den gesamten Lebenszyklus'
            }
          </p>
          {/* Fiscal year indicator */}
          {currentFiscalYear && (
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
            }`}>
              <Clock className="w-4 h-4" />
              {currentFiscalYear.name}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowWizard(true);
          }}
          data-testid="add-product-btn"
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" />
          {language === 'fr' ? 'Créer une fiche produit' : 'Produktkarte erstellen'}
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {language === 'fr' ? 'Aucun produit défini' : 'Keine Produkte definiert'}
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {language === 'fr' 
              ? 'Créez votre première fiche produit pour commencer à suivre les émissions de vos produits vendus.'
              : 'Erstellen Sie Ihre erste Produktkarte, um die Emissionen Ihrer verkauften Produkte zu verfolgen.'
            }
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
          >
            <Plus className="w-5 h-5" />
            {language === 'fr' ? 'Créer une fiche produit' : 'Produktkarte erstellen'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const isEnhanced = product.is_enhanced;
            // Use active emissions from fiscal year profile
            const activeManufacturing = product.active_manufacturing_emissions ?? product.manufacturing_emissions ?? 0;
            const activeUsage = product.active_usage_emissions ?? product.usage_emissions ?? 0;
            const activeDisposal = product.active_disposal_emissions ?? product.disposal_emissions ?? 0;
            const activeTotal = product.active_total_emissions_per_unit ?? product.total_emissions_per_unit ?? 0;
            
            // Sales for current fiscal year
            const fyQuantity = product.fiscal_year_sales_quantity ?? product.total_sales ?? 0;
            const fyEmissions = product.fiscal_year_sales_emissions ?? 0;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
              >
                {/* Header with type badge */}
                <div className={`p-4 ${isEnhanced ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        <p className="text-white/70 text-xs">
                          {isEnhanced 
                            ? (product.product_type === 'semi_finished' ? 'Semi-fini' : 'Fini')
                            : 'Fiche simple'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Manage versions button */}
                      <button
                        onClick={() => handleManageVersions(product)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                        title={language === 'fr' ? 'Gérer les versions' : 'Versionen verwalten'}
                      >
                        <History className="w-4 h-4 text-white" />
                      </button>
                      {isEnhanced && (
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                          title={language === 'fr' ? 'Modifier' : 'Bearbeiten'}
                        >
                          <Edit3 className="w-4 h-4 text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-red-500/50 transition-colors"
                        title={language === 'fr' ? 'Supprimer' : 'Löschen'}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Profile indicator */}
                {product.profile_source && (
                  <div className={`px-4 py-2 text-xs flex items-center gap-1.5 ${
                    product.profile_source === 'specific' 
                      ? (isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700')
                      : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500')
                  }`}>
                    <History className="w-3 h-3" />
                    {product.profile_source === 'specific' 
                      ? `Profil ${currentFiscalYear?.name}` 
                      : (language === 'fr' ? 'Profil par défaut' : 'Standardprofil')
                    }
                  </div>
                )}
                
                {/* Content */}
                <div className="p-4 space-y-4">
                  {isEnhanced && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                        <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                          {product.lifespan_years} an(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scale className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                        <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                          {product.materials?.length || 0} matière(s)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Emissions breakdown - using active profile values */}
                  <div className="space-y-2">
                    {activeManufacturing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-orange-500" />
                          <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                            {language === 'fr' ? 'Transformation' : 'Transformation'}
                          </span>
                        </span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>
                          {activeManufacturing.toFixed(0)} kgCO₂e
                        </span>
                      </div>
                    )}
                    {activeUsage > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-green-500" />
                          <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                            {language === 'fr' ? 'Utilisation' : 'Nutzung'}
                          </span>
                        </span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>
                          {activeUsage.toFixed(0)} kgCO₂e
                        </span>
                      </div>
                    )}
                    {activeDisposal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Recycle className="w-4 h-4 text-blue-500" />
                          <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                            {language === 'fr' ? 'Fin de vie' : 'Lebensende'}
                          </span>
                        </span>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>
                          {activeDisposal.toFixed(0)} kgCO₂e
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total emissions per unit */}
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'fr' ? 'Total par unité' : 'Gesamt pro Einheit'}
                      </span>
                      <span className="text-lg font-bold text-purple-500">
                        {activeTotal.toFixed(0)} kgCO₂e
                      </span>
                    </div>
                  </div>

                  {/* Sales info for current fiscal year */}
                  {fyQuantity > 0 && (
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      <ShoppingBag className="w-4 h-4 inline mr-1" />
                      {fyQuantity} {language === 'fr' ? 'unités vendues' : 'verkaufte Einheiten'}
                      {currentFiscalYear && (
                        <span className="opacity-75"> ({currentFiscalYear.name})</span>
                      )}
                    </div>
                  )}

                  {/* Record Sale Button */}
                  <button
                    onClick={() => handleRecordSale(product)}
                    data-testid={`record-sale-${product.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {language === 'fr' ? 'Enregistrer des ventes' : 'Verkäufe erfassen'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Product Wizard Modal */}
      <ProductWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingProduct(null);
        }}
        onProductCreated={fetchProducts}
        editingProduct={editingProduct}
      />

      {/* Product Sale Modal */}
      <ProductSaleModal
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          setSelectedProduct(null);
        }}
        onSaleRecorded={fetchProducts}
        preselectedProduct={selectedProduct}
      />

      {/* Product Versions Modal */}
      <ProductVersionsModal
        isOpen={showVersionsModal}
        onClose={() => {
          setShowVersionsModal(false);
          setSelectedProduct(null);
        }}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
        onProfileUpdated={fetchProducts}
      />
    </div>
  );
};

export default Products;
