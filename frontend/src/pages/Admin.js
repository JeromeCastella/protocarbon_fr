import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Shield, 
  Users, 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Upload,
  Search,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const Admin = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('factors');
  const [loading, setLoading] = useState(true);
  
  // Emission factors state
  const [factors, setFactors] = useState([]);
  const [factorSearch, setFactorSearch] = useState('');
  const [showFactorModal, setShowFactorModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState(null);
  const [factorForm, setFactorForm] = useState({
    name: '',
    category: '',
    scope: 'scope1',
    value: '',
    unit: '',
    source: 'OFEV',
    tags: '',
    region: 'Suisse'
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  
  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importReplaceAll, setImportReplaceAll] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [factorsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/emission-factors`),
        axios.get(`${API_URL}/api/admin/users`)
      ]);
      setFactors(factorsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categories for dropdown
  const categories = [
    { value: 'combustion_mobile', label: 'Combustion mobile' },
    { value: 'combustion_fixe', label: 'Combustion fixe' },
    { value: 'procedes', label: 'Procédés industriels' },
    { value: 'fugitives', label: 'Émissions fugitives' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'chaleur_vapeur', label: 'Chaleur / Vapeur' },
    { value: 'deplacements_professionnels', label: 'Déplacements professionnels' },
    { value: 'deplacements_domicile_travail', label: 'Déplacements domicile-travail' },
    { value: 'biens_services_achetes', label: 'Biens et services achetés' },
    { value: 'biens_equipement', label: 'Biens d\'équipement' },
    { value: 'dechets_operations', label: 'Déchets des opérations' },
    { value: 'transport_amont', label: 'Transport amont' },
    { value: 'transport_aval', label: 'Transport aval' },
    { value: 'utilisation_produits', label: 'Utilisation des produits' },
    { value: 'fin_vie_produits', label: 'Fin de vie des produits' },
    { value: 'materiaux', label: 'Matériaux' },
    { value: 'refrigerants', label: 'Réfrigérants' }
  ];

  const scopes = [
    { value: 'scope1', label: 'Scope 1' },
    { value: 'scope2', label: 'Scope 2' },
    { value: 'scope3_amont', label: 'Scope 3 Amont' },
    { value: 'scope3_aval', label: 'Scope 3 Aval' }
  ];

  // Factor CRUD
  const handleSaveFactor = async () => {
    try {
      const factorData = {
        ...factorForm,
        value: parseFloat(factorForm.value),
        tags: factorForm.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (editingFactor) {
        await axios.put(`${API_URL}/api/admin/emission-factors/${editingFactor.id}`, factorData);
      } else {
        await axios.post(`${API_URL}/api/admin/emission-factors`, factorData);
      }
      
      setShowFactorModal(false);
      setEditingFactor(null);
      resetFactorForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save factor:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEditFactor = (factor) => {
    setEditingFactor(factor);
    setFactorForm({
      name: factor.name || '',
      category: factor.category || '',
      scope: factor.scope || 'scope1',
      value: factor.value?.toString() || '',
      unit: factor.unit || '',
      source: factor.source || 'OFEV',
      tags: factor.tags?.join(', ') || '',
      region: factor.region || 'Suisse'
    });
    setShowFactorModal(true);
  };

  const handleDeleteFactor = async (factorId) => {
    if (!window.confirm('Supprimer ce facteur d\'émission ?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/emission-factors/${factorId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete factor:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetFactorForm = () => {
    setFactorForm({
      name: '',
      category: '',
      scope: 'scope1',
      value: '',
      unit: '',
      source: 'OFEV',
      tags: '',
      region: 'Suisse'
    });
  };

  // User role management
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (userId === user?.id && newRole === 'user') {
      if (!window.confirm('Vous allez retirer vos droits admin. Continuer ?')) return;
    }
    
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/role`, { role: newRole });
      fetchData();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  // Export
  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/emission-factors/export`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emission_factors_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  // Import
  const handleImport = async () => {
    try {
      const data = JSON.parse(importData);
      await axios.post(`${API_URL}/api/admin/emission-factors/import`, {
        factors: data.factors || data,
        replace_all: importReplaceAll
      });
      setShowImportModal(false);
      setImportData('');
      fetchData();
      alert('Import réussi !');
    } catch (error) {
      console.error('Failed to import:', error);
      alert('Erreur lors de l\'import. Vérifiez le format JSON.');
    }
  };

  // Filter factors
  const filteredFactors = factors.filter(f => 
    f.name?.toLowerCase().includes(factorSearch.toLowerCase()) ||
    f.category?.toLowerCase().includes(factorSearch.toLowerCase()) ||
    f.tags?.some(t => t.toLowerCase().includes(factorSearch.toLowerCase()))
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-center p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Accès refusé
          </h2>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Shield className="w-8 h-8 text-blue-500" />
            Administration
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Gérez les facteurs d&apos;émission et les utilisateurs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'factors'
              ? 'bg-blue-500 text-white'
              : isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Facteurs d&apos;émission ({factors.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-blue-500 text-white'
              : isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Utilisateurs ({users.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Factors Tab */}
          {activeTab === 'factors' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Actions bar */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={factorSearch}
                      onChange={(e) => setFactorSearch(e.target.value)}
                      placeholder="Rechercher un facteur..."
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>
                <button
                  onClick={() => { resetFactorForm(); setEditingFactor(null); setShowFactorModal(true); }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
                <button
                  onClick={handleExport}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
                    isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 ${
                    isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Importer
                </button>
              </div>

              {/* Factors table */}
              <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Nom</th>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Catégorie</th>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Scope</th>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Valeur</th>
                        <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Source</th>
                        <th className={`px-4 py-3 text-right text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFactors.map((factor, index) => (
                        <tr 
                          key={factor.id} 
                          className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} ${
                            index % 2 === 0 ? '' : isDark ? 'bg-slate-700/30' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span className="font-medium">{factor.name}</span>
                          </td>
                          <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            <span className="text-sm">{categories.find(c => c.value === factor.category)?.label || factor.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                              factor.scope === 'scope1' ? 'bg-blue-500' :
                              factor.scope === 'scope2' ? 'bg-cyan-500' :
                              factor.scope === 'scope3_amont' ? 'bg-purple-500' : 'bg-indigo-500'
                            }`}>
                              {scopes.find(s => s.value === factor.scope)?.label || factor.scope}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            <span className="font-mono">{factor.value} {factor.unit}</span>
                          </td>
                          <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                            <span className="text-sm">{factor.source}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleEditFactor(factor)}
                              className={`p-2 rounded-lg mr-2 ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                            >
                              <Edit2 className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteFactor(factor.id)}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredFactors.length === 0 && (
                  <div className="p-8 text-center">
                    <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                      Aucun facteur trouvé
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Email</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Nom</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Rôle</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Créé le</th>
                      <th className={`px-4 py-3 text-right text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, index) => (
                      <tr 
                        key={u.id} 
                        className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'} ${
                          index % 2 === 0 ? '' : isDark ? 'bg-slate-700/30' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <span className="font-medium">{u.email}</span>
                          {u.id === user?.id && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                              Vous
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {u.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            u.role === 'admin' 
                              ? 'bg-amber-100 text-amber-700' 
                              : isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          <span className="text-sm">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              u.role === 'admin'
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                          >
                            {u.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Factor Modal */}
      <AnimatePresence>
        {showFactorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFactorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${
                isDark ? 'bg-slate-800' : 'bg-white'
              }`}
            >
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingFactor ? 'Modifier le facteur' : 'Nouveau facteur d\'émission'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={factorForm.name}
                    onChange={(e) => setFactorForm({ ...factorForm, name: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                    }`}
                    placeholder="Ex: Gaz naturel - Chauffage"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Catégorie *
                    </label>
                    <select
                      value={factorForm.category}
                      onChange={(e) => setFactorForm({ ...factorForm, category: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                    >
                      <option value="">Sélectionner...</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Scope *
                    </label>
                    <select
                      value={factorForm.scope}
                      onChange={(e) => setFactorForm({ ...factorForm, scope: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                    >
                      {scopes.map(scope => (
                        <option key={scope.value} value={scope.value}>{scope.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Valeur *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={factorForm.value}
                      onChange={(e) => setFactorForm({ ...factorForm, value: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                      placeholder="Ex: 2.04"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Unité *
                    </label>
                    <input
                      type="text"
                      value={factorForm.unit}
                      onChange={(e) => setFactorForm({ ...factorForm, unit: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                      placeholder="Ex: kgCO2e/m³"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Source
                    </label>
                    <input
                      type="text"
                      value={factorForm.source}
                      onChange={(e) => setFactorForm({ ...factorForm, source: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                      placeholder="Ex: OFEV"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Région
                    </label>
                    <input
                      type="text"
                      value={factorForm.region}
                      onChange={(e) => setFactorForm({ ...factorForm, region: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                      }`}
                      placeholder="Ex: Suisse"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={factorForm.tags}
                    onChange={(e) => setFactorForm({ ...factorForm, tags: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                    }`}
                    placeholder="Ex: gaz, chauffage, combustible"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFactorModal(false)}
                  className={`flex-1 px-4 py-2 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveFactor}
                  disabled={!factorForm.name || !factorForm.category || !factorForm.value || !factorForm.unit}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
                >
                  {editingFactor ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Importer des facteurs
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Données JSON
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className={`w-full px-4 py-2 rounded-xl border font-mono text-sm ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                    }`}
                    placeholder='{"factors": [...]}'
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importReplaceAll}
                    onChange={(e) => setImportReplaceAll(e.target.checked)}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Remplacer tous les facteurs existants
                  </span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className={`flex-1 px-4 py-2 rounded-xl border ${
                    isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importData}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
                >
                  Importer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
