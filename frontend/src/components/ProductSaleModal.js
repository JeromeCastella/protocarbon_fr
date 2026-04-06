import React from 'react';
import { motion } from 'framer-motion';
import {
  Package, ShoppingBag, Check, X, Factory, Leaf, Recycle,
  ArrowRight, Edit3, Plus, Trash2, History
} from 'lucide-react';
import ProductVersionsModal from './ProductVersionsModal';
import { useProductSale } from '../hooks/useProductSale';

const ProductSaleModal = ({ isOpen, onClose, onSaleRecorded, preselectedProduct = null }) => {
  const {
    isDark, t, language, currentFiscalYear,
    products, loading, submitting,
    selectedProduct, setSelectedProduct,
    quantity, setQuantity,
    existingSale, isEditMode,
    showDeleteConfirm, setShowDeleteConfirm,
    showVersionsModal, setShowVersionsModal,
    activeProfile, saleDate,
    handleSubmit, handleDelete, fetchProductSales,
    estimatedEmissions,
  } = useProductSale(isOpen, preselectedProduct);

  if (!isOpen) return null;

  const profileManufacturing = activeProfile?.manufacturing_emissions ?? selectedProduct?.manufacturing_emissions ?? 0;
  const profileUsage = activeProfile?.usage_emissions ?? selectedProduct?.usage_emissions ?? 0;
  const profileDisposal = activeProfile?.disposal_emissions ?? selectedProduct?.disposal_emissions ?? 0;
  const manufacturingEmissions = quantity * profileManufacturing;
  const usageEmissions = quantity * profileUsage;
  const disposalEmissions = quantity * profileDisposal;
  const totalEmissions = manufacturingEmissions + usageEmissions + disposalEmissions;

  const handleClose = () => {
    setSelectedProduct(preselectedProduct || null);
    setQuantity(0);
    setShowDeleteConfirm(false);
    setShowVersionsModal(false);
    onClose();
  };

  const handleProfileUpdated = () => {
    if (selectedProduct) fetchProductSales(selectedProduct.id);
  };

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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  {isEditMode
                    ? <Edit3 className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-gray-500'}`} />
                    : <ShoppingBag className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-gray-500'}`} />
                  }
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {isEditMode ? t('products.saleModal.editSales') : t('products.saleModal.recordSales')}
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {currentFiscalYear?.name || t('products.saleModal.currentExercise')}
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
              <DeleteConfirmation isDark={isDark} t={t} selectedProduct={selectedProduct} existingSale={existingSale} submitting={submitting} onCancel={() => setShowDeleteConfirm(false)} onDelete={() => handleDelete(onSaleRecorded, handleClose)} />
            ) : products.length === 0 ? (
              <EmptyProducts isDark={isDark} t={t} />
            ) : (
              <>
                <ProductSelector isDark={isDark} t={t} products={products} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} preselectedProduct={preselectedProduct} />

                {selectedProduct && isEditMode && (
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                        {t('products.saleModal.existingSale').replace('{qty}', existingSale?.quantity)}
                      </span>
                    </div>
                  </div>
                )}

                {selectedProduct && activeProfile && (
                  <ActiveProfileBadge isDark={isDark} t={t} activeProfile={activeProfile} currentFiscalYear={currentFiscalYear} profileTotal={profileManufacturing + profileUsage + profileDisposal} onManageVersions={() => setShowVersionsModal(true)} />
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('products.saleModal.totalSold')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    data-testid="quantity-input"
                    placeholder="0"
                  />
                </div>

                {selectedProduct && (
                  <EmissionsPreview isDark={isDark} t={t} manufacturing={manufacturingEmissions} usage={usageEmissions} disposal={disposalEmissions} total={totalEmissions} quantity={quantity} />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {products.length > 0 && !showDeleteConfirm && (
            <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex gap-3">
                {isEditMode && existingSale && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={`px-4 py-3 rounded-xl border transition-all ${isDark ? 'border-red-500/50 hover:bg-red-500/20 text-red-400' : 'border-red-200 hover:bg-red-50 text-red-600'}`}
                    data-testid="delete-sale-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className={`flex-1 px-4 py-3 rounded-xl border transition-all ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                >
                  {t('products.saleModal.cancel')}
                </button>
                <button
                  onClick={() => handleSubmit(onSaleRecorded, handleClose)}
                  disabled={!selectedProduct || quantity <= 0 || submitting}
                  className="flex-1 px-4 py-3 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600"
                  data-testid="save-sale-btn"
                >
                  {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : isEditMode ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {isEditMode ? t('products.saleModal.update') : t('products.saleModal.save')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

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

/* ===== Sub-components ===== */

const ProductSelector = ({ isDark, t, products, selectedProduct, setSelectedProduct, preselectedProduct }) => (
  <div>
    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
      {t('products.saleModal.product')} *
    </label>
    <select
      value={selectedProduct?.id || ''}
      onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
      disabled={preselectedProduct !== null}
      className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'} ${preselectedProduct ? 'opacity-75' : ''}`}
      data-testid="product-select"
    >
      <option value="">{t('products.saleModal.selectProduct')}</option>
      {products.map(p => (
        <option key={p.id} value={p.id}>
          {p.name} ({(p.total_emissions_per_unit || 0).toFixed(2)} kgCO₂e/{t('products.saleModal.perUnit')})
        </option>
      ))}
    </select>
  </div>
);

const ActiveProfileBadge = ({ isDark, t, activeProfile, currentFiscalYear, profileTotal, onManageVersions }) => (
  <div className={`p-3 rounded-xl flex items-center justify-between ${
    activeProfile.source === 'specific'
      ? (isDark ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200')
      : (isDark ? 'bg-slate-700/50' : 'bg-gray-50')
  }`}>
    <div className="flex items-center gap-2">
      <History className={`w-4 h-4 ${activeProfile.source === 'specific' ? 'text-purple-500' : (isDark ? 'text-slate-400' : 'text-gray-500')}`} />
      <span className={`text-sm ${activeProfile.source === 'specific' ? (isDark ? 'text-purple-300' : 'text-purple-700') : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
        {activeProfile.source === 'specific' ? t('products.saleModal.profileFY').replace('{name}', currentFiscalYear?.name) : t('products.saleModal.defaultProfile')}
      </span>
      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>({profileTotal.toFixed(2)} kgCO₂e/{t('products.saleModal.perUnit')})</span>
    </div>
    <button
      onClick={onManageVersions}
      className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-gray-200 text-gray-600'}`}
      data-testid="manage-versions-btn"
    >
      <Edit3 className="w-3 h-3" />{t('products.saleModal.manage')}
    </button>
  </div>
);

const EmissionsPreview = ({ isDark, t, manufacturing, usage, disposal, total, quantity }) => (
  <div className="space-y-3">
    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('products.saleModal.estimatedEmissions')}</p>
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: Factory, label: 'Transformation', value: manufacturing, testId: 'preview-manufacturing' },
        { icon: Leaf, label: t('products.saleModal.utilisation'), value: usage, testId: 'preview-usage' },
        { icon: Recycle, label: t('products.saleModal.endOfLife'), value: disposal, testId: 'preview-disposal' },
      ].map(item => (
        <div key={item.testId} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/60' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <item.icon className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</span>
          </div>
          <p className={`text-sm font-semibold tabular-nums ${isDark ? 'text-slate-200' : 'text-gray-800'}`} data-testid={item.testId}>
            {(item.value / 1000).toFixed(3)} <span className={`text-xs font-normal ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>tCO₂e</span>
          </p>
        </div>
      ))}
    </div>
    <div className={`p-3 rounded-xl border ${isDark ? 'border-slate-600 bg-slate-700/40' : 'border-gray-200 bg-gray-50/80'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total</span>
        <span className={`text-lg font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="preview-total">
          {(total / 1000).toFixed(3)} tCO₂e
        </span>
      </div>
    </div>
    {quantity > 0 && (
      <p className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        <ArrowRight className="w-3 h-3" />{t('products.saleModal.autoScope3')}
      </p>
    )}
  </div>
);

const DeleteConfirmation = ({ isDark, t, selectedProduct, existingSale, submitting, onCancel, onDelete }) => (
  <div className="space-y-4">
    <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
      <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>
        {t('products.saleModal.deleteConfirmMsg').replace('{name}', selectedProduct?.name).replace('{qty}', existingSale?.quantity)}
      </p>
    </div>
    <div className="flex gap-3">
      <button onClick={onCancel} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>
        {t('products.saleModal.cancel')}
      </button>
      <button
        onClick={onDelete}
        disabled={submitting}
        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {t('products.saleModal.delete')}
      </button>
    </div>
  </div>
);

const EmptyProducts = ({ isDark, t }) => (
  <div className="text-center py-8">
    <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('products.saleModal.noProductAvailable')}</p>
    <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{t('products.saleModal.createProductFromMenu')}</p>
  </div>
);

export default ProductSaleModal;
