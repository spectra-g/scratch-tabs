import React, { useState, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'; // Import Monaco types and API
import { useRootStore } from '../stores';
import { X, Undo2, Redo2 } from 'lucide-react';

interface DiffModalProps {
  leftTabId: string;
  rightTabId: string;
  onClose: () => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({ leftTabId, rightTabId, onClose }) => {
  const { tabs, updateTabContent } = useRootStore();
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const leftTab = tabs.find(tab => tab.id === leftTabId);
  const rightTab = tabs.find(tab => tab.id === rightTabId);

  // Store initial content for potential reset/undo beyond Monaco's stack
  const [initialLeftContent, setInitialLeftContent] = useState<string | null>(leftTab?.content || "");
  const [initialRightContent, setInitialRightContent] = useState<string | null>(rightTab?.content || "");

  useEffect(() => {
    if (editorContainerRef.current && leftTab && rightTab && !diffEditorRef.current) {
      const originalContent = leftTab.content;
      const modifiedContent = rightTab.content;

      setInitialLeftContent(originalContent);
      setInitialRightContent(modifiedContent);

      const language = leftTab.language || 'plaintext';

      const originalModel = monaco.editor.createModel(originalContent, language);
      const modifiedModel = monaco.editor.createModel(modifiedContent, language);

      const editor = monaco.editor.createDiffEditor(editorContainerRef.current, {
        originalEditable: true,
        modifiedEditable: true,
        diffCodeLens: true,
        renderIndicators: true,
        renderSideBySide: true,
        theme: 'vs-dark',
        automaticLayout: true,
        enableSplitViewResizing: true,
        diffAlgorithm: 'advanced',
      });

      editor.setModel({
        original: originalModel,
        modified: modifiedModel,
      });

      diffEditorRef.current = editor;

      const modifiedEditor = editor.getModifiedEditor();
      modifiedEditor.focus();
    }

    return () => {
      if (diffEditorRef.current) {
        const editor = diffEditorRef.current;
        const model = editor.getModel();
        editor.dispose();
        diffEditorRef.current = null;
        if (model) {
          model.original?.dispose();
          model.modified?.dispose();
        }
      }
    };
  }, [leftTab, rightTab]);

  const handleUpdateLeftTab = () => {
    if (!diffEditorRef.current || !leftTab) return;
    const modifiedContent = diffEditorRef.current.getModifiedEditor().getValue();
    updateTabContent(leftTabId, modifiedContent);
  };

  const handleUpdateRightTab = () => {
    if (!diffEditorRef.current || !rightTab) return;
    const originalContent = diffEditorRef.current.getOriginalEditor().getValue();
    updateTabContent(rightTabId, originalContent);
  };

  if (!leftTab || !rightTab) return null;

  return (
      <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-gray-700 px-4 py-2">
          <h2 className="text-gray-200 font-medium">
            Compare: {leftTab.title} ↔ {rightTab.title}
          </h2>
          <div>
            <button onClick={handleUpdateLeftTab} title={`Overwrite '${leftTab.title}' with current right pane`} className="mr-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white">Update '{leftTab.title}'</button>
            <button onClick={handleUpdateRightTab} title={`Overwrite '${rightTab.title}' with current left pane`} className="mr-4 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white">Update '{rightTab.title}'</button>

            <button className="text-gray-400 hover:text-gray-200" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div ref={editorContainerRef} className="flex-1 overflow-hidden">
          {/* Monaco Editor renders here */}
        </div>
      </div>
  );
};