import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import logger from '../utils/logger';
import { 
  HelpCircle, 
  Search, 
  ChevronDown,
  ChevronUp,
  Rocket,
  BarChart3,
  Factory,
  Package,
  Database,
  Mail,
  ExternalLink,
  Filter,
  X,
  Zap,
  Truck,
  Leaf,
  Info,
  Tag
} from 'lucide-react';

import { API_URL } from '../utils/apiConfig';

// FAQ Data Structure with placeholders
const faqCategories = [
  {
    id: 'getting-started',
    icon: Rocket,
    title_fr: 'Premiers pas',
    title_de: 'Erste Schritte',
    color: 'blue',
    questions: [
      {
        id: 'gs-1',
        question_fr: 'Comment créer mon premier exercice fiscal ?',
        question_de: 'Wie erstelle ich mein erstes Geschäftsjahr?',
        answer_fr: 'Placeholder : Explication de la création d\'un exercice fiscal avec les étapes détaillées.',
        answer_de: 'Placeholder: Erklärung zur Erstellung eines Geschäftsjahres mit detaillierten Schritten.'
      },
      {
        id: 'gs-2',
        question_fr: 'Comment saisir ma première activité ?',
        question_de: 'Wie gebe ich meine erste Aktivität ein?',
        answer_fr: 'Placeholder : Guide pas à pas pour la saisie d\'une activité via le formulaire guidé.',
        answer_de: 'Placeholder: Schritt-für-Schritt-Anleitung zur Eingabe einer Aktivität über das geführte Formular.'
      },
      {
        id: 'gs-3',
        question_fr: 'Qu\'est-ce qu\'un périmètre de bilan carbone ?',
        question_de: 'Was ist ein CO2-Bilanzperimeter?',
        answer_fr: 'Placeholder : Explication du concept de périmètre et comment le configurer dans l\'application.',
        answer_de: 'Placeholder: Erklärung des Perimeterkonzepts und wie man es in der Anwendung konfiguriert.'
      }
    ]
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title_fr: 'Tableau de bord',
    title_de: 'Dashboard',
    color: 'purple',
    questions: [
      {
        id: 'db-1',
        question_fr: 'Comment interpréter les KPIs affichés ?',
        question_de: 'Wie interpretiere ich die angezeigten KPIs?',
        answer_fr: 'Placeholder : Description des différents indicateurs (émissions totales, par kCHF, variation N-1) et leur signification.',
        answer_de: 'Placeholder: Beschreibung der verschiedenen Indikatoren (Gesamtemissionen, pro kCHF, Variation N-1) und ihre Bedeutung.'
      },
      {
        id: 'db-2',
        question_fr: 'Comment fonctionne la comparaison entre exercices ?',
        question_de: 'Wie funktioniert der Vergleich zwischen Geschäftsjahren?',
        answer_fr: 'Placeholder : Explication du graphique d\'évolution et des variations année par année.',
        answer_de: 'Placeholder: Erklärung des Entwicklungsdiagramms und der jährlichen Variationen.'
      },
      {
        id: 'db-3',
        question_fr: 'Comment définir un objectif SBTi ?',
        question_de: 'Wie definiere ich ein SBTi-Ziel?',
        answer_fr: 'Placeholder : Guide pour configurer un objectif de réduction aligné sur les Science Based Targets.',
        answer_de: 'Placeholder: Anleitung zur Konfiguration eines Reduktionsziels gemäß den Science Based Targets.'
      }
    ]
  },
  {
    id: 'scopes',
    icon: Factory,
    title_fr: 'Scopes & Catégories',
    title_de: 'Scopes & Kategorien',
    color: 'amber',
    questions: [
      {
        id: 'sc-1',
        question_fr: 'Quelle est la différence entre Scope 1, 2 et 3 ?',
        question_de: 'Was ist der Unterschied zwischen Scope 1, 2 und 3?',
        answer_fr: 'Placeholder : Explication des 3 scopes selon le GHG Protocol avec des exemples concrets.',
        answer_de: 'Placeholder: Erklärung der 3 Scopes gemäß dem GHG Protocol mit konkreten Beispielen.'
      },
      {
        id: 'sc-2',
        question_fr: 'Qu\'est-ce qu\'un facteur multi-impacts ?',
        question_de: 'Was ist ein Multi-Impact-Faktor?',
        answer_fr: 'Placeholder : Explication des facteurs qui génèrent des émissions sur plusieurs scopes (ex: combustibles).',
        answer_de: 'Placeholder: Erklärung der Faktoren, die Emissionen in mehreren Scopes erzeugen (z.B. Brennstoffe).'
      },
      {
        id: 'sc-3',
        question_fr: 'Comment sont calculées les émissions du Scope 3.3 ?',
        question_de: 'Wie werden die Emissionen von Scope 3.3 berechnet?',
        answer_fr: 'Placeholder : Détail du calcul automatique des émissions amont liées aux combustibles et à l\'énergie.',
        answer_de: 'Placeholder: Details zur automatischen Berechnung der vorgelagerten Emissionen aus Brennstoffen und Energie.'
      }
    ]
  },
  {
    id: 'products',
    icon: Package,
    title_fr: 'Produits vendus',
    title_de: 'Verkaufte Produkte',
    color: 'green',
    questions: [
      {
        id: 'pr-1',
        question_fr: 'Comment créer une fiche produit ?',
        question_de: 'Wie erstelle ich eine Produktkarte?',
        answer_fr: 'Placeholder : Guide pour créer une fiche produit avec les matières, la durée de vie et les paramètres de fin de vie.',
        answer_de: 'Placeholder: Anleitung zur Erstellung einer Produktkarte mit Materialien, Lebensdauer und End-of-Life-Parametern.'
      },
      {
        id: 'pr-2',
        question_fr: 'Comment enregistrer des ventes ?',
        question_de: 'Wie erfasse ich Verkäufe?',
        answer_fr: 'Placeholder : Explication du processus d\'enregistrement des ventes et de leur impact sur le bilan carbone.',
        answer_de: 'Placeholder: Erklärung des Verkaufserfassungsprozesses und seiner Auswirkungen auf die CO2-Bilanz.'
      },
      {
        id: 'pr-3',
        question_fr: 'Comment fonctionnent les profils d\'émission par exercice ?',
        question_de: 'Wie funktionieren Emissionsprofile pro Geschäftsjahr?',
        answer_fr: 'Placeholder : Explication du système de versioning des profils produits par exercice fiscal.',
        answer_de: 'Placeholder: Erklärung des Versionierungssystems für Produktprofile pro Geschäftsjahr.'
      }
    ]
  }
];

