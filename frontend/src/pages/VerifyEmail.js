import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { Leaf, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../utils/apiConfig';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setError(t('verifyEmail.invalidLink'));
        return;
      }

      try {
        await axios.post(`${API_URL}/api/auth/verify-email`, { token });
        setStatus('success');
        setTimeout(() => navigate('/auth'), 3000);
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.detail || t('verifyEmail.linkExpired'));
      }
    };

    verifyEmail();
  }, [token, language, navigate, t]);

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
              {t('verifyEmail.title')}
            </h2>
          </div>

          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                {t('verifyEmail.verifying')}
              </p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('verifyEmail.successTitle')}
              </h3>
              <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('verifyEmail.successMessage')}
              </p>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('verifyEmail.failTitle')}
              </h3>
              <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {error}
              </p>
              <div className="space-y-3">
                <Link
                  to="/auth"
                  className="block w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  {t('verifyEmail.goToLogin')}
                </Link>
                <button
                  onClick={() => {
                    window.location.href = '/auth';
                  }}
                  className={`block w-full py-3 px-4 rounded-xl font-medium border transition-colors ${
                    isDark 
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('verifyEmail.resendLink')}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
