import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Calendar, Factory, Zap, X, Table, ArrowRight, Package,
  RefreshCw, Info, PlusCircle
} from 'lucide-react';
import ProductSaleModal from '../components/ProductSaleModal';
import GuidedEntryModal from '../components/GuidedEntryModal';
import SaleEditModal from '../components/SaleEditModal';
import Scope3AvalChoiceModal from '../components/Scope3AvalChoiceModal';
import TableViewPanel from '../components/data-entry/TableViewPanel';
import GlobalFactorSearch from '../components/data-entry/GlobalFactorSearch';
import { useDataEntry } from '../hooks/useDataEntry';
import {
  PRODUCT_SALE_CATEGORIES, iconMap, formatEmissions, formatEmissionsForTable,
} from '../components/data-entry/dataEntryConstants';

const DataEntry = () => {
  const { isDark } = useTheme();
  const {
    t, language, fiscalYears, currentFiscalYear,
    activeScope, setActiveScope, categories, activities, summary, categoryStats, loading,
    showModal, setShowModal, selectedCategory,
    showTableView, setShowTableView, tableViewScope, editingActivityData, setEditingActivityData,
    confirmDialog, setConfirmDialog,
    showProductSaleModal, setShowProductSaleModal,
    showScope3AvalChoice, setShowScope3AvalChoice,
    showSaleEditModal, setShowSaleEditModal, editingSaleId, setEditingSaleId, editingProductId, setEditingProductId,
    showExpertFactors, toggleExpertFactors, preSelectedFactor, setPreSelectedFactor,
    showCategory33Message, setShowCategory33Message,
    scopes, scopeCategories, scopeLabels,
    getProductSalesCount, handleCategoryClick, handleEditActivityInModal, handleActivitySubmit,
    openTableView, openFullTableView, getScopeActivities,
    handleDeleteActivity, handleUpdateActivity, getCategoryName,
    handleSearchFactorSelect, fetchData,
  } = useDataEntry();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!fiscalYears || fiscalYears.length === 0) {
    return <EmptyFiscalYearState isDark={isDark} language={language} />;
  }

  return (
    <div data-testid="data-entry-page" className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dataEntry.title')}
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('dataEntry.subtitle')}
          </p>
        </div>

        <div className="mb-6">
          <GlobalFactorSearch
            isDark={isDark}
            showExpertFactors={showExpertFactors}
            onToggleExpert={toggleExpertFactors}
            onSelectFactor={handleSearchFactorSelect}
          />
        </div>

        <div className="h-2"></div>

        {/* Scope Tabs */}
        <div className={`flex gap-2 p-1 rounded-xl mb-6 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
          {scopes.map(scope => (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id)}
              data-testid={`scope-tab-${scope.id}`}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                activeScope === scope.id
                  ? `${scope.color} text-white shadow-lg`
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="text-sm">{scope.name}</div>
              <div className="text-xs opacity-80">{scope.subtitle}</div>
            </button>
          ))}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scopeCategories.map((category, index) => {
            const IconComponent = iconMap[category.icon] || Factory;
            const count = category.code === 'produits_vendus'
              ? getProductSalesCount()
              : (categoryStats[category.code]?.count || 0);
            return (
              <motion.div
                key={category.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category)}
                data-testid={`category-card-${category.code}`}
                className="relative cursor-pointer"
              >
                <div
                  className="p-6 rounded-2xl text-white min-h-[140px] flex flex-col justify-between"
                  style={{ backgroundColor: category.color }}
                >
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10" style={{ color: category.color }}>
                      {count}
                    </div>
                  )}
                  <IconComponent className="w-10 h-10 opacity-90" />
                  <div>
                    <p className="font-medium text-sm leading-tight">
                      {language === 'fr' ? category.name_fr : category.name_de}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar */}
      <SidebarProgress
        isDark={isDark}
        t={t}
        summary={summary}
        scopes={scopes}
        getScopeActivities={getScopeActivities}
        openTableView={openTableView}
        openFullTableView={openFullTableView}
      />

      {/* Modals */}
      <GuidedEntryModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingActivityData(null); setPreSelectedFactor(null); }}
        category={selectedCategory}
        scope={preSelectedFactor ? (preSelectedFactor.scope || selectedCategory?.scope || activeScope) : activeScope}
        language={language}
        isDark={isDark}
        onSubmit={handleActivitySubmit}
        editingActivity={editingActivityData}
        preSelectedFactor={preSelectedFactor}
        showExpertFactors={showExpertFactors}
        onToggleExpert={toggleExpertFactors}
      />

      <AnimatePresence>
        {showTableView && (
          <TableViewPanel
            isDark={isDark}
            tableViewScope={tableViewScope}
            scopeLabels={scopeLabels}
            scopes={scopes}
            getScopeActivities={getScopeActivities}
            getCategoryName={getCategoryName}
            summary={summary}
            formatEmissions={formatEmissions}
            formatEmissionsForTable={formatEmissionsForTable}
            handleEditActivityInModal={handleEditActivityInModal}
            handleDeleteActivity={handleDeleteActivity}
            PRODUCT_SALE_CATEGORIES={PRODUCT_SALE_CATEGORIES}
            onClose={() => setShowTableView(false)}
          />
        )}
      </AnimatePresence>

      <Scope3AvalChoiceModal
        isOpen={showScope3AvalChoice}
        onClose={() => setShowScope3AvalChoice(false)}
        onChooseProductSheet={() => setShowProductSaleModal(true)}
        onChooseDirectEntry={(categoryCode) => {
          const cat = categories.find(c => c.code === categoryCode);
          if (cat) {
            setEditingActivityData(null);
            setShowModal(true);
          }
        }}
        language={language}
        isDark={isDark}
      />

      <ProductSaleModal
        isOpen={showProductSaleModal}
        onClose={() => setShowProductSaleModal(false)}
        onSaleRecorded={fetchData}
      />

      <AnimatePresence>
        {showCategory33Message && (
          <Category33Modal isDark={isDark} t={t} onClose={() => setShowCategory33Message(false)} />
        )}
      </AnimatePresence>

      <SaleEditModal
        isOpen={showSaleEditModal}
        onClose={() => { setShowSaleEditModal(false); setEditingSaleId(null); setEditingProductId(null); }}
        saleId={editingSaleId}
        productId={editingProductId}
        onSaleUpdated={fetchData}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDark={isDark}
        variant="danger"
      />
    </div>
  );
};

/* ===== Sub-components extracted from the monolith ===== */

const EmptyFiscalYearState = ({ isDark, language }) => (
  <div data-testid="data-entry-empty-state" className="flex items-center justify-center min-h-[60vh]">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-lg w-full text-center p-8 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}
    >
      <div className="relative mb-6">
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
          <Calendar className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className={`absolute -bottom-1 -right-1 left-1/2 ml-6 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}
        >
          <PlusCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        </motion.div>
      </div>
      <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {language === 'fr' ? 'Créez votre premier exercice fiscal' : 'Erstellen Sie Ihr erstes Geschäftsjahr'}
      </h2>
      <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
        {language === 'fr'
          ? 'Pour commencer à saisir vos données d\'émissions, vous devez d\'abord créer un exercice fiscal. Cela permettra d\'organiser vos données par période.'
          : 'Um mit der Eingabe Ihrer Emissionsdaten zu beginnen, müssen Sie zunächst ein Geschäftsjahr erstellen. Dadurch können Ihre Daten nach Zeitraum organisiert werden.'
        }
      </p>
      <div className={`rounded-xl p-4 mb-6 text-left ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {language === 'fr'
              ? 'Un exercice fiscal correspond généralement à une année calendaire (janvier-décembre) ou à l\'année comptable de votre entreprise.'
              : 'Ein Geschäftsjahr entspricht in der Regel einem Kalenderjahr (Januar-Dezember) oder dem Buchhaltungsjahr Ihres Unternehmens.'
            }
          </div>
        </div>
      </div>
      <Link
        to="/general-info"
        data-testid="create-fiscal-year-btn"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
      >
        <PlusCircle className="w-5 h-5" />
        {language === 'fr' ? 'Créer un exercice fiscal' : 'Geschäftsjahr erstellen'}
      </Link>
      <p className={`mt-4 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
        {language === 'fr' ? 'Vous serez redirigé vers les ' : 'Sie werden zu den '}
        <Link to="/general-info" className="text-blue-500 hover:underline">
          {language === 'fr' ? 'informations générales' : 'allgemeinen Informationen'}
        </Link>
      </p>
    </motion.div>
  </div>
);

