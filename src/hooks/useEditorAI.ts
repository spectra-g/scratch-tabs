import { useEffect } from 'react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface UseEditorAIProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  activeTabId: string;
  isCodegenGenerating: boolean;
  activeCodegenTabId: string | null;
  codegenResult: string | null;
}

export const useEditorAI = ({
  editor,
  activeTabId,
  isCodegenGenerating,
  activeCodegenTabId,
  codegenResult,
}: UseEditorAIProps) => {
  
  // Effect to stream AI code generation into the editor
  useEffect(() => {
    const isStreamingForThisTab = isCodegenGenerating && activeCodegenTabId === activeTabId;

    if (editor && isStreamingForThisTab && codegenResult !== null) {
      try {
        const model = editor.getModel();
        if (model && !model.isDisposed()) {
          const currentContent = model.getValue();
          if (currentContent !== codegenResult) {
            // Using executeEdits is better than setValue as it can be part of the undo stack
            editor.executeEdits('ai-stream', [{
              range: model.getFullModelRange(),
              text: codegenResult
            }]);
          }
        }
      } catch (error) {
        console.warn('[useEditorAI] Failed to stream AI code:', error);
      }
    }
  }, [editor, isCodegenGenerating, activeCodegenTabId, codegenResult, activeTabId]);

  return {
    // Return empty object for now, can be extended if needed
  };
}; 