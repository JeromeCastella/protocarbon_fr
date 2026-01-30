import React, { useState, useEffect } from 'react';
import { Download, FileJson, CheckCircle, AlertCircle, Loader2, Database, Package, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminExportTab = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('all');
  const [exportType, setExportType] = useState('full');
  const [loading, setLoading] = useState(false);
  const [loadingFY, setLoadingFY] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const fetchFiscalYears = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/fiscal-years`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiscalYears(data);
      }
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
    } finally {
      setLoadingFY(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const token = localStorage.getItem('token');
      let endpoint = `${API_URL}/api/export/${exportType}`;
      
      if (selectedFiscalYear !== 'all') {
        endpoint += `?fiscal_year_id=${selectedFiscalYear}`;
      }
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Export failed');
      }
      
      const data = await res.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fiscalYearName = selectedFiscalYear === 'all' 
        ? 'all' 
        : fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name || selectedFiscalYear;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `carbon_export_${exportType}_${fiscalYearName}_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setResult({
        success: true,
        message: language === 'fr' ? 'Export réussi !' : 'Export erfolgreich!',
        stats: data.statistics || { count: data[exportType]?.length || 0 }
      });
    } catch (error) {
      console.error('Export error:', error);
      setResult({
        success: false,
        message: language === 'fr' ? 'Erreur lors de l\'export' : 'Exportfehler'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportTypes = [
    { 
      id: 'full', 
      label: language === 'fr' ? 'Sauvegarde complète' : 'Vollständige Sicherung',
      description: language === 'fr' ? 'Toutes les données (activités, produits, facteurs, etc.)' : 'Alle Daten (Aktivitäten, Produkte, Faktoren, etc.)',
      icon: Database,
      color: 'blue'
    },
    { 
      id: 'activities', 
      label: language === 'fr' ? 'Activités uniquement' : 'Nur Aktivitäten',
      description: language === 'fr' ? 'Données des activités carbone' : 'Kohlenstoffaktivitätsdaten',
      icon: Activity,
      color: 'green'
    },
    { 
      id: 'products', 
      label: language === 'fr' ? 'Produits uniquement' : 'Nur Produkte',
      description: language === 'fr' ? 'Catalogue des produits et émissions' : 'Produktkatalog und Emissionen',
      icon: Package,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Export Type Selection */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {language === 'fr' ? 'Type d\'export' : 'Exporttyp'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportTypes.map(type => (
            <button
              key={type.id}
              data-testid={`export-type-${type.id}`}
              onClick={() => setExportType(type.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                exportType === type.id
                  ? `border-${type.color}-500 ${isDark ? 'bg-slate-700' : 'bg-blue-50'}`
                  : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-${type.color}-500/20`}>
                  <type.icon className={`w-5 h-5 text-${type.color}-500`} />
                </div>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {type.label}
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {type.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Fiscal Year Selection */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {language === 'fr' ? 'Exercice fiscal' : 'Geschäftsjahr'}
        </h3>
        
        {loadingFY ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              {language === 'fr' ? 'Chargement...' : 'Laden...'}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="export-fy-all"
              onClick={() => setSelectedFiscalYear('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedFiscalYear === 'all'
                  ? 'bg-blue-500 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {language === 'fr' ? 'Tous les exercices' : 'Alle Geschäftsjahre'}
            </button>
            
            {fiscalYears.map(fy => (
              <button
                key={fy.id}
                data-testid={`export-fy-${fy.id}`}
                onClick={() => setSelectedFiscalYear(fy.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedFiscalYear === fy.id
                    ? 'bg-blue-500 text-white'
                    : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {fy.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {language === 'fr' ? 'Lancer l\'export' : 'Export starten'}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' 
                ? `Export ${exportTypes.find(t => t.id === exportType)?.label} en format JSON`
                : `${exportTypes.find(t => t.id === exportType)?.label} im JSON-Format exportieren`}
            </p>
          </div>
          
          <button
            data-testid="export-download-btn"
            onClick={handleExport}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'fr' ? 'Export en cours...' : 'Export läuft...'}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {language === 'fr' ? 'Télécharger JSON' : 'JSON herunterladen'}
              </>
            )}
          </button>
        </div>
        
        {/* Result message */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
            result.success 
              ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{result.message}</span>
            {result.success && result.stats && (
              <span className="ml-auto text-sm opacity-75">
                {result.stats.total_activities !== undefined && (
                  `${result.stats.total_activities} activités, ${result.stats.total_products} produits`
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <FileJson className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h4 className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              {language === 'fr' ? 'Format JSON' : 'JSON-Format'}
            </h4>
            <p className={`text-sm mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>
              {language === 'fr' 
                ? 'Le fichier JSON exporté peut être utilisé pour la sauvegarde, la migration de données, ou l\'intégration avec d\'autres systèmes.'
                : 'Die exportierte JSON-Datei kann für Backups, Datenmigration oder die Integration mit anderen Systemen verwendet werden.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExportTab;
