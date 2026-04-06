import React from 'react';
import { BarChart3, CheckCircle2, Flag, CircleDot } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const StatsDashboard = ({ stats, isDark, onSubcategoryClick, activeSubcategory }) => {
  const { t } = useLanguage();
  if (!stats) return null;
  const g = stats.global;
  return (
    <div className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
      <div className="px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('curation.stats.globalProgress')}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-3">
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${g.progress_pct}%` }} />
          </div>
          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {g.reviewed}/{g.total} ({g.progress_pct}%)
          </span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{g.reviewed} {t('curation.stats.treated')}</span>
          <span className="flex items-center gap-1"><Flag className="w-3 h-3 text-amber-500" />{g.flagged} {t('curation.stats.flaggedLabel')}</span>
          <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-slate-400" />{g.untreated} {t('curation.stats.remaining')}</span>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
        <button
          onClick={() => onSubcategoryClick('')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            !activeSubcategory
              ? 'bg-blue-500 text-white'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous ({g.total})
        </button>
        {stats.by_subcategory.map(sc => (
          <button
            key={sc.subcategory}
            onClick={() => onSubcategoryClick(sc.subcategory)}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all flex items-center gap-1 ${
              activeSubcategory === sc.subcategory
                ? 'bg-blue-500 text-white'
                : isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {sc.name_fr}
            <span className={`font-mono ${activeSubcategory === sc.subcategory ? 'text-blue-200' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {sc.reviewed}/{sc.total}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatsDashboard;
