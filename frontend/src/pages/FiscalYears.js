import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  FileText,
  ArrowRight,
  Info
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Months for display
const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' }
];

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
    getActivitiesForDuplication,
    refreshFiscalYears
  } = useFiscalYear();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRectifyModal, setShowRectifyModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedFY, setSelectedFY] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Company fiscal year settings
  const [companySettings, setCompanySettings] = useState({
    fiscal_year_start_month: 1,
    fiscal_year_start_day: 1
  });
  
  // Fetch company settings on mount
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/companies`);
        if (response.data) {
          setCompanySettings({
            fiscal_year_start_month: response.data.fiscal_year_start_month || 1,
            fiscal_year_start_day: response.data.fiscal_year_start_day || 1
          });
        }
      } catch (error) {
        console.error('Failed to fetch company settings:', error);
      }
    };
    fetchCompanySettings();
  }, []);
  
  // Form states - simplified to just year
  const [createForm, setCreateForm] = useState({
    year: new Date().getFullYear()
  });
  const [createError, setCreateError] = useState('');
  const [rectifyReason, setRectifyReason] = useState('');
  const [duplicateForm, setDuplicateForm] = useState({
    new_name: '',
    new_start_date: '',
    new_end_date: '',
    duplicate_activities: false,
    selected_activity_ids: []
  });
  const [activitiesForDuplication, setActivitiesForDuplication] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Calculate fiscal year dates based on company settings and selected year
  const calculateFiscalYearDates = (year) => {
    const startMonth = companySettings.fiscal_year_start_month;
    const startDay = companySettings.fiscal_year_start_day;
    
    // Start date in the selected year
    const startDate = new Date(year, startMonth - 1, startDay);
    
    // End date is the day before start date of next year
    let endDate;
    if (startMonth === 1 && startDay === 1) {
      // Calendar year: Jan 1 to Dec 31
      endDate = new Date(year, 11, 31);
    } else {
      // Fiscal year spans two calendar years
      endDate = new Date(year + 1, startMonth - 1, startDay);
      endDate.setDate(endDate.getDate() - 1);
    }
    
    // Format as ISO date strings (YYYY-MM-DD)
    const formatISO = (d) => d.toISOString().split('T')[0];
    
    return {
      start_date: formatISO(startDate),
      end_date: formatISO(endDate)
    };
  };

  // Get preview of fiscal year dates
  const getFiscalYearPreview = (year) => {
    const dates = calculateFiscalYearDates(year);
    const startDate = new Date(dates.start_date);
    const endDate = new Date(dates.end_date);
    
    const startMonthName = MONTHS.find(m => m.value === (startDate.getMonth() + 1))?.label;
    const endMonthName = MONTHS.find(m => m.value === (endDate.getMonth() + 1))?.label;
    
    return {
      start: `${startDate.getDate()} ${startMonthName} ${startDate.getFullYear()}`,
      end: `${endDate.getDate()} ${endMonthName} ${endDate.getFullYear()}`
    };
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

  const handleCreate = async () => {
    if (!createForm.year) return;
    setLoading(true);
    try {
      // Calculate dates based on company settings
      const dates = calculateFiscalYearDates(createForm.year);
      
      await createFiscalYear({
        name: `Exercice ${createForm.year}`,
        start_date: dates.start_date,
        end_date: dates.end_date
      });
      setShowCreateModal(false);
      setCreateForm({ year: new Date().getFullYear() });
    } catch (error) {
      console.error('Failed to create fiscal year:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

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

  const openDuplicateModal = async (fy) => {
    setSelectedFY(fy);
    setLoading(true);
    try {
      const activities = await getActivitiesForDuplication(fy.id);
      setActivitiesForDuplication(activities);
      
      // Pre-fill with next year dates
      const startDate = new Date(fy.start_date);
      const endDate = new Date(fy.end_date);
      startDate.setFullYear(startDate.getFullYear() + 1);
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      const yearNum = startDate.getFullYear();
      setDuplicateForm({
        new_name: `Exercice ${yearNum}`,
        new_start_date: startDate.toISOString().split('T')[0],
        new_end_date: endDate.toISOString().split('T')[0],
        duplicate_activities: false,
        selected_activity_ids: []
      });
      
      setShowDuplicateModal(true);
    } catch (error) {
      console.error('Failed to get activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedFY || !duplicateForm.new_name || !duplicateForm.new_start_date || !duplicateForm.new_end_date) return;
    setLoading(true);
    try {
      await duplicateToNewYear(selectedFY.id, {
        new_name: duplicateForm.new_name,
        new_start_date: duplicateForm.new_start_date,
        new_end_date: duplicateForm.new_end_date,
        duplicate_activities: duplicateForm.duplicate_activities,
        activity_ids_to_duplicate: duplicateForm.selected_activity_ids
      });
      setShowDuplicateModal(false);
      setSelectedFY(null);
      setActivitiesForDuplication(null);
    } catch (error) {
      console.error('Failed to duplicate:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la duplication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="fiscal-years-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Exercices Fiscaux
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Gérez vos périodes de bilan carbone
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          data-testid="create-fiscal-year-btn"
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5" />
          Nouvel exercice
        </button>
      </div>

      {/* Fiscal Years List */}
      {fiscalYears.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <Calendar className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Aucun exercice fiscal créé
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Créez votre premier exercice pour commencer à suivre vos émissions par période.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
          >
            <Plus className="w-5 h-5" />
            Créer un exercice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {fiscalYears.map((fy, index) => (
            <motion.div
              key={fy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'} ${
                currentFiscalYear?.id === fy.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      fy.status === 'closed' 
                        ? 'bg-green-500/20' 
                        : fy.status === 'rectified'
                          ? 'bg-orange-500/20'
                          : 'bg-blue-500/20'
                    }`}>
                      <Calendar className={`w-7 h-7 ${
                        fy.status === 'closed' 
                          ? 'text-green-500' 
                          : fy.status === 'rectified'
                            ? 'text-orange-500'
                            : 'text-blue-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fy.name}
                        </h3>
                        {getStatusBadge(fy.status)}
                        {currentFiscalYear?.id === fy.id && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs">
                            Actuel
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {formatDate(fy.start_date)} → {formatDate(fy.end_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fy.status === 'draft' || fy.status === 'rectified' ? (
                      <>
                        <button
                          onClick={() => selectFiscalYear(fy)}
                          className={`px-4 py-2 rounded-xl transition-all ${
                            isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                          } ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          Sélectionner
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFY(fy);
                            setShowCloseModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
                        >
                          <Lock className="w-4 h-4" />
                          Clôturer
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedFY(fy);
                            setShowRectifyModal(true);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                            isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                          }`}
                        >
                          <Unlock className="w-4 h-4" />
                          Rectifier
                        </button>
                        <button
                          onClick={() => openDuplicateModal(fy)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"
                        >
                          <Copy className="w-4 h-4" />
                          Nouvel exercice
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Summary if closed */}
                {fy.status === 'closed' && fy.summary && (
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    <div className="grid grid-cols-4 gap-4">
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total émissions</p>
                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fy.summary.total_emissions_tco2e?.toLocaleString()} tCO₂e
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 1</p>
                        <p className="text-lg font-bold text-blue-500">
                          {(fy.summary.by_scope?.scope1 || 0).toLocaleString()} tCO₂e
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 2</p>
                        <p className="text-lg font-bold text-cyan-500">
                          {(fy.summary.by_scope?.scope2 || 0).toLocaleString()} tCO₂e
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Activités</p>
                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fy.summary.activities_count}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Rectifications history */}
                {fy.rectifications && fy.rectifications.length > 0 && (
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Historique des rectifications
                    </p>
                    <div className="space-y-2">
                      {fy.rectifications.map((rect, i) => (
                        <div key={i} className={`text-sm p-2 rounded-lg ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                          <span className={isDark ? 'text-orange-300' : 'text-orange-700'}>
                            {new Date(rect.reopened_at).toLocaleDateString('fr-FR')} : {rect.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Modal onClose={() => setShowCreateModal(false)} title="Créer un exercice fiscal">
            <div className="space-y-4">
              {/* Info about fiscal year configuration */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Les dates sont calculées automatiquement selon la configuration de votre entreprise 
                      ({companySettings.fiscal_year_start_day} {MONTHS.find(m => m.value === companySettings.fiscal_year_start_month)?.label}).
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Year selector */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Année de l&apos;exercice
                </label>
                <select
                  value={createForm.year}
                  onChange={(e) => setCreateForm({ year: parseInt(e.target.value) })}
                  data-testid="fiscal-year-select"
                  className={`w-full px-4 py-3 rounded-xl border text-lg font-medium ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                  }`}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {/* Preview of dates */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                <p className={`font-medium mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  Exercice {createForm.year}
                </p>
                <p className={`text-sm ${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
                  Du {getFiscalYearPreview(createForm.year).start} au {getFiscalYearPreview(createForm.year).end}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  data-testid="confirm-create-fiscal-year-btn"
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Close Confirmation Modal */}
      <AnimatePresence>
        {showCloseModal && selectedFY && (
          <Modal onClose={() => setShowCloseModal(false)} title="Clôturer l'exercice">
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className={`font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                      Êtes-vous sûr de vouloir clôturer cet exercice ?
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-yellow-300/70' : 'text-yellow-600'}`}>
                      Les données seront verrouillées. Vous pourrez rectifier l&apos;exercice ultérieurement si nécessaire.
                    </p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedFY.name}
                </p>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatDate(selectedFY.start_date)} → {formatDate(selectedFY.end_date)}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Clôture...' : 'Confirmer la clôture'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Rectify Modal */}
      <AnimatePresence>
        {showRectifyModal && selectedFY && (
          <Modal onClose={() => setShowRectifyModal(false)} title="Rectifier l'exercice">
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <p className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                    Cette action réouvrira l&apos;exercice clôturé pour permettre des modifications.
                    Une justification est requise pour la traçabilité.
                  </p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Justification de la rectification *
                </label>
                <textarea
                  value={rectifyReason}
                  onChange={(e) => setRectifyReason(e.target.value)}
                  placeholder="Ex: Correction d'une erreur de saisie sur les consommations électriques..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Minimum 10 caractères requis
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRectifyModal(false);
                    setRectifyReason('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleRectify}
                  disabled={loading || rectifyReason.length < 10}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {loading ? 'Traitement...' : 'Rectifier'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Duplicate Modal */}
      <AnimatePresence>
        {showDuplicateModal && selectedFY && (
          <Modal onClose={() => setShowDuplicateModal(false)} title="Créer un nouvel exercice">
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Les fiches produits seront automatiquement reprises. 
                  Vous pouvez également choisir de dupliquer certaines activités.
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Nom du nouvel exercice
                </label>
                <input
                  type="text"
                  value={duplicateForm.new_name}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, new_name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={duplicateForm.new_start_date}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, new_start_date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={duplicateForm.new_end_date}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, new_end_date: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
              </div>

              {/* Activities duplication option */}
              {activitiesForDuplication && activitiesForDuplication.total_activities > 0 && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duplicateForm.duplicate_activities}
                      onChange={(e) => setDuplicateForm({ 
                        ...duplicateForm, 
                        duplicate_activities: e.target.checked,
                        selected_activity_ids: []
                      })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Dupliquer toutes les activités
                      </p>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {activitiesForDuplication.total_activities} activités disponibles
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setActivitiesForDuplication(null);
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={loading || !duplicateForm.new_name || !duplicateForm.new_start_date || !duplicateForm.new_end_date}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  {loading ? 'Création...' : 'Créer le nouvel exercice'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal component
const Modal = ({ children, onClose, title }) => {
  const { isDark } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
      >
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FiscalYears;
