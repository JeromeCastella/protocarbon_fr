import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FactorsPagination = ({ pagination, search, expertFilter, onPageChange }) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  if (!pagination || pagination.total_pages <= 1) return null;

  const getIsPublicParam = () =>
    expertFilter === 'public' ? 'true' : expertFilter === 'expert' ? 'false' : '';

  return (
    <div className="flex items-center justify-between pt-2">
      <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        {((pagination.page - 1) * pagination.page_size) + 1}–{Math.min(pagination.page * pagination.page_size, pagination.total)} {t('admin.factors.of')} {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <button
          data-testid="pagination-prev"
          onClick={() => onPageChange(pagination.page - 1, search, getIsPublicParam())}
          disabled={pagination.page <= 1}
          className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={`text-sm font-medium px-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {pagination.page} / {pagination.total_pages}
        </span>
        <button
          data-testid="pagination-next"
          onClick={() => onPageChange(pagination.page + 1, search, getIsPublicParam())}
          disabled={pagination.page >= pagination.total_pages}
          className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FactorsPagination;
