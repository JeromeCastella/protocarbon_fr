import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

export const useProductVersions = (isOpen, productId) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultProfile, setDefaultProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    fiscal_year_id: '', manufacturing_emissions: 0, usage_emissions: 0, disposal_emissions: 0, change_reason: '',
  });
  const [expandedProfiles, setExpandedProfiles] = useState({});

  useEffect(() => {
    if (isOpen && productId) fetchData();
  }, [isOpen, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, fyRes] = await Promise.all([
        axios.get(`${API_URL}/api/products/${productId}/emission-profiles`),
        axios.get(`${API_URL}/api/fiscal-years`),
      ]);
      setDefaultProfile(profilesRes.data.default_profile);
      setProfiles(profilesRes.data.profiles || []);
      setFiscalYears(fyRes.data || []);
    } catch (error) { logger.error('Failed to fetch data:', error); }
    finally { setLoading(false); }
  };

  const handleCreateProfile = () => {
    const usedFyIds = profiles.map(p => p.fiscal_year_id);
    const available = fiscalYears.filter(fy => !usedFyIds.includes(fy.id));
    if (available.length === 0) { alert(t('products.versions.allFYHaveProfile')); return; }
    setFormData({
      fiscal_year_id: available[0]?.id || '',
      manufacturing_emissions: defaultProfile?.manufacturing_emissions || 0,
      usage_emissions: defaultProfile?.usage_emissions || 0,
      disposal_emissions: defaultProfile?.disposal_emissions || 0,
      change_reason: '',
    });
    setEditingProfile(null);
    setShowForm(true);
  };

  const handleEditProfile = (profile) => {
    setFormData({
      fiscal_year_id: profile.fiscal_year_id,
      manufacturing_emissions: profile.manufacturing_emissions,
      usage_emissions: profile.usage_emissions,
      disposal_emissions: profile.disposal_emissions,
      change_reason: profile.change_reason || '',
    });
    setEditingProfile(profile);
    setShowForm(true);
  };

  const handleEditDefault = () => {
    setFormData({
      fiscal_year_id: 'default',
      manufacturing_emissions: defaultProfile?.manufacturing_emissions || 0,
      usage_emissions: defaultProfile?.usage_emissions || 0,
      disposal_emissions: defaultProfile?.disposal_emissions || 0,
      change_reason: '',
    });
    setEditingProfile({ fiscal_year_id: 'default', is_default: true });
    setShowForm(true);
  };

  const handleSaveProfile = async (onProfileUpdated) => {
    setSaving(true);
    try {
      if (editingProfile) {
        await axios.put(`${API_URL}/api/products/${productId}/emission-profiles/${formData.fiscal_year_id}`, {
          manufacturing_emissions: formData.manufacturing_emissions,
          usage_emissions: formData.usage_emissions,
          disposal_emissions: formData.disposal_emissions,
          change_reason: formData.change_reason,
        });
      } else {
        await axios.post(`${API_URL}/api/products/${productId}/emission-profiles`, formData);
      }
      await fetchData();
      setShowForm(false);
      onProfileUpdated?.();
    } catch (error) {
      logger.error('Failed to save profile:', error);
      alert(error.response?.data?.detail || 'Error saving profile');
    } finally { setSaving(false); }
  };

  const handleDeleteProfile = async (fiscalYearId, onProfileUpdated) => {
    if (!confirm(t('products.versions.deleteProfileConfirm'))) return;
    try {
      await axios.delete(`${API_URL}/api/products/${productId}/emission-profiles/${fiscalYearId}`);
      await fetchData();
      onProfileUpdated?.();
    } catch (error) { logger.error('Failed to delete profile:', error); }
  };

  const toggleExpand = (id) => setExpandedProfiles(prev => ({ ...prev, [id]: !prev[id] }));

  const totalEmissions = formData.manufacturing_emissions + formData.usage_emissions + formData.disposal_emissions;
  const usedFyIds = profiles.map(p => p.fiscal_year_id);
  const availableFiscalYears = fiscalYears.filter(fy => !usedFyIds.includes(fy.id));

  return {
    isDark, t, language, loading, saving,
    defaultProfile, profiles, fiscalYears, showForm, setShowForm,
    editingProfile, formData, setFormData, expandedProfiles,
    handleCreateProfile, handleEditProfile, handleEditDefault,
    handleSaveProfile, handleDeleteProfile, toggleExpand,
    totalEmissions, availableFiscalYears,
  };
};