const SidebarProgress = ({ isDark, t, summary, scopes, getScopeActivities, openTableView, openFullTableView }) => (
  <div className="w-80 space-y-6">
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={openFullTableView}
      data-testid="total-balance-card"
      className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all hover:scale-[1.02] hover:shadow-xl"
    >
      <div className="flex items-center justify-between">
        <p className="text-blue-100 text-sm">{t('dataEntry.totalBalance')}</p>
        <Table className="w-5 h-5 text-blue-200" />
      </div>
      <h2 className="text-4xl font-bold mt-1" data-testid="sidebar-total-emissions">
        {formatEmissions(summary?.total_emissions).value}
      </h2>
      <p className="text-blue-200 text-sm">{formatEmissions(summary?.total_emissions).unit}</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (summary?.total_emissions || 0) / 100)}%` }}
          />
        </div>
        <span className="text-sm">
          {Math.round(Object.values(summary?.scope_completion || {}).reduce((a, b) => a + b.percentage, 0) / 4)}% {t('dataEntry.completed')}
        </span>
      </div>
      <p className="text-xs text-blue-200 mt-3 flex items-center gap-1">
        <ArrowRight className="w-3 h-3" />
        Cliquer pour voir le détail complet
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}
    >
      <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {t('dataEntry.progressByScope')}
      </h3>
      <div className="space-y-4">
        {Object.entries(summary?.scope_completion || {}).map(([scope, data]) => {
          const scopeConfig = scopes.find(s => s.id === scope);
          const scopeActivitiesCount = getScopeActivities(scope).length;
          return (
            <div
              key={scope}
              onClick={() => openTableView(scope)}
              className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {scopeConfig?.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatEmissions(summary?.scope_emissions?.[scope]).value}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {formatEmissions(summary?.scope_emissions?.[scope]).unit}
                  </span>
                  {scopeActivitiesCount > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${scopeConfig?.color} text-white`}>
                      {scopeActivitiesCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                  {data.categories_filled}/{data.total_categories} {t('dataEntry.categories')}
                </span>
                <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {data.percentage}%
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-200'} overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.percentage}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${scopeConfig?.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  </div>
);

const Category33Modal = ({ isDark, t, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl overflow-hidden`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{t('dataEntry.category33.title')}</h3>
            <p className="text-white/80 text-sm">Scope 3.3</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <p className={`${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
          {t('dataEntry.category33.message')}
        </p>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <RefreshCw className="w-5 h-5 text-amber-500" />
            </div>
            <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
              {t('dataEntry.category33.autoCalculated')}
            </p>
          </div>
        </div>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('dataEntry.category33.noAction')}
        </p>
      </div>
      <div className={`p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default DataEntry;
