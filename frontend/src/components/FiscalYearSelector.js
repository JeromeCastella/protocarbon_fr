import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronDown, 
  Check, 
  Lock, 
  AlertTriangle,
  Plus
} from 'lucide-react';

const FiscalYearSelector = ({ onCreateNew }) => {
  const { isDark } = useTheme();
  const { fiscalYears, currentFiscalYear, selectFiscalYear, loading } = useFiscalYear();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'} animate-pulse`}>
        <div className="h-5 w-32 bg-gray-300 rounded" />
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'closed':
        return <Lock className="w-4 h-4 text-green-500" />;
      case 'rectified':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'closed':
        return 'Clôturé';
      case 'rectified':
        return 'Rectifié';
      default:
        return 'En cours';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
          isDark 
            ? 'bg-slate-700 hover:bg-slate-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm border border-gray-200'
        }`}
      >
        {currentFiscalYear ? (
          <>
            {getStatusIcon(currentFiscalYear.status)}
            <div className="text-left">
              <p className="text-sm font-medium">{currentFiscalYear.name}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {formatDate(currentFiscalYear.start_date)} - {formatDate(currentFiscalYear.end_date)}
              </p>
            </div>
          </>
        ) : (
          <>
            <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Aucun exercice
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full left-0 mt-2 w-72 rounded-xl shadow-xl z-[100] overflow-hidden ${
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className={`p-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <p className={`text-xs font-medium px-2 py-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                EXERCICES FISCAUX
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2">
              {fiscalYears.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Aucun exercice créé
                </p>
              ) : (
                fiscalYears.map((fy) => (
                  <button
                    key={fy.id}
                    onClick={() => {
                      selectFiscalYear(fy);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      currentFiscalYear?.id === fy.id
                        ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    {getStatusIcon(fy.status)}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{fy.name}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {formatDate(fy.start_date)} - {formatDate(fy.end_date)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      fy.status === 'closed' 
                        ? 'bg-green-500/20 text-green-500'
                        : fy.status === 'rectified'
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {getStatusLabel(fy.status)}
                    </span>
                    {currentFiscalYear?.id === fy.id && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                ))
              )}
            </div>
            
            <div className={`p-2 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateNew && onCreateNew();
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  isDark 
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' 
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Nouvel exercice</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FiscalYearSelector;
