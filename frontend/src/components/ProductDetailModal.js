import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Factory, Leaf, Recycle, Package, ShoppingBag, Edit3, Plus, Clock
} from 'lucide-react';

/**
 * Modale pleine page pour le détail d'un produit.
 * Affiche breakdown des émissions, liste des matières, historique des ventes.
 */
const ProductDetailModal = ({
  isOpen, onClose, product, isDark, language, currentFiscalYear, onEdit, onSale
}) => {
  if (!isOpen || !product) return null;

  const mfg = product.active_manufacturing_emissions ?? product.manufacturing_emissions ?? 0;
  const usage = product.active_usage_emissions ?? product.usage_emissions ?? 0;
  const disposal = product.active_disposal_emissions ?? product.disposal_emissions ?? 0;
  const total = product.active_total_emissions_per_unit ?? product.total_emissions_per_unit ?? 0;
  const endOfLife = product.end_of_life || [];
  const salesHistory = product.sales_history || product.sales || [];
  const fyQty = product.fiscal_year_sales_quantity ?? product.total_sales ?? 0;
  const fyEmissions = product.fiscal_year_sales_emissions ?? 0;

  const phases = [
    { key: 'mfg', label: language === 'fr' ? 'Transformation (3.10)' : 'Transformation (3.10)', value: mfg, icon: Factory, color: 'orange' },
    { key: 'use', label: language === 'fr' ? 'Utilisation' : 'Nutzung', value: usage, icon: Leaf, color: 'emerald' },
    { key: 'end', label: language === 'fr' ? 'Fin de vie' : 'Lebensende', value: disposal, icon: Recycle, color: 'sky' },
  ].filter(p => p.value > 0);

  const totalPhases = phases.reduce((s, p) => s + p.value, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
            data-testid="product-detail-modal"
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <Package className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-gray-500'}`} />
                </div>
                <div className="min-w-0">
                  <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.product_type === 'semi_finished'
                        ? (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                        : (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700')
                    }`}>
                      {product.product_type === 'semi_finished'
                        ? (language === 'fr' ? 'Semi-fini' : 'Halbfertig')
                        : (language === 'fr' ? 'Fini' : 'Fertig')}
                    </span>
                    {product.lifespan_years > 0 && (
                      <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Clock className="w-3 h-3" /> {product.lifespan_years} {language === 'fr' ? 'ans' : 'Jahre'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {product.is_enhanced && (
                  <button
                    onClick={() => { onClose(); onEdit(product); }}
                    data-testid="detail-edit-btn"
                    className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={onClose} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                  <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Total emissions */}
              <div className="text-center">
                <p className={`text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="detail-total">
                  {total.toFixed(total >= 100 ? 0 : total >= 1 ? 1 : 2)}
                  <span className={`text-lg font-normal ml-2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                    kgCO₂e / {language === 'fr' ? 'unité' : 'Einheit'}
                  </span>
                </p>
              </div>

              {/* Phases breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {phases.map(phase => {
                  const pct = totalPhases > 0 ? ((phase.value / totalPhases) * 100).toFixed(0) : 0;
                  const colorMap = { orange: 'orange', emerald: 'emerald', sky: 'sky' };
                  const c = colorMap[phase.color];
                  return (
                    <div key={phase.key} className={`p-4 rounded-xl ${isDark ? `bg-${c}-500/10` : `bg-${c}-50`}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <phase.icon className={`w-4 h-4 text-${c}-500`} />
                        <span className={`text-sm font-medium ${isDark ? `text-${c}-300` : `text-${c}-700`}`}>{phase.label}</span>
                      </div>
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {phase.value.toFixed(phase.value >= 10 ? 0 : 2)} <span className="text-sm font-normal">kgCO₂e</span>
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{pct}%</p>
                    </div>
                  );
                })}
              </div>

              {/* End of life entries */}
              {endOfLife.length > 0 && (
                <div>
                  <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Recycle className="w-4 h-4" />
                    {language === 'fr' ? `Fin de vie (${endOfLife.length})` : `Lebensende (${endOfLife.length})`}
                  </h3>
                  <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDark ? 'bg-slate-700/50' : 'bg-gray-50'}>
                          <th className={`text-left px-4 py-2.5 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            {language === 'fr' ? 'Traitement' : 'Behandlung'}
                          </th>
                          <th className={`text-right px-4 py-2.5 font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            {language === 'fr' ? 'Quantité' : 'Menge'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {endOfLife.map((e, i) => (
                          <tr key={i} className={isDark ? 'border-t border-slate-700' : 'border-t border-gray-100'}>
                            <td className={`px-4 py-2.5 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                              {e.name || `Traitement ${i + 1}`}
                            </td>
                            <td className={`text-right px-4 py-2.5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {e.quantity} {e.unit || 'kg'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sales summary */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <ShoppingBag className="w-4 h-4" />
                  {language === 'fr' ? 'Ventes' : 'Verkäufe'}
                  {currentFiscalYear && <span className={`font-normal text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({currentFiscalYear.name})</span>}
                </h3>
                {fyQty > 0 ? (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                        {fyQty} {language === 'fr' ? 'unités vendues' : 'verkaufte Einheiten'}
                      </span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {(fyEmissions / 1000).toFixed(2)} tCO₂e
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {language === 'fr' ? 'Aucune vente enregistrée pour cet exercice.' : 'Keine Verkäufe für dieses Geschäftsjahr.'}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { onClose(); onSale(product); }}
                data-testid="detail-sale-btn"
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isDark ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                {language === 'fr' ? 'Enregistrer une vente' : 'Verkauf erfassen'}
              </button>
              <button
                onClick={onClose}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {language === 'fr' ? 'Fermer' : 'Schließen'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
