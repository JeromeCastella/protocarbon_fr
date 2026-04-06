import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Briefcase, Layers, Save, Loader2, Check } from 'lucide-react';

const CompanyIdentityCard = ({
  company, setCompany, isDark, saving, saved, handleSave,
  isPrivateCompany, entityTypes, sectors, consolidationApproaches, t,
}) => {
  const inputCls = `w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
  }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('generalInfo.companyIdentity')}</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('generalInfo.companyIdentityDesc')}</p>
          </div>
        </div>
        <motion.button onClick={handleSave} disabled={saving} whileTap={{ scale: 0.95 }} data-testid="save-company-btn"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          } disabled:opacity-50`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" />{t('common.success')}</> : <><Save className="w-4 h-4" />{t('common.save')}</>}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Building2 className="w-4 h-4" />{t('company.name')}</label>
          <input type="text" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} data-testid="company-name-input" className={inputCls} placeholder="Entreprise Demo" />
        </div>
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><MapPin className="w-4 h-4" />{t('company.location')}</label>
          <input type="text" value={company.location} onChange={e => setCompany({ ...company, location: e.target.value })} data-testid="company-location-input" className={inputCls} placeholder="Fribourg, Suisse" />
        </div>
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Briefcase className="w-4 h-4" />{t('company.sector')}</label>
          <select value={company.sector} onChange={e => setCompany({ ...company, sector: e.target.value })} data-testid="company-sector-select" className={inputCls}>
            <option value="">{t('company.selectSector')}</option>
            {sectors.map(s => <option key={s} value={s}>{t(`sectors.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Building2 className="w-4 h-4" />{t('generalInfo.entityType')}</label>
          <select value={company.entity_type || 'private_company'} onChange={e => setCompany({ ...company, entity_type: e.target.value })} data-testid="company-entity-type-select" className={inputCls}>
            {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {isPrivateCompany && (
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}><Layers className="w-4 h-4" />{t('company.consolidationApproach')}</label>
            <select value={company.consolidation_approach} onChange={e => setCompany({ ...company, consolidation_approach: e.target.value })} data-testid="company-consolidation-select" className={inputCls}>
              {consolidationApproaches.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompanyIdentityCard;
