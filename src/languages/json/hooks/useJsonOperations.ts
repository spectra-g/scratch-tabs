import { useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Tab } from '../../../types';
import { useJsonModals } from './useJsonModals';

export const useJsonOperations = (
  editor: monaco.editor.IStandaloneCodeEditor,
  addTab: (tab: Tab) => void
) => {
  const { 
    openStringifyModal,
    openPathFinderModal,
    openPathEvaluatorModal
  } = useJsonModals();

  const handleFormat = useCallback(() => {
    editor.getAction('editor.action.formatDocument').run();
  }, [editor]);

  const handleMinify = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      editor.setValue(JSON.stringify(json));
    } catch (error) {
      console.error('Failed to minify JSON:', error);
    }
  }, [editor]);

  const handleSortKeys = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      
      const sortObjectKeys = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sortObjectKeys);
        }
        if (obj && typeof obj === 'object') {
          return Object.keys(obj)
            .sort()
            .reduce((acc: any, key) => {
              acc[key] = sortObjectKeys(obj[key]);
              return acc;
            }, {});
        }
        return obj;
      };

      const sorted = sortObjectKeys(json);
      editor.setValue(JSON.stringify(sorted, null, 2));
    } catch (error) {
      console.error('Failed to sort JSON keys:', error);
    }
  }, [editor]);

  const handleFlatten = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      const flatten = (obj: any, prefix = ''): any => {
        return Object.keys(obj).reduce((acc: any, k) => {
          const pre = prefix.length ? prefix + '.' : '';
          if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flatten(obj[k], pre + k));
          } else {
            acc[pre + k] = obj[k];
          }
          return acc;
        }, {});
      };

      const flattened = flatten(json);
      editor.setValue(JSON.stringify(flattened, null, 2));
    } catch (error) {
      console.error('Failed to flatten JSON:', error);
    }
  }, [editor]);

  const handleUnflatten = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      const unflatten = (obj: any): any => {
        const result: any = {};
        
        for (const key in obj) {
          const keys = key.split('.');
          let current = result;
          
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (i === keys.length - 1) {
              current[k] = obj[key];
            } else {
              current[k] = current[k] || {};
              current = current[k];
            }
          }
        }
        
        return result;
      };

      const unflattened = unflatten(json);
      editor.setValue(JSON.stringify(unflattened, null, 2));
    } catch (error) {
      console.error('Failed to unflatten JSON:', error);
    }
  }, [editor]);

  const handleRemoveEmpty = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      const removeEmpty = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj
            .map(removeEmpty)
            .filter(item => item !== null && item !== undefined);
        }
        
        if (obj && typeof obj === 'object') {
          return Object.entries(obj)
            .reduce((acc: any, [key, value]) => {
              const cleaned = removeEmpty(value);
              if (cleaned !== null && cleaned !== undefined &&
                  !(Array.isArray(cleaned) && cleaned.length === 0) &&
                  !(typeof cleaned === 'object' && Object.keys(cleaned).length === 0)) {
                acc[key] = cleaned;
              }
              return acc;
            }, {});
        }
        
        return obj;
      };

      const cleaned = removeEmpty(json);
      editor.setValue(JSON.stringify(cleaned, null, 2));
    } catch (error) {
      console.error('Failed to remove empty values:', error);
    }
  }, [editor]);

  const handleStringify = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      const stringified = JSON.stringify(json);
      openStringifyModal(stringified, addTab);
    } catch (error) {
      console.error('Failed to stringify JSON:', error);
    }
  }, [editor, openStringifyModal, addTab]);

  const handlePathFinder = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openPathFinderModal(json);
    } catch (error) {
      console.error('Failed to open path finder:', error);
    }
  }, [editor, openPathFinderModal]);

  const handlePathEvaluator = useCallback(() => {
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openPathEvaluatorModal(json);
    } catch (error) {
      console.error('Failed to open path evaluator:', error);
    }
  }, [editor, openPathEvaluatorModal]);

  return {
    handleFormat,
    handleMinify,
    handleSortKeys,
    handleFlatten,
    handleUnflatten,
    handleRemoveEmpty,
    handleStringify,
    handlePathFinder,
    handlePathEvaluator
  };
};