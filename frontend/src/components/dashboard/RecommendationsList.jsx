/**
 * Liste des mesures recommandées basées sur les émissions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

const RecommendationsList = ({ recommendations = [], formatEmissions, isDark = false }) => {
  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="w-6 h-6 text-amber-500" />
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Mesures recommandées
        </h3>
      </div>
      <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        Basées sur vos principales sources d'émissions
      </p>

      <div className="space-y-6">
        {recommendations.map((rec, idx) => (
          <RecommendationCard 
            key={idx} 
            recommendation={rec} 
            formatEmissions={formatEmissions}
            isDark={isDark} 
          />
        ))}
      </div>
    </motion.div>
  );
};

const RecommendationCard = ({ recommendation, formatEmissions, isDark }) => {
  const { category, emissions, measures } = recommendation;
  const formattedEmissions = formatEmissions(emissions);

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {category.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
        </span>
        <span className={`text-sm px-2 py-1 rounded-lg ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
          {formattedEmissions.value} {formattedEmissions.unit}
        </span>
      </div>
      <div className="space-y-2">
        {measures.map((measure, mIdx) => (
          <MeasureItem key={mIdx} measure={measure} isDark={isDark} />
        ))}
      </div>
    </div>
  );
};

const MeasureItem = ({ measure, isDark }) => {
  const impactColors = {
    high: { dot: 'bg-green-500', badge: 'bg-green-500/20 text-green-600', label: 'Impact fort' },
    medium: { dot: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-600', label: 'Impact moyen' },
    low: { dot: 'bg-gray-400', badge: 'bg-gray-500/20 text-gray-500', label: 'Impact faible' }
  };

  const colors = impactColors[measure.impact] || impactColors.low;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
      <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {measure.title_fr}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
        {colors.label}
      </span>
    </div>
  );
};

export default RecommendationsList;
