import { useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Tab } from '../../../types';
import { useJsonModals } from './useJsonModals';

export const useJsonValidation = (
  editor: monaco.editor.IStandaloneCodeEditor,
  addTab: (tab: Tab) => void
) => {
  const {
    openSchemaValidationModal,
    openSchemaGenerationModal
  } = useJsonModals();

  const handleValidateSchema = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openSchemaValidationModal(json);
    } catch (error) {
      console.error('Failed to validate schema:', error);
    }
  }, [editor, openSchemaValidationModal]);

  const handleGenerateSchema = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openSchemaGenerationModal(json, addTab);
    } catch (error) {
      console.error('Failed to generate schema:', error);
    }
  }, [editor, openSchemaGenerationModal, addTab]);

  return {
    handleValidateSchema,
    handleGenerateSchema
  };
};