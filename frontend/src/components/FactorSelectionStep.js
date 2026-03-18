import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Info, FlaskConical } from 'lucide-react';
import FactorCard from './FactorCard';
import { createFactorSearchIndex, searchFactors, sortFactorsByRelevance } from '../utils/factorSearch';

/**
 * FactorSelectionStep - Enhanced factor selection with search and cards
 * This component replaces the old factor selection UI with a cleaner, more user-friendly experience
 */
const FactorSelectionStep = ({
  factors,
  selectedFactor,
  onSelectFactor,
  selectedUnit,
  language = 'fr',
  isDark = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(null);
  const [showExpertFactors, setShowExpertFactors] = useState(false);

  // Split factors into public and all
  const publicFactors = useMemo(() => {
    if (!factors) return [];
    return factors.filter(f => f.is_public === true);
  }, [factors]);

  const expertCount = useMemo(() => {
    if (!factors) return 0;
    return factors.filter(f => f.is_public === false).length;
  }, [factors]);

  // Active factor list based on toggle
  const activeFactors = showExpertFactors ? factors : publicFactors;
  
  // Create search index when active factors change
  useEffect(() => {
    if (activeFactors && activeFactors.length > 0) {
      const index = createFactorSearchIndex(activeFactors);
      setSearchIndex(index);
    }
  }, [activeFactors]);
  
  // Filter and sort factors
  const displayFactors = useMemo(() => {
    if (!activeFactors || activeFactors.length === 0) return [];
    
    // If searching, use fuzzy search
    if (searchQuery.trim().length >= 2 && searchIndex) {
      const results = searchFactors(searchIndex, searchQuery);
      return results || [];
    }
    
    // Otherwise, sort by relevance
    return sortFactorsByRelevance(activeFactors, language);
  }, [activeFactors, searchQuery, searchIndex, language]);
  
  // Count enriched factors
  const enrichedCount = useMemo(() => {
    return activeFactors?.filter(f => f.name_simple_fr || f.name_simple_de).length || 0;
  }, [activeFactors]);

  if (!factors || factors.length === 0) {
    return (
      <div className={`p-6 rounded-xl text-center ${
        isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
      }`}>
        <Info className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          {language === 'fr' 
            ? `Aucun facteur compatible avec l'unité "${selectedUnit}"` 
            : `Kein kompatibler Faktor für die Einheit "${selectedUnit}"`}
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {language === 'fr' 
            ? 'Veuillez sélectionner une autre unité' 
            : 'Bitte wählen Sie eine andere Einheit'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header with count and expert toggle */}
      <div className="flex items-center justify-between flex-shrink-0">
        <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {language === 'fr' 
            ? '3. Sélectionner le facteur d\'émission' 
            : '3. Emissionsfaktor auswählen'}
        </label>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {displayFactors.length} {language === 'fr' ? 'facteur(s)' : 'Faktor(en)'}
          </span>
          {expertCount > 0 && (
            <button
              type="button"
              onClick={() => setShowExpertFactors(!showExpertFactors)}
              data-testid="toggle-expert-factors"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                showExpertFactors
                  ? isDark
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                  : isDark
                    ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {showExpertFactors 
                ? (language === 'fr' ? 'Masquer experts' : 'Experten ausblenden')
                : (language === 'fr' ? `+ ${expertCount} experts` : `+ ${expertCount} Experten`)
              }
            </button>
          )}
        </div>
      </div>
      
      {/* Search bar */}
      <div className="relative mt-4 flex-shrink-0">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
          isDark ? 'text-slate-400' : 'text-gray-400'
        }`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'fr' 
            ? 'Rechercher un facteur (ex: voiture, diesel, train...)' 
            : 'Faktor suchen (z.B. Auto, Diesel, Zug...)'
          }
          data-testid="factor-search-input"
          className={`w-full pl-12 pr-10 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
            isDark 
              ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Search hint */}
      {!searchQuery && enrichedCount > 0 && (
        <p className={`text-xs mt-2 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          💡 {language === 'fr' 
            ? `Conseil : tapez des mots simples comme "voiture", "avion", "électricité"...`
            : `Tipp: Geben Sie einfache Wörter ein wie "Auto", "Flugzeug", "Strom"...`
          }
        </p>
      )}
      
      {/* Factor cards grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 overflow-y-auto pr-2 mt-4 flex-1 auto-rows-min content-start">
        {displayFactors.map((factor) => (
          <FactorCard
            key={factor.id}
            factor={factor}
            language={language}
            isSelected={selectedFactor?.id === factor.id}
            onClick={() => onSelectFactor(factor)}
          />
        ))}
      </div>
      
      {/* No results message */}
      {searchQuery && displayFactors.length === 0 && (
        <div className={`p-4 rounded-xl text-center ${
          isDark ? 'bg-slate-700' : 'bg-gray-50'
        }`}>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            {language === 'fr' 
              ? `Aucun résultat pour "${searchQuery}"` 
              : `Keine Ergebnisse für "${searchQuery}"`}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            {language === 'fr' ? 'Effacer la recherche' : 'Suche löschen'}
          </button>
        </div>
      )}
      
      {/* Selected factor confirmation */}
      {selectedFactor && (
        <div className={`mt-4 p-4 rounded-xl flex-shrink-0 ${
          isDark 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              {language === 'fr' ? 'Facteur sélectionné' : 'Faktor ausgewählt'}
            </span>
          </div>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {language === 'fr' 
              ? (selectedFactor.name_simple_fr || selectedFactor.name_fr)
              : (selectedFactor.name_simple_de || selectedFactor.name_de || selectedFactor.name_fr)
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default FactorSelectionStep;
