import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, PlusCircle, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * Composant d'état vide affiché quand l'utilisateur n'a pas d'exercice fiscal.
 * Utilisé sur DataEntry, Dashboard, GeneralInfo, Products.
 */
const EmptyFiscalYearState = ({ contextMessage }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  
  return (
    <div data-testid="empty-fiscal-year-state" className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-lg w-full text-center p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
      >
        {/* Illustration */}
        <div className="relative mb-6">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <Calendar className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className={`absolute -bottom-1 -right-1 left-1/2 ml-6 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}
          >
            <PlusCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          </motion.div>
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('emptyFiscalYear.createFirst')}
        </h2>

        {/* Context-specific message */}
        {contextMessage && (
          <p className={`mb-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {contextMessage}
          </p>
        )}

        {/* Description */}
        <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          {t('emptyFiscalYear.mainDesc')}
        </p>

        {/* Info box */}
        <div className={`rounded-xl p-4 mb-6 text-left ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('emptyFiscalYear.infoText')}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          to="/fiscal-years"
          data-testid="create-fiscal-year-btn"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
        >
          <PlusCircle className="w-5 h-5" />
          {t('emptyFiscalYear.createBtn')}
        </Link>

        {/* Secondary link */}
        <p className={`mt-4 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          {t('emptyFiscalYear.goTo')}
          <Link to="/fiscal-years" className="text-blue-500 hover:underline">
            {t('emptyFiscalYear.exercisesLink')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default EmptyFiscalYearState;
