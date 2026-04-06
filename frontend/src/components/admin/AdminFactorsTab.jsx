import React from 'react';
import useAdminFactors from '../../hooks/useAdminFactors';
import {
  FactorsToolbar,
  FactorsTable,
  FactorsPagination,
  FactorFormModal,
  ImportModal,
  VersionModal,
  HistoryModal
} from './factors';

const AdminFactorsTab = ({ factors, subcategories, pagination, onPageChange, onRefetch }) => {
  const hook = useAdminFactors({ subcategories, onPageChange, onRefetch });

  return (
    <div className="space-y-4">
      <FactorsToolbar
        search={hook.search}
        onSearchChange={hook.handleSearchChange}
        expertFilter={hook.expertFilter}
        onFilterChange={hook.handleFilterChange}
        onAdd={hook.openNewFactorModal}
        onExport={hook.handleExportV2}
        onImport={() => hook.setShowImportModal(true)}
      />

      <FactorsTable
        factors={factors}
        onViewHistory={hook.handleViewHistory}
        onCreateNewVersion={hook.handleCreateNewVersion}
        onEdit={hook.handleEditFactor}
        onDuplicate={hook.handleDuplicateFactor}
        onSoftDelete={hook.handleSoftDelete}
        onDelete={hook.handleDeleteFactor}
      />

      <FactorsPagination
        pagination={pagination}
        search={hook.search}
        expertFilter={hook.expertFilter}
        onPageChange={onPageChange}
      />

      <FactorFormModal
        show={hook.showFactorModal}
        onClose={() => hook.setShowFactorModal(false)}
        editingFactor={hook.editingFactor}
        factorForm={hook.factorForm}
        setFactorForm={hook.setFactorForm}
        showAdvanced={hook.showAdvanced}
        setShowAdvanced={hook.setShowAdvanced}
        subcategories={subcategories}
        onSubcategoryChange={hook.handleSubcategoryChange}
        onUpdateImpact={hook.updateImpactByKey}
        onAddInputUnit={hook.addInputUnit}
        onRemoveInputUnit={hook.removeInputUnit}
        getLinkedCategories={hook.getLinkedCategories}
        getCategoriesForImpactType={hook.getCategoriesForImpactType}
        onSave={hook.handleSaveFactor}
      />

      <ImportModal
        show={hook.showImportModal}
        onClose={() => hook.setShowImportModal(false)}
        importData={hook.importData}
        setImportData={hook.setImportData}
        importReplaceAll={hook.importReplaceAll}
        setImportReplaceAll={hook.setImportReplaceAll}
        onImport={hook.handleImportV2}
      />

      <VersionModal
        show={hook.showVersionModal}
        onClose={() => hook.setShowVersionModal(false)}
        versioningFactor={hook.versioningFactor}
        versionForm={hook.versionForm}
        setVersionForm={hook.setVersionForm}
        onUpdateImpact={hook.updateVersionImpact}
        onSave={hook.handleSaveNewVersion}
      />

      <HistoryModal
        show={hook.showHistoryModal}
        onClose={() => hook.setShowHistoryModal(false)}
        factorHistory={hook.factorHistory}
      />
    </div>
  );
};

export default AdminFactorsTab;
