import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyFiscalYearState from '../components/EmptyFiscalYearState';
import { 
  Calendar,
  Truck,
  Flame,
  Factory,
  Wind,
  Zap,
  Thermometer,
  Snowflake,
  ShoppingCart,
  Wrench,
  Fuel,
  Trash2,
  Plane,
  Car,
  Building,
  Settings,
  Power,
  Recycle,
  Home,
  Store,
  TrendingUp,
  X,
  Check,
  Search,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
  Edit3,
  Table,
  ArrowRight,
  Package,
  ShoppingBag,
  RefreshCw,
  FileText,
  PlusCircle
} from 'lucide-react';
import ProductSaleModal from '../components/ProductSaleModal';
import GuidedEntryModal from '../components/GuidedEntryModal';
import SaleEditModal from '../components/SaleEditModal';
import Scope3AvalChoiceModal from '../components/Scope3AvalChoiceModal';
import Fuse from 'fuse.js';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

// Categories that should open product sale modal instead of regular entry
const PRODUCT_SALE_CATEGORIES = ['transformation_produits', 'utilisation_produits', 'fin_vie_produits'];

// Virtual "Produits vendus" card that replaces the 3 separate product categories
const PRODUITS_VENDUS_CARD = {
  code: 'produits_vendus',
  name_fr: 'Produits vendus',
  name_de: 'Verkaufte Produkte',
  scope: 'scope3_aval',
  icon: 'package',
  color: '#7c3aed' // Purple color
};

// Utility function to format emissions with appropriate unit
const formatEmissions = (valueInKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return { value: '0', unit: 'kgCO₂e' };
  }
  
  const tonnes = valueInKg / 1000;
  
  if (tonnes >= 10) {
    // Display in tonnes if >= 10 tonnes
    return {
      value: tonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'tCO₂e'
    };
  } else {
    // Display in kg if < 10 tonnes
    return {
      value: valueInKg.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
      unit: 'kgCO₂e'
    };
  }
};

/**
 * Formatage des émissions pour la TableView avec uniformisation des unités
 * L'unité est déterminée par le total (si >= 10t, tout en tonnes)
 * Affiche toujours 2 décimales pour la cohérence
 */
const formatEmissionsForTable = (valueInKg, totalEmissionsKg) => {
  if (valueInKg === null || valueInKg === undefined) {
    return '0.00 kgCO₂e';
  }
  
  // Décider de l'unité basé sur le total (même seuil que formatEmissions: 10 tonnes)
  const totalTonnes = (totalEmissionsKg || 0) / 1000;
  const useTonnes = totalTonnes >= 10;
  
  if (useTonnes) {
    const tonnes = valueInKg / 1000;
    return `${tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tCO₂e`;
  } else {
    return `${valueInKg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO₂e`;
  }
};

const iconMap = {
  truck: Truck, flame: Flame, factory: Factory, wind: Wind, zap: Zap,
  thermometer: Thermometer, snowflake: Snowflake, 'shopping-cart': ShoppingCart,
  tool: Wrench, fuel: Fuel, trash: Trash2, plane: Plane, car: Car,
  building: Building, settings: Settings, power: Power, recycle: Recycle,
  home: Home, store: Store, 'trending-up': TrendingUp, package: Package
};


/* ================================================================
 *  TABLE VIEW PANEL — Slide-over for scope activity details
 * ================================================================ */
