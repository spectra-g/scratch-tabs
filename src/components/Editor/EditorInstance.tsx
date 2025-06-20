import React, { useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useRootStore } from '../../stores';
import { Tab } from '../../types';
import { useEditorScrollManager } from '../../hooks/useEditorScrollManager';
import { useLanguageDetection } from '../../hooks/useLanguageDetection';
import { useTabletSelector } from '../../hooks/useTabletSelector';
import { TabletSelector } from '../../tablets';
import { Tablet } from '../../tablets';
import { useAIStore } from '../../stores/aiStore';
import { modelManager } from '../../services/modelManager';

interface EditorInstanceProps {
  side: 'left' | 'right';
  activeTab: Tab;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

// Global storage for view states per tab (keep this for scroll position restoration)
const tabViewStates = new Map<string, Monaco.editor.ICodeEditorViewState>();

export const EditorInstance: React.FC<EditorInstanceProps> = ({side, activeTab, onEditorReady}) => {
  const {
    updateTabContent,
    setCursorPosition,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState,
    updateTabLanguage,
    activeEditorSide,
  } = useRootStore(state => ({
    updateTabContent: state.updateTabContent,
    setCursorPosition: state.setCursorPosition,
    setActiveLeftTab: state.setActiveLeftTab,
    setActiveRightTab: state.setActiveRightTab,
    updateTabState: state.updateTabState,
    updateTabLanguage: state.updateTabLanguage,
    activeEditorSide: state.splitView.activeSide,
  }));

  const { 
    isCodegenReady, 
    runCodegen, 
    codegenResult, 
    activeCodegenTabId,
    isCodegenGenerating 
  } = useAIStore(state => ({
    isCodegenReady: state.ai.isCodegenReady,
    runCodegen: state.runCodegen,
    codegenResult: state.ai.codegenResult,
    activeCodegenTabId: state.ai.activeCodegenTabId,
    isCodegenGenerating: state.ai.isCodegenGenerating,
  }));

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const currentTabIdRef = useRef<string>(activeTab.id);

  // --- Ref to hold the latest activeTab data ---
  const latestActiveTabRef = useRef(activeTab);
  useEffect(() => {
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  // --- Custom Hooks ---
  const {restoreScrollPosition} = useEditorScrollManager(editorRef, activeTab.id);
  const {detectAndSetLanguage} = useLanguageDetection(updateTabLanguage);
  const {
    showTabletSelector,
    tabletQuery,
    selectorPosition,
    tabletSelectorContainerRef,
    closeTabletSelector,
  } = useTabletSelector(editorRef, editorContainerRef, activeTab?.id, updateTabContent);

  const previousContentRef = useRef<string>(activeTab.content);

  // Effect to switch models when active tab changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const currentModel = editor.getModel();
    
    // Save view state for the previous tab
    if (currentTabIdRef.current && currentModel) {
      const viewState = editor.saveViewState();
      if (viewState) {
        tabViewStates.set(currentTabIdRef.current, viewState);
      }
    }

    // Get or create model from our manager
    const newModel = modelManager.get(activeTab);
    
    // Switch to the new model
    editor.setModel(newModel);
    
    // Restore view state for the new tab
    const savedViewState = tabViewStates.get(activeTab.id);
    if (savedViewState) {
      editor.restoreViewState(savedViewState);
    }
    
    // Update current tab reference
    currentTabIdRef.current = activeTab.id;
    previousContentRef.current = activeTab.content;
    
  }, [activeTab.id, activeTab.content, activeTab.language, activeTab]);

  // AI effect for context menu action
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const actionId = 'ai-generate-code';
    
    // Add the action and get the disposable
    const disposableAction = editor.addAction({
      id: actionId,
      label: 'Generate Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      precondition: isCodegenReady && !isCodegenGenerating ? undefined : 'false',
      run: (ed) => {
        const originalValue = ed.getValue();
        if (!isCodegenReady || isCodegenGenerating) return;
        runCodegen({
          tabId: latestActiveTabRef.current.id,
          text: originalValue,
          max_new_tokens: 128,
          temperature: 0.5,
          top_k: 5,
          do_sample: false,
        });
      },
    });
    
    return () => {
      disposableAction.dispose();
    };
  }, [isCodegenReady, isCodegenGenerating, runCodegen]);

  useEffect(() => {
      previousContentRef.current = activeTab.content;
  }, [activeTab.id, activeTab.content]);

  // --- Effects ---
  useEffect(() => {
    // Only focus if this editor instance's side matches the globally active editor side
    // AND the activeTab for this instance is indeed the one that should be active on this side.
    const shouldFocus =
      activeEditorSide === side &&
      ((side === 'left' && activeTab.id === useRootStore.getState().splitView.activeLeftTabId) ||
       (side === 'right' && activeTab.id === useRootStore.getState().splitView.activeRightTabId));

    if (shouldFocus) {
      const timer = setTimeout(() => {
        if (editorRef.current && document.activeElement !== editorRef.current.getDomNode()?.querySelector('textarea')) {
          editorRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [side, activeTab.id, activeEditorSide]);

  // Effect to stream AI code generation into the editor
  useEffect(() => {
    const editor = editorRef.current;
    const isStreamingForThisTab = isCodegenGenerating && activeCodegenTabId === activeTab.id;

    if (editor && isStreamingForThisTab && codegenResult !== null) {
        const model = editor.getModel();
        if (model && editor.getValue() !== codegenResult) {
            // Using executeEdits is better than setValue as it can be part of the undo stack
            // and preserves cursor position better if the changes are not full-document.
            editor.executeEdits('ai-stream', [{
                range: model.getFullModelRange(),
                text: codegenResult
            }]);
        }
    }
  }, [isCodegenGenerating, activeCodegenTabId, codegenResult, activeTab.id]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Notify parent component that editor is ready
    onEditorReady?.(editor);
    
    // Initialize the model manager with the monaco instance and a callback
    modelManager.initialize(monaco, (model, tabId) => {
      model.onDidChangeContent(() => {
        const newContent = model!.getValue();
        updateTabContent(tabId, newContent);
        
        // Use latestActiveTabRef inside listener to avoid stale state
        if (!latestActiveTabRef.current.isTablet && !useAIStore.getState().ai.isCodegenGenerating) {
          detectAndSetLanguage(tabId, newContent, previousContentRef.current, latestActiveTabRef.current.language, latestActiveTabRef.current.languageLocked);
        }
        previousContentRef.current = newContent;
      });
    });

    // Initialize with the current tab's model
    const model = modelManager.get(activeTab);
    editor.setModel(model);
    currentTabIdRef.current = activeTab.id;
    previousContentRef.current = activeTab.content;

    restoreScrollPosition(activeTab.id);
    
    // Ctrl+K (Format)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
       if (!editor.hasTextFocus()) {
           return;
       }
       editor.getAction('editor.action.formatDocument')?.run();
    });
    
    // Cursor Position Listener
    editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      const currentTabIdForCursor = latestActiveTabRef.current.id;
      setCursorPosition(currentTabIdForCursor, {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const handleEditorFocus = () => {
    if (side === 'left') {
      setActiveLeftTab(activeTab.id);
    } else {
      setActiveRightTab(activeTab.id);
    }
  };

  const handleTabletSelect = (tablet: Tablet) => {
    // Dispose the model if it exists
    modelManager.dispose(activeTab.id);
    
    // Convert to tablet
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);
    updateTabState(activeTab.id, {
      isTablet: true,
      tabletState: serializedState,
      content: '', // Clear content when switching to a tablet
      language: 'plaintext', // Reset language? Or keep tablet-specific?
      languageLocked: true,
      title: tablet.label, // Update title
    });
    closeTabletSelector(true);
  };

  const handleTabletSelectorClose = () => {
    closeTabletSelector(true);
  };

  return (
    <div className="h-full w-full bg-gray-850 relative overflow-hidden" ref={editorContainerRef}>
      <div className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
        <Editor
          height="100%"
          width="100%"
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: {enabled: false},
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            copyWithSyntaxHighlighting: false,
            scrollBeyondLastLine: true,
            formatOnPaste: true,
            formatOnType: true,
            find: {
              addExtraSpaceOnTop: false,
            },
          }}
        />
        {showTabletSelector && (
          <div
            ref={tabletSelectorContainerRef}
            style={{
              position: 'absolute',
              left: `${selectorPosition.x}px`,
              top: `${selectorPosition.y}px`,
              zIndex: 50
            }}
          >
            <TabletSelector
              searchQuery={tabletQuery} // state - current
              onSelect={handleTabletSelect}
              onClose={handleTabletSelectorClose}
            />
          </div>
        )}
      </div>
    </div>
  );
};