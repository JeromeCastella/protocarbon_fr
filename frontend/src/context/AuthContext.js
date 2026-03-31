import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Configure axios to send cookies with every request
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if we have a valid session via /me
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch {
      // No valid session — that's fine
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { 
      email, 
      password,
      remember_me: rememberMe
    });
    const { user: userData } = response.data;
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, language) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, { 
      email, password, name, language 
    });
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch {
      // Ignore logout errors
    }
    setUser(null);
  };

  const updateLanguage = async (language) => {
    await axios.put(`${API_URL}/api/auth/language`, { language });
    setUser(prev => ({ ...prev, language }));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser,
      loading, 
      login, 
      register, 
      logout,
      updateLanguage,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
