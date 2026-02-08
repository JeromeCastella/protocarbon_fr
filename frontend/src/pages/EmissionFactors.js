import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Database, 
  Search, 
  Tag,
  MapPin,
  Info,
  Download,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const EmissionFactors = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScope, setSelectedScope] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/emission-factors`);
      setFactors(response.data || []);
    } catch (error) {
      console.error('Failed to fetch emission factors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export emission factors to JSON file
  const handleExportJSON = async () => {
    setExporting(true);
    try {
      // Get token from localStorage for authenticated request
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/export/emission-factors`, { headers });
      const data = response.data;
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emission_factors_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export emission factors:', error);
      alert('Erreur lors de l\'export des facteurs d\'émission');
    } finally {
      setExporting(false);
    }
  };

  // Export emission factors to CSV file
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Get token from localStorage for authenticated request
      const token = localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/export/emission-factors`, { headers: authHeaders });
      const factors = response.data.emission_factors || [];
      
      // Build CSV content
      const csvHeaders = [
        'id',
        'name_fr',
        'name_de',
        'subcategory',
        'input_units',
        'default_unit',
        'impacts_count',
        'impact_1_scope',
        'impact_1_value',
        'impact_1_unit',
        'impact_2_scope',
        'impact_2_value',
        'impact_2_unit',
        'impact_3_scope',
        'impact_3_value',
        'impact_3_unit',
        'impact_4_scope',
        'impact_4_value',
        'impact_4_unit',
        'source',
        'region',
        'year',
        'tags'
      ];
      
      const rows = factors.map(f => {
        const impacts = f.impacts || [];
        const impact1 = impacts[0] || {};
        const impact2 = impacts[1] || {};
        const impact3 = impacts[2] || {};
        const impact4 = impacts[3] || {};
        
        return [
          f.id || '',
          `"${(f.name_fr || '').replace(/"/g, '""')}"`,
          `"${(f.name_de || '').replace(/"/g, '""')}"`,
          f.subcategory || '',
          `"${(f.input_units || []).join(', ')}"`,
          f.default_unit || '',
          impacts.length,
          impact1.scope || '',
          impact1.value || '',
          impact1.unit || '',
          impact2.scope || '',
          impact2.value || '',
          impact2.unit || '',
          impact3.scope || '',
          impact3.value || '',
          impact3.unit || '',
          impact4.scope || '',
          impact4.value || '',
          impact4.unit || '',
          `"${(f.source || '').replace(/"/g, '""')}"`,
          f.region || '',
          f.year || '',
          `"${(f.tags || []).join(', ')}"`
        ].join(',');
      });
      
      const csvContent = [csvHeaders.join(','), ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emission_factors_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export emission factors:', error);
      alert('Erreur lors de l\'export des facteurs d\'émission');
    } finally {
      setExporting(false);
    }
  };

  // Helper to get factor name based on language
  const getFactorName = (factor) => {
    if (factor.name_fr || factor.name_de) {
      return language === 'de' ? (factor.name_de || factor.name_fr) : (factor.name_fr || factor.name_de);
    }
    return factor.name || 'Sans nom';
  };

  // Helper to get primary impact (first one or scope2 preferred)
  const getPrimaryImpact = (factor) => {
    if (factor.impacts && factor.impacts.length > 0) {
      // Prefer scope2 or scope1, otherwise first impact
      const scope2 = factor.impacts.find(i => i.scope === 'scope2');
      const scope1 = factor.impacts.find(i => i.scope === 'scope1');
      return scope2 || scope1 || factor.impacts[0];
    }
    // Legacy format
    return { scope: factor.scope, category: factor.category, value: factor.value, unit: factor.unit };
  };

  // Helper to get all scopes from impacts
  const getFactorScopes = (factor) => {
    if (factor.impacts && factor.impacts.length > 0) {
      return [...new Set(factor.impacts.map(i => i.scope))];
    }
    return factor.scope ? [factor.scope] : [];
  };

  const filteredFactors = factors.filter(factor => {
    const name = getFactorName(factor);
    const matchesSearch = !searchTerm || 
      name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factor.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Check if any impact matches the selected scope
    const scopes = getFactorScopes(factor);
    const matchesScope = !selectedScope || scopes.some(s => s === selectedScope || s?.startsWith(selectedScope));
    
    return matchesSearch && matchesScope;
  });

  const groupedFactors = filteredFactors.reduce((acc, factor) => {
    // Use subcategory or first impact category
    const category = factor.subcategory || factor.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(factor);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div data-testid="emission-factors-page" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('emissionFactors.title')}
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('emissionFactors.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('emissionFactors.searchPlaceholder')}
              data-testid="ef-search-input"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
        </div>
        <select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          data-testid="ef-scope-filter"
          className={`px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 ${
            isDark 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <option value="">Tous les scopes</option>
          <option value="scope1">Scope 1</option>
          <option value="scope2">Scope 2</option>
          <option value="scope3_amont">Scope 3 Amont</option>
          <option value="scope3_aval">Scope 3 Aval</option>
        </select>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            data-testid="export-csv-btn"
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' 
                : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
            } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={exporting}
            data-testid="export-json-btn"
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' 
                : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
            } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total facteurs</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{factors.length}</p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 1</p>
          <p className={`text-2xl font-bold text-blue-500`}>
            {factors.filter(f => getFactorScopes(f).includes('scope1')).length}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 2</p>
          <p className={`text-2xl font-bold text-cyan-500`}>
            {factors.filter(f => getFactorScopes(f).includes('scope2')).length}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scope 3</p>
          <p className={`text-2xl font-bold text-purple-500`}>
            {factors.filter(f => getFactorScopes(f).some(s => s?.startsWith('scope3'))).length}
          </p>
        </div>
      </div>

      {/* Factors List */}
      <div className="space-y-6">
        {Object.entries(groupedFactors).map(([category, categoryFactors]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}
          >
            <div className={`px-6 py-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t(`categories.${category}`) || category}
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {categoryFactors.map((factor, index) => {
                const primaryImpact = getPrimaryImpact(factor);
                const scopes = getFactorScopes(factor);
                const factorName = getFactorName(factor);
                
                return (
                  <div
                    key={factor.id || index}
                    className={`px-6 py-4 ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {factorName}
                          </h4>
                          {scopes.map(scope => (
                            <span key={scope} className={`px-2 py-1 text-xs rounded-lg ${
                              scope === 'scope1' ? 'bg-blue-100 text-blue-600' :
                              scope === 'scope2' ? 'bg-cyan-100 text-cyan-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {scope?.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Database className="w-4 h-4 text-green-500" />
                            <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>
                              {primaryImpact?.value} {primaryImpact?.unit || factor.default_unit}
                            </span>
                          </div>
                          {factor.region && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                                {factor.region}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Info className="w-4 h-4 text-blue-500" />
                            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                              {factor.source}
                            </span>
                          </div>
                        </div>
                        {factor.tags && factor.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {factor.tags.map(tag => (
                              <span
                                key={tag}
                                className={`px-2 py-1 text-xs rounded-lg ${
                                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Tag className="w-3 h-3 inline mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {primaryImpact?.value}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {primaryImpact?.unit || factor.default_unit}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredFactors.length === 0 && (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
          <Database className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
            Aucun facteur d&apos;émission trouvé pour cette recherche.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmissionFactors;
