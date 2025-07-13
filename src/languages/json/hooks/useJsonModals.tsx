import React from "react";
import { useJsonModalsStore } from "../../../stores/jsonModalsStore";
import { StringifyModal } from "../components/modals/StringifyModal";
import { CodeGenerationModal } from "../components/modals/CodeGenerationModal";
import { JsonTreeViewModalWrapper } from "../components/modals/JsonTreeViewModalWrapper";
import { SchemaValidationModal } from "../components/modals/SchemaValidationModal";
import { JsonStructureComparisonModal } from "../components/modals/JsonStructureComparisonModal";

export const useJsonModals = () => {
  const {
    modalState,
    openStringifyModal,
    openCodeGenerationModal,
    openTreeViewModal,
    openSchemaValidationModal,
    openStructureComparisonModal,
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
    renderModal,
    closeModal,
  };
};
