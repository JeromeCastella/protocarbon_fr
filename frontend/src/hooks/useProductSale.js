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
      const allProducts = response.data || [];
      setProducts(allProducts);
      if (preselectedProduct) {
        const found = allProducts.find(p => p.id === preselectedProduct.id);
        if (found) setSelectedProduct(found);
      }
    } catch (error) { logger.error('Failed to fetch products:', error); }
    finally { setLoading(false); }
  };

  const fetchProductSales = async (productId) => {
    try {
      const fiscalYearParam = currentFiscalYear?.id ? `?fiscal_year_id=${currentFiscalYear.id}` : '';
      const [salesResponse, profilesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/products/${productId}/sales${fiscalYearParam}`),
        axios.get(`${API_URL}/api/products/${productId}/emission-profiles`),
      ]);

      const sales = salesResponse.data?.sales || [];

      // Determine active emission profile for this fiscal year
      const defaultProfile = profilesResponse.data?.default_profile;
      const profiles = profilesResponse.data?.profiles || [];
      const specificProfile = profiles.find(p => p.fiscal_year_id === currentFiscalYear?.id);

      if (specificProfile) {
        setActiveProfile({ ...specificProfile, source: 'specific' });
      } else if (defaultProfile) {
        setActiveProfile({ ...defaultProfile, source: 'default' });
      }

      if (sales.length > 0) {
        const sale = sales[0];
        setExistingSale(sale);
        setQuantity(sale.quantity || 0);
        setIsEditMode(true);
        if (sale.date) setSaleDate(sale.date);
      } else {
        setExistingSale(null);
        setQuantity(0);
        setIsEditMode(false);
        if (currentFiscalYear?.start_date) setSaleDate(currentFiscalYear.start_date);
        else setSaleDate('');
      }
    } catch (error) {
      logger.error('Failed to fetch product sales:', error);
      setExistingSale(null);
      setQuantity(0);
      setIsEditMode(false);
      setActiveProfile(null);
    }
  };

  const handleSubmit = async (onSaleRecorded, onClose) => {
    if (!selectedProduct || quantity <= 0) return;
    setSubmitting(true);
    try {
      if (isEditMode && existingSale?.sale_id) {
        await axios.put(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.sale_id}`, {
          quantity: quantity,
        });
      } else {
        await axios.post(`${API_URL}/api/products/${selectedProduct.id}/sales`, {
          product_id: selectedProduct.id,
          quantity: quantity,
          fiscal_year_id: currentFiscalYear?.id,
        });
      }
      onSaleRecorded?.();
      onClose?.();
    } catch (error) {
      logger.error('Failed to save sale:', error);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (onSaleRecorded, onClose) => {
    if (!selectedProduct || !existingSale?.sale_id) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API_URL}/api/products/${selectedProduct.id}/sales/${existingSale.sale_id}`);
      onSaleRecorded?.();
      onClose?.();
    } catch (error) { logger.error('Failed to delete sale:', error); }
    finally { setSubmitting(false); setShowDeleteConfirm(false); }
  };

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
  };
};
