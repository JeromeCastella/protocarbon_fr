import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ChevronDown, 
  Check, 
  Lock, 
  AlertTriangle,
  Plus,
  FlaskConical,
  ChevronRight
} from 'lucide-react';

const FiscalYearSelector = ({ onCreateNew }) => {
  const { isDark } = useTheme();
  const { fiscalYears, currentFiscalYear, selectFiscalYear, loading } = useFiscalYear();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);

  // Separate actual exercises from scenarios
  const { actualYears, scenariosByYear } = useMemo(() => {
    const actuals = [];
    const scenarios = {};
    for (const fy of fiscalYears) {
      if (fy.type === 'scenario') {
        const year = fy.year;
        if (!scenarios[year]) scenarios[year] = [];
        scenarios[year].push(fy);
      } else {
        actuals.push(fy);
      }
    }
    // Sort actuals by year descending (most recent first)
    actuals.sort((a, b) => (b.year || 0) - (a.year || 0));
    return { actualYears: actuals, scenariosByYear: scenarios };
  }, [fiscalYears]);

  // Check if current selection is a scenario
  const isScenarioSelected = currentFiscalYear?.type === 'scenario';

  if (loading) {
    return (
      <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'} animate-pulse`}>
        <div className="h-5 w-32 bg-gray-300 rounded" />
      </div>
    );
  }

  const getStatusIcon = (fy) => {
    if (fy.type === 'scenario') return <FlaskConical className="w-4 h-4 text-violet-500" />;
    switch (fy.status) {
      case 'closed': return <Lock className="w-4 h-4 text-green-500" />;
      case 'rectified': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (fy) => {
    if (fy.type === 'scenario') return 'Scénario';
    switch (fy.status) {
      case 'closed': return 'Clôturé';
      case 'rectified': return 'Rectifié';
      default: return 'En cours';
    }
  };

  const getStatusColor = (fy) => {
    if (fy.type === 'scenario') return 'bg-violet-500/20 text-violet-500';
    switch (fy.status) {
      case 'closed': return 'bg-green-500/20 text-green-500';
      case 'rectified': return 'bg-orange-500/20 text-orange-500';
      default: return 'bg-blue-500/20 text-blue-500';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  const handleSelectFy = (fy) => {
    selectFiscalYear(fy);
    setIsOpen(false);
    setExpandedYear(null);
  };

  const toggleScenarios = (year, e) => {
    e.stopPropagation();
    setExpandedYear(expandedYear === year ? null : year);
  };

  return (
    <div className="relative z-50">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="fiscal-year-selector"
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
          isScenarioSelected
            ? isDark
              ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30'
              : 'bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200'
            : isDark 
              ? 'bg-slate-700 hover:bg-slate-600 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm border border-gray-200'
        }`}
      >
        {currentFiscalYear ? (
          <>
            {getStatusIcon(currentFiscalYear)}
            <div className="text-left">
              <p className="text-sm font-medium">
                {currentFiscalYear.type === 'scenario' 
                  ? (currentFiscalYear.scenario_name || 'Scénario')
                  : currentFiscalYear.name
                }
              </p>
              <p className={`text-xs ${isScenarioSelected ? (isDark ? 'text-violet-400' : 'text-violet-500') : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {currentFiscalYear.type === 'scenario'
                  ? `Scénario ${currentFiscalYear.year}`
                  : `${formatDate(currentFiscalYear.start_date)} - ${formatDate(currentFiscalYear.end_date)}`
                }
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

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full left-0 mt-2 w-80 rounded-xl shadow-xl z-[100] overflow-hidden ${
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className={`p-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <p className={`text-xs font-medium px-2 py-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                EXERCICES FISCAUX
              </p>
            </div>
            
            <div className="max-h-72 overflow-y-auto p-2">
              {actualYears.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Aucun exercice créé
                </p>
              ) : (
                actualYears.map((fy) => {
                  const year = fy.year;
                  const scenarios = scenariosByYear[year] || [];
                  const hasScenarios = scenarios.length > 0;
                  const isExpanded = expandedYear === year;
                  const isSelected = currentFiscalYear?.id === fy.id;

                  return (
                    <div key={fy.id}>
                      {/* Actual exercise row */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSelectFy(fy)}
                          data-testid={`fy-select-${fy.id}`}
                          className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isSelected
                              ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                              : isDark ? 'hover:bg-slate-700 text-white' : 'hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          {getStatusIcon(fy)}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{fy.name}</p>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {formatDate(fy.start_date)} - {formatDate(fy.end_date)}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(fy)}`}>
                            {getStatusLabel(fy)}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </button>

                        {/* Scenario badge */}
                        {hasScenarios && (
                          <button
                            onClick={(e) => toggleScenarios(year, e)}
                            data-testid={`scenario-toggle-${year}`}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                              isExpanded
                                ? 'bg-violet-500/20 text-violet-500'
                                : isDark 
                                  ? 'hover:bg-slate-700 text-slate-400 hover:text-violet-400'
                                  : 'hover:bg-violet-50 text-gray-400 hover:text-violet-600'
                            }`}
                            title={`${scenarios.length} scénario(s)`}
                          >
                            <FlaskConical className="w-3.5 h-3.5" />
                            <span>{scenarios.length}</span>
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                      </div>

                      {/* Expanded scenarios list */}
                      <AnimatePresence>
                        {isExpanded && hasScenarios && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`ml-6 pl-3 border-l-2 ${isDark ? 'border-violet-500/30' : 'border-violet-200'} py-1 space-y-0.5`}>
                              {scenarios.map((s) => {
                                const isSSelected = currentFiscalYear?.id === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => handleSelectFy(s)}
                                    data-testid={`scenario-select-${s.id}`}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                                      isSSelected
                                        ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-700'
                                        : isDark ? 'hover:bg-slate-700/50 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <FlaskConical className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                                    <span className="flex-1 text-left truncate">{s.scenario_name || s.name}</span>
                                    {isSSelected && <Check className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
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
          onClick={() => { setIsOpen(false); setExpandedYear(null); }}
        />
      )}
    </div>
  );
};

export default FiscalYearSelector;
