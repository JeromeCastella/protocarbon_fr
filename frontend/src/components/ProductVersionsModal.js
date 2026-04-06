import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Edit3, Trash2, Calendar, Factory, Leaf, Recycle,
  Check, History, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useProductVersions } from '../hooks/useProductVersions';

const ProductVersionsModal = ({ isOpen, onClose, productId, productName, onProfileUpdated }) => {
  const {
    isDark, t, loading, saving,
    defaultProfile, profiles, showForm, setShowForm,
    editingProfile, formData, setFormData, expandedProfiles,
    handleCreateProfile, handleEditProfile, handleEditDefault,
    handleSaveProfile, handleDeleteProfile, toggleExpand,
    totalEmissions, availableFiscalYears,
  } = useProductVersions(isOpen, productId);

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
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('products.versions.title')}</h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{productName}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
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
            <ProfileForm
              isDark={isDark}
              t={t}
              editingProfile={editingProfile}
              formData={formData}
              setFormData={setFormData}
              totalEmissions={totalEmissions}
              availableFiscalYears={availableFiscalYears}
              saving={saving}
              onSave={() => handleSaveProfile(onProfileUpdated)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <ProfilesList
              isDark={isDark}
              t={t}
              defaultProfile={defaultProfile}
              profiles={profiles}
              expandedProfiles={expandedProfiles}
              availableFiscalYears={availableFiscalYears}
              toggleExpand={toggleExpand}
              handleEditDefault={handleEditDefault}
              handleEditProfile={handleEditProfile}
              handleDeleteProfile={(fyId) => handleDeleteProfile(fyId, onProfileUpdated)}
              handleCreateProfile={handleCreateProfile}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProfileForm = ({ isDark, t, editingProfile, formData, setFormData, totalEmissions, availableFiscalYears, saving, onSave, onCancel }) => (
  <div className="space-y-5">
    <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
      <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>
        {editingProfile?.is_default ? t('products.versions.editDefaultValues') : editingProfile ? t('products.versions.editProfile') : t('products.versions.createProfile')}
      </p>
    </div>

    {!editingProfile && (
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('products.versions.fiscalYear')} *</label>
        <select
          value={formData.fiscal_year_id}
          onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year_id: e.target.value }))}
          className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
        >
          {availableFiscalYears.map(fy => (
            <option key={fy.id} value={fy.id}>{fy.name} ({fy.start_date} → {fy.end_date})</option>
          ))}
        </select>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { key: 'manufacturing_emissions', icon: Factory, color: 'orange', label: t('products.versions.transformation') },
        { key: 'usage_emissions', icon: Leaf, color: 'green', label: t('products.versions.utilisation') },
        { key: 'disposal_emissions', icon: Recycle, color: 'blue', label: t('products.versions.endOfLife') },
      ].map(field => (
        <div key={field.key}>
          <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            <field.icon className={`w-4 h-4 text-${field.color}-500`} />
            {field.label}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData[field.key] === 0 ? '' : formData[field.key]}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
              placeholder="0"
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>kgCO₂e</span>
          </div>
        </div>
      ))}
    </div>

    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white">
      <div className="flex items-center justify-between">
        <span className="text-purple-200">{t('products.versions.totalPerUnit')}</span>
        <span className="text-xl font-bold">{totalEmissions.toFixed(2)} kgCO₂e</span>
      </div>
    </div>

    {!editingProfile?.is_default && (
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('products.versions.changeReason')}</label>
        <input
          type="text"
          value={formData.change_reason}
          onChange={(e) => setFormData(prev => ({ ...prev, change_reason: e.target.value }))}
          placeholder={t('products.versions.changeReasonPlaceholder')}
          className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 placeholder:text-gray-400'}`}
        />
      </div>
    )}

    <div className="flex gap-3 pt-2">
      <button onClick={onCancel} className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>
        {t('products.versions.cancel')}
      </button>
      <button
        onClick={onSave}
        disabled={saving || (!editingProfile && !formData.fiscal_year_id)}
        className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
        {t('products.versions.save')}
      </button>
    </div>
  </div>
);

const EmissionBadges = ({ isDark, t, profile }) => (
  <div className="grid grid-cols-3 gap-3 text-sm">
    {[
      { value: profile.manufacturing_emissions, color: 'orange', label: 'Transformation' },
      { value: profile.usage_emissions, color: 'green', label: t('products.versions.utilisation') },
      { value: profile.disposal_emissions, color: 'blue', label: t('products.versions.endOfLife') },
    ].map(item => (
      <div key={item.label} className={`p-2 rounded-lg ${isDark ? `bg-${item.color}-500/20` : `bg-${item.color}-50`}`}>
        <span className={`text-${item.color}-500 font-medium`}>{item.value} kgCO₂e</span>
        <p className={`text-xs ${isDark ? `text-${item.color}-300/70` : `text-${item.color}-600/70`}`}>{item.label}</p>
      </div>
    ))}
  </div>
);

const ProfilesList = ({ isDark, t, defaultProfile, profiles, expandedProfiles, availableFiscalYears, toggleExpand, handleEditDefault, handleEditProfile, handleDeleteProfile, handleCreateProfile }) => (
  <div className="space-y-4">
    <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('products.versions.profilesExplanation')}</p>
    </div>

    {defaultProfile && (
      <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700'}`}>
              {t('products.versions.defaultProfile')}
            </span>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('products.versions.usedIfNoSpecific')}</span>
          </div>
          <button onClick={handleEditDefault} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}>
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <EmissionBadges isDark={isDark} t={t} profile={defaultProfile} />
      </div>
    )}

    {profiles.length > 0 && (
      <div className="space-y-3">
        <h3 className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{t('products.versions.profilesByFY')}</h3>
        {profiles.map((profile) => (
          <div key={profile.fiscal_year_id} className={`rounded-xl border ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-white'}`}>
            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.fiscal_year_id)}>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile.fiscal_year_name}</span>
                  {profile.change_reason && <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{profile.change_reason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                  {(profile.manufacturing_emissions + profile.usage_emissions + profile.disposal_emissions).toFixed(2)} kgCO₂e
                </span>
                {expandedProfiles[profile.fiscal_year_id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
            <AnimatePresence>
              {expandedProfiles[profile.fiscal_year_id] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className={`px-4 pb-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-100'}`}>
                    <div className="mt-3"><EmissionBadges isDark={isDark} t={t} profile={profile} /></div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProfile(profile); }}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                      >
                        <Edit3 className="w-4 h-4" />{t('products.versions.edit')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.fiscal_year_id); }}
                        className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 ${isDark ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
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

    {availableFiscalYears.length > 0 && (
      <button
        onClick={handleCreateProfile}
        className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
          isDark ? 'border-slate-600 hover:border-purple-500 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400' : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-500 hover:text-purple-600'
        }`}
      >
        <Plus className="w-5 h-5" />{t('products.versions.addProfileForFY')}
      </button>
    )}

    {availableFiscalYears.length === 0 && profiles.length > 0 && (
      <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{t('products.versions.allFYHaveProfileDefined')}</span>
      </div>
    )}
  </div>
);

export default ProductVersionsModal;
