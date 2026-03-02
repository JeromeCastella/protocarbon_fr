import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Trash2, Factory, Leaf, Recycle, ShoppingBag,
  Edit3, Clock, MoreHorizontal, Copy, X
} from 'lucide-react';
import ProductWizard from '../components/ProductWizard';
import ProductSaleModal from '../components/ProductSaleModal';
import ProductVersionsModal from '../components/ProductVersionsModal';
import ProductDetailModal from '../components/ProductDetailModal';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ── Emissions stacked bar ──────────────────────────────────────────
const EmissionsBar = ({ manufacturing, usage, disposal, isDark }) => {
  const total = manufacturing + usage + disposal;
  if (total <= 0) return null;

  const pctMfg = (manufacturing / total) * 100;
  const pctUse = (usage / total) * 100;
  const pctEnd = (disposal / total) * 100;

  const [hovered, setHovered] = useState(null);

  const segments = [
    { key: 'mfg', pct: pctMfg, value: manufacturing, color: 'bg-orange-400', label: 'Matières' },
    { key: 'use', pct: pctUse, value: usage, color: 'bg-emerald-400', label: 'Utilisation' },
    { key: 'end', pct: pctEnd, value: disposal, color: 'bg-sky-400', label: 'Fin de vie' },
  ].filter(s => s.pct > 0);

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        {segments.map(s => (
          <div
            key={s.key}
            className={`${s.color} rounded-sm transition-opacity ${hovered && hovered !== s.key ? 'opacity-40' : ''}`}
            style={{ width: `${s.pct}%`, minWidth: s.pct > 0 ? '4px' : 0 }}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            data-testid={`bar-${s.key}`}
          />
        ))}
      </div>
      <div className="flex gap-3 text-[11px]">
        {segments.map(s => (
          <span
            key={s.key}
            className={`flex items-center gap-1 transition-opacity ${hovered && hovered !== s.key ? 'opacity-40' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
          >
            <span className={`inline-block w-2 h-2 rounded-sm ${s.color}`} />
            {s.label}
            {hovered === s.key && <span className="font-medium">{s.pct.toFixed(0)}%</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Actions dropdown ───────────────────────────────────────────────
const ActionsMenu = ({ onEdit, onDuplicate, onDelete, onVersions, isEnhanced, isDark, language }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    isEnhanced && { icon: Edit3, label: language === 'fr' ? 'Modifier' : 'Bearbeiten', action: onEdit, testId: 'action-edit' },
    { icon: Copy, label: language === 'fr' ? 'Dupliquer' : 'Duplizieren', action: onDuplicate, testId: 'action-duplicate' },
    { icon: Clock, label: language === 'fr' ? 'Versions' : 'Versionen', action: onVersions, testId: 'action-versions' },
    { icon: Trash2, label: language === 'fr' ? 'Supprimer' : 'Löschen', action: onDelete, danger: true, testId: 'action-delete' },
  ].filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        data-testid="card-actions-btn"
        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
      >
        <MoreHorizontal className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border z-20 overflow-hidden ${
              isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
            }`}
          >
            {items.map((item, i) => (
              <button
                key={i}
                data-testid={item.testId}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.action(); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                  item.danger
                    ? (isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50')
                    : (isDark ? 'text-slate-200 hover:bg-slate-600' : 'text-gray-700 hover:bg-gray-50')
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Product card ───────────────────────────────────────────────────
const ProductCard = ({ product, index, isDark, language, onEdit, onDelete, onDuplicate, onVersions, onSale, onClick }) => {
  const isEnhanced = product.is_enhanced;
  const mfg = product.active_manufacturing_emissions ?? product.manufacturing_emissions ?? 0;
  const usage = product.active_usage_emissions ?? product.usage_emissions ?? 0;
  const disposal = product.active_disposal_emissions ?? product.disposal_emissions ?? 0;
  const total = product.active_total_emissions_per_unit ?? product.total_emissions_per_unit ?? 0;
  const fyQty = product.fiscal_year_sales_quantity ?? product.total_sales ?? 0;
  const fyEmissions = product.fiscal_year_sales_emissions ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      data-testid={`product-card-${product.id}`}
      className={`rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
        isDark ? 'bg-slate-800 hover:bg-slate-750 ring-1 ring-slate-700' : 'bg-white shadow-md hover:shadow-xl'
      }`}
    >
      {/* Header — neutral */}
      <div className={`px-5 pt-5 pb-3 flex items-start justify-between`}>
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              product.product_type === 'semi_finished'
                ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                : (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700')
            }`} data-testid="product-type-badge">
              {product.product_type === 'semi_finished'
                ? (language === 'fr' ? 'Semi-fini' : 'Halbfertig')
                : (language === 'fr' ? 'Fini' : 'Fertig')}
            </span>
            {product.lifespan_years > 0 && (
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {product.lifespan_years} {language === 'fr' ? 'ans' : 'Jahre'}
              </span>
            )}
          </div>
        </div>
        <ActionsMenu
          onEdit={() => onEdit(product)}
          onDuplicate={() => onDuplicate(product)}
          onDelete={() => onDelete(product.id)}
          onVersions={() => onVersions(product)}
          isEnhanced={isEnhanced}
          isDark={isDark}
          language={language}
        />
      </div>

      {/* Dominant emissions value */}
      <div className="px-5 py-4">
        <p className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="total-emissions">
          {total.toFixed(total >= 100 ? 0 : total >= 1 ? 1 : 2)}
          <span className={`text-base font-normal ml-1.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
            kgCO₂e / {language === 'fr' ? 'unité' : 'Einheit'}
          </span>
        </p>
      </div>

      {/* Stacked bar */}
      <div className="px-5 pb-4">
        <EmissionsBar manufacturing={mfg} usage={usage} disposal={disposal} isDark={isDark} />
      </div>

      {/* Footer — sales + link */}
      <div className={`px-5 py-3 border-t flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {fyQty > 0
            ? `${fyQty} ${language === 'fr' ? 'ventes' : 'Verkäufe'} · ${(fyEmissions / 1000).toFixed(2)} tCO₂e`
            : (language === 'fr' ? 'Aucune vente' : 'Keine Verkäufe')}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onSale(product); }}
          data-testid={`record-sale-${product.id}`}
          className={`text-xs font-medium flex items-center gap-1 transition-colors ${
            isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {language === 'fr' ? 'Vente' : 'Verkauf'}
        </button>
      </div>
    </motion.div>
  );
};

// ── Page ────────────────────────────────────────────────────────────
const Products = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { currentFiscalYear, fiscalYears } = useFiscalYear();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { fetchProducts(); }, [currentFiscalYear]);

  const fetchProducts = async () => {
    try {
      const fy = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const res = await axios.get(`${API_URL}/api/products${fy}`);
      setProducts(res.data || []);
    } catch (err) { console.error('Failed to fetch products:', err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (productId) => {
    const msg = language === 'fr'
      ? 'Êtes-vous sûr de vouloir supprimer ce produit ?'
      : 'Sind Sie sicher, dass Sie dieses Produkt löschen möchten?';
    if (!window.confirm(msg)) return;
    try {
      const res = await axios.delete(`${API_URL}/api/products/${productId}`);
      if (res.data?.archived) {
        alert(language === 'fr'
          ? 'Le produit a été archivé car il a des ventes enregistrées.'
          : 'Das Produkt wurde archiviert, da es Verkäufe gibt.');
      }
      fetchProducts();
    } catch (err) { console.error('Failed to delete product:', err); }
  };

  const handleEdit = (product) => {
    if (product.is_enhanced) { setEditingProduct(product); setShowWizard(true); }
  };

  const handleDuplicate = (product) => {
    // Open wizard in creation mode with pre-filled data from duplicated product
    setEditingProduct({ ...product, id: null, name: `${product.name} (copie)` });
    setShowWizard(true);
  };

  const handleSale = (product) => { setSelectedProduct(product); setShowSaleModal(true); };
  const handleVersions = (product) => { setSelectedProduct(product); setShowVersionsModal(true); };
  const handleCardClick = (product) => { setSelectedProduct(product); setShowDetailModal(true); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <EmptyFiscalYearState
        contextMessage={language === 'fr'
          ? 'Créez un exercice fiscal pour pouvoir enregistrer des produits et suivre leurs ventes.'
          : 'Erstellen Sie ein Geschäftsjahr, um Produkte zu erfassen und deren Verkäufe zu verfolgen.'}
      />
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
              : 'Verwalten Sie Ihre Produktkarten und deren CO₂-Auswirkungen über den gesamten Lebenszyklus'}
          </p>
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
          onClick={() => { setEditingProduct(null); setShowWizard(true); }}
          data-testid="add-product-btn"
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" />
          {language === 'fr' ? 'Créer une fiche produit' : 'Produktkarte erstellen'}
        </button>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {language === 'fr' ? 'Aucun produit défini' : 'Keine Produkte definiert'}
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {language === 'fr'
              ? 'Créez votre première fiche produit pour commencer à suivre les émissions de vos produits vendus.'
              : 'Erstellen Sie Ihre erste Produktkarte, um die Emissionen Ihrer verkauften Produkte zu verfolgen.'}
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
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              isDark={isDark}
              language={language}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onVersions={handleVersions}
              onSale={handleSale}
              onClick={() => handleCardClick(product)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProductWizard
        isOpen={showWizard}
        onClose={() => { setShowWizard(false); setEditingProduct(null); }}
        onProductCreated={fetchProducts}
        editingProduct={editingProduct}
      />
      <ProductSaleModal
        isOpen={showSaleModal}
        onClose={() => { setShowSaleModal(false); setSelectedProduct(null); }}
        onSaleRecorded={fetchProducts}
        preselectedProduct={selectedProduct}
      />
      <ProductVersionsModal
        isOpen={showVersionsModal}
        onClose={() => { setShowVersionsModal(false); setSelectedProduct(null); }}
        productId={selectedProduct?.id}
        productName={selectedProduct?.name}
        onProfileUpdated={fetchProducts}
      />
      <ProductDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
        product={selectedProduct}
        isDark={isDark}
        language={language}
        currentFiscalYear={currentFiscalYear}
        onEdit={handleEdit}
        onSale={handleSale}
      />
    </div>
  );
};

export default Products;
