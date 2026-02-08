import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Calendar, 
  Plus, 
  Lock, 
  Unlock,
  Copy,
  Trash2,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  FileText,
  MoreVertical,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Configuration des années
const MIN_YEAR = 2020;
const YEARS_AHEAD = 10;

const FiscalYears = () => {
  const { isDark } = useTheme();
  const { 
    fiscalYears, 
    currentFiscalYear,
    selectFiscalYear,
    createFiscalYear, 
    closeFiscalYear, 
    rectifyFiscalYear,
    duplicateToNewYear,
    refreshFiscalYears
  } = useFiscalYear();
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRectifyModal, setShowRectifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFY, setSelectedFY] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    year: new Date().getFullYear() + 1,
    duplicateFrom: null,
    duplicateActivities: false
  });
  const [createError, setCreateError] = useState('');
  
  // Rectify form state
  const [rectifyReason, setRectifyReason] = useState('');
  
  // Delete confirmation state
  const [deleteStats, setDeleteStats] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Calculate available years (those not already created)
  const existingYears = useMemo(() => {
    return new Set(fiscalYears.map(fy => fy.year || parseInt(fy.name?.replace('Exercice ', ''))));
  }, [fiscalYears]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + YEARS_AHEAD;
    const years = [];
    
    for (let year = MIN_YEAR; year <= maxYear; year++) {
      years.push({
        year,
        available: !existingYears.has(year)
      });
    }
    
    return years;
  }, [existingYears]);

  // Find first available year for default selection
  useEffect(() => {
    const firstAvailable = availableYears.find(y => y.available);
    if (firstAvailable && showCreateModal) {
      setCreateForm(prev => ({ ...prev, year: firstAvailable.year }));
    }
  }, [availableYears, showCreateModal]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'closed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
            <Lock className="w-3 h-3" />
            Clôturé
          </span>
        );
      case 'rectified':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-500 text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            Rectifié
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-500 text-xs font-medium">
            <FileText className="w-3 h-3" />
            En cours
          </span>
        );
    }
  };

  // Get activities count for a fiscal year
  const getActivityCount = (fy) => {
    return fy.activities_count || 0;
  };

  // Handle create fiscal year
  const handleCreate = async () => {
    if (!createForm.year) return;
    
    // Check if year is available
    if (existingYears.has(createForm.year)) {
      setCreateError(`Un exercice existe déjà pour l'année ${createForm.year}`);
      return;
    }
    
    setLoading(true);
    setCreateError('');
    
    try {
      if (createForm.duplicateActivities && createForm.duplicateFrom) {
        // Create via duplication
        await duplicateToNewYear(createForm.duplicateFrom, {
          new_year: createForm.year,
          duplicate_activities: true,
          activity_ids_to_duplicate: []
        });
      } else {
        // Create empty fiscal year
        await createFiscalYear({ year: createForm.year });
      }
      
      setShowCreateModal(false);
      setCreateForm({ year: new Date().getFullYear() + 1, duplicateFrom: null, duplicateActivities: false });
    } catch (error) {
      console.error('Failed to create fiscal year:', error);
      setCreateError(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // Handle close fiscal year
  const handleClose = async () => {
    if (!selectedFY) return;
    setLoading(true);
    try {
      await closeFiscalYear(selectedFY.id);
      setShowCloseModal(false);
      setSelectedFY(null);
    } catch (error) {
      console.error('Failed to close fiscal year:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la clôture');
    } finally {
      setLoading(false);
    }
  };

  // Handle rectify fiscal year
  const handleRectify = async () => {
    if (!selectedFY || !rectifyReason) return;
    setLoading(true);
    try {
      await rectifyFiscalYear(selectedFY.id, rectifyReason);
      setShowRectifyModal(false);
      setSelectedFY(null);
      setRectifyReason('');
    } catch (error) {
      console.error('Failed to rectify fiscal year:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la rectification');
    } finally {
      setLoading(false);
    }
  };

  // Open delete modal and fetch stats
  const openDeleteModal = async (fy) => {
    setSelectedFY(fy);
    setDeleteConfirmText('');
    setDeleteError('');
    setLoading(true);
    
    try {
      // Fetch detailed stats for this fiscal year
      const response = await axios.get(`${API_URL}/api/dashboard/summary?fiscal_year_id=${fy.id}`);
      setDeleteStats({
        activitiesCount: response.data?.activities_count || 0,
        totalEmissions: response.data?.total_emissions || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setDeleteStats({ activitiesCount: 0, totalEmissions: 0 });
    } finally {
      setLoading(false);
      setShowDeleteModal(true);
    }
  };

  // Handle delete fiscal year
  const handleDelete = async () => {
    if (!selectedFY) return;
    if (deleteConfirmText !== selectedFY.name) return;
    
    setLoading(true);
    setDeleteError('');
    try {
      const response = await axios.delete(`${API_URL}/api/fiscal-years/${selectedFY.id}`);
      console.log('Delete response:', response.data);
      await refreshFiscalYears();
      setShowDeleteModal(false);
      setSelectedFY(null);
      setDeleteStats(null);
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Failed to delete fiscal year:', error);
      setDeleteError(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // Get available actions for a fiscal year
  const getAvailableActions = (fy) => {
    const actions = [];
    
    if (fy.status === 'draft') {
      actions.push({ key: 'close', label: 'Clôturer', icon: Lock, color: 'green' });
    }
    
    if (fy.status === 'closed') {
      actions.push({ key: 'rectify', label: 'Rectifier', icon: Unlock, color: 'orange' });
    }
    
    if (fy.status === 'rectified') {
      actions.push({ key: 'close', label: 'Re-clôturer', icon: Lock, color: 'green' });
    }
    
    // Duplicate is always available
    actions.push({ key: 'duplicate', label: 'Dupliquer vers...', icon: Copy, color: 'blue' });
    
    // Delete is always available with warning
    actions.push({ key: 'delete', label: 'Supprimer', icon: Trash2, color: 'red' });
    
    return actions;
  };

  // Handle action click
  const handleAction = (fy, action) => {
    setOpenMenuId(null);
    setSelectedFY(fy);
    
    switch (action) {
      case 'close':
        setShowCloseModal(true);
        break;
      case 'rectify':
        setShowRectifyModal(true);
        break;
      case 'duplicate':
        // Open create modal with duplication pre-selected
        const nextYear = (fy.year || parseInt(fy.name?.replace('Exercice ', ''))) + 1;
        const targetYear = availableYears.find(y => y.year >= nextYear && y.available)?.year || nextYear;
        setCreateForm({
          year: targetYear,
          duplicateFrom: fy.id,
          duplicateActivities: true
        });
        setShowCreateModal(true);
        break;
      case 'delete':
        openDeleteModal(fy);
        break;
      default:
        break;
    }
  };

  // Sort fiscal years by year descending
  const sortedFiscalYears = useMemo(() => {
    return [...fiscalYears].sort((a, b) => {
      const yearA = a.year || parseInt(a.name?.replace('Exercice ', ''));
      const yearB = b.year || parseInt(b.name?.replace('Exercice ', ''));
      return yearA - yearB;
    });
  }, [fiscalYears]);

  return (
    <div data-testid="fiscal-years-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Exercices fiscaux
          </h1>
          <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Gérez vos exercices fiscaux et leurs données
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm({ 
              year: availableYears.find(y => y.available)?.year || new Date().getFullYear(), 
              duplicateFrom: null, 
              duplicateActivities: false 
            });
            setCreateError('');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvel exercice
        </button>
      </div>

      {/* Fiscal Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedFiscalYears.map((fy, index) => (
          <motion.div
            key={fy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative p-5 rounded-2xl border transition-all ${
              currentFiscalYear?.id === fy.id
                ? isDark 
                  ? 'bg-blue-500/10 border-blue-500/50' 
                  : 'bg-blue-50 border-blue-200'
                : isDark 
                  ? 'bg-slate-800 border-slate-700 hover:border-slate-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Current badge */}
            {currentFiscalYear?.id === fy.id && (
              <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                Actif
              </div>
            )}

            {/* Header with menu */}
            <div className="flex items-start justify-between mb-3">
              <div 
                className="cursor-pointer flex-1"
                onClick={() => selectFiscalYear(fy)}
              >
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {fy.name}
                </h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatDate(fy.start_date)} → {formatDate(fy.end_date)}
                </p>
              </div>
              
              {/* Actions menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === fy.id ? null : fy.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <MoreVertical className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                </button>
                
                <AnimatePresence>
                  {openMenuId === fy.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`absolute right-0 top-full mt-1 w-48 rounded-xl shadow-lg border z-50 overflow-hidden ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                      }`}
                    >
                      {getAvailableActions(fy).map((action) => (
                        <button
                          key={action.key}
                          onClick={() => handleAction(fy, action.key)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            action.color === 'red'
                              ? 'text-red-500 hover:bg-red-500/10'
                              : action.color === 'green'
                              ? isDark ? 'text-green-400 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-50'
                              : action.color === 'orange'
                              ? isDark ? 'text-orange-400 hover:bg-orange-500/10' : 'text-orange-600 hover:bg-orange-50'
                              : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <action.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{action.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Status and stats */}
            <div className="flex items-center justify-between">
              {getStatusBadge(fy.status)}
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {getActivityCount(fy)} saisies
              </span>
            </div>

            {/* Summary if closed */}
            {fy.summary && (
              <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {(fy.summary.total_emissions_tco2e || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} tCO₂e
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {fiscalYears.length === 0 && (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Aucun exercice fiscal
          </h3>
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Créez votre premier exercice fiscal pour commencer
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          >
            Créer un exercice
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* ==================== CREATE MODAL ==================== */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Créer un exercice
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Year selector */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Année
                  </label>
                  <div className="relative">
                    <select
                      value={createForm.year}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className={`w-full px-4 py-3 pr-10 rounded-xl border appearance-none transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      {availableYears.map(({ year, available }) => (
                        <option 
                          key={year} 
                          value={year} 
                          disabled={!available}
                          className={!available ? 'text-gray-400' : ''}
                        >
                          {year} {!available ? '(déjà créé)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <p className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Période : 1er janvier {createForm.year} → 31 décembre {createForm.year}
                  </p>
                </div>

                {/* Duplicate option */}
                {fiscalYears.length > 0 && (
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.duplicateActivities}
                        onChange={(e) => setCreateForm(prev => ({ 
                          ...prev, 
                          duplicateActivities: e.target.checked,
                          duplicateFrom: e.target.checked ? (prev.duplicateFrom || fiscalYears[0]?.id) : null
                        }))}
                        className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Dupliquer les données depuis
                        </span>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          Copie toutes les activités d'un exercice existant
                        </p>
                      </div>
                    </label>

                    {createForm.duplicateActivities && (
                      <div className="mt-3">
                        <select
                          value={createForm.duplicateFrom || ''}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, duplicateFrom: e.target.value }))}
                          className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                            isDark 
                              ? 'bg-slate-600 border-slate-500 text-white' 
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        >
                          {sortedFiscalYears.map(fy => (
                            <option key={fy.id} value={fy.id}>
                              {fy.name} ({getActivityCount(fy)} saisies)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {createError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{createError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                    isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || existingYears.has(createForm.year)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Créer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CLOSE MODAL ==================== */}
      <AnimatePresence>
        {showCloseModal && selectedFY && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCloseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-green-500/20">
                    <Lock className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Clôturer {selectedFY.name} ?
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      L'exercice sera verrouillé après clôture
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    La clôture calcule le bilan final et verrouille les modifications. 
                    Vous pourrez rectifier l'exercice si nécessaire.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Clôturer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== RECTIFY MODAL ==================== */}
      <AnimatePresence>
        {showRectifyModal && selectedFY && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRectifyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-orange-500/20">
                    <Unlock className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rectifier {selectedFY.name} ?
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      L'exercice sera rouvert pour modifications
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Motif de rectification *
                  </label>
                  <textarea
                    value={rectifyReason}
                    onChange={(e) => setRectifyReason(e.target.value)}
                    placeholder="Ex: Correction des données de consommation électrique..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-orange-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowRectifyModal(false); setRectifyReason(''); }}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRectify}
                    disabled={loading || !rectifyReason.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    Rectifier
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DELETE MODAL ==================== */}
      <AnimatePresence>
        {showDeleteModal && selectedFY && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-full bg-red-500/20">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Supprimer {selectedFY.name} ?
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Cette action est irréversible
                    </p>
                  </div>
                </div>

                {/* Warning box with stats */}
                <div className={`p-4 rounded-xl mb-5 border-2 border-red-500/30 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                  <p className={`font-medium mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    Cette action supprimera définitivement :
                  </p>
                  <ul className={`space-y-1 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    <li>• <strong>{deleteStats?.activitiesCount || 0}</strong> activités saisies</li>
                    <li>• <strong>{((deleteStats?.totalEmissions || 0) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</strong> tCO₂e d'émissions</li>
                  </ul>
                </div>

                {/* Confirmation input */}
                <div className="mb-5">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Pour confirmer, tapez <strong className="text-red-500">"{selectedFY.name}"</strong>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={selectedFY.name}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-red-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                </div>

                {/* Error message */}
                {deleteError && (
                  <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-red-500/20 text-red-500">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{deleteError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                      isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading || deleteConfirmText !== selectedFY.name}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FiscalYears;
