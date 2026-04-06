/**
 * Hook personnalisé pour la gestion des données admin
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

import { API_URL } from '../utils/apiConfig';

export const useAdminData = (isAdmin) => {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState([]);
  const [factorsPagination, setFactorsPagination] = useState({ total: 0, page: 1, page_size: 50, total_pages: 0 });
  const [subcategories, setSubcategories] = useState([]);
  const [unitConversions, setUnitConversions] = useState([]);
  const [users, setUsers] = useState([]);
  const isInitialLoad = useRef(true);

  const fetchFactors = useCallback(async (page = 1, search = "", is_public = "") => {
    if (!isAdmin) return;
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (search) params.append("search", search);
      if (is_public) params.append("is_public", is_public);
      const res = await axios.get(`${API_URL}/api/admin/emission-factors-v2?${params}`);
      const data = res.data;
      setFactors(data.items || []);
      setFactorsPagination({ total: data.total, page: data.page, page_size: data.page_size, total_pages: data.total_pages });
    } catch (error) {
      logger.error('Failed to fetch factors:', error);
    }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    
    if (isInitialLoad.current) {
      setLoading(true);
    }  
    try {
      const [factorsRes, usersRes, subcatsRes, unitsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/emission-factors-v2?page=1&page_size=50`),
        axios.get(`${API_URL}/api/admin/users`),
        axios.get(`${API_URL}/api/admin/subcategories`),
        axios.get(`${API_URL}/api/admin/unit-conversions`)
      ]);
      
      const fData = factorsRes.data;
      setFactors(fData.items || []);
      setFactorsPagination({ total: fData.total, page: fData.page, page_size: fData.page_size, total_pages: fData.total_pages });
      setUsers(usersRes.data || []);
      setSubcategories(subcatsRes.data || []);
      setUnitConversions(unitsRes.data || []);
    } catch (error) {
      logger.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    factors,
    factorsPagination,
    fetchFactors,
    subcategories,
    unitConversions,
    users,
    refetch: fetchData
  };
};

// Catégories GHG Protocol
// Labels are resolved via t('categories.<value>') in consuming components
export const ALL_CATEGORIES = [
  { value: 'combustion_mobile', scope: 'scope1' },
  { value: 'combustion_fixe', scope: 'scope1' },
  { value: 'emissions_procedes', scope: 'scope1' },
  { value: 'emissions_fugitives', scope: 'scope1' },
  { value: 'electricite', scope: 'scope2' },
  { value: 'chaleur_vapeur', scope: 'scope2' },
  { value: 'refroidissement', scope: 'scope2' },
  { value: 'biens_services_achetes', scope: 'scope3_amont' },
  { value: 'biens_equipement', scope: 'scope3_amont' },
  { value: 'activites_combustibles_energie', scope: 'scope3_amont' },
  { value: 'transport_distribution_amont', scope: 'scope3_amont' },
  { value: 'dechets_operations', scope: 'scope3_amont' },
  { value: 'deplacements_professionnels', scope: 'scope3_amont' },
  { value: 'deplacements_domicile_travail', scope: 'scope3_amont' },
  { value: 'actifs_loues_amont', scope: 'scope3_amont' },
  { value: 'transport_distribution_aval', scope: 'scope3_aval' },
  { value: 'transformation_produits', scope: 'scope3_aval' },
  { value: 'utilisation_produits', scope: 'scope3_aval' },
  { value: 'fin_vie_produits', scope: 'scope3_aval' },
  { value: 'actifs_loues_aval', scope: 'scope3_aval' },
  { value: 'franchises', scope: 'scope3_aval' },
  { value: 'investissements', scope: 'scope3_aval' },
];

export const SCOPES = [
  { value: 'scope1', labelKey: 'scope.scope1' },
  { value: 'scope2', labelKey: 'scope.scope2' },
  { value: 'scope3_amont', labelKey: 'scope.scope3Amont' },
  { value: 'scope3_aval', labelKey: 'scope.scope3Aval' }
];

export const IMPACT_TYPES = [
  { value: 'direct', labelKey: 'impactTypes.direct' },
  { value: 'indirect', labelKey: 'impactTypes.indirect' },
  { value: 'upstream', labelKey: 'impactTypes.upstream' },
  { value: 'downstream', labelKey: 'impactTypes.downstream' }
];

export const COMMON_UNITS = ['L', 'kWh', 'MWh', 'kg', 't', 'km', 'm3', 'GJ', 'tep', 'passager.km', 'CHF', 'kCHF'];

// Utilitaires
export const getScopeColor = (scope) => {
  const colors = {
    scope1: 'bg-blue-500',
    scope2: 'bg-cyan-500',
    scope3_amont: 'bg-purple-500',
    scope3_aval: 'bg-indigo-500'
  };
  return colors[scope] || 'bg-gray-500';
};

export const getLinkedCategories = (subcategory, subcategories) => {
  if (!subcategory) return [];
  const subcat = subcategories.find(s => s.code === subcategory);
  return subcat?.categories || [];
};
