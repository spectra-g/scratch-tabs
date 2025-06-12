import { useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Tab } from '../../../types';
import { useJsonModals } from './useJsonModals';
import { generateJsonSchema } from '../utils/jsonSchema';

export const useJsonValidation = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  addTab: (tab: Tab) => void
) => {
  const { openSchemaValidationModal, openCodeGenerationModal } = useJsonModals();

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
      const schema = generateJsonSchema(json);
      
      const tab = {
        id: crypto.randomUUID(),
        title: 'JSON Schema',
        content: JSON.stringify(schema, null, 2),
        language: 'json'
      };

      openCodeGenerationModal([tab], addTab);
    } catch (error) {
      console.error('Failed to generate schema:', error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  return {
    handleValidateSchema,
    handleGenerateSchema
  };
};
