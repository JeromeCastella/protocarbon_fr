import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

const AuthContext = createContext();

// Token storage helpers - sessionStorage by default, localStorage only with "Remember Me"
const getStoredToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const storeToken = (newToken, rememberMe) => {
  if (rememberMe) {
    localStorage.setItem('token', newToken);
    sessionStorage.removeItem('token');
  } else {
    sessionStorage.setItem('token', newToken);
    localStorage.removeItem('token');
  }
};

const clearStoredToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = async (email, password, rememberMe = false) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { 
      email, 
      password,
      remember_me: rememberMe
    });
    const { token: newToken, user: userData } = response.data;
    storeToken(newToken, rememberMe);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
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
      token, 
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
