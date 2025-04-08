import React from 'react';
import { useJsonModalsStore } from '../../../stores/jsonModalsStore';
import { StringifyModal } from '../components/modals/StringifyModal';
import { PathFinderModal } from '../components/modals/PathFinderModal';
import { PathEvaluatorModal } from '../components/modals/PathEvaluatorModal';

export const useJsonModals = () => {
  const {
    modalState,
    openStringifyModal,
    openPathFinderModal,
    openPathEvaluatorModal,
    closeModal
  } = useJsonModalsStore();

  const renderModal = (): React.ReactNode => {
    switch (modalState.type) {
      case 'stringify':
        return <StringifyModal {...modalState.props} />;
      case 'pathFinder':
        return <PathFinderModal {...modalState.props} />;
      case 'pathEvaluator':
        return <PathEvaluatorModal {...modalState.props} />;
      default:
        return null;
    }
  };

  return {
    openStringifyModal,
    openPathFinderModal,
    openPathEvaluatorModal,
    renderModal,
    closeModal
  };
};