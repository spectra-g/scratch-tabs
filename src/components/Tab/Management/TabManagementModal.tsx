import React from 'react';
import { useTabManagementEngine } from './useTabManagementEngine';
import { TabManagementModalUI } from './TabManagementModalUI';
import { TabManagementModalProps } from './types';

export const TabManagementModal: React.FC<TabManagementModalProps> = ({ isOpen, onClose }) => {
  const engine = useTabManagementEngine(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return <TabManagementModalUI engine={engine} />;
}; 