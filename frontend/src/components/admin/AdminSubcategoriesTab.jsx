import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, Layers, X, Check } from 'lucide-react';
import axios from 'axios';
import { ALL_CATEGORIES } from '../../hooks/useAdminData';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const INITIAL_FORM = {
  code: '',
  name_fr: '',
  name_de: '',
  categories: [],
  icon: 'circle',
  order: 0
};

const AdminSubcategoriesTab = ({ subcategories, onRefetch }) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const filteredSubcats = subcategories.filter(s => {
    const searchLower = search.toLowerCase();
    return s.code?.toLowerCase().includes(searchLower) ||
           s.name_fr?.toLowerCase().includes(searchLower) ||
           s.name_de?.toLowerCase().includes(searchLower);
  });

  const handleEdit = (subcat) => {
    setEditing(subcat);
    setForm({
      code: subcat.code || '',
      name_fr: subcat.name_fr || '',
      name_de: subcat.name_de || '',
      categories: subcat.categories || [],
      icon: subcat.icon || 'circle',
      order: subcat.order || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (subcatId) => {
    if (!window.confirm(t('confirmations.delete'))) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/subcategories/${subcatId}`);
      onRefetch();
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
      alert(t('errors.generic'));
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await axios.put(`${API_URL}/api/admin/subcategories/${editing.id}`, form);
      } else {
        await axios.post(`${API_URL}/api/admin/subcategories`, form);
      }
      
      setShowModal(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      onRefetch();
    } catch (error) {
      console.error('Failed to save subcategory:', error);
      alert('Erreur: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleCategory = (catValue) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(catValue)
        ? prev.categories.filter(c => c !== catValue)
        : [...prev.categories, catValue]
    }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditing(null);
  };

  // Group categories by scope
  const categoriesByScope = ALL_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.scope]) acc[cat.scope] = [];
    acc[cat.scope].push(cat);
    return acc;
  }, {});

  const scopeLabels = {
    scope1: t('scope.scope1'),
    scope2: t('scope.scope2'),
    scope3_amont: t('scope.scope3Amont'),
    scope3_aval: 'Scope 3 Aval'
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            data-testid="subcategory-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une sous-catégorie..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
          />
        </div>
        <button
          data-testid="add-subcategory-btn"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          <Plus className="w-5 h-5" />
          Ajouter
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead>
            <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Nom FR</th>
              <th className="text-left px-4 py-3 font-medium">Nom DE</th>
              <th className="text-left px-4 py-3 font-medium">Catégories liées</th>
              <th className="text-left px-4 py-3 font-medium">Ordre</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubcats.map(subcat => (
              <tr 
                key={subcat.id} 
                data-testid={`subcategory-row-${subcat.id}`}
                className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <td className="px-4 py-3">
                  <code className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>
                    {subcat.code}
                  </code>
                </td>
                <td className="px-4 py-3 font-medium">{subcat.name_fr}</td>
                <td className="px-4 py-3">{subcat.name_de}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(subcat.categories || []).slice(0, 3).map(cat => (
                      <span 
                        key={cat} 
                        className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}
                      >
                        {cat}
                      </span>
                    ))}
                    {(subcat.categories || []).length > 3 && (
                      <span className="text-xs text-gray-500">+{subcat.categories.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{subcat.order}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleEdit(subcat)} 
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(subcat.id)} 
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Layers className="w-6 h-6 text-purple-500" />
                    {editing ? 'Modifier la sous-catégorie' : 'Nouvelle sous-catégorie'}
                  </h3>
                  <button 
                    onClick={() => setShowModal(false)} 
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Code, Name FR, Name DE */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Code *
                    </label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="voitures"
                      disabled={!!editing}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Nom FR *
                    </label>
                    <input
                      type="text"
                      value={form.name_fr}
                      onChange={(e) => setForm(prev => ({ ...prev, name_fr: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Voitures"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Nom DE *
                    </label>
                    <input
                      type="text"
                      value={form.name_de}
                      onChange={(e) => setForm(prev => ({ ...prev, name_de: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Autos"
                    />
                  </div>
                </div>

                {/* Icon & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Icône
                    </label>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="car"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Ordre
                    </label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Catégories liées (relation N-N)
                  </label>
                  <div className="space-y-4">
                    {Object.entries(categoriesByScope).map(([scope, cats]) => (
                      <div key={scope}>
                        <div className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {scopeLabels[scope]}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cats.map(cat => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => toggleCategory(cat.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                form.categories.includes(cat.value)
                                  ? 'bg-purple-500 text-white'
                                  : isDark 
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowModal(false)} 
                    className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.code || !form.name_fr || !form.name_de}
                    className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {editing ? 'Modifier' : 'Créer'}
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

export default AdminSubcategoriesTab;
