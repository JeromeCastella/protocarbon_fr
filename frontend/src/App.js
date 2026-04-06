import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { FiscalYearProvider } from './context/FiscalYearContext';
import AuthPage from './pages/AuthPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import GeneralInfo from './pages/GeneralInfo';
import DataEntry from './pages/DataEntry';
import Products from './pages/Products';
import EmissionFactors from './pages/EmissionFactors';
import FiscalYears from './pages/FiscalYears';
import Admin from './pages/Admin';
import Assistance from './pages/Assistance';
import CurationWorkbench from './pages/CurationWorkbench';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <FiscalYearProvider>
        <Routes>
          {/* Auth routes */}
          <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Protected routes */}
          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/auth" />}>
            <Route index element={<Navigate to="/general-info" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="general-info" element={<GeneralInfo />} />
            <Route path="data-entry" element={<DataEntry />} />
            <Route path="products" element={<Products />} />
            <Route path="emission-factors" element={<EmissionFactors />} />
            <Route path="fiscal-years" element={<FiscalYears />} />
            <Route path="admin" element={<Admin />} />
            <Route path="curation" element={<CurationWorkbench />} />
            <Route path="assistance" element={<Assistance />} />
          </Route>
        </Routes>
      </FiscalYearProvider>
    </div>
  );
}

export default App;
