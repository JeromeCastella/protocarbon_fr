import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS, formatEmissions } from './constants';

const TopSubcategories = ({ scopeBreakdown }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const top10Subcategories = useMemo(() => {
    if (!scopeBreakdown?.scopes) return [];
    const allCategories = {};
    Object.values(scopeBreakdown.scopes).forEach(scope => {
      if (scope.categories) {
        Object.entries(scope.categories).forEach(([name, value]) => {
          allCategories[name] = (allCategories[name] || 0) + value;
        });
      }
    });
    return Object.entries(allCategories)
      .map(([name, value]) => ({ name, displayName: t(`categories.${name}`) || name, emissions: value }))
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, 7);
  }, [scopeBreakdown, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
      data-testid="top-subcategories"
    >
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {t('dashboard.chart.topSubcategories')}
      </h3>

      <div className="space-y-3">
        {top10Subcategories.map((item, index) => {
          const maxEmissions = top10Subcategories[0]?.emissions || 1;
          const percentage = (item.emissions / maxEmissions) * 100;
          const formatted = formatEmissions(item.emissions);

          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className={`w-5 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {index + 1}.
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t(`categories.${item.name}`) || item.name}
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatted.value}
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'} overflow-hidden`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {top10Subcategories.length === 0 && (
          <p className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('dashboard.chart.noData')}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default TopSubcategories;
