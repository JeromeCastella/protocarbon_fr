import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

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
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      logout();
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
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
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

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
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
