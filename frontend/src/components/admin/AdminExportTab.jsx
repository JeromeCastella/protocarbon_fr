import React, { useState, useEffect } from 'react';
import { Download, FileJson, CheckCircle, AlertCircle, Loader2, Database, Package, Activity, Layers, FileCode, HardDrive, Shield, Info } from 'lucide-react';
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

  // MongoDB dump state
  const [dumpLoading, setDumpLoading] = useState(false);
  const [dumpInfo, setDumpInfo] = useState(null);
  const [dumpInfoLoading, setDumpInfoLoading] = useState(false);
  const [dumpResult, setDumpResult] = useState(null);

  useEffect(() => {
    fetchFiscalYears();
    fetchDumpInfo();
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

  const fetchDumpInfo = async () => {
    setDumpInfoLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/export/mongodump/info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDumpInfo(data);
      }
    } catch (error) {
      console.error('Error fetching dump info:', error);
    } finally {
      setDumpInfoLoading(false);
    }
  };

  const handleMongoDump = async () => {
    setDumpLoading(true);
    setDumpResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/export/mongodump`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Export failed');
      }

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `mongodump_${new Date().toISOString().split('T')[0]}.archive`;

      const blob = await res.blob();

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 200);

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
      setDumpResult({
        success: true,
        message: language === 'fr'
          ? `Export réussi — ${filename} (${sizeMB} MB)`
          : `Export erfolgreich — ${filename} (${sizeMB} MB)`
      });
    } catch (error) {
      console.error('MongoDB dump error:', error);
      setDumpResult({
        success: false,
        message: language === 'fr'
          ? `Erreur : ${error.message}`
          : `Fehler: ${error.message}`
      });
    } finally {
      setDumpLoading(false);
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
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      
      const fiscalYearName = selectedFiscalYear === 'all' 
        ? 'tous' 
        : (fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name || selectedFiscalYear).replace(/\s+/g, '_');
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `carbon_export_${exportType}_${fiscalYearName}_${timestamp}.json`;
      
      // Try multiple download methods for browser compatibility
      const url = window.URL.createObjectURL(blob);
      
      // Method 1: Modern browsers - use anchor element with download attribute
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Some browsers need the link to be in the DOM
      link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 200);
      
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
      id: 'reference-data', 
      label: language === 'fr' ? 'Données de référence' : 'Referenzdaten',
      description: language === 'fr' ? 'Facteurs d\'émission + sous-catégories + conversions' : 'Emissionsfaktoren + Unterkategorien + Umrechnungen',
      icon: FileCode,
      color: 'orange'
    },
    { 
      id: 'emission-factors', 
      label: language === 'fr' ? 'Facteurs d\'émission' : 'Emissionsfaktoren',
      description: language === 'fr' ? 'Tous les facteurs d\'émission V2' : 'Alle Emissionsfaktoren V2',
      icon: Layers,
      color: 'yellow'
    },
    { 
      id: 'activities', 
      label: language === 'fr' ? 'Activités' : 'Aktivitäten',
      description: language === 'fr' ? 'Données des activités carbone' : 'Kohlenstoffaktivitätsdaten',
      icon: Activity,
      color: 'green'
    },
    { 
      id: 'products', 
      label: language === 'fr' ? 'Produits' : 'Produkte',
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {exportTypes.map(type => {
            const isSelected = exportType === type.id;
            const colorClasses = {
              blue: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500' },
              orange: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500' },
              yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500' },
              green: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500' },
              purple: { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500' }
            };
            const colors = colorClasses[type.color];
            
            return (
              <button
                key={type.id}
                data-testid={`export-type-${type.id}`}
                onClick={() => setExportType(type.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? `${colors.border} ${isDark ? 'bg-slate-700' : 'bg-blue-50'}`
                    : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <type.icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {type.label}
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {type.description}
                </p>
              </button>
            );
          })}
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

      {/* ===================== MONGODB DUMP SECTION ===================== */}
      <div className={`p-6 rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
            <HardDrive className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {language === 'fr' ? 'Export MongoDB (mongodump)' : 'MongoDB-Export (mongodump)'}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr'
                ? 'Export natif de la base complète au format .archive — compatible mongorestore pour migration vers un autre hébergeur.'
                : 'Nativer Export der gesamten Datenbank im .archive-Format — kompatibel mit mongorestore für die Migration zu einem anderen Hoster.'}
            </p>
          </div>
        </div>

        {/* DB Info */}
        {dumpInfoLoading ? (
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr' ? 'Analyse de la base...' : 'Datenbank wird analysiert...'}
            </span>
          </div>
        ) : dumpInfo && (
          <div className={`p-4 rounded-xl mb-5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? 'Base' : 'Datenbank'}
                </p>
                <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="dump-db-name">
                  {dumpInfo.db_name}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Collections
                </p>
                <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="dump-collections-count">
                  {dumpInfo.total_collections}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Documents
                </p>
                <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="dump-total-docs">
                  {dumpInfo.total_documents?.toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {language === 'fr' ? 'Taille données' : 'Datengröße'}
                </p>
                <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="dump-data-size">
                  {dumpInfo.data_size_mb} MB
                </p>
              </div>
            </div>

            {/* Collections detail */}
            <details className="mt-3">
              <summary className={`text-xs cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}>
                {language === 'fr' ? 'Détail des collections' : 'Sammlungsdetails'}
              </summary>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {Object.entries(dumpInfo.collections || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{name}</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{count.toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Security notice */}
        <div className={`p-3 rounded-lg mb-5 flex items-start gap-3 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
          <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <p className={`text-xs ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
            {language === 'fr'
              ? 'Opération en lecture seule — aucun risque pour la base de production. Le fichier est généré côté serveur puis supprimé après téléchargement.'
              : 'Nur-Lese-Operation — kein Risiko für die Produktionsdatenbank. Die Datei wird serverseitig generiert und nach dem Download gelöscht.'}
          </p>
        </div>

        {/* Download button */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {language === 'fr'
                ? 'Restauration : mongorestore --archive=fichier.archive'
                : 'Wiederherstellung: mongorestore --archive=datei.archive'}
            </p>
          </div>
          <button
            data-testid="mongodump-download-btn"
            onClick={handleMongoDump}
            disabled={dumpLoading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              dumpLoading
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {dumpLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'fr' ? 'Export en cours...' : 'Export läuft...'}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {language === 'fr' ? 'Télécharger .archive' : '.archive herunterladen'}
              </>
            )}
          </button>
        </div>

        {/* Result message */}
        {dumpResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
            dumpResult.success
              ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
          }`} data-testid="dump-result-message">
            {dumpResult.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm">{dumpResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExportTab;
