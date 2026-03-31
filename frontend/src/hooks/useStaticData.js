import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cache storage with TTL
const cache = {
  categories: { data: null, timestamp: 0 },
  subcategories: { data: null, timestamp: 0 },
  unitConversions: { data: null, timestamp: 0 }
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Hook for fetching and caching static data (categories, subcategories, unit conversions)
 * Data is cached in memory for 1 hour to reduce API calls
 */
export const useStaticData = () => {
  const [categories, setCategories] = useState(cache.categories.data || []);
  const [subcategories, setSubcategories] = useState(cache.subcategories.data || []);
  const [unitConversions, setUnitConversions] = useState(cache.unitConversions.data || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isCacheValid = (cacheEntry) => {
    return cacheEntry.data && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
  };

  const fetchCategories = useCallback(async (force = false) => {
    if (!force && isCacheValid(cache.categories)) {
      setCategories(cache.categories.data);
      return cache.categories.data;
    }

    try {
      const response = await axios.get(`${API_URL}/api/categories`);
      cache.categories = { data: response.data, timestamp: Date.now() };
      setCategories(response.data);
      return response.data;
    } catch (err) {
      logger.error('Failed to fetch categories:', err);
      setError(err);
      return [];
    }
  }, []);

  const fetchSubcategories = useCallback(async (force = false) => {
    if (!force && isCacheValid(cache.subcategories)) {
      setSubcategories(cache.subcategories.data);
      return cache.subcategories.data;
    }

    try {
      const response = await axios.get(`${API_URL}/api/subcategories`);
      cache.subcategories = { data: response.data, timestamp: Date.now() };
      setSubcategories(response.data);
      return response.data;
    } catch (err) {
      logger.error('Failed to fetch subcategories:', err);
      setError(err);
      return [];
    }
  }, []);

  const fetchUnitConversions = useCallback(async (force = false) => {
    if (!force && isCacheValid(cache.unitConversions)) {
      setUnitConversions(cache.unitConversions.data);
      return cache.unitConversions.data;
    }

    try {
      const response = await axios.get(`${API_URL}/api/unit-conversions`);
      cache.unitConversions = { data: response.data, timestamp: Date.now() };
      setUnitConversions(response.data);
      return response.data;
    } catch (err) {
      logger.error('Failed to fetch unit conversions:', err);
      setError(err);
      return [];
    }
  }, []);

  const fetchAllStaticData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCategories(force),
        fetchSubcategories(force),
        fetchUnitConversions(force)
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchSubcategories, fetchUnitConversions]);

  // Clear cache (useful after admin updates)
  const clearCache = useCallback(() => {
    cache.categories = { data: null, timestamp: 0 };
    cache.subcategories = { data: null, timestamp: 0 };
    cache.unitConversions = { data: null, timestamp: 0 };
  }, []);

  // Get subcategories filtered by category
  const getSubcategoriesByCategory = useCallback((categoryCode) => {
    return subcategories.filter(sub => 
      sub.categories && sub.categories.includes(categoryCode)
    );
  }, [subcategories]);

  // Get category by code
  const getCategoryByCode = useCallback((code) => {
    return categories.find(cat => cat.code === code);
  }, [categories]);

  return {
    categories,
    subcategories,
    unitConversions,
    loading,
    error,
    fetchCategories,
    fetchSubcategories,
    fetchUnitConversions,
    fetchAllStaticData,
    clearCache,
    getSubcategoriesByCategory,
    getCategoryByCode
  };
};

export default useStaticData;
