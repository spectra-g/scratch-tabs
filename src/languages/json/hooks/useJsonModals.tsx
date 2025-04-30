import React from 'react';
import { useJsonModalsStore } from '../../../stores/jsonModalsStore';
import { StringifyModal } from '../components/modals/StringifyModal';
import { CodeGenerationModal } from '../components/modals/CodeGenerationModal';
import { JsonTreeViewModalWrapper } from '../components/modals/JsonTreeViewModalWrapper';

export const useJsonModals = () => {
  const {
    modalState,
    openStringifyModal,
    openCodeGenerationModal,
    openTreeViewModal,
    closeModal
  } = useJsonModalsStore();

  const renderModal = (): React.ReactNode => {
    switch (modalState.type) {
      case 'stringify':
        return <StringifyModal {...modalState.props} />;
      case 'codeGeneration':
        return <CodeGenerationModal {...modalState.props} />;
      case 'treeView':
        return <JsonTreeViewModalWrapper {...modalState.props} />;
      default:
        return null;
    }
  };

  return {
    openStringifyModal,
    openCodeGenerationModal,
    openTreeViewModal,
    renderModal,
    closeModal
  };
};