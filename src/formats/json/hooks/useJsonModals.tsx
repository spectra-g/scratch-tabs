import React from "react";
import { useJsonModalsStore } from "../../../stores/jsonModalsStore";
import { StringifyModal } from "../components/modals/StringifyModal";
import { CodeGenerationModal } from "../components/modals/CodeGenerationModal";
import { JsonTreeViewModalWrapper } from "../components/modals/JsonTreeViewModalWrapper";
import { SchemaValidationModal } from "../components/modals/SchemaValidationModal";
import { JsonStructureComparisonModal } from "../components/modals/JsonStructureComparisonModal";
import { ExtractDataModal } from "../components/modals/ExtractDataModal";
import { JsonEqualityCheckModal } from "../components/modals/JsonEqualityCheckModal";
import { CsvExportOptionsModal } from "../components/modals/CsvExportOptionsModal";

export const useJsonModals = () => {
  const {
    modalState,
    openStringifyModal,
    openCodeGenerationModal,
    openTreeViewModal,
    openSchemaValidationModal,
    openStructureComparisonModal,
    openExtractDataModal,
    openEqualityCheckModal,
    openCsvExportOptionsModal,
    closeModal,
  } = useJsonModalsStore();

  const renderModal = (): React.ReactNode => {
    switch (modalState.type) {
      case "stringify":
        return <StringifyModal {...modalState.props} />;
      case "codeGeneration":
        return <CodeGenerationModal {...modalState.props} />;
      case "treeView":
        return <JsonTreeViewModalWrapper {...modalState.props} />;
      case "schemaValidation":
        return <SchemaValidationModal {...modalState.props} />;
      case "structureComparison":
        return <JsonStructureComparisonModal {...modalState.props} />;
      case "extractData":
        return <ExtractDataModal {...modalState.props} />;
      case "equalityCheck":
        return <JsonEqualityCheckModal {...modalState.props} />;
      case "csvExportOptions":
        return <CsvExportOptionsModal {...modalState.props} />;
      default:
        return null;
    }
  };

  return {
    openStringifyModal,
    openCodeGenerationModal,
    openTreeViewModal,
    openSchemaValidationModal,
    openStructureComparisonModal,
    openExtractDataModal,
    openEqualityCheckModal,
    openCsvExportOptionsModal,
    renderModal,
    closeModal,
  };
};
