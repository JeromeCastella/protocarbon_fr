import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminUsersTab = ({ users, currentUserId, onRefetch }) => {
  const { isDark } = useTheme();

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (userId === currentUserId && newRole === 'user') {
      if (!window.confirm('Vous allez retirer vos droits admin. Continuer ?')) return;
    }
    
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/role`, { role: newRole });
      onRefetch();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      <table className="w-full">
        <thead>
          <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="text-left px-4 py-3 font-medium">Nom</th>
            <th className="text-left px-4 py-3 font-medium">Rôle</th>
            <th className="text-left px-4 py-3 font-medium">Date création</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr 
              key={u.id} 
              data-testid={`user-row-${u.id}`}
              className={`border-t ${isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{u.name || '-'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  u.role === 'admin' 
                    ? 'bg-amber-500/20 text-amber-500' 
                    : isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                </span>
                {u.id === currentUserId && (
                  <span className={`ml-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>(Vous)</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  data-testid={`toggle-role-${u.id}`}
                  onClick={() => handleToggleRole(u.id, u.role)}
                  className={`px-3 py-1 rounded text-sm ${
                    u.role === 'admin'
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                  }`}
                >
                  {u.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsersTab;
