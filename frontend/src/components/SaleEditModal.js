import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../utils/logger';
import { 
  Package, 
  ShoppingBag,
  Check,
  X,
  Factory,
  Leaf,
  Recycle,
  Trash2,
  Edit3,
  AlertTriangle,
  Calendar,
  Hash
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Modal for editing or deleting a product sale and all its linked activities.
 * When a sale is modified, all activities (transformation, usage, disposal) are updated together.
 */
const SaleEditModal = ({ isOpen, onClose, saleId, productId, onSaleUpdated }) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [saleDetails, setSaleDetails] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [saleDate, setSaleDate] = useState('');

  useEffect(() => {
    if (isOpen && saleId && productId) {
      fetchSaleDetails();
    }
  }, [isOpen, saleId, productId]);

  const fetchSaleDetails = async () => {
    setLoading(true);
    try {
      // Fetch sale details including linked activities
      const [saleRes, productRes] = await Promise.all([
        axios.get(`${API_URL}/api/products/${productId}/sales/${saleId}`),
        axios.get(`${API_URL}/api/products/${productId}`)
      ]);
      
      setSaleDetails(saleRes.data);
      setProduct(productRes.data);
      
      // Set initial values from sale info
      const saleInfo = saleRes.data.sale_info;
      setQuantity(saleInfo.quantity || 1);
      setSaleDate(saleInfo.date || '');
    } catch (error) {
      logger.error('Failed to fetch sale details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!saleId || !productId) return;
    
    setSubmitting(true);
    try {
      await axios.put(`${API_URL}/api/products/${productId}/sales/${saleId}`, {
        quantity: quantity,
        date: saleDate || null
      });
      
      onSaleUpdated && onSaleUpdated();
      handleClose();
    } catch (error) {
      logger.error('Failed to update sale:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!saleId || !productId) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/products/${productId}/sales/${saleId}`);
      
      onSaleUpdated && onSaleUpdated();
      handleClose();
    } catch (error) {
      logger.error('Failed to delete sale:', error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setSaleDetails(null);
    setProduct(null);
    setQuantity(1);
    setSaleDate('');
    setShowDeleteConfirm(false);
    onClose();
  };

  // Calculate emissions preview based on current quantity
  const manufacturingEmissions = product ? quantity * (product.manufacturing_emissions || 0) : 0;
  const usageEmissions = product ? quantity * (product.usage_emissions || 0) : 0;
  const disposalEmissions = product ? quantity * (product.disposal_emissions || 0) : 0;
  const totalEmissions = manufacturingEmissions + usageEmissions + disposalEmissions;

  // Get linked activities count
  const linkedActivitiesCount = saleDetails?.linked_activities?.length || 0;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 60 }}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Modifier la vente' : 'Verkauf bearbeiten'}
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {linkedActivitiesCount} {language === 'fr' ? 'activités liées' : 'verknüpfte Aktivitäten'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              data-testid="close-sale-edit-modal"
            >
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
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                      {language === 'fr' ? 'Confirmer la suppression' : 'Löschen bestätigen'}
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-200/80' : 'text-red-700'}`}>
                      {language === 'fr' 
                        ? `Cette action supprimera définitivement cette vente et ses ${linkedActivitiesCount} activités associées (transformation, utilisation, fin de vie).`
                        : `Diese Aktion löscht diesen Verkauf und seine ${linkedActivitiesCount} zugehörigen Aktivitäten dauerhaft.`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  {language === 'fr' ? 'Annuler' : 'Abbrechen'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="confirm-delete-sale"
                >
                  {deleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  {language === 'fr' ? 'Supprimer' : 'Löschen'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Product Info */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Package className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {product?.name || saleDetails?.product_name}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {(product?.total_emissions_per_unit || 0).toFixed(2)} kgCO₂e/{language === 'fr' ? 'unité' : 'Einheit'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Hash className="w-4 h-4" />
                    {language === 'fr' ? 'Quantité' : 'Menge'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    data-testid="sale-quantity-input"
                  />
                </div>
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Calendar className="w-4 h-4" />
                    {language === 'fr' ? 'Date' : 'Datum'}
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                    data-testid="sale-date-input"
                  />
                </div>
              </div>

              {/* Emissions Preview */}
              <div className="space-y-3">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {language === 'fr' ? 'Émissions recalculées :' : 'Neuberechnete Emissionen:'}
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
              </div>

              {/* Linked Activities Info */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <span className="font-medium">{linkedActivitiesCount}</span> {language === 'fr' ? 'activités seront mises à jour :' : 'Aktivitäten werden aktualisiert:'}
                  {saleDetails?.linked_activities?.map((a, idx) => (
                    <span key={a.id}>
                      {idx > 0 && ', '}
                      {a.sale_phase === 'transformation' ? 'Transformation' : 
                       a.sale_phase === 'usage' ? (language === 'fr' ? 'Utilisation' : 'Nutzung') : 
                       (language === 'fr' ? 'Fin de vie' : 'Lebensende')}
                    </span>
                  ))}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !showDeleteConfirm && (
          <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                  isDark ? 'border-red-500/50 hover:bg-red-500/20 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600'
                }`}
                data-testid="delete-sale-btn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all ${
                  isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Abbrechen'}
              </button>
              <button
                onClick={handleUpdate}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="save-sale-btn"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {language === 'fr' ? 'Enregistrer' : 'Speichern'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SaleEditModal;
