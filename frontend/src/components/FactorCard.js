import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Check, Info } from 'lucide-react';

/**
 * FactorCard - Compact card for 2-column grid layout
 * Hover tooltip for details, minimal height for maximum density
 */
const FactorCard = ({ 
  factor, 
  language = 'fr', 
  isSelected = false, 
  onClick,
}) => {
  const { isDark } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isExpert = factor.is_public === false;
  
  const name = language === 'fr' 
    ? (factor.name_simple_fr || factor.name_fr)
    : (factor.name_simple_de || factor.name_de || factor.name_fr);
  
  const description = language === 'fr' ? factor.description_fr : factor.description_de;
  const usageHint = language === 'fr' ? factor.usage_hint_fr : factor.usage_hint_de;
  const tooltipContent = description || usageHint;
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
          w-full px-3 py-2 rounded-lg border text-left transition-all duration-150
          ${isSelected 
            ? isDark
              ? 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/40' 
              : 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/30'
            : isDark
              ? 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-700/50'
              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
          }
        `}
      >
        {/* Name row */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isSelected && (
            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {name}
          </span>
          {isExpert && (
            <span className={`flex-shrink-0 text-[9px] font-bold px-1 py-px rounded ${
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`} data-testid={`expert-badge-${factor.id}`}>
              EXP
            </span>
          )}
          {tooltipContent && (
            <Info className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          )}
        </div>
        
        {/* Meta row — value + source */}
        <div className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {impact && (
            <span className={`font-mono px-1 py-px rounded ${isDark ? 'bg-slate-700/80' : 'bg-gray-100'}`}>
              {impact.value < 0.001 ? impact.value.toExponential(2) : impact.value.toFixed(3)} {impact.unit}
            </span>
          )}
          {factor.source && <span>{factor.source}</span>}
        </div>
      </button>
      
      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div 
          className={`absolute z-50 left-0 right-0 mt-1 p-2.5 rounded-lg shadow-lg text-xs ${
            isDark 
              ? 'bg-slate-700 text-slate-200 border border-slate-600' 
              : 'bg-white text-gray-700 border border-gray-200'
          }`}
          style={{ top: '100%' }}
        >
          <div className="flex items-start gap-1.5">
            <Info className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <p>{tooltipContent}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorCard;
