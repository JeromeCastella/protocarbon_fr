import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal de confirmation personnalisé pour remplacer window.confirm()
 * qui est bloqué dans les environnements sandbox
 */
const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmer", 
  message = "Êtes-vous sûr ?",
  confirmText = "Confirmer",
  cancelText = "Annuler",
  isDark = false,
  variant = "danger" // "danger" | "warning" | "info"
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      iconBg: isDark ? 'bg-red-500/20' : 'bg-red-100',
      confirmBtn: 'bg-red-500 hover:bg-red-600 text-white'
    },
    warning: {
      icon: 'text-amber-500',
      iconBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white'
    },
    info: {
      icon: 'text-blue-500',
      iconBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      confirmBtn: 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
            isDark ? 'bg-slate-800' : 'bg-white'
          } p-6`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
              <AlertTriangle className={`w-8 h-8 ${styles.icon}`} />
            </div>

            {/* Title */}
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>

            {/* Message */}
            <p className={`mb-6 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              {message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${styles.confirmBtn}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
