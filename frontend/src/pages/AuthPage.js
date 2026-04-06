import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Mail, Lock, User, ArrowRight, Globe, Eye, EyeOff, Moon, Sun, CheckCircle, Sparkles } from 'lucide-react';
import PasswordStrength from '../components/PasswordStrength';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password, rememberMe);
      } else {
        // Store name for welcome modal
        setRegisteredName(name);
        await register(email, password, name, language);
        // Show welcome modal after successful registration
        setShowWelcomeModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
    // User is already logged in and will be redirected by AuthContext
  };

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-green-50'}`}>
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 opacity-90"></div>
        <div className="absolute inset-0">
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 320">
            <path fill="rgba(255,255,255,0.1)" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        <div className="relative z-10 text-white max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
              <Leaf className="w-12 h-12" />
            </div>
            <h1 className="text-5xl font-bold mb-6">CarbonScope</h1>
            <p className="text-xl text-blue-100 mb-8">
              {t('auth.tagline')}
            </p>
          </motion.div>
        </div>
        {/* Brand logo — bottom left */}
        <div className="absolute bottom-8 left-12 z-10">
          <img
            src={language === 'fr' ? '/logo-plan-climat-fr.png' : '/logo-plan-climat-de.png'}
            alt={t('auth.brandLogoAlt')}
            className="h-12 w-auto opacity-90"
            data-testid="brand-logo"
          />
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Language & Theme toggles */}
          <div className="flex justify-end gap-2 mb-8">
            <button
              onClick={toggleLanguage}
              data-testid="auth-language-toggle"
              className={`p-3 rounded-xl transition-all ${
                isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              data-testid="auth-theme-toggle"
              className={`p-3 rounded-xl transition-all ${
                isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className={`p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl shadow-gray-200/50'}`}>
            <div className="text-center mb-8">
              <div className="lg:hidden w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-10 h-10 text-white" />
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isLogin ? t('auth.welcomeBack') : t('auth.welcome')}
              </h2>
              <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {isLogin ? t('auth.login') : t('auth.createAccount')}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('auth.name')}
                  </label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="register-name-input"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder={t('auth.name')}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="email-input"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder={t('auth.email')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="password-input"
                    className={`w-full pl-12 pr-12 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder={t('auth.password')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && <PasswordStrength password={password} />}
              </div>

              {/* Remember Me & Forgot Password (Login only) */}
              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      data-testid="remember-me-checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {t('auth.rememberMe')}
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    data-testid="forgot-password-link"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-btn"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/30"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? t('auth.login') : t('auth.register')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className={`mt-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                data-testid="toggle-auth-mode"
                className="text-blue-500 font-medium hover:underline"
              >
                {isLogin ? t('auth.register') : t('auth.login')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Welcome Modal after Registration */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleCloseWelcome}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-12 h-12" />
                </motion.div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold"
                >
                  {t('auth.welcomeProtoCarbon')}
                </motion.h2>
              </div>

              {/* Content */}
              <div className="p-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className={`text-center mb-6 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    {t('auth.congratsMessage').replace('{name}', registeredName || '')}
                  </p>

                  {/* Next steps */}
                  <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
                    <div className="flex items-start gap-3">
                      <Sparkles className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <div>
                        <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {t('auth.nextStep')}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          {t('auth.nextStepDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseWelcome}
                    data-testid="welcome-start-btn"
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"
                  >
                    {t('auth.start')}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
