import React from 'react';
import { Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const AdminHeader = () => {
  const { isDark } = useTheme();
  
  return (
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
        <Shield className="w-8 h-8 text-amber-500" />
      </div>
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Administration
        </h1>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          Gestion des facteurs d'émission, sous-catégories et utilisateurs
        </p>
      </div>
    </div>
  );
};

export default AdminHeader;
