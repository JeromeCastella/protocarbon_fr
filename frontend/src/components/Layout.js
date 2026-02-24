import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import FiscalYearSelector from './FiscalYearSelector';
import { 
  LayoutDashboard, 
  Settings, 
  FileInput, 
  Package, 
  CheckSquare, 
  Database, 
  FileText, 
  HelpCircle,
  Moon,
  Sun,
  LogOut,
  Globe,
  Leaf,
  Calendar,
  Shield
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation principale (fonctions métier)
  const mainNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/general-info', icon: Settings, label: t('nav.generalInfo') },
    { path: '/fiscal-years', icon: Calendar, label: language === 'fr' ? 'Exercices' : 'Geschäftsjahre' },
    { path: '/data-entry', icon: FileInput, label: t('nav.dataEntry') },
    { path: '/products', icon: Package, label: t('nav.products') },
    // Admin link - only shown if user is admin
    ...(user?.role === 'admin' ? [{ path: '/admin', icon: Shield, label: t('nav.admin') || 'Administration' }] : []),
  ];

  // Support/Aide (séparé visuellement)
  const supportNavItems = [
    { path: '/assistance', icon: HelpCircle, label: language === 'fr' ? 'Assistance' : 'Hilfe' },
  ];

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-64 fixed h-full flex flex-col z-40 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-r`}>
        {/* Logo */}
        <div className="p-6 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Proto_carbon_{language.toUpperCase()}</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Comptabilité carbone</p>
            </div>
          </div>
        </div>

        {/* Fiscal Year Selector */}
        <div className="px-4 py-3 border-b border-inherit">
          <FiscalYearSelector onCreateNew={() => navigate('/fiscal-years')} />
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNavItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${path === '/' ? 'dashboard' : path.slice(1)}`}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                  : isDark 
                    ? 'text-slate-300 hover:bg-slate-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
          
          {/* Séparateur + Section Support */}
          <div className={`my-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
          
          {supportNavItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              data-testid={`nav-${path.slice(1)}`}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                  : isDark 
                    ? 'text-slate-300 hover:bg-slate-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Section Préférences (Langue + Thème côte à côte) */}
        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              data-testid="language-toggle"
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                isDark 
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'FR' : 'DE'}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              data-testid="theme-toggle"
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                isDark 
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-sm font-medium">{isDark ? (language === 'fr' ? 'Clair' : 'Hell') : (language === 'fr' ? 'Sombre' : 'Dunkel')}</span>
            </button>
          </div>
        </div>

        {/* Section Profil utilisateur */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name || 'User'}</p>
                <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email}</p>
              </div>
              <button
                onClick={logout}
                data-testid="logout-btn"
                title={language === 'fr' ? 'Déconnexion' : 'Abmelden'}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ml-64 min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
