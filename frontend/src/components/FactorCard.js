import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Check, Info } from 'lucide-react';

/**
 * FactorCard - Display an emission factor in a compact card
 * Description is shown in a tooltip on hover for a cleaner interface
 */
const FactorCard = ({ 
  factor, 
  language = 'fr', 
  isSelected = false, 
  onClick,
}) => {
  const { isDark } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  
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

  // Tooltip content
  const tooltipContent = description || usageHint;

  // Get primary impact (first one)
  const impact = factor.impacts?.[0];

  return (
    <div 
      className="relative"
      onMouseEnter={() => tooltipContent && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        data-testid={`factor-card-${factor.id}`}
        className={`
          w-full px-4 py-3 rounded-xl border text-left transition-all duration-200
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
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Name and impact */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Factor name */}
              <h4 className={`font-medium truncate ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {name}
              </h4>
              
              {/* Info icon - visual indicator only */}
              {tooltipContent && (
                <Info className={`w-4 h-4 flex-shrink-0 ${
                  isDark ? 'text-slate-500' : 'text-gray-400'
                }`} />
              )}
            </div>
            
            {/* Impact and source - compact inline */}
            <div className={`mt-1 flex items-center gap-2 text-xs ${
              isDark ? 'text-slate-500' : 'text-gray-400'
            }`}>
              {impact && (
                <span className={`font-mono px-1.5 py-0.5 rounded ${
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
            </div>
          </div>
          
          {/* Right side: Selection indicator */}
          {isSelected && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </button>
      
      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div 
          className={`absolute z-50 left-0 right-0 mt-1 p-3 rounded-lg shadow-lg text-sm ${
            isDark 
              ? 'bg-slate-700 text-slate-200 border border-slate-600' 
              : 'bg-white text-gray-700 border border-gray-200'
          }`}
          style={{ top: '100%' }}
        >
          <div className="flex items-start gap-2">
            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <p>{tooltipContent}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorCard;
