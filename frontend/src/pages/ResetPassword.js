import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Leaf, Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import PasswordStrength from '../components/PasswordStrength';

import { API_URL } from '../utils/apiConfig';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('resetPassword.mismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('resetPassword.tooShort'));
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || t('resetPassword.invalidOrExpired'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-green-50'}`}>
        <div className={`p-8 rounded-2xl text-center ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('resetPassword.invalidLink')}
          </h2>
          <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('resetPassword.linkExpired')}
          </p>
          <Link to="/forgot-password" className="text-blue-500 font-medium hover:underline">
            {t('resetPassword.requestNew')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-8 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-green-50'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl shadow-gray-200/50'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-10 h-10 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('resetPassword.title')}
            </h2>
            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('resetPassword.subtitle')}
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('resetPassword.successTitle')}
              </h3>
              <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('resetPassword.successMessage')}
              </p>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('resetPassword.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="reset-password-input"
                      className={`w-full pl-12 pr-12 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('resetPassword.confirmLabel')}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="reset-confirm-input"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {t('resetPassword.mismatch')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || password !== confirmPassword}
                  data-testid="reset-submit-btn"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    t('resetPassword.submit')
                  )}
                </button>
              </form>

              <p className={`mt-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 text-blue-500 font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('resetPassword.backToLogin')}
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
