import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';
import { faqCategories, scopeConfig } from '../components/assistance/assistanceData';

export const useAssistance = () => {
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('faq');

  // FAQ state
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({ 'getting-started': true });

  // Emission factors state
  const [factors, setFactors] = useState([]);
  const [factorsLoading, setFactorsLoading] = useState(false);
  const [factorSearch, setFactorSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState(null);

  const fetchFactors = useCallback(async () => {
    setFactorsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/emission-factors`);
      setFactors(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch emission factors:', error);
    } finally {
      setFactorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'factors' && factors.length === 0) {
      fetchFactors();
    }
  }, [activeTab, factors.length, fetchFactors]);

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const filteredFaqCategories = useMemo(() => {
    if (!faqSearch.trim()) return faqCategories;
    const searchLower = faqSearch.toLowerCase();
    return faqCategories.map(cat => ({
      ...cat,
      questions: cat.questions.filter(q => {
        const question = language === 'fr' ? q.question_fr : q.question_de;
        const answer = language === 'fr' ? q.answer_fr : q.answer_de;
        return question.toLowerCase().includes(searchLower) || answer.toLowerCase().includes(searchLower);
      })
    })).filter(cat => cat.questions.length > 0);
  }, [faqSearch, language]);

  const filteredFactors = useMemo(() => {
    let result = factors;
    if (factorSearch.trim()) {
      const searchLower = factorSearch.toLowerCase();
      result = result.filter(f => {
        const name = language === 'fr' ? (f.name_simple_fr || f.name_fr || f.name) : (f.name_simple_de || f.name_de || f.name);
        return name?.toLowerCase().includes(searchLower) ||
               f.subcategory?.toLowerCase().includes(searchLower) ||
               f.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      });
    }
    if (scopeFilter) {
      result = result.filter(f => f.impacts?.some(i => i.scope === scopeFilter || i.scope?.startsWith(scopeFilter)));
    }
    return result;
  }, [factors, factorSearch, scopeFilter, language]);

  const getScopeColor = (scope) => {
    const config = scopeConfig[scope] || scopeConfig.scope3;
    return config.color;
  };

  return {
    t, language, activeTab, setActiveTab,
    faqSearch, setFaqSearch, expandedQuestions, toggleQuestion,
    expandedCategories, toggleCategory, filteredFaqCategories,
    factorSearch, setFactorSearch, scopeFilter, setScopeFilter,
    showFilters, setShowFilters, selectedFactor, setSelectedFactor,
    filteredFactors, factorsLoading, getScopeColor,
  };
};
