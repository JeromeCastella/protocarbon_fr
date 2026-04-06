import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFiscalYear } from '../context/FiscalYearContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';
import { Lock, Unlock, Copy, Trash2 } from 'lucide-react';

const MIN_YEAR = 2020;
const YEARS_AHEAD = 10;

export const useFiscalYearsPage = () => {
  const { t } = useLanguage();
  const {
    fiscalYears, currentFiscalYear, selectFiscalYear,
    createFiscalYear, closeFiscalYear, rectifyFiscalYear,
    duplicateToNewYear, refreshFiscalYears,
  } = useFiscalYear();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRectifyModal, setShowRectifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFY, setSelectedFY] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [createForm, setCreateForm] = useState({
    year: new Date().getFullYear() + 1, duplicateFrom: null,
    duplicateActivities: false, isScenario: false,
    selectedScenarioId: '', newScenarioName: '',
  });
  const [createError, setCreateError] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [rectifyReason, setRectifyReason] = useState('');
  const [deleteStats, setDeleteStats] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const fetchScenarios = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/scenarios`);
      setScenarios(res.data || []);
    } catch (e) {
      logger.error('Failed to fetch scenarios:', e);
    }
  }, []);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  const existingYears = useMemo(
    () => new Set(fiscalYears.filter(fy => fy.type !== 'scenario').map(fy => fy.year || parseInt(fy.name?.replace('Exercice ', '')))),
    [fiscalYears],
  );

  const availableYears = useMemo(() => {
    const maxYear = new Date().getFullYear() + YEARS_AHEAD;
    const years = [];
    for (let y = MIN_YEAR; y <= maxYear; y++) years.push({ year: y, available: !existingYears.has(y) });
    return years;
  }, [existingYears]);

  const scenarioTakenYears = useMemo(() => {
    if (!createForm.isScenario || !createForm.selectedScenarioId || createForm.selectedScenarioId === 'new') return new Set();
    return new Set(fiscalYears.filter(fy => fy.type === 'scenario' && fy.scenario_id === createForm.selectedScenarioId).map(fy => fy.year));
  }, [fiscalYears, createForm.isScenario, createForm.selectedScenarioId]);

  useEffect(() => {
    if (createForm.isScenario && createForm.selectedScenarioId && createForm.selectedScenarioId !== 'new') {
      if (scenarioTakenYears.has(createForm.year)) {
        const firstFree = availableYears.find(y => !scenarioTakenYears.has(y.year));
        if (firstFree) setCreateForm(prev => ({ ...prev, year: firstFree.year }));
      }
    }
  }, [createForm.selectedScenarioId, scenarioTakenYears]);

  useEffect(() => {
    const first = availableYears.find(y => y.available);
    if (first && showCreateModal) setCreateForm(prev => ({ ...prev, year: first.year }));
  }, [availableYears, showCreateModal]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getActivityCount = (fy) => fy.activities_count || 0;

  const handleCreate = async () => {
    if (!createForm.year) return;
    if (createForm.isScenario) {
      if (createForm.selectedScenarioId === '') { setCreateError(t('fiscalYears.errors.selectOrCreateScenario')); return; }
      if (createForm.selectedScenarioId === 'new' && !createForm.newScenarioName.trim()) { setCreateError(t('fiscalYears.errors.scenarioNameRequired')); return; }
    }
    if (!createForm.isScenario && existingYears.has(createForm.year)) { setCreateError(t('fiscalYears.errors.yearAlreadyExists').replace('{year}', createForm.year)); return; }

    setLoading(true);
    setCreateError('');
    try {
      if (createForm.duplicateFrom) {
        let scenarioId = null;
        if (createForm.isScenario) {
          if (createForm.selectedScenarioId === 'new') {
            const res = await axios.post(`${API_URL}/api/scenarios`, { name: createForm.newScenarioName.trim() });
            scenarioId = res.data.id;
            await fetchScenarios();
          } else { scenarioId = createForm.selectedScenarioId; }
        }
        await duplicateToNewYear(createForm.duplicateFrom, {
          new_year: createForm.year, duplicate_activities: createForm.duplicateActivities,
          activity_ids_to_duplicate: [], is_scenario: createForm.isScenario,
          scenario_id: scenarioId || undefined,
        });
      } else if (!createForm.isScenario) {
        await createFiscalYear({ year: createForm.year });
      } else {
        setCreateError(t('fiscalYears.errors.scenarioNeedBase'));
        setLoading(false);
        return;
      }
      setShowCreateModal(false);
      setCreateForm({ year: new Date().getFullYear() + 1, duplicateFrom: null, duplicateActivities: false, isScenario: false, selectedScenarioId: '', newScenarioName: '' });
    } catch (error) {
      logger.error('Failed to create fiscal year:', error);
      setCreateError(error.response?.data?.detail || t('fiscalYears.errors.createError'));
    } finally { setLoading(false); }
  };

  const handleClose = async () => {
    if (!selectedFY) return;
    setLoading(true);
    try { await closeFiscalYear(selectedFY.id); setShowCloseModal(false); setSelectedFY(null); }
    catch (error) { logger.error('Failed to close fiscal year:', error); alert(error.response?.data?.detail || t('fiscalYears.errors.closeError')); }
    finally { setLoading(false); }
  };

  const handleRectify = async () => {
    if (!selectedFY || !rectifyReason) return;
    setLoading(true);
    try { await rectifyFiscalYear(selectedFY.id, rectifyReason); setShowRectifyModal(false); setSelectedFY(null); setRectifyReason(''); }
    catch (error) { logger.error('Failed to rectify:', error); alert(error.response?.data?.detail || t('fiscalYears.errors.rectifyError')); }
    finally { setLoading(false); }
  };

  const openDeleteModal = async (fy) => {
    setSelectedFY(fy); setDeleteConfirmText(''); setDeleteError(''); setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/summary?fiscal_year_id=${fy.id}`);
      setDeleteStats({ activitiesCount: response.data?.activities_count || 0, totalEmissions: response.data?.total_emissions || 0 });
    } catch { setDeleteStats({ activitiesCount: 0, totalEmissions: 0 }); }
    finally { setLoading(false); setShowDeleteModal(true); }
  };

  const handleDelete = async () => {
    if (!selectedFY || deleteConfirmText !== selectedFY.name) return;
    setLoading(true); setDeleteError('');
    try {
      await axios.delete(`${API_URL}/api/fiscal-years/${selectedFY.id}`);
      await refreshFiscalYears();
      setShowDeleteModal(false); setSelectedFY(null); setDeleteStats(null); setDeleteConfirmText('');
    } catch (error) {
      logger.error('Failed to delete:', error);
      setDeleteError(error.response?.data?.detail || t('fiscalYears.errors.deleteError'));
    } finally { setLoading(false); }
  };

  const getAvailableActions = (fy) => {
    const actions = [];
    if (fy.status === 'draft') actions.push({ key: 'close', label: t('fiscalYears.actions.close'), icon: Lock, color: 'green' });
    if (fy.status === 'closed') actions.push({ key: 'rectify', label: t('fiscalYears.actions.rectify'), icon: Unlock, color: 'orange' });
    if (fy.status === 'rectified') actions.push({ key: 'close', label: t('fiscalYears.actions.reclose'), icon: Lock, color: 'green' });
    actions.push({ key: 'duplicate', label: t('fiscalYears.actions.duplicateTo'), icon: Copy, color: 'blue' });
    actions.push({ key: 'delete', label: t('fiscalYears.actions.delete'), icon: Trash2, color: 'red' });
    return actions;
  };

  const handleAction = (fy, action) => {
    setOpenMenuId(null); setSelectedFY(fy);
    switch (action) {
      case 'close': setShowCloseModal(true); break;
      case 'rectify': setShowRectifyModal(true); break;
      case 'duplicate': {
        const nextYear = (fy.year || parseInt(fy.name?.replace('Exercice ', ''))) + 1;
        const targetYear = availableYears.find(y => y.year >= nextYear && y.available)?.year || nextYear;
        setCreateForm({ year: targetYear, duplicateFrom: fy.id, duplicateActivities: true, isScenario: false, scenarioName: '' });
        setShowCreateModal(true);
        break;
      }
      case 'delete': openDeleteModal(fy); break;
      default: break;
    }
  };

  const sortedFiscalYears = useMemo(() => {
    return [...fiscalYears].sort((a, b) => {
      const yearA = a.year || parseInt(a.name?.replace('Exercice ', ''));
      const yearB = b.year || parseInt(b.name?.replace('Exercice ', ''));
      if (yearA !== yearB) return yearA - yearB;
      return (a.type === 'scenario' ? 1 : 0) - (b.type === 'scenario' ? 1 : 0);
    });
  }, [fiscalYears]);

  return {
    t, fiscalYears, currentFiscalYear, selectFiscalYear,
    showCreateModal, setShowCreateModal, showCloseModal, setShowCloseModal,
    showRectifyModal, setShowRectifyModal, showDeleteModal, setShowDeleteModal,
    selectedFY, loading, openMenuId, setOpenMenuId,
    createForm, setCreateForm, createError, setCreateError, scenarios,
    rectifyReason, setRectifyReason, deleteStats, deleteConfirmText,
    setDeleteConfirmText, deleteError,
    existingYears, availableYears, scenarioTakenYears,
    formatDate, getActivityCount, getAvailableActions,
    handleCreate, handleClose, handleRectify, handleDelete, handleAction,
    sortedFiscalYears,
  };
};
