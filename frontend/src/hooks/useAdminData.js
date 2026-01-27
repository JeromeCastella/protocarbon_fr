/**
 * Hook personnalisé pour la gestion des données admin
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const useAdminData = (isAdmin) => {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const [factorsRes, usersRes, subcatsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/emission-factors-v2`),
        axios.get(`${API_URL}/api/admin/users`),
        axios.get(`${API_URL}/api/admin/subcategories`)
      ]);
      
      setFactors(factorsRes.data || []);
      setUsers(usersRes.data || []);
      setSubcategories(subcatsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    factors,
    subcategories,
    users,
    refetch: fetchData
  };
};

// Catégories GHG Protocol
export const ALL_CATEGORIES = [
  { value: 'combustion_mobile', label: 'Combustion mobile', scope: 'scope1' },
  { value: 'combustion_fixe', label: 'Combustion fixe', scope: 'scope1' },
  { value: 'emissions_procedes', label: 'Émissions de procédés', scope: 'scope1' },
  { value: 'emissions_fugitives', label: 'Émissions fugitives', scope: 'scope1' },
  { value: 'electricite', label: 'Électricité', scope: 'scope2' },
  { value: 'chaleur_vapeur', label: 'Chaleur et vapeur', scope: 'scope2' },
  { value: 'refroidissement', label: 'Refroidissement', scope: 'scope2' },
  { value: 'biens_services_achetes', label: 'Biens et services achetés', scope: 'scope3_amont' },
  { value: 'biens_equipement', label: "Biens d'équipement", scope: 'scope3_amont' },
  { value: 'activites_combustibles_energie', label: 'Activités liées aux combustibles et à l\'énergie', scope: 'scope3_amont' },
  { value: 'transport_distribution_amont', label: 'Transport et distribution amont', scope: 'scope3_amont' },
  { value: 'dechets_operations', label: 'Déchets générés par les opérations', scope: 'scope3_amont' },
  { value: 'deplacements_professionnels', label: 'Déplacements professionnels', scope: 'scope3_amont' },
  { value: 'deplacements_domicile_travail', label: 'Déplacements pendulaires des employés', scope: 'scope3_amont' },
  { value: 'actifs_loues_amont', label: 'Actifs loués en amont', scope: 'scope3_amont' },
  { value: 'transport_distribution_aval', label: 'Transport et distribution aval', scope: 'scope3_aval' },
  { value: 'transformation_produits', label: 'Transformation des produits vendus', scope: 'scope3_aval' },
  { value: 'utilisation_produits', label: 'Utilisation des produits vendus', scope: 'scope3_aval' },
  { value: 'fin_vie_produits', label: 'Traitement en fin de vie des produits vendus', scope: 'scope3_aval' },
  { value: 'actifs_loues_aval', label: 'Actifs loués en aval', scope: 'scope3_aval' },
  { value: 'franchises', label: 'Franchises', scope: 'scope3_aval' },
  { value: 'investissements', label: 'Investissements', scope: 'scope3_aval' },
];

export const SCOPES = [
  { value: 'scope1', label: 'Scope 1' },
  { value: 'scope2', label: 'Scope 2' },
  { value: 'scope3_amont', label: 'Scope 3 Amont' },
  { value: 'scope3_aval', label: 'Scope 3 Aval' }
];

export const IMPACT_TYPES = [
  { value: 'direct', label: 'Direct' },
  { value: 'indirect', label: 'Indirect' },
  { value: 'upstream', label: 'Amont' },
  { value: 'downstream', label: 'Aval' }
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
