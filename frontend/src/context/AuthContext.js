import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

const AuthContext = createContext();

// Configure axios to always send cookies
axios.defaults.withCredentials = true;

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

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      logger.error('Logout API call failed:', error);
    }
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      // Cookie absent ou expiré → pas connecté
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
