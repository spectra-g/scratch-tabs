import { useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Tab } from '../../../types';
import { useJsonModals } from './useJsonModals';
import { generateJavaClasses } from '../utils/javaGenerator';
import { generateTypeScriptInterfaces } from '../utils/generateTypeScriptInterfaces';

export const useJsonConversions = (
  editor: monaco.editor.IStandaloneCodeEditor,
  addTab: (tab: Tab) => void
) => {
  const {
    openCodeGenerationModal,
    openCsvModal,
    openConversionModal
  } = useJsonModals();

  const handleToJava = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      
      // Generate Java classes
      const javaClasses = generateJavaClasses(json);
      
      // Create tabs for each class
      const tabs = javaClasses.map(javaClass => ({
        id: crypto.randomUUID(),
        title: javaClass.className,
        content: javaClass.code,
        language: 'java'
      }));

      // Open the code generation modal with the Java classes
      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error('Failed to convert to Java:', error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

const handleToTypeScript = useCallback(() => {
  try {
    const content = editor.getValue();
    const json = JSON.parse(content);

    // Generate TypeScript interfaces
    const tsInterfaces = generateTypeScriptInterfaces(json); // Use default "Root" or pass a custom name

    if (tsInterfaces.length === 0) {
        console.warn("No TypeScript interfaces were generated. Input might be invalid or not an object/array.");
        // Optionally show a message to the user
        return;
    }

    // Create tabs for each interface/type alias
    const tabs = tsInterfaces.map(tsInterface => ({
      id: crypto.randomUUID(),
      // Use interfaceName for the tab title
      title: tsInterface.interfaceName,
      content: tsInterface.code,
      language: 'typescript', // Set language to typescript
      languageLocked: true, // Keep consistent with handleToJava
      cursorPosition: { lineNumber: 1, column: 1 } // Keep consistent
    }));

    // Open the code generation modal with the TypeScript interfaces
    // Make sure openCodeGenerationModal can accept the Tab structure expected by addTab
    openCodeGenerationModal(tabs, addTab);

  } catch (error: any) {
    console.error('Failed to parse JSON or convert to TypeScript:', error);
    // Optionally show a more specific error to the user
    // e.g., if (error instanceof SyntaxError) { /* handle JSON parse error * / }
  }
}, [editor, openCodeGenerationModal, addTab]);

  const handleToPython = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to Python conversion
      openCodeGenerationModal('python', json, addTab);
    } catch (error) {
      console.error('Failed to convert to Python:', error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToGo = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to Go conversion
      openCodeGenerationModal('go', json, addTab);
    } catch (error) {
      console.error('Failed to convert to Go:', error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToCSharp = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to C# conversion
      openCodeGenerationModal('csharp', json, addTab);
    } catch (error) {
      console.error('Failed to convert to C#:', error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToCsv = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to CSV conversion
      openCsvModal(json, addTab);
    } catch (error) {
      console.error('Failed to convert to CSV:', error);
    }
  }, [editor, openCsvModal, addTab]);

  const handleToYaml = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to YAML conversion
      openConversionModal('yaml', json, addTab);
    } catch (error) {
      console.error('Failed to convert to YAML:', error);
    }
  }, [editor, openConversionModal, addTab]);

  const handleToXml = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      // Implementation of JSON to XML conversion
      openConversionModal('xml', json, addTab);
    } catch (error) {
      console.error('Failed to convert to XML:', error);
    }
  }, [editor, openConversionModal, addTab]);

  return {
    handleToJava,
    handleToTypeScript,
    handleToPython,
    handleToGo,
    handleToCSharp,
    handleToCsv,
    handleToYaml,
    handleToXml
  };
};