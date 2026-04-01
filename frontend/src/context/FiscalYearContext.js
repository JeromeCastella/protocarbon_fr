import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

const FiscalYearContext = createContext();

export const useFiscalYear = () => {
  const context = useContext(FiscalYearContext);
  if (!context) {
    throw new Error('useFiscalYear must be used within a FiscalYearProvider');
  }
  return context;
};

export const FiscalYearProvider = ({ children }) => {
  const { token } = useAuth();
  const [fiscalYears, setFiscalYears] = useState([]);
  const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFiscalYears = async () => {
    try {
      const [yearsRes, currentRes] = await Promise.all([
        axios.get(`${API_URL}/api/fiscal-years`),
        axios.get(`${API_URL}/api/fiscal-years/current`)
      ]);
      setFiscalYears(yearsRes.data || []);
      setCurrentFiscalYear(currentRes.data);
    } catch (error) {
      logger.error('Failed to fetch fiscal years:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFiscalYears();
    } else {
      setFiscalYears([]);
      setCurrentFiscalYear(null);
      setLoading(false);
    }
  }, [token]);

  const selectFiscalYear = (fiscalYear) => {
    setCurrentFiscalYear(fiscalYear);
  };

  const createFiscalYear = async (data) => {
    const response = await axios.post(`${API_URL}/api/fiscal-years`, data);
    await fetchFiscalYears();
    return response.data;
  };

  const closeFiscalYear = async (fiscalYearId) => {
    const response = await axios.post(`${API_URL}/api/fiscal-years/${fiscalYearId}/close`);
    await fetchFiscalYears();
    return response.data;
  };

  const rectifyFiscalYear = async (fiscalYearId, reason) => {
    const response = await axios.post(`${API_URL}/api/fiscal-years/${fiscalYearId}/rectify`, { reason });
    await fetchFiscalYears();
    return response.data;
  };

  const duplicateToNewYear = async (fiscalYearId, data) => {
    const response = await axios.post(`${API_URL}/api/fiscal-years/${fiscalYearId}/duplicate`, data);
    await fetchFiscalYears();
    return response.data;
  };

  const getActivitiesForDuplication = async (fiscalYearId) => {
    const response = await axios.get(`${API_URL}/api/fiscal-years/${fiscalYearId}/activities-for-duplication`);
    return response.data;
  };

  const refreshFiscalYears = () => {
    fetchFiscalYears();
  };

  return (
    <FiscalYearContext.Provider value={{
      fiscalYears,
      currentFiscalYear,
      loading,
      selectFiscalYear,
      createFiscalYear,
      closeFiscalYear,
      rectifyFiscalYear,
      duplicateToNewYear,
      getActivitiesForDuplication,
      refreshFiscalYears
    }}>
      {children}
    </FiscalYearContext.Provider>
  );
};
