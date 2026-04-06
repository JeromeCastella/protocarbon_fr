import React from 'react';
import { Download, FileJson, CheckCircle, AlertCircle, Loader2, Database, Package, Activity, Layers, FileCode, HardDrive, Shield } from 'lucide-react';
import { useAdminExport } from '../../hooks/useAdminExport';

const EXPORT_TYPES = [
  { id: 'full', icon: Database, color: 'blue' },
  { id: 'reference-data', icon: FileCode, color: 'orange' },
  { id: 'emission-factors', icon: Layers, color: 'yellow' },
  { id: 'activities', icon: Activity, color: 'green' },
  { id: 'products', icon: Package, color: 'purple' },
];

const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500' },
};

const AdminExportTab = () => {
  const {
    isDark, t,
    fiscalYears, selectedFiscalYear, setSelectedFiscalYear,
    exportType, setExportType, loading, loadingFY, result,
    dumpLoading, dumpInfo, dumpInfoLoading, dumpResult,
    handleMongoDump, handleExport,
  } = useAdminExport();

  const exportTypes = EXPORT_TYPES.map(et => ({
    ...et,
    label: t(`admin.export.${et.id === 'full' ? 'fullBackup' : et.id === 'reference-data' ? 'referenceData' : et.id === 'emission-factors' ? 'emissionFactors' : et.id}`),
    description: t(`admin.export.${et.id === 'full' ? 'fullBackupDesc' : et.id === 'reference-data' ? 'referenceDataDesc' : et.id === 'emission-factors' ? 'emissionFactorsDesc' : et.id + 'Desc'}`),
  }));

  return (
    <div className="space-y-6">
      {/* Export Type Selection */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('admin.export.exportType')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {exportTypes.map(type => {
            const isSelected = exportType === type.id;
            const colors = COLOR_CLASSES[type.color];
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
          {t('admin.export.fiscalYear')}
        </h3>
        {loadingFY ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('common.loading')}</span>
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
              {t('admin.export.allFiscalYears')}
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
              {t('admin.export.startExport')}
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {exportTypes.find(et => et.id === exportType)?.label}
            </p>
          </div>
          <button
            data-testid="export-download-btn"
            onClick={handleExport}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />{t('admin.export.exporting')}</> : <><Download className="w-5 h-5" />{t('admin.export.downloadJson')}</>}
          </button>
        </div>
        <ResultMessage result={result} isDark={isDark} />
      </div>

      {/* Info Box */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <FileJson className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h4 className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>{t('admin.export.jsonFormat')}</h4>
            <p className={`text-sm mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>{t('admin.export.jsonFormatDesc')}</p>
          </div>
        </div>
      </div>

      {/* MongoDB Dump Section */}
      <MongoDumpSection
        isDark={isDark}
        t={t}
        dumpInfo={dumpInfo}
        dumpInfoLoading={dumpInfoLoading}
        dumpLoading={dumpLoading}
        dumpResult={dumpResult}
        handleMongoDump={handleMongoDump}
      />
    </div>
  );
};

const ResultMessage = ({ result, isDark }) => {
  if (!result) return null;
  return (
    <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
      result.success
        ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
        : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
    }`}>
      {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span>{result.message}</span>
      {result.success && result.stats && result.stats.total_activities !== undefined && (
        <span className="ml-auto text-sm opacity-75">
          {result.stats.total_activities} activités, {result.stats.total_products} produits
        </span>
      )}
    </div>
  );
};

const MongoDumpSection = ({ isDark, t, dumpInfo, dumpInfoLoading, dumpLoading, dumpResult, handleMongoDump }) => (
  <div className={`p-6 rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} shadow-sm`}>
    <div className="flex items-start gap-4 mb-5">
      <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
        <HardDrive className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
      </div>
      <div className="flex-1">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('admin.export.mongoExport')}</h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('admin.export.mongoExportDesc')}</p>
      </div>
    </div>

    {dumpInfoLoading ? (
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('admin.export.analyzing')}</span>
      </div>
    ) : dumpInfo && (
      <div className={`p-4 rounded-xl mb-5 ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('admin.export.database'), value: dumpInfo.db_name, testId: 'dump-db-name' },
            { label: 'Collections', value: dumpInfo.total_collections, testId: 'dump-collections-count' },
            { label: 'Documents', value: dumpInfo.total_documents?.toLocaleString('fr-FR'), testId: 'dump-total-docs' },
            { label: t('admin.export.dataSize'), value: `${dumpInfo.data_size_mb} MB`, testId: 'dump-data-size' },
          ].map(item => (
            <div key={item.testId}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{item.label}</p>
              <p className={`font-mono text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid={item.testId}>{item.value}</p>
            </div>
          ))}
        </div>
        <details className="mt-3">
          <summary className={`text-xs cursor-pointer select-none ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}>
            {t('admin.export.collectionDetails')}
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

    <div className={`p-3 rounded-lg mb-5 flex items-start gap-3 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
      <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
      <p className={`text-xs ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>{t('admin.export.securityNotice')}</p>
    </div>

    <div className="flex items-center justify-between">
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t('admin.export.restoreHint')}</p>
      <button
        data-testid="mongodump-download-btn"
        onClick={handleMongoDump}
        disabled={dumpLoading}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
          dumpLoading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {dumpLoading ? <><Loader2 className="w-5 h-5 animate-spin" />{t('admin.export.exporting')}</> : <><Download className="w-5 h-5" />{t('admin.export.downloadDump')}</>}
      </button>
    </div>

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
);

export default AdminExportTab;
