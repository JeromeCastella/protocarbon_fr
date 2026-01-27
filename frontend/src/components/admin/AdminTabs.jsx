import React from 'react';
import { Database, Layers, Users } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const AdminTabs = ({ activeTab, setActiveTab, factorsCount, subcategoriesCount, usersCount }) => {
  const { isDark } = useTheme();
  
  const tabs = [
    { id: 'factors', label: 'Facteurs', icon: Database, count: factorsCount, color: 'bg-blue-500' },
    { id: 'subcategories', label: 'Sous-catégories', icon: Layers, count: subcategoriesCount, color: 'bg-purple-500' },
    { id: 'users', label: 'Utilisateurs', icon: Users, count: usersCount, color: 'bg-green-500' }
  ];
  
  return (
    <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          data-testid={`admin-tab-${tab.id}`}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === tab.id
              ? `${tab.color} text-white`
              : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <tab.icon className="w-5 h-5" />
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
};

export default AdminTabs;
