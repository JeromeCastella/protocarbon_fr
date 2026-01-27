import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

// Import refactored components
import { 
  AdminHeader, 
  AdminTabs, 
  AdminFactorsTab, 
  AdminSubcategoriesTab, 
  AdminUsersTab 
} from '../components/admin';
import { useAdminData } from '../hooks/useAdminData';

const Admin = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('factors');
  
  // Use custom hook for data fetching
  const { loading, factors, subcategories, users, refetch } = useAdminData(user?.role === 'admin');

  // Access check
  if (user?.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Accès refusé
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <AdminHeader />

      {/* Tabs */}
      <AdminTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        factorsCount={factors.length}
        subcategoriesCount={subcategories.length}
        usersCount={users.length}
      />

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Factors Tab */}
          {activeTab === 'factors' && (
            <AdminFactorsTab 
              factors={factors} 
              subcategories={subcategories} 
              onRefetch={refetch} 
            />
          )}

          {/* Subcategories Tab */}
          {activeTab === 'subcategories' && (
            <AdminSubcategoriesTab 
              subcategories={subcategories} 
              onRefetch={refetch} 
            />
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <AdminUsersTab 
              users={users} 
              currentUserId={user?.id} 
              onRefetch={refetch} 
            />
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
