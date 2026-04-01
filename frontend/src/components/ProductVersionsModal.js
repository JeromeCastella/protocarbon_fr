import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../utils/logger';
import { 
  X,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Factory,
  Leaf,
  Recycle,
  Check,
  History,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { API_URL } from '../utils/apiConfig';

/**
 * Modal pour gérer les versions des émissions d'un produit par exercice fiscal.
 * Permet de définir des profils d'émissions différents selon l'année.
 */
const ProductVersionsModal = ({ isOpen, onClose, productId, productName, onProfileUpdated }) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [defaultProfile, setDefaultProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  
  // Form state for new/edit profile
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    fiscal_year_id: '',
    manufacturing_emissions: 0,
    usage_emissions: 0,
    disposal_emissions: 0,
    change_reason: ''
  });
  
  // Expanded profiles
  const [expandedProfiles, setExpandedProfiles] = useState({});

  useEffect(() => {
    if (isOpen && productId) {
      fetchData();
    }
  }, [isOpen, productId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, fyRes] = await Promise.all([
        axios.get(`${API_URL}/api/products/${productId}/emission-profiles`),
        axios.get(`${API_URL}/api/fiscal-years`)
      ]);
      
      setDefaultProfile(profilesRes.data.default_profile);
      setProfiles(profilesRes.data.profiles || []);
      setFiscalYears(fyRes.data || []);
    } catch (error) {
      logger.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    // Find fiscal years that don't have a profile yet
    const usedFyIds = profiles.map(p => p.fiscal_year_id);
    const availableFys = fiscalYears.filter(fy => !usedFyIds.includes(fy.id));
    
    if (availableFys.length === 0) {
      alert(language === 'fr' 
        ? 'Tous les exercices fiscaux ont déjà un profil.' 
        : 'Alle Geschäftsjahre haben bereits ein Profil.');
      return;
    }
    
    setFormData({
      fiscal_year_id: availableFys[0]?.id || '',
      manufacturing_emissions: defaultProfile?.manufacturing_emissions || 0,
      usage_emissions: defaultProfile?.usage_emissions || 0,
      disposal_emissions: defaultProfile?.disposal_emissions || 0,
      change_reason: ''
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
      change_reason: profile.change_reason || ''
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
      change_reason: ''
    });
    setEditingProfile({ fiscal_year_id: 'default', is_default: true });
    setShowForm(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (editingProfile) {
        // Update existing profile
        await axios.put(
          `${API_URL}/api/products/${productId}/emission-profiles/${formData.fiscal_year_id}`,
          {
            manufacturing_emissions: formData.manufacturing_emissions,
            usage_emissions: formData.usage_emissions,
            disposal_emissions: formData.disposal_emissions,
            change_reason: formData.change_reason
          }
        );
      } else {
        // Create new profile
        await axios.post(
          `${API_URL}/api/products/${productId}/emission-profiles`,
          formData
        );
      }
      
      await fetchData();
      setShowForm(false);
      onProfileUpdated && onProfileUpdated();
    } catch (error) {
      logger.error('Failed to save profile:', error);
      alert(error.response?.data?.detail || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (fiscalYearId) => {
    if (!confirm(language === 'fr' 
      ? 'Supprimer ce profil ? Les ventes futures utiliseront les valeurs par défaut.'
      : 'Dieses Profil löschen? Zukünftige Verkäufe verwenden die Standardwerte.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/products/${productId}/emission-profiles/${fiscalYearId}`);
      await fetchData();
      onProfileUpdated && onProfileUpdated();
    } catch (error) {
      logger.error('Failed to delete profile:', error);
    }
  };

  const toggleExpand = (id) => {
    setExpandedProfiles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate total emissions for preview
  const totalEmissions = formData.manufacturing_emissions + formData.usage_emissions + formData.disposal_emissions;

  // Get available fiscal years for new profile
  const usedFyIds = profiles.map(p => p.fiscal_year_id);
  const availableFiscalYears = fiscalYears.filter(fy => !usedFyIds.includes(fy.id));

  if (!isOpen) return null;

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
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Versions du produit' : 'Produktversionen'}
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {productName}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : showForm ? (
            /* Profile Form */
            <div className="space-y-5">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
                <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>
                  {editingProfile?.is_default
                    ? (language === 'fr' 
                        ? 'Modifier les valeurs par défaut (utilisées quand aucun profil spécifique n\'existe)'
                        : 'Standardwerte bearbeiten (verwendet wenn kein spezifisches Profil existiert)')
                    : editingProfile
                      ? (language === 'fr' ? 'Modifier le profil existant' : 'Bestehendes Profil bearbeiten')
                      : (language === 'fr' ? 'Créer un nouveau profil pour un exercice spécifique' : 'Neues Profil für ein bestimmtes Geschäftsjahr erstellen')
                  }
                </p>
              </div>
              
              {/* Fiscal Year Selection (only for new non-default profiles) */}
              {!editingProfile && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {language === 'fr' ? 'Exercice fiscal' : 'Geschäftsjahr'} *
                  </label>
                  <select
                    value={formData.fiscal_year_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year_id: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    {availableFiscalYears.map(fy => (
                      <option key={fy.id} value={fy.id}>
                        {fy.name} ({fy.start_date} → {fy.end_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Emission Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Factory className="w-4 h-4 text-orange-500" />
                    {language === 'fr' ? 'Transformation' : 'Transformation'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.manufacturing_emissions === 0 ? '' : formData.manufacturing_emissions}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturing_emissions: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="0"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                      kgCO₂e
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Leaf className="w-4 h-4 text-green-500" />
                    {language === 'fr' ? 'Utilisation' : 'Nutzung'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.usage_emissions === 0 ? '' : formData.usage_emissions}
                      onChange={(e) => setFormData(prev => ({ ...prev, usage_emissions: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="0"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                      kgCO₂e
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <Recycle className="w-4 h-4 text-blue-500" />
                    {language === 'fr' ? 'Fin de vie' : 'Lebensende'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.disposal_emissions === 0 ? '' : formData.disposal_emissions}
                      onChange={(e) => setFormData(prev => ({ ...prev, disposal_emissions: parseFloat(e.target.value) || 0 }))}
                      className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="0"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                      kgCO₂e
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Total Preview */}
              <div className={`p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white`}>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">{language === 'fr' ? 'Total par unité' : 'Gesamt pro Einheit'}</span>
                  <span className="text-xl font-bold">{totalEmissions.toFixed(2)} kgCO₂e</span>
                </div>
              </div>
              
              {/* Change Reason */}
              {!editingProfile?.is_default && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {language === 'fr' ? 'Raison du changement' : 'Änderungsgrund'}
                  </label>
                  <input
                    type="text"
                    value={formData.change_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, change_reason: e.target.value }))}
                    placeholder={language === 'fr' ? 'Ex: Nouveau fournisseur, optimisation process...' : 'z.B.: Neuer Lieferant, Prozessoptimierung...'}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 placeholder:text-gray-400'}`}
                  />
                </div>
              )}
              
              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  {language === 'fr' ? 'Annuler' : 'Abbrechen'}
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || (!editingProfile && !formData.fiscal_year_id)}
                  className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {language === 'fr' ? 'Enregistrer' : 'Speichern'}
                </button>
              </div>
            </div>
          ) : (
            /* Profiles List */
            <div className="space-y-4">
              {/* Info */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                  {language === 'fr' 
                    ? 'Les profils permettent de définir des émissions différentes selon l\'exercice fiscal. Les ventes utiliseront automatiquement le profil correspondant.'
                    : 'Profile ermöglichen unterschiedliche Emissionen je nach Geschäftsjahr. Verkäufe verwenden automatisch das entsprechende Profil.'
                  }
                </p>
              </div>
              
              {/* Default Profile */}
              {defaultProfile && (
                <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700'}`}>
                        {language === 'fr' ? 'PAR DÉFAUT' : 'STANDARD'}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'fr' ? 'Utilisé si aucun profil spécifique' : 'Verwendet wenn kein spezifisches Profil'}
                      </span>
                    </div>
                    <button
                      onClick={handleEditDefault}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                      <span className="text-orange-500 font-medium">{defaultProfile.manufacturing_emissions} kgCO₂e</span>
                      <p className={`text-xs ${isDark ? 'text-orange-300/70' : 'text-orange-600/70'}`}>Transformation</p>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                      <span className="text-green-500 font-medium">{defaultProfile.usage_emissions} kgCO₂e</span>
                      <p className={`text-xs ${isDark ? 'text-green-300/70' : 'text-green-600/70'}`}>{language === 'fr' ? 'Utilisation' : 'Nutzung'}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                      <span className="text-blue-500 font-medium">{defaultProfile.disposal_emissions} kgCO₂e</span>
                      <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-blue-600/70'}`}>{language === 'fr' ? 'Fin de vie' : 'Lebensende'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Custom Profiles */}
              {profiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {language === 'fr' ? 'Profils par exercice' : 'Profile nach Geschäftsjahr'}
                  </h3>
                  
                  {profiles.map((profile) => (
                    <div 
                      key={profile.fiscal_year_id}
                      className={`rounded-xl border ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-white'}`}
                    >
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(profile.fiscal_year_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-purple-500" />
                          <div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {profile.fiscal_year_name}
                            </span>
                            {profile.change_reason && (
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {profile.change_reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                            {(profile.manufacturing_emissions + profile.usage_emissions + profile.disposal_emissions).toFixed(2)} kgCO₂e
                          </span>
                          {expandedProfiles[profile.fiscal_year_id] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedProfiles[profile.fiscal_year_id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`px-4 pb-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-100'}`}>
                              <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/20' : 'bg-orange-50'}`}>
                                  <span className="text-orange-500 font-medium">{profile.manufacturing_emissions} kgCO₂e</span>
                                  <p className={`text-xs ${isDark ? 'text-orange-300/70' : 'text-orange-600/70'}`}>Transformation</p>
                                </div>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                                  <span className="text-green-500 font-medium">{profile.usage_emissions} kgCO₂e</span>
                                  <p className={`text-xs ${isDark ? 'text-green-300/70' : 'text-green-600/70'}`}>{language === 'fr' ? 'Utilisation' : 'Nutzung'}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                                  <span className="text-blue-500 font-medium">{profile.disposal_emissions} kgCO₂e</span>
                                  <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-blue-600/70'}`}>{language === 'fr' ? 'Fin de vie' : 'Lebensende'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditProfile(profile); }}
                                  className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
                                    isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                  {language === 'fr' ? 'Modifier' : 'Bearbeiten'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.fiscal_year_id); }}
                                  className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${
                                    isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Profile Button */}
              {availableFiscalYears.length > 0 && (
                <button
                  onClick={handleCreateProfile}
                  className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                    isDark 
                      ? 'border-slate-600 hover:border-purple-500 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400' 
                      : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-500 hover:text-purple-600'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  {language === 'fr' ? 'Ajouter un profil pour un exercice' : 'Profil für ein Geschäftsjahr hinzufügen'}
                </button>
              )}
              
              {/* No more fiscal years available */}
              {availableFiscalYears.length === 0 && profiles.length > 0 && (
                <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    {language === 'fr' 
                      ? 'Tous les exercices fiscaux ont déjà un profil défini.'
                      : 'Alle Geschäftsjahre haben bereits ein definiertes Profil.'
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductVersionsModal;
