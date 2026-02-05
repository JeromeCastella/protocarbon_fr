import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Trash2, Shield, ShieldOff, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminUsersTab = ({ users, currentUserId, onRefetch }) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (userId === currentUserId && newRole === 'user') {
      if (!window.confirm(t('confirmations.removeAdminSelf'))) return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/role`, { role: newRole });
      onRefetch();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert(error.response?.data?.detail || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`);
      setDeleteConfirm(null);
      onRefetch();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.detail || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead>
            <tr className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
              <th className="text-left px-4 py-3 font-medium">{t('admin.users.email')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('admin.users.name')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('admin.users.role')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('admin.users.createdAt')}</th>
              <th className="text-right px-4 py-3 font-medium">{t('common.actions')}</th>
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
                    {u.role === 'admin' ? t('auth.admin') : t('auth.user')}
                  </span>
                  {u.id === currentUserId && (
                    <span className={`ml-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>({t('auth.you')})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-CH') : '-'}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {/* Toggle Role Button */}
                  <button
                    data-testid={`toggle-role-${u.id}`}
                    onClick={() => handleToggleRole(u.id, u.role)}
                    disabled={loading}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                      u.role === 'admin'
                        ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                        : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                    } disabled:opacity-50`}
                  >
                    {u.role === 'admin' ? (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        {t('auth.removeAdmin')}
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        {t('auth.promoteAdmin')}
                      </>
                    )}
                  </button>
                  
                  {/* Delete Button - only show for non-current user */}
                  {u.id !== currentUserId && (
                    <button
                      data-testid={`delete-user-${u.id}`}
                      onClick={() => setDeleteConfirm(u)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {language === 'fr' ? 'Supprimer' : 'Löschen'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Confirmer la suppression' : 'Löschen bestätigen'}
                </h3>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`ml-auto p-2 rounded-lg hover:bg-slate-700/50 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className={`mb-6 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {language === 'fr' 
                ? `Êtes-vous sûr de vouloir supprimer l'utilisateur "${deleteConfirm.email}" ? Cette action est irréversible.`
                : `Sind Sie sicher, dass Sie den Benutzer "${deleteConfirm.email}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {language === 'fr' ? 'Annuler' : 'Abbrechen'}
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm.id)}
                disabled={loading}
                data-testid="confirm-delete-user"
                className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {language === 'fr' ? 'Suppression...' : 'Löschen...'}
                  </span>
                ) : (
                  language === 'fr' ? 'Supprimer définitivement' : 'Endgültig löschen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminUsersTab;
