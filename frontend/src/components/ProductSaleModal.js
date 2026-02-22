import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Package, 
  ShoppingBag,
  Check,
  X,
  Factory,
  Leaf,
  Recycle,
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
  History
} from 'lucide-react';
import ProductVersionsModal from './ProductVersionsModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Modal pour gérer les ventes totales d'un produit par exercice fiscal.
 * - Filtre les ventes par exercice fiscal courant
 * - Si aucune vente n'existe pour cet exercice : crée une nouvelle vente
 * - Si une vente existe : permet de modifier le total (pas d'ajout de ligne)
 */
const ProductSaleModal = ({ isOpen, onClose, onSaleRecorded, preselectedProduct = null }) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const { currentFiscalYear } = useFiscalYear();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(0);
  
  // État pour la vente existante
  const [existingSale, setExistingSale] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // État pour le modal de versions
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  
  // Profil d'émissions actif
  const [activeProfile, setActiveProfile] = useState(null);

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

  // Quand un produit est sélectionné, charger ses ventes pour l'exercice courant
  useEffect(() => {
    if (selectedProduct && currentFiscalYear) {
      fetchProductSales(selectedProduct.id);
    } else {
      setExistingSale(null);
      setQuantity(0);
      setIsEditMode(false);
    }
  }, [selectedProduct, currentFiscalYear]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      // Inclure tous les produits (enhanced et simples, non archivés)
      const allProducts = response.data || [];
      setProducts(allProducts);
      
      if (preselectedProduct) {
        const found = allProducts.find(p => p.id === preselectedProduct.id);
        if (found) setSelectedProduct(found);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductSales = async (productId) => {
    try {
      // Filtrer par exercice fiscal courant
      const fiscalYearParam = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const [salesResponse, profilesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/products/${productId}/sales${fiscalYearParam}`),
        axios.get(`${API_URL}/api/products/${productId}/emission-profiles`)
      ]);
      
      const sales = salesResponse.data?.sales || [];
      
      // Déterminer le profil actif pour cet exercice
      const defaultProfile = profilesResponse.data?.default_profile;
      const profiles = profilesResponse.data?.profiles || [];
      const specificProfile = profiles.find(p => p.fiscal_year_id === currentFiscalYear?.id);
      
      if (specificProfile) {
        setActiveProfile({ ...specificProfile, source: 'specific' });
      } else if (defaultProfile) {
        setActiveProfile({ ...defaultProfile, source: 'default' });
      }
      
      if (sales.length > 0) {
        // Prendre la première vente pour cet exercice
        const sale = sales[0];
        setExistingSale(sale);
        setQuantity(sale.quantity || 0);
        setIsEditMode(true);
        
        // Utiliser la date de la vente existante
        if (sale.date) {
          setSaleDate(sale.date);
        }
      } else {
        setExistingSale(null);
        setQuantity(0);
        setIsEditMode(false);
        // Réinitialiser avec la date de début de l'exercice
        if (currentFiscalYear?.start_date) {
          setSaleDate(currentFiscalYear.start_date);
        }
      }
    } catch (error) {
      console.error('Failed to fetch product sales:', error);
      setExistingSale(null);
      setQuantity(0);
      setIsEditMode(false);
      setActiveProfile(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || quantity <= 0) return;
    
    setSubmitting(true);
    try {
      if (isEditMode && existingSale?.sale_id) {
        // Mettre à jour la vente existante
        await axios.put(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.sale_id}`, {
          quantity: quantity
        });
      } else {
        // Créer une nouvelle vente - envoyer l'ID de l'exercice fiscal courant
        await axios.post(`${API_URL}/api/products/${selectedProduct.id}/sales`, {
          product_id: selectedProduct.id,
          quantity: quantity,
          fiscal_year_id: currentFiscalYear?.id
        });
      }
      
      onSaleRecorded && onSaleRecorded();
      handleClose();
    } catch (error) {
      console.error('Failed to save sale:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct || !existingSale?.sale_id) return;
    
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.sale_id}`);
      onSaleRecorded && onSaleRecorded();
      handleClose();
    } catch (error) {
      console.error('Failed to delete sale:', error);
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setSelectedProduct(preselectedProduct || null);
    setQuantity(0);
    setExistingSale(null);
    setIsEditMode(false);
    setShowDeleteConfirm(false);
    setActiveProfile(null);
    setShowVersionsModal(false);
    onClose();
  };

  const handleProfileUpdated = () => {
    // Refresh product data to get updated emissions
    if (selectedProduct) {
      fetchProductSales(selectedProduct.id);
      fetchProducts(); // Refresh product list too in case default values changed
    }
  };

  // Calculate emissions preview using active profile
  const profileManufacturing = activeProfile?.manufacturing_emissions ?? selectedProduct?.manufacturing_emissions ?? 0;
  const profileUsage = activeProfile?.usage_emissions ?? selectedProduct?.usage_emissions ?? 0;
  const profileDisposal = activeProfile?.disposal_emissions ?? selectedProduct?.disposal_emissions ?? 0;
  
  const manufacturingEmissions = quantity * profileManufacturing;
  const usageEmissions = quantity * profileUsage;
  const disposalEmissions = quantity * profileDisposal;
  const totalEmissions = manufacturingEmissions + usageEmissions + disposalEmissions;

  if (!isOpen) return null;

  return (
    <>
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
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isEditMode 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                {isEditMode ? <Edit3 className="w-5 h-5 text-white" /> : <ShoppingBag className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {isEditMode 
                    ? (language === 'fr' ? 'Modifier les ventes' : 'Verkäufe bearbeiten')
                    : (language === 'fr' ? 'Enregistrer des ventes' : 'Verkäufe erfassen')
                  }
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {currentFiscalYear?.name || (language === 'fr' ? 'Exercice courant' : 'Aktuelles Geschäftsjahr')}
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
          ) : showDeleteConfirm ? (
            /* Delete Confirmation */
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                  {language === 'fr' 
                    ? `Supprimer les ventes de "${selectedProduct?.name}" pour cet exercice (${existingSale?.quantity} unités) ?`
                    : `Verkäufe von "${selectedProduct?.name}" für dieses Geschäftsjahr löschen (${existingSale?.quantity} Einheiten)?`
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {language === 'fr' ? 'Annuler' : 'Abbrechen'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {language === 'fr' ? 'Supprimer' : 'Löschen'}
                </button>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                {language === 'fr' ? 'Aucune fiche produit disponible.' : 'Keine Produktkarte verfügbar.'}
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {language === 'fr' 
                  ? "Créez d'abord une fiche produit depuis le menu Produits."
                  : 'Erstellen Sie zuerst eine Produktkarte im Menü Produkte.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Product selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {language === 'fr' ? 'Produit' : 'Produkt'} *
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
                  data-testid="product-select"
                >
                  <option value="">{language === 'fr' ? 'Sélectionner un produit...' : 'Produkt auswählen...'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({(p.total_emissions_per_unit || 0).toFixed(2)} kgCO₂e/{language === 'fr' ? 'unité' : 'Einheit'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode indicator */}
              {selectedProduct && isEditMode && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {language === 'fr' 
                        ? `Vente existante : ${existingSale?.quantity} unités. Modifiez le total ci-dessous.`
                        : `Bestehender Verkauf: ${existingSale?.quantity} Einheiten. Ändern Sie die Gesamtzahl unten.`
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Active profile indicator */}
              {selectedProduct && activeProfile && (
                <div className={`p-3 rounded-xl flex items-center justify-between ${
                  activeProfile.source === 'specific' 
                    ? (isDark ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200')
                    : (isDark ? 'bg-slate-700/50' : 'bg-gray-50')
                }`}>
                  <div className="flex items-center gap-2">
                    <History className={`w-4 h-4 ${activeProfile.source === 'specific' ? 'text-purple-500' : (isDark ? 'text-slate-400' : 'text-gray-500')}`} />
                    <span className={`text-sm ${activeProfile.source === 'specific' ? (isDark ? 'text-purple-300' : 'text-purple-700') : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
                      {activeProfile.source === 'specific'
                        ? (language === 'fr' ? `Profil ${currentFiscalYear?.name}` : `Profil ${currentFiscalYear?.name}`)
                        : (language === 'fr' ? 'Profil par défaut' : 'Standardprofil')
                      }
                    </span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      ({(profileManufacturing + profileUsage + profileDisposal).toFixed(2)} kgCO₂e/{language === 'fr' ? 'unité' : 'Einheit'})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowVersionsModal(true)}
                    className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                      isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    data-testid="manage-versions-btn"
                  >
                    <Edit3 className="w-3 h-3" />
                    {language === 'fr' ? 'Gérer' : 'Verwalten'}
                  </button>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {language === 'fr' ? 'Total vendu' : 'Gesamtverkauf'} *
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                  data-testid="quantity-input"
                />
              </div>

              {/* Emissions preview */}
              {selectedProduct && quantity > 0 && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {language === 'fr' ? 'Émissions totales :' : 'Gesamtemissionen:'}
                  </p>
                  
                  <div className="space-y-2">
                    {manufacturingEmissions > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                        <div className="flex items-center gap-2">
                          <Factory className="w-4 h-4 text-orange-500" />
                          <span className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                            Transformation
                          </span>
                        </div>
                        <span className="font-medium text-orange-500">
                          {(manufacturingEmissions / 1000).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    )}
                    
                    {usageEmissions > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                        <div className="flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-green-500" />
                          <span className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                            {language === 'fr' ? 'Utilisation' : 'Nutzung'}
                          </span>
                        </div>
                        <span className="font-medium text-green-500">
                          {(usageEmissions / 1000).toFixed(4)} tCO₂e
                        </span>
                      </div>
                    )}
                    
                    {disposalEmissions > 0 && (
                      <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                        <div className="flex items-center gap-2">
                          <Recycle className="w-4 h-4 text-blue-500" />
                          <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                            {language === 'fr' ? 'Fin de vie' : 'Lebensende'}
                          </span>
                        </div>
                        <span className="font-medium text-blue-500">
                          {(disposalEmissions / 1000).toFixed(4)} tCO₂e
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
                    <span>
                      {language === 'fr' 
                        ? 'Les émissions seront automatiquement ventilées dans le Scope 3 Aval'
                        : 'Emissionen werden automatisch in Scope 3 Downstream aufgeteilt'
                      }
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && !showDeleteConfirm && (
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-3">
              {/* Delete button (only in edit mode) */}
              {isEditMode && existingSale && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`px-4 py-3 rounded-xl border transition-all ${
                    isDark ? 'border-red-500/50 hover:bg-red-500/20 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600'
                  }`}
                  data-testid="delete-sale-btn"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleClose}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                  isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Abbrechen'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedProduct || quantity <= 0 || submitting}
                className={`flex-1 px-4 py-3 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isEditMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                }`}
                data-testid="save-sale-btn"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isEditMode ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isEditMode 
                  ? (language === 'fr' ? 'Mettre à jour' : 'Aktualisieren')
                  : (language === 'fr' ? 'Enregistrer' : 'Speichern')
                }
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
    
    {/* Product Versions Modal */}
    <ProductVersionsModal
      isOpen={showVersionsModal}
      onClose={() => setShowVersionsModal(false)}
      productId={selectedProduct?.id}
      productName={selectedProduct?.name}
      onProfileUpdated={handleProfileUpdated}
    />
    </>
  );
};

export default ProductSaleModal;