// Scope colors and labels
const scopeConfig = {
  scope1: { color: 'blue', label_fr: 'Scope 1', label_de: 'Scope 1', icon: Factory },
  scope2: { color: 'cyan', label_fr: 'Scope 2', label_de: 'Scope 2', icon: Zap },
  scope3_amont: { color: 'amber', label_fr: 'Scope 3 Amont', label_de: 'Scope 3 Upstream', icon: Truck },
  scope3_aval: { color: 'indigo', label_fr: 'Scope 3 Aval', label_de: 'Scope 3 Downstream', icon: Leaf },
  scope3_3: { color: 'orange', label_fr: 'Scope 3.3', label_de: 'Scope 3.3', icon: Zap },
  scope3: { color: 'purple', label_fr: 'Scope 3', label_de: 'Scope 3', icon: Truck }
};

const Assistance = () => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  
  // Tab state
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

  // Load emission factors when tab is selected
  useEffect(() => {
    if (activeTab === 'factors' && factors.length === 0) {
      fetchFactors();
    }
  }, [activeTab]);

  const fetchFactors = async () => {
    setFactorsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/emission-factors`);
      setFactors(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch emission factors:', error);
    } finally {
      setFactorsLoading(false);
    }
  };

  // Toggle question expansion
  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Filter FAQ based on search
  const filteredFaqCategories = useMemo(() => {
    if (!faqSearch.trim()) return faqCategories;
    
    const searchLower = faqSearch.toLowerCase();
    return faqCategories.map(cat => ({
      ...cat,
      questions: cat.questions.filter(q => {
        const question = language === 'fr' ? q.question_fr : q.question_de;
        const answer = language === 'fr' ? q.answer_fr : q.answer_de;
        return question.toLowerCase().includes(searchLower) || 
               answer.toLowerCase().includes(searchLower);
      })
    })).filter(cat => cat.questions.length > 0);
  }, [faqSearch, language]);

  // Filter emission factors
  const filteredFactors = useMemo(() => {
    let result = factors;
    
    // Search filter
    if (factorSearch.trim()) {
      const searchLower = factorSearch.toLowerCase();
      result = result.filter(f => {
        const name = language === 'fr' ? (f.name_simple_fr || f.name_fr || f.name) : (f.name_simple_de || f.name_de || f.name);
        return name?.toLowerCase().includes(searchLower) ||
               f.subcategory?.toLowerCase().includes(searchLower) ||
               f.tags?.some(t => t.toLowerCase().includes(searchLower));
      });
    }
    
    // Scope filter
    if (scopeFilter) {
      result = result.filter(f => 
        f.impacts?.some(i => i.scope === scopeFilter || i.scope?.startsWith(scopeFilter))
      );
    }
    
    return result;
  }, [factors, factorSearch, scopeFilter, language]);

  // Get color class for scope
  const getScopeColor = (scope) => {
    const config = scopeConfig[scope] || scopeConfig.scope3;
    return config.color;
  };

  const tabs = [
    { id: 'faq', label: language === 'fr' ? 'FAQ' : 'FAQ', icon: HelpCircle },
    { id: 'factors', label: language === 'fr' ? 'Facteurs d\'émission' : 'Emissionsfaktoren', icon: Database }
  ];

  return (
    <div data-testid="assistance-page" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {language === 'fr' ? 'Assistance' : 'Hilfe'}
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {language === 'fr' 
            ? 'Trouvez des réponses à vos questions et explorez les facteurs d\'émission'
            : 'Finden Sie Antworten auf Ihre Fragen und erkunden Sie die Emissionsfaktoren'
          }
        </p>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: FAQ ==================== */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher dans la FAQ...' : 'In FAQ suchen...'}
              data-testid="faq-search"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            {faqSearch && (
              <button
                onClick={() => setFaqSearch('')}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* FAQ Categories */}
          <div className="space-y-4">
            {filteredFaqCategories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategories[category.id];
              const title = language === 'fr' ? category.title_fr : category.title_de;
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    data-testid={`faq-category-${category.id}`}
                    className={`w-full p-5 flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-${category.color}-500/20`}>
                        <Icon className={`w-6 h-6 text-${category.color}-500`} />
                      </div>
                      <div className="text-left">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {title}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {category.questions.length} {language === 'fr' ? 'questions' : 'Fragen'}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                    )}
                  </button>

                  {/* Questions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}
                      >
                        {category.questions.map((q, idx) => {
                          const isQuestionExpanded = expandedQuestions[q.id];
                          const question = language === 'fr' ? q.question_fr : q.question_de;
                          const answer = language === 'fr' ? q.answer_fr : q.answer_de;
                          
                          return (
                            <div
                              key={q.id}
                              className={`${idx > 0 ? `border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}` : ''}`}
                            >
                              <button
                                onClick={() => toggleQuestion(q.id)}
                                data-testid={`faq-question-${q.id}`}
                                className={`w-full p-4 pl-6 flex items-center justify-between text-left transition-colors ${
                                  isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className={`font-medium pr-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                                  {question}
                                </span>
                                {isQuestionExpanded ? (
                                  <ChevronUp className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                                ) : (
                                  <ChevronDown className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                                )}
                              </button>
                              
                              <AnimatePresence>
                                {isQuestionExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className={`px-6 pb-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}
                                  >
                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                      {answer}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* No results */}
          {filteredFaqCategories.length === 0 && faqSearch && (
            <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
              <Search className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                {language === 'fr' 
                  ? 'Aucun résultat pour cette recherche'
                  : 'Keine Ergebnisse für diese Suche'
                }
              </p>
            </div>
          )}

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-2xl ${isDark ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100'}`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Vous ne trouvez pas la réponse ?' : 'Sie finden die Antwort nicht?'}
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {language === 'fr' 
                    ? 'Notre équipe est là pour vous aider'
                    : 'Unser Team ist für Sie da'
                  }
                </p>
              </div>
              <a
                href="mailto:support@protocarbon.ch"
                data-testid="contact-support-btn"
                className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                <Mail className="w-5 h-5" />
                {language === 'fr' ? 'Contacter le support' : 'Support kontaktieren'}
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* ==================== TAB 2: EMISSION FACTORS ==================== */}
      {activeTab === 'factors' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={factorSearch}
                onChange={(e) => setFactorSearch(e.target.value)}
                placeholder={language === 'fr' ? 'Rechercher un facteur d\'émission...' : 'Emissionsfaktor suchen...'}
                data-testid="factors-search"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              {factorSearch && (
                <button
                  onClick={() => setFactorSearch('')}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              data-testid="toggle-filters-btn"
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                showFilters || scopeFilter
                  ? 'bg-blue-500 text-white border-blue-500'
                  : isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              {language === 'fr' ? 'Filtres' : 'Filter'}
              {scopeFilter && (
                <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">1</span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
              >
                <p className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  {language === 'fr' ? 'Filtrer par scope' : 'Nach Scope filtern'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setScopeFilter('')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      !scopeFilter
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {language === 'fr' ? 'Tous' : 'Alle'}
                  </button>
                  {Object.entries(scopeConfig).slice(0, 4).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setScopeFilter(scopeFilter === key ? '' : key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        scopeFilter === key
                          ? `bg-${config.color}-500 text-white`
                          : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {language === 'fr' ? config.label_fr : config.label_de}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {filteredFactors.length} {language === 'fr' ? 'facteur(s) trouvé(s)' : 'Faktor(en) gefunden'}
          </p>

          {/* Factors List */}
          {factorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFactors.slice(0, 50).map((factor, idx) => {
                const name = language === 'fr' ? (factor.name_simple_fr || factor.name_fr || factor.name) : (factor.name_simple_de || factor.name_de || factor.name);
                const impacts = factor.impacts || [];
                
                return (
                  <motion.div
                    key={factor.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    onClick={() => setSelectedFactor(factor)}
                    data-testid={`factor-card-${factor.id || idx}`}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700' 
                        : 'bg-white hover:shadow-md shadow-sm border border-gray-100'
                    }`}
                  >
                    <h4 className={`font-medium mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {name}
                    </h4>
                    
                    {/* Subcategory */}
                    {factor.subcategory && (
                      <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        {factor.subcategory}
                      </p>
                    )}
                    
                    {/* Impacts badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {impacts.map((impact, i) => {
                        const color = getScopeColor(impact.scope);
                        return (
                          <span
                            key={`${impact.scope}-${impact.value}-${i}`}
                            className={`px-2 py-0.5 text-xs rounded-full bg-${color}-500/20 text-${color}-500`}
                          >
                            {impact.scope}: {impact.value?.toFixed(2)} {impact.unit}
                          </span>
                        );
                      })}
                    </div>
                    
                    {/* Units & Source */}
                    <div className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        <Tag className="w-3 h-3" />
                        {(factor.input_units || []).slice(0, 3).join(', ')}
                        {(factor.input_units || []).length > 3 && '...'}
                      </span>
                      {factor.source && (
                        <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                          {factor.source}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Show more info */}
          {filteredFactors.length > 50 && (
            <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {language === 'fr' 
                ? `Affichage des 50 premiers résultats sur ${filteredFactors.length}. Affinez votre recherche.`
                : `Anzeige der ersten 50 von ${filteredFactors.length} Ergebnissen. Verfeinern Sie Ihre Suche.`
              }
            </p>
          )}

          {/* No results */}
          {!factorsLoading && filteredFactors.length === 0 && (
            <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
              <Database className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                {language === 'fr' 
                  ? 'Aucun facteur trouvé pour ces critères'
                  : 'Keine Faktoren für diese Kriterien gefunden'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================== FACTOR DETAIL MODAL ==================== */}
      <AnimatePresence>
        {selectedFactor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedFactor(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20">
                      <Database className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'fr' ? 'Détail du facteur' : 'Faktordetails'}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFactor(null)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Name */}
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {language === 'fr' ? 'Nom' : 'Name'}
                  </p>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'fr' ? (selectedFactor.name_simple_fr || selectedFactor.name_fr || selectedFactor.name) : (selectedFactor.name_simple_de || selectedFactor.name_de || selectedFactor.name)}
                  </p>
                </div>

                {/* Subcategory */}
                {selectedFactor.subcategory && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {language === 'fr' ? 'Sous-catégorie' : 'Unterkategorie'}
                    </p>
                    <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                      {selectedFactor.subcategory}
                    </p>
                  </div>
                )}

                {/* Impacts */}
                <div>
                  <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {language === 'fr' ? 'Impacts par scope' : 'Auswirkungen pro Scope'}
                  </p>
                  <div className="space-y-2">
                    {(selectedFactor.impacts || []).map((impact, i) => {
                      const color = getScopeColor(impact.scope);
                      const config = scopeConfig[impact.scope] || scopeConfig.scope3;
                      const Icon = config.icon;
                      return (
                        <div
                          key={`${impact.scope}-${impact.category || i}`}
                          className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                              <Icon className={`w-4 h-4 text-${color}-500`} />
                            </div>
                            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {language === 'fr' ? config.label_fr : config.label_de}
                            </span>
                          </div>
                          <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {impact.value?.toFixed(4)} {impact.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Units */}
                {selectedFactor.input_units?.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {language === 'fr' ? 'Unités acceptées' : 'Akzeptierte Einheiten'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFactor.input_units.map((unit) => (
                        <span
                          key={unit}
                          className={`px-3 py-1 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source & Region */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedFactor.source && (
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'fr' ? 'Source' : 'Quelle'}
                      </p>
                      <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                        {selectedFactor.source}
                      </p>
                    </div>
                  )}
                  {selectedFactor.region && (
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {language === 'fr' ? 'Région' : 'Region'}
                      </p>
                      <p className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                        {selectedFactor.region}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedFactor.tags?.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFactor.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setSelectedFactor(null)}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  {language === 'fr' ? 'Fermer' : 'Schließen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Assistance;
