import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, ArrowRight, X, Check, Repeat } from 'lucide-react';
import axios from 'axios';
import logger from '../../utils/logger';

import { API_URL } from '../../utils/apiConfig';

const INITIAL_FORM = {
  from_unit: '',
  to_unit: '',
  factor: '',
  description_fr: '',
  description_de: ''
};

const AdminUnitsTab = ({ unitConversions, onRefetch }) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const filteredConversions = unitConversions.filter(c => {
    const q = search.toLowerCase();
    return c.from_unit?.toLowerCase().includes(q) ||
           c.to_unit?.toLowerCase().includes(q) ||
           c.description_fr?.toLowerCase().includes(q) ||
           c.description_de?.toLowerCase().includes(q);
  });

  const handleEdit = (conv) => {
    setEditing(conv);
    setForm({
      from_unit: conv.from_unit || '',
      to_unit: conv.to_unit || '',
      factor: conv.factor?.toString() || '',
      description_fr: conv.description_fr || '',
      description_de: conv.description_de || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (convId) => {
    if (!window.confirm(language === 'fr' ? 'Supprimer cette conversion ?' : 'Diese Umrechnung löschen?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/unit-conversions/${convId}`);
      onRefetch();
    } catch (error) {
      logger.error('Failed to delete conversion:', error);
    }
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      factor: parseFloat(form.factor)
    };
    try {
      if (editing) {
        await axios.put(`${API_URL}/api/admin/unit-conversions/${editing.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/admin/unit-conversions`, payload);
      }
      setShowModal(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      onRefetch();
    } catch (error) {
      logger.error('Failed to save conversion:', error);
      alert('Erreur: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditing(null);
  };

  // Group by from_unit for visual clarity
  const groupedByFrom = filteredConversions.reduce((acc, c) => {
    if (!acc[c.from_unit]) acc[c.from_unit] = [];
    acc[c.from_unit].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <Repeat className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-500'}`} />
        <div>
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {unitConversions.length}
          </span>
          <span className={`ml-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {language === 'fr' ? 'conversions d\'unités' : 'Einheitenumrechnungen'}
          </span>
        </div>
        <div className={`ml-auto text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {Object.keys(groupedByFrom).length} {language === 'fr' ? 'unités source' : 'Quelleinheiten'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
          <input
            type="text"
            data-testid="unit-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'fr' ? 'Rechercher une conversion...' : 'Umrechnung suchen...'}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
          />
        </div>
        <button
          data-testid="add-conversion-btn"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
        >
          <Plus className="w-5 h-5" />
          {language === 'fr' ? 'Ajouter' : 'Hinzufügen'}
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead>
            <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
              <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' ? 'Unité source' : 'Quelleinheit'}
              </th>
              <th className="px-4 py-3 w-10"></th>
              <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' ? 'Unité cible' : 'Zieleinheit'}
              </th>
              <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' ? 'Facteur' : 'Faktor'}
              </th>
              <th className={`text-left px-4 py-3 font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {language === 'fr' ? 'Description' : 'Beschreibung'}
              </th>
              <th className={`text-right px-4 py-3 font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredConversions.map(conv => (
              <tr
                key={conv.id}
                data-testid={`conversion-row-${conv.id}`}
                className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <td className="px-4 py-3">
                  <code className={`text-sm font-semibold px-2 py-1 rounded ${isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>
                    {conv.from_unit}
                  </code>
                </td>
                <td className="px-4 py-3 text-center">
                  <ArrowRight className={`w-4 h-4 mx-auto ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                </td>
                <td className="px-4 py-3">
                  <code className={`text-sm font-semibold px-2 py-1 rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {conv.to_unit}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-mono font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {conv.factor}
                  </span>
                  <span className={`ml-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    (1 {conv.from_unit} = {conv.factor} {conv.to_unit})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {language === 'fr' ? conv.description_fr : (conv.description_de || conv.description_fr)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(conv)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'}`}
                      title={language === 'fr' ? 'Modifier' : 'Bearbeiten'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(conv.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                      title={language === 'fr' ? 'Supprimer' : 'Löschen'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredConversions.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {language === 'fr' ? 'Aucune conversion trouvée' : 'Keine Umrechnung gefunden'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {filteredConversions.length} / {unitConversions.length} {language === 'fr' ? 'conversions' : 'Umrechnungen'}
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
              className={`w-full max-w-lg rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden flex flex-col`}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Repeat className="w-6 h-6 text-teal-500" />
                    {editing
                      ? (language === 'fr' ? 'Modifier la conversion' : 'Umrechnung bearbeiten')
                      : (language === 'fr' ? 'Nouvelle conversion' : 'Neue Umrechnung')
                    }
                  </h3>
                  <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Units row */}
                <div className="grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {language === 'fr' ? 'Unité source *' : 'Quelleinheit *'}
                    </label>
                    <input
                      type="text"
                      data-testid="conversion-from-unit"
                      value={form.from_unit}
                      onChange={(e) => setForm(prev => ({ ...prev, from_unit: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="km"
                    />
                  </div>
                  <div className="flex items-center justify-center pb-2">
                    <ArrowRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {language === 'fr' ? 'Unité cible *' : 'Zieleinheit *'}
                    </label>
                    <input
                      type="text"
                      data-testid="conversion-to-unit"
                      value={form.to_unit}
                      onChange={(e) => setForm(prev => ({ ...prev, to_unit: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="L"
                    />
                  </div>
                </div>

                {/* Factor */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {language === 'fr' ? 'Facteur de conversion *' : 'Umrechnungsfaktor *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    data-testid="conversion-factor"
                    value={form.factor}
                    onChange={(e) => setForm(prev => ({ ...prev, factor: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    placeholder="0.07"
                  />
                  {form.from_unit && form.to_unit && form.factor && (
                    <p className={`mt-2 text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                      1 {form.from_unit} = {form.factor} {form.to_unit}
                    </p>
                  )}
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Description FR
                    </label>
                    <input
                      type="text"
                      data-testid="conversion-desc-fr"
                      value={form.description_fr}
                      onChange={(e) => setForm(prev => ({ ...prev, description_fr: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Consommation moyenne"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      Description DE
                    </label>
                    <input
                      type="text"
                      data-testid="conversion-desc-de"
                      value={form.description_de}
                      onChange={(e) => setForm(prev => ({ ...prev, description_de: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="Durchschnittlicher Verbrauch"
                    />
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
                    {language === 'fr' ? 'Annuler' : 'Abbrechen'}
                  </button>
                  <button
                    data-testid="conversion-save-btn"
                    onClick={handleSave}
                    disabled={!form.from_unit || !form.to_unit || !form.factor}
                    className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {editing ? (language === 'fr' ? 'Modifier' : 'Bearbeiten') : (language === 'fr' ? 'Créer' : 'Erstellen')}
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

export default AdminUnitsTab;
