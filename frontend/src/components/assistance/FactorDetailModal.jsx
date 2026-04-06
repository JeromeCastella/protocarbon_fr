import React from 'react';
import { X, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { scopeConfig } from './assistanceData';

const FactorDetailModal = ({ factor, isDark, language, t, getScopeColor, onClose }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-lg max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20"><Database className="w-6 h-6 text-blue-500" /></div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('assistance.factorDetail')}</h2>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.name')}</p>
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {language === 'fr' ? (factor.name_simple_fr || factor.name_fr || factor.name) : (factor.name_simple_de || factor.name_de || factor.name)}
            </p>
          </div>

          {factor.subcategory && (
            <div>
              <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.subcategory')}</p>
              <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>{factor.subcategory}</p>
            </div>
          )}

          <div>
            <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.impactsByScope')}</p>
            <div className="space-y-2">
              {(factor.impacts || []).map((impact, i) => {
                const color = getScopeColor(impact.scope);
                const config = scopeConfig[impact.scope] || scopeConfig.scope3;
                const Icon = config.icon;
                return (
                  <div key={`${impact.scope}-${impact.category || i}`}
                    className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${color}-500/20`}><Icon className={`w-4 h-4 text-${color}-500`} /></div>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'fr' ? config.label_fr : config.label_de}
                      </span>
                    </div>
                    <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {impact.value?.toFixed(4)} {impact.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {factor.input_units?.length > 0 && (
            <div>
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.acceptedUnits')}</p>
              <div className="flex flex-wrap gap-2">
                {factor.input_units.map((unit) => (
                  <span key={unit} className={`px-3 py-1 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{unit}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {factor.source && (
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.source')}</p>
                <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>{factor.source}</p>
              </div>
            )}
            {factor.region && (
              <div>
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('assistance.region')}</p>
                <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>{factor.region}</p>
              </div>
            )}
          </div>

          {factor.tags?.length > 0 && (
            <div>
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {factor.tags.map((tag) => (
                  <span key={tag} className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button onClick={onClose}
            className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
            {t('assistance.close')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FactorDetailModal;
