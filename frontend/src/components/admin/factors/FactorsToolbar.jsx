import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Search, Plus, Download, Upload, FlaskConical } from 'lucide-react';

const FactorsToolbar = ({
  search, onSearchChange,
  expertFilter, onFilterChange,
  onAdd, onExport, onImport
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const filters = [
    { key: 'all', label: t('admin.factors.all') },
    { key: 'public', label: t('admin.factors.publicFilter') },
    { key: 'expert', label: 'Experts', icon: FlaskConical }
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative flex-1 min-w-64">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
        <input
          type="text"
          data-testid="factor-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('common.search') + '...'}
          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
        />
      </div>

      <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
        {filters.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            data-testid={`filter-${key}`}
            onClick={() => onFilterChange(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              expertFilter === key
                ? key === 'expert'
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-500 text-white'
                : isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      <button
        data-testid="add-factor-btn"
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        <Plus className="w-5 h-5" />
        {t('common.add')}
      </button>
      <button
        data-testid="export-btn"
        onClick={onExport}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
      >
        <Download className="w-5 h-5" />
        {t('common.export')}
      </button>
      <button
        data-testid="import-btn"
        onClick={onImport}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
      >
        <Upload className="w-5 h-5" />
        {t('common.import')}
      </button>
    </div>
  );
};

export default FactorsToolbar;
