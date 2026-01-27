import React from 'react';
import { Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const AdminHeader = () => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
        <Shield className="w-8 h-8 text-amber-500" />
      </div>
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('admin.title')}
        </h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('admin.subtitle')}
        </p>
      </div>
    </div>
  );
};

export default AdminHeader;
