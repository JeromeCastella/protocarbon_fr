import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Check } from 'lucide-react';

/**
 * FactorCard - Display an emission factor in a user-friendly card
 * Shows simplified name, description, and impact value
 */
const FactorCard = ({ 
  factor, 
  language = 'fr', 
  isSelected = false, 
  onClick,
  showDetails = true 
}) => {
  const { isDark } = useTheme();
  
  // Get display name (prefer simplified, fallback to technical)
  const name = language === 'fr' 
    ? (factor.name_simple_fr || factor.name_fr)
    : (factor.name_simple_de || factor.name_de || factor.name_fr);
  
  // Get description
  const description = language === 'fr'
    ? factor.description_fr
    : factor.description_de;
  
  // Get usage hint
  const usageHint = language === 'fr'
    ? factor.usage_hint_fr
    : factor.usage_hint_de;

  // Get primary impact (first one)
  const impact = factor.impacts?.[0];
  
  // Determine if this is an enriched factor
  const isEnriched = !!(factor.name_simple_fr || factor.name_simple_de);

  return (
    <button
      onClick={onClick}
      data-testid={`factor-card-${factor.id}`}
      className={`
        w-full p-4 rounded-xl border text-left transition-all duration-200
        ${isSelected 
          ? isDark
            ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/30' 
            : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/30'
          : isDark
            ? 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-700/50'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Factor name */}
          <h4 className={`font-medium leading-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {name}
          </h4>
          
          {/* Description or usage hint */}
          {showDetails && (description || usageHint) && (
            <p className={`mt-1.5 text-sm leading-snug ${
              isDark ? 'text-slate-400' : 'text-gray-500'
            }`}>
              {description || usageHint}
            </p>
          )}
          
          {/* Impact and source */}
          {showDetails && (
            <div className={`mt-2 flex items-center gap-2 text-xs ${
              isDark ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {impact && (
                <span className={`font-mono px-2 py-0.5 rounded ${
                  isDark ? 'bg-slate-700' : 'bg-gray-100'
                }`}>
                  {impact.value?.toFixed(3)} {impact.unit}
                </span>
              )}
              {factor.source && (
                <>
                  <span>·</span>
                  <span>{factor.source}</span>
                </>
              )}
              {factor.region && (
                <>
                  <span>·</span>
                  <span>{factor.region}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </button>
  );
};

export default FactorCard;
