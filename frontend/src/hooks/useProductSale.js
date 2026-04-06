import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFiscalYear } from '../context/FiscalYearContext';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../utils/apiConfig';

export const useProductSale = (isOpen, preselectedProduct) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const { currentFiscalYear } = useFiscalYear();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(0);

  const [existingSale, setExistingSale] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [saleDate, setSaleDate] = useState('');

  useEffect(() => { if (isOpen) fetchProducts(); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (preselectedProduct) setSelectedProduct(preselectedProduct); }, [preselectedProduct]);
  useEffect(() => {
    if (selectedProduct && currentFiscalYear) fetchProductSales(selectedProduct.id);
    else { setExistingSale(null); setQuantity(0); setIsEditMode(false); }
  }, [selectedProduct, currentFiscalYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data || []);
    } catch (error) { logger.error('Failed to fetch products:', error); }
    finally { setLoading(false); }
  };

  const fetchProductSales = async (productId) => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}/sales?fiscal_year_id=${currentFiscalYear.id}`);
      const sales = response.data || [];
      if (sales.length > 0) {
        const sale = sales[0];
        setExistingSale(sale);
        setQuantity(sale.total_units || 0);
        setIsEditMode(true);
        setSaleDate(sale.sale_date || '');
      } else {
        setExistingSale(null);
        setQuantity(0);
        setIsEditMode(false);
        setSaleDate('');
      }

      const profileRes = await axios.get(`${API_URL}/api/products/${productId}/emission-profiles/active?fiscal_year_id=${currentFiscalYear.id}`);
      setActiveProfile(profileRes.data);
    } catch (error) {
      logger.error('Failed to fetch product sales:', error);
      setExistingSale(null);
      setActiveProfile(null);
    }
  };

  const handleSubmit = async (onSaleRecorded, onClose) => {
    if (!selectedProduct || quantity <= 0) return;
    setSubmitting(true);
    try {
      const payload = {
        product_id: selectedProduct.id,
        total_units: quantity,
        fiscal_year_id: currentFiscalYear?.id,
        sale_date: saleDate || undefined,
      };
      if (existingSale) {
        await axios.put(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/products/${selectedProduct.id}/sales`, payload);
      }
      onSaleRecorded?.();
      onClose?.();
    } catch (error) {
      logger.error('Failed to record sale:', error);
      alert(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (onSaleRecorded, onClose) => {
    if (!existingSale) return;
    try {
      await axios.delete(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.id}`);
      onSaleRecorded?.();
      onClose?.();
    } catch (error) { logger.error('Failed to delete sale:', error); }
    setShowDeleteConfirm(false);
  };

  const estimatedEmissions = activeProfile ? {
    manufacturing: (activeProfile.manufacturing_emissions || 0) * quantity,
    usage: (activeProfile.usage_emissions || 0) * quantity,
    disposal: (activeProfile.disposal_emissions || 0) * quantity,
    total: ((activeProfile.manufacturing_emissions || 0) + (activeProfile.usage_emissions || 0) + (activeProfile.disposal_emissions || 0)) * quantity,
  } : null;

  return {
    isDark, t, language, currentFiscalYear,
    products, loading, submitting,
    selectedProduct, setSelectedProduct,
    quantity, setQuantity,
    existingSale, isEditMode,
    showDeleteConfirm, setShowDeleteConfirm,
    showVersionsModal, setShowVersionsModal,
    activeProfile, saleDate, setSaleDate,
    handleSubmit, handleDelete, fetchProductSales,
    estimatedEmissions,
  };
};
