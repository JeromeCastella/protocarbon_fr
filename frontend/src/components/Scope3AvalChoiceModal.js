import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, FileText, ChevronRight, X, 
  Factory, Leaf, Recycle, ArrowLeft
} from 'lucide-react';

/**
 * FEAT-04 — Modale de choix pour le Scope 3 Aval
 * Propose deux modes de saisie : "Fiche produit" (guidé) ou "Saisie directe" (classique)
 * En mode "Saisie directe", affiche les 3 catégories GHG pour sélection.
 */
const Scope3AvalChoiceModal = ({
  isOpen,
  onClose,
  onChooseProductSheet,
  onChooseDirectEntry,
  language,
  isDark
}) => {
  const [showCategories, setShowCategories] = useState(false);

  const directCategories = [
    {
      code: 'transformation_produits',
      name_fr: 'Transformation des produits vendus',
      name_de: 'Verarbeitung verkaufter Produkte',
      description_fr: 'Cat. 3.10 — Émissions liées à la transformation par un tiers',
      description_de: 'Kat. 3.10 — Emissionen aus der Verarbeitung durch Dritte',
      icon: Factory,
      color: '#8b5cf6'
    },
    {
      code: 'utilisation_produits',
      name_fr: 'Utilisation des produits vendus',
      name_de: 'Nutzung verkaufter Produkte',
      description_fr: 'Cat. 3.11 — Émissions liées à l\'utilisation par le client',
      description_de: 'Kat. 3.11 — Emissionen aus der Nutzung durch den Kunden',
      icon: Leaf,
      color: '#06b6d4'
    },
    {
      code: 'fin_vie_produits',
      name_fr: 'Traitement en fin de vie',
      name_de: 'Entsorgung verkaufter Produkte',
      description_fr: 'Cat. 3.12 — Émissions liées au traitement en fin de vie',
      description_de: 'Kat. 3.12 — Emissionen aus der Entsorgung',
      icon: Recycle,
      color: '#f59e0b'
    }
  ];

  const handleClose = () => {
    setShowCategories(false);
    onClose();
  };

  const handleDirectEntry = (categoryCode) => {
    setShowCategories(false);
    onChooseDirectEntry(categoryCode);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
          data-testid="scope3-aval-choice-modal"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showCategories && (
                  <button
                    onClick={() => setShowCategories(false)}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    data-testid="back-to-choice-btn"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="text-lg font-bold">
                    {showCategories
                      ? (language === 'fr' ? 'Choisir une catégorie' : 'Kategorie wählen')
                      : (language === 'fr' ? 'Produits vendus — Mode de saisie' : 'Verkaufte Produkte — Eingabemodus')
                    }
                  </h3>
                  <p className="text-white/70 text-sm">
                    {showCategories
                      ? (language === 'fr' ? 'Scope 3 Aval — Saisie directe' : 'Scope 3 Nachgelagert — Direkteingabe')
                      : (language === 'fr' ? 'Scope 3 Aval' : 'Scope 3 Nachgelagert')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {!showCategories ? (
                /* Step 1: Choice between modes */
                <motion.div
                  key="choice"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {/* Option: Fiche produit */}
                  <button
                    onClick={() => { handleClose(); onChooseProductSheet(); }}
                    data-testid="choice-product-sheet"
                    className={`w-full p-5 rounded-xl text-left transition-all group border-2 ${
                      isDark
                        ? 'border-slate-700 hover:border-purple-500/50 hover:bg-slate-700/50'
                        : 'border-gray-200 hover:border-purple-500/50 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                        <Package className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'fr' ? 'Fiche produit' : 'Produktblatt'}
                          </h4>
                          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'} group-hover:text-purple-500 transition-colors`} />
                        </div>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {language === 'fr'
                            ? 'Parcours guidé : créez une fiche produit structurée avec profil d\'émissions, puis enregistrez vos ventes.'
                            : 'Geführter Prozess: Erstellen Sie ein strukturiertes Produktblatt mit Emissionsprofil und erfassen Sie Ihre Verkäufe.'
                          }
                        </p>
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {language === 'fr' ? 'Recommandé pour un catalogue limité' : 'Empfohlen für kleinen Katalog'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Option: Saisie directe */}
                  <button
                    onClick={() => setShowCategories(true)}
                    data-testid="choice-direct-entry"
                    className={`w-full p-5 rounded-xl text-left transition-all group border-2 ${
                      isDark
                        ? 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-700/50'
                        : 'border-gray-200 hover:border-indigo-500/50 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                        <FileText className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {language === 'fr' ? 'Saisie directe' : 'Direkteingabe'}
                          </h4>
                          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'} group-hover:text-indigo-500 transition-colors`} />
                        </div>
                        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {language === 'fr'
                            ? 'Saisissez directement une activité avec un facteur d\'émission, sans créer de fiche produit.'
                            : 'Geben Sie eine Aktivität direkt mit einem Emissionsfaktor ein, ohne ein Produktblatt zu erstellen.'
                          }
                        </p>
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {language === 'fr' ? 'Multi-références ou données agrégées' : 'Multi-Referenzen oder aggregierte Daten'}
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ) : (
                /* Step 2: Category selection for direct entry */
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  {directCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.code}
                        onClick={() => handleDirectEntry(cat.code)}
                        data-testid={`direct-entry-${cat.code}`}
                        className={`w-full p-4 rounded-xl text-left transition-all group border-2 ${
                          isDark
                            ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="p-2.5 rounded-lg"
                            style={{ backgroundColor: `${cat.color}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {language === 'fr' ? cat.name_fr : cat.name_de}
                            </h4>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {language === 'fr' ? cat.description_fr : cat.description_de}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-gray-300'} group-hover:text-gray-500 transition-colors`} />
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Scope3AvalChoiceModal;
