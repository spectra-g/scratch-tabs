import React, { useRef, useEffect, useCallback } from 'react';
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
import { useBatchToolsStore } from '../../stores/batchToolsStore';
import { BatchToolsModal } from '../BatchTools/BatchToolsModal';
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

  const { 
    isReady: isAiReady, 
    isLoading: isAiLoading,
    summarizeTextWithModal 
  } = useAIStore(state => ({
    isReady: state.ai.isReady,
    isLoading: state.ai.isLoading,
    summarizeTextWithModal: state.summarizeTextWithModal,
  }));

  const { openModal: openBatchToolsModal } = useBatchToolsStore();

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const batchToolsDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const aiReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const codegenReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const currentTabIdRef = useRef<string>(activeTab.id);

  // --- Ref to hold the latest activeTab data ---
  const latestActiveTabRef = useRef(activeTab);
  useEffect(() => {
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Add a ref to track pending format operations to avoid duplicate formatting
  const pendingFormatRef = useRef<Set<string>>(new Set());

  // Handler for auto-format when language is detected on significant change
  const handleLanguageDetectedOnSignificantChange = useCallback((tabId: string, language: string) => {
    const editor = editorRef.current;
    if (!editor || tabId !== activeTab.id) return;

    // Prevent duplicate format operations
    const formatKey = `${tabId}-${language}`;
    if (pendingFormatRef.current.has(formatKey)) return;
    
    pendingFormatRef.current.add(formatKey);

    // Auto-format the document
    const formatAction = editor.getAction('editor.action.formatDocument');
    if (formatAction) {
      formatAction.run().finally(() => {
        // Clean up the pending format tracking
        pendingFormatRef.current.delete(formatKey);
      });
    } else {
      // Clean up even if format action fails
      pendingFormatRef.current.delete(formatKey);
    }
  }, [activeTab.id]);

  // --- Custom Hooks ---
  const {restoreScrollPosition} = useEditorScrollManager(editorRef, activeTab.id);
  const {detectAndSetLanguage} = useLanguageDetection(updateTabLanguage, handleLanguageDetectedOnSignificantChange);
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

    // Get currently visible tab IDs from split view state
    const splitView = useRootStore.getState().splitView;
    const visibleTabIds = splitView.isSplit 
      ? [splitView.activeLeftTabId, splitView.activeRightTabId].filter((id): id is string => id !== null)
      : [splitView.activeLeftTabId].filter((id): id is string => id !== null);

    // Get or create model from our manager, passing visible tab IDs
    const newModel = modelManager.get(activeTab, visibleTabIds);
    
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

  // Effect to update context keys when AI state changes
  useEffect(() => {
    const aiReadyValue = isAiReady && !isAiLoading;
    const codegenReadyValue = isCodegenReady && !isCodegenGenerating;
    
    if (aiReadyContextKeyRef.current) {
      aiReadyContextKeyRef.current.set(aiReadyValue);
    }
    if (codegenReadyContextKeyRef.current) {
      codegenReadyContextKeyRef.current.set(codegenReadyValue);
    }
  }, [isAiReady, isAiLoading, isCodegenReady, isCodegenGenerating]);

  // Cleanup batch tools disposable on unmount
  useEffect(() => {
    return () => {
      if (batchToolsDisposableRef.current) {
        batchToolsDisposableRef.current.dispose();
      }
    };
  }, []);

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
    
    // Get currently visible tab IDs from split view state and set them in ModelManager
    const splitView = useRootStore.getState().splitView;
    const visibleTabIds = splitView.isSplit 
      ? [splitView.activeLeftTabId, splitView.activeRightTabId].filter((id): id is string => id !== null)
      : [splitView.activeLeftTabId].filter((id): id is string => id !== null);

    // Set visible tab IDs in ModelManager to prevent eviction
    modelManager.setVisibleTabIds(visibleTabIds);
    
    // Initialize the model manager with the monaco instance and a callback
    modelManager.initialize(monaco, (model, tabId) => {
      model.onDidChangeContent(() => {
        const newContent = model!.getValue();
        updateTabContent(tabId, newContent);
        
        // Mark the model as edited for cache prioritization
        modelManager.markAsEdited(tabId);
        
        // Use latestActiveTabRef inside listener to avoid stale state
        if (!latestActiveTabRef.current.isTablet && !useAIStore.getState().ai.isCodegenGenerating) {
          detectAndSetLanguage(tabId, newContent, previousContentRef.current, latestActiveTabRef.current.language, latestActiveTabRef.current.languageLocked);
        }
        previousContentRef.current = newContent;
      });
    });

    // Initialize with the current tab's model
    const model = modelManager.get(activeTab, visibleTabIds);
    editor.setModel(model);
    currentTabIdRef.current = activeTab.id;
    previousContentRef.current = activeTab.content;

    restoreScrollPosition(activeTab.id);
    
    // Auto-format tabs that were likely created from paste or file import
    // First check if tab was created recently to avoid unnecessary work
    const now = Date.now();
    if ((now - activeTab.dateCreated) < 500) {
      // Only check other conditions if tab was recently created
      const hasSubstantialContent = activeTab.content && activeTab.content.trim().length > 50;
      const isFormattableLanguage = activeTab.language !== 'plaintext';
      const isNotTablet = !activeTab.isTablet;
      const isNotLikelyDuplicate = !activeTab.title.includes('(copy)') && !activeTab.title.includes('Copy of');
      
      if (hasSubstantialContent && isFormattableLanguage && isNotTablet && isNotLikelyDuplicate) {
        // Use setTimeout to ensure the model and language are fully set before formatting
        setTimeout(() => {
          const formatAction = editor.getAction('editor.action.formatDocument');
          if (formatAction) {
            formatAction.run();
          }
        }, 100); // Small delay to ensure everything is ready
      }
    }
    
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

    // Clean up previous batch tools action if it exists
    if (batchToolsDisposableRef.current) {
      batchToolsDisposableRef.current.dispose();
    }

    // Add Batch Tools context menu action
    batchToolsDisposableRef.current = editor.addAction({
      id: 'batch-tools',
      label: 'Transformations',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2.5,
      run: () => {
        const selectedText = editor.getModel()?.getValueInRange(editor.getSelection()!) || '';
        const fullContent = editor.getValue();
        openBatchToolsModal(fullContent, selectedText);
      }
    });

    // Create context keys for AI actions (only once per editor instance)
    aiReadyContextKeyRef.current = editor.createContextKey('aiReady', isAiReady && !isAiLoading);
    codegenReadyContextKeyRef.current = editor.createContextKey('codegenReady', isCodegenReady && !isCodegenGenerating);
    
    // Add AI actions
    const summarizeActionId = 'ai-summarize';
    const codegenActionId = 'ai-generate-code';
    
    // Add the summarize action
    editor.addAction({
      id: summarizeActionId,
      label: 'Summarize',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.0,
      precondition: 'aiReady',
      run: (ed) => {
        // Get fresh state directly from store to avoid stale state issues
        const freshAIState = useAIStore.getState().ai;
        
        // Update context keys with fresh state
        if (aiReadyContextKeyRef.current) {
          const freshAiReady = freshAIState.isReady && !freshAIState.isLoading;
          aiReadyContextKeyRef.current.set(freshAiReady);
        }
        
        const content = ed.getValue();
        
        // Use fresh state for condition check
        const shouldProceed = freshAIState.isReady && 
                             !freshAIState.isLoading && 
                             !latestActiveTabRef.current.isTablet && 
                             content.trim().length > 0;
                             
        if (!shouldProceed) {
          return;
        }
        summarizeTextWithModal(content, latestActiveTabRef.current.id);
      },
    });
    
    // Add the code generation action
    editor.addAction({
      id: codegenActionId,
      label: 'Generate Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      precondition: 'codegenReady',
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

  const handleBatchToolsApply = useCallback((content: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const selectedText = selection && !selection.isEmpty() 
      ? editor.getModel()?.getValueInRange(selection) || ''
      : '';

    if (selectedText) {
      // Replace only the selected text
      editor.executeEdits('batch-tools', [{
        range: selection!,
        text: content
      }]);
    } else {
      // Replace entire content
      const model = editor.getModel();
      if (model) {
        editor.executeEdits('batch-tools', [{
          range: model.getFullModelRange(),
          text: content
        }]);
      }
    }
  }, []);

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
      <BatchToolsModal onApply={handleBatchToolsApply} />
    </div>
  );
};