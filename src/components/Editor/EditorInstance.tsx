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

interface EditorInstanceProps {
  side: 'left' | 'right';
  activeTab: Tab;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

// Global storage for Monaco models and view states per tab
const tabModels = new Map<string, Monaco.editor.ITextModel>();
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
  const previousContentRef = useRef<string>(activeTab.content);
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

  // Function to create or get model for a tab
  const getOrCreateModelForTab = (tabId: string, content: string, language: string): Monaco.editor.ITextModel => {
    if (!monacoRef.current) throw new Error('Monaco not initialized');
    
    let model = tabModels.get(tabId);
    
    // Check if model exists and is not disposed
    const modelIsValid = model && !model.isDisposed();
    
    if (!modelIsValid) {
      // If we have a model but it's disposed, remove it from the map
      if (model) {
        tabModels.delete(tabId);
      }
      
      // Create new model
      model = monacoRef.current.editor.createModel(content, language);
      tabModels.set(tabId, model);
      
      // Listen for content changes on this model
      model.onDidChangeContent(() => {
        const newContent = model!.getValue();
        updateTabContent(tabId, newContent);
        
        if (!latestActiveTabRef.current.isTablet) {
          detectAndSetLanguage(tabId, newContent, previousContentRef.current, language, latestActiveTabRef.current.languageLocked);
        }
        previousContentRef.current = newContent;
      });
    } else if (model) {  // Extra check to satisfy TypeScript
      // Update existing model if content has changed externally
      if (model.getValue() !== content) {
        model.setValue(content);
      }
      // Update language if needed
      if (model.getLanguageId() !== language) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
    
    // At this point model must be defined
    return model!;
  };

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

    // Get or create model for the new active tab
    const newModel = getOrCreateModelForTab(activeTab.id, activeTab.content, activeTab.language);
    
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
    
  }, [activeTab.id, activeTab.content, activeTab.language]);

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

  // Effect to clean up models for tabs that were converted to tablets
  useEffect(() => {
    if (activeTab.isTablet && tabModels.has(activeTab.id)) {
      // If a tab was converted to a tablet, dispose of its Monaco model
      const modelToDispose = tabModels.get(activeTab.id);
      if (modelToDispose && !modelToDispose.isDisposed()) {
        modelToDispose.dispose();
      }
      tabModels.delete(activeTab.id);
    }
  }, [activeTab.id, activeTab.isTablet]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    onEditorReady?.(editor);
    // Initialize with the current tab's model
    const model = getOrCreateModelForTab(activeTab.id, activeTab.content, activeTab.language);
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

  // Register Monaco context menu action for Generate Code reactively
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const actionId = 'ai-generate-code';
    console.log(`[${Date.now()}] [Editor] Registering context menu action:`, {
      isCodegenReady,
      isCodegenGenerating,
      activeTabId: activeTab.id
    });
    const disposableAction = editor.addAction({
      id: actionId,
      label: 'Generate Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      precondition: isCodegenReady && !isCodegenGenerating ? undefined : 'false',
      run: (ed) => {
        console.log(`[${Date.now()}] [Editor] Context menu action executed`);
        const originalValue = ed.getValue();
        console.log(`[${Date.now()}] [Editor] Original value length:`, originalValue.length);
        if (!isCodegenReady || isCodegenGenerating) {
          console.log(`[${Date.now()}] [Editor] Codegen not ready or already generating, returning`);
          return;
        }
        console.log(`[${Date.now()}] [Editor] Calling runCodegen`);
        runCodegen({
          tabId: activeTab.id,
          text: originalValue,
          max_new_tokens: 128,
          temperature: 0.5,
          top_k: 5,
          do_sample: false,
        });
      },
    });
    return () => {
      console.log(`[${Date.now()}] [Editor] Disposing context menu action`);
      disposableAction.dispose();
    };
  }, [isCodegenReady, isCodegenGenerating, runCodegen, activeTab.id]);

  // Debug logging for context menu action
  useEffect(() => {
    console.log(`[${Date.now()}] [Editor] Context menu action state:`, {
      isCodegenReady,
      isCodegenGenerating,
      activeTabId: activeTab.id
    });
  }, [isCodegenReady, isCodegenGenerating, activeTab.id]);

  // --- REACTIVE VALUE FOR STREAMING CODEGEN ---
  const isStreamingForThisTab = isCodegenGenerating && activeCodegenTabId === activeTab.id;
  const editorValue = isStreamingForThisTab && codegenResult !== null ? codegenResult : activeTab.content;

  // Debug logging for editor reactivity
  useEffect(() => {
    console.log(`[${Date.now()}] [Editor] Tab ${activeTab.id} state:`, {
      isStreamingForThisTab,
      isCodegenGenerating,
      activeCodegenTabId,
      codegenResultLength: codegenResult?.length || 0,
      activeTabContentLength: activeTab.content.length,
      editorValueLength: editorValue.length,
      isStreamingValue: isStreamingForThisTab && codegenResult !== null
    });
  }, [isStreamingForThisTab, isCodegenGenerating, activeCodegenTabId, codegenResult, activeTab.content, editorValue, activeTab.id]);

  // --- onChange handler for editor ---
  const handleEditorChange = (value: string | undefined) => {
    console.log(`[${Date.now()}] [Editor] handleEditorChange called:`, {
      valueLength: value?.length || 0,
      isStreamingForThisTab,
      activeTabId: activeTab.id
    });
    if (typeof value !== 'string') return;
    // Only update if not streaming for this tab (otherwise, codegenResult is the source of truth)
    if (!isStreamingForThisTab) {
      console.log(`[${Date.now()}] [Editor] Updating tab content (not streaming)`);
      updateTabContent(activeTab.id, value);
    } else {
      console.log(`[${Date.now()}] [Editor] Skipping tab content update (streaming)`);
    }
  };

  const handleEditorFocus = () => {
    if (side === 'left') {
      setActiveLeftTab(activeTab.id);
    } else {
      setActiveRightTab(activeTab.id);
    }
  };

  const handleTabletSelect = (tablet: Tablet) => {
    // If the tab has a Monaco model, dispose it before converting to tablet
    const existingModel = tabModels.get(activeTab.id);
    if (existingModel && !existingModel.isDisposed()) {
      existingModel.dispose();
    }
    tabModels.delete(activeTab.id);
    
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
          value={editorValue}
          onChange={handleEditorChange}
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