const TableViewPanel = ({
  isDark, tableViewScope, scopeLabels, scopes, getScopeActivities,
  getCategoryName, summary, formatEmissions, formatEmissionsForTable,
  handleEditActivityInModal, handleDeleteActivity, PRODUCT_SALE_CATEGORIES,
  onClose
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const rawActivities = getScopeActivities(tableViewScope);
  const totalEmissions = rawActivities.reduce((sum, a) => sum + (a.emissions || 0), 0);

  // Filter
  const filtered = searchQuery
    ? rawActivities.filter(a => {
        const q = searchQuery.toLowerCase();
        return (a.name || '').toLowerCase().includes(q)
          || (a.emission_factor_name || '').toLowerCase().includes(q)
          || (getCategoryName(a.category_id) || '').toLowerCase().includes(q)
          || (a.factor_snapshot?.name_simple_fr || '').toLowerCase().includes(q)
          || (a.factor_snapshot?.name_fr || '').toLowerCase().includes(q)
          || (a.comments || '').toLowerCase().includes(q);
      })
    : rawActivities;

  // Sort
  const activities = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    let va, vb;
    switch (sortField) {
      case 'name': va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); break;
      case 'category': va = getCategoryName(a.category_id); vb = getCategoryName(b.category_id); break;
      case 'factor': va = (a.factor_snapshot?.name_simple_fr || a.factor_snapshot?.name_fr || '').toLowerCase(); vb = (b.factor_snapshot?.name_simple_fr || b.factor_snapshot?.name_fr || '').toLowerCase(); break;
      case 'quantity': va = a.quantity || 0; vb = b.quantity || 0; break;
      case 'emissions': va = a.emissions || 0; vb = b.emissions || 0; break;
      case 'percent': va = a.emissions || 0; vb = b.emissions || 0; break;
      case 'source': va = a.sale_id ? 1 : 0; vb = b.sale_id ? 1 : 0; break;
      default: return 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const scopeColorMap = (scope) => {
    if (scope === 'scope1') return { text: 'text-blue-500', bg: 'bg-blue-500' };
    if (scope === 'scope2') return { text: 'text-cyan-500', bg: 'bg-cyan-500' };
    if (scope === 'scope3_3') return { text: 'text-amber-500', bg: 'bg-amber-500' };
    if (scope?.includes('amont') || scope === 'scope3') return { text: 'text-purple-500', bg: 'bg-purple-500' };
    return { text: 'text-indigo-500', bg: 'bg-indigo-500' };
  };

  const headerBg = tableViewScope === null
    ? 'from-blue-500 to-purple-500'
    : tableViewScope === 'scope1' ? 'from-blue-500 to-blue-600'
    : tableViewScope === 'scope2' ? 'from-cyan-500 to-cyan-600'
    : tableViewScope?.includes('amont') ? 'from-purple-500 to-purple-600'
    : 'from-indigo-500 to-indigo-600';

  const thClass = `text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`;
  const thRightClass = `text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-y-0 right-0 w-[94%] max-w-[1600px] ${isDark ? 'bg-slate-900' : 'bg-gray-50'} shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerBg} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Table className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {tableViewScope === null ? 'Bilan complet' : scopeLabels[tableViewScope]?.name}
                </h3>
                <p className="text-sm text-white/70">
                  {rawActivities.length} entrées — {
                    formatEmissions(tableViewScope === null
                      ? summary?.total_emissions
                      : summary?.scope_emissions?.[tableViewScope]).value
                  } {formatEmissions(tableViewScope === null
                      ? summary?.total_emissions
                      : summary?.scope_emissions?.[tableViewScope]).unit}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white" data-testid="close-table-view">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une activité, catégorie, facteur..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              data-testid="table-view-search"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <Table className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-700' : 'text-gray-300'}`} />
              <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {searchQuery ? t('dataEntry.noResults') : t('dataEntry.noData')}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'}`}>
                <tr>
                  <th className={thClass} onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Activité <SortIcon field="name" /></div>
                  </th>
                  {tableViewScope === null && (
                    <th className={thClass}>Scope</th>
                  )}
                  <th className={thClass} onClick={() => toggleSort('category')}>
                    <div className="flex items-center gap-1">Catégorie <SortIcon field="category" /></div>
                  </th>
                  <th className={thClass} onClick={() => toggleSort('factor')}>
                    <div className="flex items-center gap-1">Facteur d'émission <SortIcon field="factor" /></div>
                  </th>
                  <th className={thRightClass} onClick={() => toggleSort('quantity')}>
                    <div className="flex items-center justify-end gap-1">Quantité <SortIcon field="quantity" /></div>
                  </th>
                  <th className={thRightClass} onClick={() => toggleSort('emissions')}>
                    <div className="flex items-center justify-end gap-1">Émissions <SortIcon field="emissions" /></div>
                  </th>
                  <th className={thRightClass} onClick={() => toggleSort('percent')}>
                    <div className="flex items-center justify-end gap-1">% <SortIcon field="percent" /></div>
                  </th>
                  <th className={thClass} onClick={() => toggleSort('source')}>
                    <div className="flex items-center gap-1">Source <SortIcon field="source" /></div>
                  </th>
                  <th className={thClass}>Commentaire</th>
                  <th className={`text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => {
                  const activityScope = activity.scope || 'scope1';
                  const { text: scopeColor, bg: scopeBgColor } = scopeColorMap(activityScope);
                  const isGrouped = activity.group_size > 1;
                  const isSecondary = activity.group_index > 0;
                  const isLinkedActivity = isSecondary;
                  const pct = totalEmissions > 0 ? ((activity.emissions || 0) / totalEmissions * 100) : 0;
                  const factorName = activity.factor_snapshot?.name_simple_fr || activity.factor_snapshot?.name_fr || activity.emission_factor_name || '—';
                  const factorValue = activity.factor_snapshot?.impacts?.[0]
                    ? `${activity.factor_snapshot.impacts[0].value} ${activity.factor_snapshot.impacts[0].unit}`
                    : (activity.impact_value ? `${activity.impact_value} ${activity.impact_unit || ''}` : '');

                  return (
                    <tr
                      key={activity.id}
                      className={`border-b ${isDark ? 'border-slate-800' : 'border-gray-100'} transition-colors ${
                        isLinkedActivity
                          ? (isDark ? 'bg-slate-800/60' : 'bg-gray-50/80')
                          : (isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white')
                      }`}
                    >
                      {/* Activité */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isLinkedActivity ? (
                            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>↳</span>
                          ) : isGrouped ? (
                            <span className={`text-[10px] px-1 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                              {activity.group_size}x
                            </span>
                          ) : null}
                          <span className={`text-sm font-medium truncate max-w-[200px] ${isDark ? 'text-slate-200' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                            {activity.name || activity.emission_factor_name || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Scope (bilan complet) */}
                      {tableViewScope === null && (
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${scopeBgColor}`}>
                            {activityScope === 'scope3_3' ? '3.3' : (scopeLabels[activityScope]?.name || activityScope).replace('Scope ', '')}
                          </span>
                        </td>
                      )}

                      {/* Catégorie */}
                      <td className={`py-3 px-3 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                        <span className="truncate max-w-[150px] block">{getCategoryName(activity.category_id)}</span>
                      </td>

                      {/* Facteur d'émission */}
                      <td className="py-3 px-3">
                        <div className={`${isLinkedActivity ? 'opacity-60' : ''}`}>
                          <p className={`text-xs truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{factorName}</p>
                          {factorValue && (
                            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{factorValue}</p>
                          )}
                        </div>
                      </td>

                      {/* Quantité */}
                      <td className={`py-3 px-3 text-right text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-900'} ${isLinkedActivity ? 'opacity-60' : ''}`}>
                        {activity.quantity?.toLocaleString('fr-FR')} {activity.original_unit || activity.unit}
                      </td>

                      {/* Émissions */}
                      <td className={`py-3 px-3 text-right font-bold text-sm ${scopeColor} ${isLinkedActivity ? 'opacity-70' : ''}`}>
                        {formatEmissionsForTable(activity.emissions, totalEmissions)}
                      </td>

                      {/* % du total */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className={`w-10 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div className={`h-full rounded-full ${scopeBgColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium min-w-[36px] text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {pct < 0.1 && pct > 0 ? '<0.1' : pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3">
                        {!isLinkedActivity && PRODUCT_SALE_CATEGORIES.includes(activity.category_id) ? (
                          activity.sale_id ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                              <Package className="w-3 h-3 inline mr-0.5" />Fiche
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                              <FileText className="w-3 h-3 inline mr-0.5" />Direct
                            </span>
                          )
                        ) : isLinkedActivity ? (
                          <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Auto</span>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                            <FileText className="w-3 h-3 inline mr-0.5" />Direct
                          </span>
                        )}
                      </td>

                      {/* Commentaire */}
                      <td className={`py-3 px-3 text-xs max-w-[150px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        <span className="truncate block" title={activity.comments || ''}>{activity.comments || '—'}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {isLinkedActivity ? (
                          <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>Auto</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditActivityInModal(activity)}
                              data-testid={`edit-activity-${activity.id}`}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 hover:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-500'}`}
                              title={t('dataEntry.edit')}
                            >
                              <Edit3 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                            </button>
                            <button
                              onClick={() => {
                                if (activity.sale_id && activity.product_id) {
                                  handleEditActivityInModal(activity);
                                } else {
                                  handleDeleteActivity(activity);
                                }
                              }}
                              data-testid={`delete-activity-${activity.id}`}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                              title={activity.sale_id ? t('dataEntry.manageSale') : t('dataEntry.delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`sticky bottom-0 ${isDark ? 'bg-slate-800 border-t border-slate-700' : 'bg-white border-t border-gray-200'}`}>
                  <td colSpan={tableViewScope === null ? 5 : 4} className={`py-3 px-3 font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {tableViewScope === null ? t('dataEntry.totalGeneral') : `${t('dataEntry.totalScope')} ${scopeLabels[tableViewScope]?.name}`}
                    {searchQuery && ` (${activities.length} résultats)`}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold text-sm ${
                    tableViewScope === null ? 'text-blue-500' :
                    tableViewScope === 'scope1' ? 'text-blue-500' :
                    tableViewScope === 'scope2' ? 'text-cyan-500' : 'text-purple-500'
                  }`}>
                    {formatEmissionsForTable(
                      activities.reduce((s, a) => s + (a.emissions || 0), 0),
                      totalEmissions
                    )}
                  </td>
                  <td className={`py-3 px-3 text-right text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {totalEmissions > 0 ? (activities.reduce((s, a) => s + (a.emissions || 0), 0) / totalEmissions * 100).toFixed(1) : 0}%
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};


/* ================================================================
 *  GLOBAL FACTOR SEARCH — Quick search bar for power users
 * ================================================================ */
const normalize = (str) => typeof str === 'string' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : str;

const FUSE_OPTIONS = {
  keys: [
    { name: 'name_simple_fr', weight: 4 },
    { name: 'name_simple_de', weight: 4 },
    { name: 'name_fr', weight: 2 },
    { name: 'name_de', weight: 2 },
    { name: 'category_names_fr', weight: 2 },
    { name: 'category_names_de', weight: 2 },
    { name: 'source_product_name', weight: 1.5 },
    { name: 'subcategory', weight: 1.5 },
    { name: 'tags', weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  getFn: (obj, path) => {
    const val = Fuse.config.getFn(obj, path);
    if (Array.isArray(val)) return val.map(v => normalize(v));
    return normalize(val);
  },
};

const GlobalFactorSearch = ({ isDark, showExpertFactors, onToggleExpert, onSelectFactor }) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allFactors, setAllFactors] = useState(null); // lazy loaded
  const [fuseAll, setFuseAll] = useState(null);
  const [fusePublic, setFusePublic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lazy load factors on first focus
  const loadFactors = async () => {
    if (allFactors || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/emission-factors/search-index`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAllFactors(data);
      setFuseAll(new Fuse(data, FUSE_OPTIONS));
      setFusePublic(new Fuse(data.filter(f => f.is_public), FUSE_OPTIONS));
    } catch (err) {
      logger.error('Failed to load search index:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search with debounce — uses the correct index based on expert toggle
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const fuseIndex = showExpertFactors ? fuseAll : fusePublic;
    if (!query || query.length < 2 || !fuseIndex) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const raw = fuseIndex.search(normalize(query), { limit: 300 });
      // Diversify results: max 3 per subcategory to avoid one subcategory dominating
      const diversified = [];
      const subCounts = {};
      for (const r of raw) {
        const sub = r.item.subcategory || '_other';
        subCounts[sub] = (subCounts[sub] || 0) + 1;
        if (subCounts[sub] <= 3) {
          diversified.push(r);
        }
        if (diversified.length >= 20) break;
      }
      setResults(diversified);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fuseAll, fusePublic, showExpertFactors]);

  const handleSelect = (factor) => {
    setQuery('');
    setResults([]);
    setIsFocused(false);
    onSelectFactor(factor);
  };

  const getDisplayName = (f) => {
    if (language === 'fr') return f.name_simple_fr || f.name_fr || f.source_product_name || '—';
    return f.name_simple_de || f.name_de || f.source_product_name || '—';
  };

  const getImpactText = (f) => {
    if (!f.impact) return '';
    const v = f.impact.value;
    if (v == null) return '';
    return `${v >= 0.01 ? v.toFixed(4) : v.toExponential(2)} ${f.impact.unit || ''}`;
  };

  return (
    <div ref={containerRef} className="relative" data-testid="global-factor-search">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        isFocused
          ? (isDark ? 'border-blue-500 bg-slate-800 ring-2 ring-blue-500/20' : 'border-blue-400 bg-white ring-2 ring-blue-400/20')
          : (isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white')
      }`}>
        <Search className={`w-5 h-5 flex-shrink-0 ${isFocused ? 'text-blue-500' : (isDark ? 'text-slate-500' : 'text-gray-400')}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setIsFocused(true); loadFactors(); }}
          placeholder={t('dataEntry.globalSearchPlaceholder')}
          className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
          data-testid="global-search-input"
        />
        {isLoading && (
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        )}

        {/* Expert toggle */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pl-2 border-l border-slate-600/30">
          <button
            onClick={onToggleExpert}
            data-testid="expert-toggle-btn"
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              showExpertFactors
                ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')
                : (isDark ? 'bg-slate-700 text-slate-400 hover:text-slate-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700')
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {language === 'fr' ? 'Expert' : 'Experte'}
            <div className={`w-6 h-3.5 rounded-full transition-colors ${showExpertFactors ? 'bg-amber-500' : (isDark ? 'bg-slate-600' : 'bg-gray-300')}`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white mt-0.5 transition-transform ${showExpertFactors ? 'translate-x-3' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isFocused && (query.length >= 2 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-xl shadow-2xl border overflow-hidden ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}
            data-testid="search-results-dropdown"
          >
            {isLoading ? (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                {t('dataEntry.loadingIndex')}
              </div>
            ) : results.length === 0 && query.length >= 2 ? (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {language === 'fr'
                  ? `Aucun résultat pour "${query}"${!showExpertFactors ? ' — Activez le mode Expert pour élargir la recherche' : ''}`
                  : `Keine Ergebnisse für "${query}"${!showExpertFactors ? ' — Expertenmodus aktivieren für erweiterte Suche' : ''}`
                }
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((r, idx) => {
                  const f = r.item;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSelect(f)}
                      data-testid={`search-result-${idx}`}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-b-0 ${
                        isDark ? 'border-slate-700/50 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {getDisplayName(f)}
                          </p>
                          {!f.is_public && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                              Expert
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            {f.subcategory || f.category}
                          </span>
                          {f.default_unit && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                              {f.default_unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {getImpactText(f)}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



const DataEntry = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { currentFiscalYear, fiscalYears } = useFiscalYear();
  const { token } = useAuth();
  const [activeScope, setActiveScope] = useState('scope1');
  const [categories, setCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]); // For search category resolution
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [excludedCategories, setExcludedCategories] = useState([]);

  // Table view state
  const [showTableView, setShowTableView] = useState(false);
  const [tableViewScope, setTableViewScope] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingActivityData, setEditingActivityData] = useState(null);

  // Confirm dialog state (remplace window.confirm qui est bloqué en sandbox)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Product sale modal state
  const [showProductSaleModal, setShowProductSaleModal] = useState(false);

  // Scope 3 Aval choice modal state (FEAT-04)
  const [showScope3AvalChoice, setShowScope3AvalChoice] = useState(false);

  // Sale edit modal state (for editing linked sale activities)
  const [showSaleEditModal, setShowSaleEditModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  // Expert factors toggle — shared between search bar and GuidedEntryModal
  const [showExpertFactors, setShowExpertFactors] = useState(() => {
    return localStorage.getItem('showExpertFactors') === 'true';
  });
  // Factor pre-selected from search bar
  const [preSelectedFactor, setPreSelectedFactor] = useState(null);

  const toggleExpertFactors = () => {
    setShowExpertFactors(prev => {
      const next = !prev;
      localStorage.setItem('showExpertFactors', String(next));
      return next;
    });
  };

  // Handle factor selected from global search bar
  const handleSearchFactorSelect = (factor) => {
    // Derive scope from factor or its first impact
    const factorScope = factor.scope || factor.impact?.scope || 'scope1';

    // Resolve possible categories from factor's subcategory
    const subcat = allSubcategories.find(s => s.code === factor.subcategory);
    const subcatCategoryCodes = subcat?.categories || [];
    
    // Get full category objects for these codes
    const possibleCategories = subcatCategoryCodes
      .map(code => categories.find(c => c.code === code))
      .filter(Boolean);

    if (possibleCategories.length === 1) {
      // Unambiguous — auto-select
      setSelectedCategory(possibleCategories[0]);
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: null });
    } else if (possibleCategories.length > 1) {
      // Ambiguous — pass choices to GuidedEntryModal for user to pick
      setSelectedCategory(possibleCategories[0]); // pre-select first as default
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: possibleCategories });
    } else {
      // No subcategory match — fallback to factor.category or unknown
      const fallbackCat = categories.find(c => c.code === factor.category);
      setSelectedCategory(fallbackCat || { code: factor.category || 'unknown', scope: factorScope });
      setPreSelectedFactor({ ...factor, scope: factorScope, _resolvedCategories: null });
    }

    setEditingActivityData(null);
    setShowModal(true);
  };

  const fetchData = useCallback(async () => {
    try {
      // Build query params with fiscal year filter
      const fiscalYearParam = currentFiscalYear?.id ? `&fiscal_year_id=${currentFiscalYear.id}` : '';
      
      const [categoriesRes, activitiesRes, summaryRes, statsRes, subcatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/activities?limit=500${fiscalYearParam}`),
        axios.get(`${API_URL}/api/dashboard/summary${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`),
        axios.get(`${API_URL}/api/dashboard/category-stats${fiscalYearParam ? '?' + fiscalYearParam.slice(1) : ''}`),
        axios.get(`${API_URL}/api/subcategories`),
      ]);
      setCategories(categoriesRes.data || []);
      setAllSubcategories(subcatsRes.data || []);
      // Handle paginated response
      const activitiesData = activitiesRes.data?.data || activitiesRes.data || [];
      setActivities(activitiesData);
      setSummary(summaryRes.data);
      setCategoryStats(statsRes.data || {});
      setExcludedCategories(summaryRes.data?.excluded_categories || []);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFiscalYear?.id]);

  // Reload data when fiscal year changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scopes = [
    { id: 'scope1', name: t('scope.scope1'), subtitle: t('scope.scope1Title'), color: 'bg-blue-500' },
    { id: 'scope2', name: t('scope.scope2'), subtitle: t('scope.scope2Title'), color: 'bg-cyan-500' },
    { id: 'scope3_amont', name: t('scope.scope3Amont'), subtitle: t('scope.scope3AmontTitle'), color: 'bg-purple-500' },
    { id: 'scope3_aval', name: t('scope.scope3Aval'), subtitle: t('scope.scope3AvalTitle'), color: 'bg-indigo-500' },
  ];

  // Filter categories for the active scope, excluding product sale categories (they will be merged)
  const baseScopeCategories = categories.filter(c => 
    c.scope === activeScope && 
    !excludedCategories.includes(c.code) &&
    !PRODUCT_SALE_CATEGORIES.includes(c.code) // Exclude the 3 product categories
  );
  
  // Add the merged "Produits vendus" card if we're on scope3_aval
  // Insert it after "actifs_loues_aval" to maintain proper GHG Protocol order
  const scopeCategories = (() => {
    if (activeScope !== 'scope3_aval') {
      return baseScopeCategories;
    }
    
    // Find the index of "actifs_loues_aval" to insert "Produits vendus" after it
    const actifsLouesIndex = baseScopeCategories.findIndex(c => c.code === 'actifs_loues_aval');
    
    if (actifsLouesIndex !== -1) {
      // Insert after "actifs_loues_aval"
      const result = [...baseScopeCategories];
      result.splice(actifsLouesIndex + 1, 0, PRODUITS_VENDUS_CARD);
      return result;
    }
    
    // Fallback: add at the end if "actifs_loues_aval" not found
    return [...baseScopeCategories, PRODUITS_VENDUS_CARD];
  })();
  
  // Calculate activity count for the merged "Produits vendus" card
  // Includes both product sheet sales (unique sale_id) and direct entry activities
  const getProductSalesCount = () => {
    const productSaleIds = new Set();
    let directEntryCount = 0;
    (activities || []).forEach(activity => {
      if (PRODUCT_SALE_CATEGORIES.includes(activity.category_id)) {
        if (activity.sale_id) {
          productSaleIds.add(activity.sale_id);
        } else if (!activity.group_index || activity.group_index === 0) {
          // Count direct entries (non-grouped or primary in group)
          directEntryCount++;
        }
      }
    });
    return productSaleIds.size + directEntryCount;
  };

  // Category 3.3 message state
  const [showCategory33Message, setShowCategory33Message] = useState(false);

  const handleCategoryClick = (category) => {
    // Check if this is category 3.3 (auto-calculated from Scope 1 & 2)
    if (category.code === 'activites_combustibles_energie') {
      setShowCategory33Message(true);
      return;
    }
    
    // Check if this is the merged "Produits vendus" card or individual product category
    // FEAT-04: Show choice modal instead of directly opening ProductSaleModal
    if (category.code === 'produits_vendus' || PRODUCT_SALE_CATEGORIES.includes(category.code)) {
      setShowScope3AvalChoice(true);
      return;
    }
    
    setSelectedCategory(category);
    setEditingActivityData(null);
    setShowModal(true);
  };

  // Open modal in edit mode with pre-filled data
  const handleEditActivityInModal = async (activity) => {
    // Check if this activity is part of a linked sale (has sale_id)
    if (activity.sale_id && activity.product_id) {
      // Open the Sale Edit Modal for grouped editing
      setEditingSaleId(activity.sale_id);
      setEditingProductId(activity.product_id);
      setShowSaleEditModal(true);
      return;
    }
    
    // Déterminer l'activité à éditer (principale du groupe si multi-impacts)
    let activityToEdit = activity;
    
    // Si l'activité fait partie d'un groupe et n'est pas la principale
    if (activity.group_id && activity.group_index > 0) {
      try {
        // Charger le groupe complet pour récupérer l'activité principale
        const response = await axios.get(`${API_URL}/api/activities/groups/${activity.group_id}`);
        const mainActivity = response.data.activities.find(a => a.group_index === 0);
        if (mainActivity) {
          activityToEdit = {
            ...mainActivity,
            // Garder une référence au groupe complet pour l'affichage
            _groupActivities: response.data.activities
          };
        }
      } catch (error) {
        logger.error('Failed to load activity group:', error);
      }
    }
    
    // Utiliser entry_category pour trouver la catégorie de saisie originale
    const categoryCode = activityToEdit.entry_category || activityToEdit.category_id;
    const category = categories.find(c => c.code === categoryCode);
    if (!category) return;

    setSelectedCategory(category);
    setEditingActivityData(activityToEdit);
    setShowTableView(false);
    setShowModal(true);
  };

  // Handle activity submission from the guided modal
  const handleActivitySubmit = async (activityData) => {
    try {
      // Add fiscal year ID to associate activity with selected fiscal year
      const dataWithFiscalYear = {
        ...activityData,
        fiscal_year_id: currentFiscalYear?.id
      };
      
      if (editingActivityData) {
        // Mode édition : utiliser l'endpoint de groupe si l'activité fait partie d'un groupe
        const groupId = editingActivityData.group_id;
        if (groupId) {
          await axios.put(`${API_URL}/api/activities/groups/${groupId}`, dataWithFiscalYear);
        } else {
          await axios.put(`${API_URL}/api/activities/${editingActivityData.id}`, dataWithFiscalYear);
        }
      } else {
        // Création : peut retourner plusieurs activités si multi-impacts
        const response = await axios.post(`${API_URL}/api/activities`, dataWithFiscalYear);
        
        // Log pour debug (multi-impacts)
        if (response.data.count > 1) {
          logger.log(`Créé ${response.data.count} activités (groupe ${response.data.group_id})`);
        }
      }
      fetchData();
    } catch (error) {
      logger.error('Failed to save activity:', error);
      // TODO: Afficher toast d'erreur avec le message
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      }
    }
  };
  
  // Table view functions
  const openTableView = (scope) => {
    setTableViewScope(scope);
    setShowTableView(true);
  };

  // Open full view (all scopes) when clicking on total
  const openFullTableView = () => {
    setTableViewScope(null);
    setShowTableView(true);
  };

  // Catégories Scope 3 Amont (pour le mapping de scope3 générique)
  const SCOPE3_AMONT_CATEGORIES = new Set([
    'biens_services_achetes', 'biens_equipement', 'activites_combustibles_energie',
    'transport_distribution_amont', 'dechets_operations', 'deplacements_professionnels',
    'deplacements_domicile_travail', 'actifs_loues_amont'
  ]);

  // Fonction pour normaliser le scope pour l'affichage (comme le backend)
  const normalizeScope = (scope, categoryId) => {
    if (!scope) return 'scope1';
    if (['scope1', 'scope2', 'scope3_amont', 'scope3_aval'].includes(scope)) return scope;
    if (scope === 'scope3_3') return 'scope3_amont'; // 3.3 = amont énergie
    if (scope === 'scope3') {
      return SCOPE3_AMONT_CATEGORIES.has(categoryId) ? 'scope3_amont' : 'scope3_aval';
    }
    return 'scope1';
  };

  const getScopeActivities = (scope) => {
    const list = scope === null
      ? [...activities]
      : activities.filter(a => normalizeScope(a.scope, a.category_id) === scope);
    return list.sort((a, b) => (b.emissions || 0) - (a.emissions || 0));
  };

  // Suppression d'une activité (gère les groupes)
  const handleDeleteActivity = async (activity) => {
    // Fonction de suppression effective
    const performDelete = async () => {
      try {
        if (activity.group_id && activity.group_size > 1) {
          await axios.delete(`${API_URL}/api/activities/groups/${activity.group_id}`);
        } else {
          await axios.delete(`${API_URL}/api/activities/${activity.id}`);
        }
        fetchData();
      } catch (error) {
        logger.error('Failed to delete activity:', error);
      }
    };

    // Si l'activité fait partie d'un groupe multi-impacts, demander confirmation
    if (activity.group_id && activity.group_size > 1) {
      setConfirmDialog({
        isOpen: true,
        title: t('dataEntry.deleteGroup'),
        message: `Cette saisie contient ${activity.group_size} impacts liés. Voulez-vous supprimer les ${activity.group_size} activités ?`,
        onConfirm: performDelete,
      });
    } else {
      // Pour une activité simple, supprimer directement
      await performDelete();
    }
  };

  const handleUpdateActivity = async (activityId, updates) => {
    try {
      await axios.put(`${API_URL}/api/activities/${activityId}`, updates);
      setEditingActivity(null);
      fetchData();
    } catch (error) {
      logger.error('Failed to update activity:', error);
    }
  };

  const getCategoryName = (categoryCode) => {
    const cat = categories.find(c => c.code === categoryCode);
    return cat ? (language === 'fr' ? cat.name_fr : cat.name_de) : categoryCode;
  };

  const scopeLabels = {
    scope1: { name: t('dataEntry.scopeLabels.scope1'), subtitle: t('dataEntry.scopeLabels.scope1Sub'), color: 'blue' },
    scope2: { name: t('dataEntry.scopeLabels.scope2'), subtitle: t('dataEntry.scopeLabels.scope2Sub'), color: 'cyan' },
    scope3_amont: { name: t('dataEntry.scopeLabels.scope3_amont'), subtitle: t('dataEntry.scopeLabels.scope3_amontSub'), color: 'purple' },
    scope3_aval: { name: t('dataEntry.scopeLabels.scope3_aval'), subtitle: t('dataEntry.scopeLabels.scope3_avalSub'), color: 'indigo' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Empty state: No fiscal year created
  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div data-testid="data-entry-empty-state" className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-lg w-full text-center p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
        >
          {/* Illustration */}
          <div className="relative mb-6">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Calendar className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className={`absolute -bottom-1 -right-1 left-1/2 ml-6 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}
            >
              <PlusCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {language === 'fr' ? 'Créez votre premier exercice fiscal' : 'Erstellen Sie Ihr erstes Geschäftsjahr'}
          </h2>

          {/* Description */}
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            {language === 'fr' 
              ? 'Pour commencer à saisir vos données d\'émissions, vous devez d\'abord créer un exercice fiscal. Cela permettra d\'organiser vos données par période.'
              : 'Um mit der Eingabe Ihrer Emissionsdaten zu beginnen, müssen Sie zunächst ein Geschäftsjahr erstellen. Dadurch können Ihre Daten nach Zeitraum organisiert werden.'
            }
          </p>

          {/* Info box */}
          <div className={`rounded-xl p-4 mb-6 text-left ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' 
                  ? 'Un exercice fiscal correspond généralement à une année calendaire (janvier-décembre) ou à l\'année comptable de votre entreprise.'
                  : 'Ein Geschäftsjahr entspricht in der Regel einem Kalenderjahr (Januar-Dezember) oder dem Buchhaltungsjahr Ihres Unternehmens.'
                }
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/general-info"
            data-testid="create-fiscal-year-btn"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            <PlusCircle className="w-5 h-5" />
            {language === 'fr' ? 'Créer un exercice fiscal' : 'Geschäftsjahr erstellen'}
          </Link>

          {/* Secondary link */}
          <p className={`mt-4 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            {language === 'fr' ? 'Vous serez redirigé vers les ' : 'Sie werden zu den '}
            <Link to="/general-info" className="text-blue-500 hover:underline">
              {language === 'fr' ? 'informations générales' : 'allgemeinen Informationen'}
            </Link>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div data-testid="data-entry-page" className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.title')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('dataEntry.subtitle')}
          </p>
        </div>

        {/* Global Factor Search Bar */}
        <div className="mb-6">
          <GlobalFactorSearch
            isDark={isDark}
            showExpertFactors={showExpertFactors}
            onToggleExpert={toggleExpertFactors}
            onSelectFactor={handleSearchFactorSelect}
          />
        </div>

        <div className="h-2"></div>

        {/* Scope Tabs */}
        <div className={`flex gap-2 p-1 rounded-xl mb-6 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {scopes.map(scope => (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id)}
              data-testid={`scope-tab-${scope.id}`}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeScope === scope.id
                  ? `${scope.color} text-white shadow-lg`
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="text-sm">{scope.name}</div>
              <div className="text-xs opacity-80">{scope.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scopeCategories.map((category, index) => {
            const IconComponent = iconMap[category.icon] || Factory;
            // For the merged "Produits vendus" card, use unique sale count
            const count = category.code === 'produits_vendus' 
              ? getProductSalesCount() 
              : (categoryStats[category.code]?.count || 0);
            
            return (
              <motion.div
                key={category.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category)}
                data-testid={`category-card-${category.code}`}
                className="relative cursor-pointer"
              >
                <div
                  className="p-6 rounded-2xl text-white min-h-[140px] flex flex-col justify-between"
                  style={{ backgroundColor: category.color }}
                >
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10" style={{ color: category.color }}>
                      {count}
                    </div>
                  )}
                  <IconComponent className="w-10 h-10 opacity-90" />
                  <div>
                    <p className="font-medium text-sm leading-tight">
                      {language === 'fr' ? category.name_fr : category.name_de}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar - Progress */}
      <div className="w-80 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={openFullTableView}
          data-testid="total-balance-card"
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-blue-100 text-sm">{t('dataEntry.totalBalance')}</p>
            <Table className="w-5 h-5 text-blue-200" />
          </div>
          <h2 className="text-4xl font-bold mt-1" data-testid="sidebar-total-emissions">
            {formatEmissions(summary?.total_emissions).value}
          </h2>
          <p className="text-blue-200 text-sm">{formatEmissions(summary?.total_emissions).unit}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (summary?.total_emissions || 0) / 100)}%` }}
              />
            </div>
            <span className="text-sm">
              {Math.round(Object.values(summary?.scope_completion || {}).reduce((a, b) => a + b.percentage, 0) / 4)}% {t('dataEntry.completed')}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            Cliquer pour voir le détail complet
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
        >
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.progressByScope')}
          </h3>
          <div className="space-y-4">
            {Object.entries(summary?.scope_completion || {}).map(([scope, data]) => {
              const scopeConfig = scopes.find(s => s.id === scope);
              const scopeActivitiesCount = getScopeActivities(scope).length;
              return (
                <div 
                  key={scope} 
                  onClick={() => openTableView(scope)}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {scopeConfig?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatEmissions(summary?.scope_emissions?.[scope]).value}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {formatEmissions(summary?.scope_emissions?.[scope]).unit}
                      </span>
                      {scopeActivitiesCount > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${scopeConfig?.color} text-white`}>
                          {scopeActivitiesCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      {data.categories_filled}/{data.total_categories} {t('dataEntry.categories')}
                    </span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {data.percentage}%
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.percentage}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${scopeConfig?.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ========== GUIDED ENTRY MODAL ========== */}
      <GuidedEntryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingActivityData(null);
          setPreSelectedFactor(null);
        }}
        category={selectedCategory}
        scope={preSelectedFactor ? (preSelectedFactor.scope || selectedCategory?.scope || activeScope) : activeScope}
        language={language}
        isDark={isDark}
        onSubmit={handleActivitySubmit}
        editingActivity={editingActivityData}
        preSelectedFactor={preSelectedFactor}
        showExpertFactors={showExpertFactors}
        onToggleExpert={toggleExpertFactors}
      />


      {/* ========== TABLE VIEW — SLIDE-OVER PANEL ========== */}
      <AnimatePresence>
        {showTableView && (
          <TableViewPanel
            isDark={isDark}
            tableViewScope={tableViewScope}
            scopeLabels={scopeLabels}
            scopes={scopes}
            getScopeActivities={getScopeActivities}
            getCategoryName={getCategoryName}
            summary={summary}
            formatEmissions={formatEmissions}
            formatEmissionsForTable={formatEmissionsForTable}
            handleEditActivityInModal={handleEditActivityInModal}
            handleDeleteActivity={handleDeleteActivity}
            PRODUCT_SALE_CATEGORIES={PRODUCT_SALE_CATEGORIES}
            onClose={() => setShowTableView(false)}
          />
        )}
      </AnimatePresence>

      {/* ========== SCOPE 3 AVAL CHOICE MODAL (FEAT-04) ========== */}
      <Scope3AvalChoiceModal
        isOpen={showScope3AvalChoice}
        onClose={() => setShowScope3AvalChoice(false)}
        onChooseProductSheet={() => setShowProductSaleModal(true)}
        onChooseDirectEntry={(categoryCode) => {
          // Find the real category object from the full categories list
          const cat = categories.find(c => c.code === categoryCode);
          if (cat) {
            setSelectedCategory(cat);
            setEditingActivityData(null);
            setShowModal(true);
          }
        }}
        language={language}
        isDark={isDark}
      />

      {/* Product Sale Modal (for transformation/utilisation/fin_vie categories) */}
      <ProductSaleModal
        isOpen={showProductSaleModal}
        onClose={() => setShowProductSaleModal(false)}
        onSaleRecorded={fetchData}
      />

      {/* Category 3.3 Information Modal */}
      <AnimatePresence>
        {showCategory33Message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCategory33Message(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
            >
              {/* Header with icon */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t('dataEntry.category33.title')}</h3>
                    <p className="text-white/80 text-sm">Scope 3.3</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <p className={`${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {t('dataEntry.category33.message')}
                </p>
                
                <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <RefreshCw className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                      {t('dataEntry.category33.autoCalculated')}
                    </p>
                  </div>
                </div>
                
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {t('dataEntry.category33.noAction')}
                </p>
              </div>
              
              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setShowCategory33Message(false)}
                  className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Edit Modal (for editing/deleting linked sale activities) */}
      <SaleEditModal
        isOpen={showSaleEditModal}
        onClose={() => {
          setShowSaleEditModal(false);
          setEditingSaleId(null);
          setEditingProductId(null);
        }}
        saleId={editingSaleId}
        productId={editingProductId}
        onSaleUpdated={fetchData}
      />

      {/* Dialog de confirmation (remplace window.confirm bloqué en sandbox) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDark={isDark}
        variant="danger"
      />
    </div>
  );
};

export default DataEntry;
