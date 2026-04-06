import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

export const useAdminExport = () => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();

  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('all');
  const [exportType, setExportType] = useState('full');
  const [loading, setLoading] = useState(false);
  const [loadingFY, setLoadingFY] = useState(true);
  const [result, setResult] = useState(null);

  const [dumpLoading, setDumpLoading] = useState(false);
  const [dumpInfo, setDumpInfo] = useState(null);
  const [dumpInfoLoading, setDumpInfoLoading] = useState(false);
  const [dumpResult, setDumpResult] = useState(null);

  const fetchFiscalYears = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/fiscal-years`);
      setFiscalYears(res.data || []);
    } catch (error) { logger.error('Error fetching fiscal years:', error); }
    finally { setLoadingFY(false); }
  }, []);

  const fetchDumpInfo = useCallback(async () => {
    setDumpInfoLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/export/mongodump/info`);
      setDumpInfo(res.data);
    } catch (error) { logger.error('Error fetching dump info:', error); }
    finally { setDumpInfoLoading(false); }
  }, []);

  useEffect(() => { fetchFiscalYears(); fetchDumpInfo(); }, [fetchFiscalYears, fetchDumpInfo]);

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { if (link.parentNode) document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 200);
  };

  const handleMongoDump = async () => {
    setDumpLoading(true);
    setDumpResult(null);
    try {
      const res = await axios.get(`${API_URL}/api/export/mongodump`, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'];
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `mongodump_${new Date().toISOString().split('T')[0]}.archive`;
      const exportMethod = res.headers['x-export-method'] || 'unknown';
      triggerDownload(res.data, filename);

      const sizeMB = (res.data.size / (1024 * 1024)).toFixed(1);
      const methodLabel = exportMethod === 'mongodump' ? 'mongodump native' : 'BSON Python';
      setDumpResult({ success: true, message: `${t('admin.export.exportSuccess')} — ${filename} (${sizeMB} MB) — ${methodLabel}` });
    } catch (error) {
      logger.error('MongoDB dump error:', error);
      setDumpResult({ success: false, message: `${t('admin.export.exportError')}: ${error.message}` });
    } finally { setDumpLoading(false); }
  };

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      let endpoint = `${API_URL}/api/export/${exportType}`;
      if (selectedFiscalYear !== 'all') endpoint += `?fiscal_year_id=${selectedFiscalYear}`;
      const res = await axios.get(endpoint);

      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const fyName = selectedFiscalYear === 'all' ? 'tous' : (fiscalYears.find(fy => fy.id === selectedFiscalYear)?.name || selectedFiscalYear).replace(/\s+/g, '_');
      const filename = `carbon_export_${exportType}_${fyName}_${new Date().toISOString().split('T')[0]}.json`;
      triggerDownload(blob, filename);

      setResult({ success: true, message: t('admin.export.exportSuccess'), stats: res.data.statistics || { count: res.data[exportType]?.length || 0 } });
    } catch (error) {
      logger.error('Export error:', error);
      setResult({ success: false, message: t('admin.export.exportError') });
    } finally { setLoading(false); }
  };

  return {
    isDark, t, language,
    fiscalYears, selectedFiscalYear, setSelectedFiscalYear,
    exportType, setExportType, loading, loadingFY, result,
    dumpLoading, dumpInfo, dumpInfoLoading, dumpResult,
    handleMongoDump, handleExport,
  };
};
