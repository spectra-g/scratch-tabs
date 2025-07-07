import React, { useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useRootStore } from '../../stores';
import { useTabsStore } from '../../stores/tabsStore';
import { useSplitViewStore } from '../../stores/splitViewStore';
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
  activeTabId: string;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

// Threshold for considering content "large" (100KB)
const LARGE_CONTENT_THRESHOLD = 100000;

// Global storage for view states (scroll position, etc.)
const tabViewStates = new Map<string, Monaco.editor.ICodeEditorViewState>();

// Utility function to safely check if a model is disposed
const isModelDisposed = (model: Monaco.editor.ITextModel | null): boolean => {
  if (!model) return true;
  try {
    return typeof model.isDisposed === 'function' && model.isDisposed();
  } catch {
    return true;
  }
};

// Utility function to safely get model value
const getModelValue = (model: Monaco.editor.ITextModel | null): string => {
  if (isModelDisposed(model)) return '';
  try {
    return model!.getValue();
  } catch {
    return '';
  }
};

export const EditorInstance: React.FC<EditorInstanceProps> = ({ side, activeTabId, onEditorReady }) => {
  console.time(`[EditorInstance] Render for side ${side}`);
  console.log(`[EditorInstance] Rendering for side ${side}, tab: ${activeTabId}`);
  
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const currentTabIdRef = useRef<string>(activeTabId);
  
  // Get the tab metadata, but we won't use its `content` for the editor's value prop
  const activeTab = useTabsStore(state => state.tabs.find(t => t.id === activeTabId));

  // Get actions from rootStore
  const {
    updateTabContent,
    setCursorPosition,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState,
    updateTabLanguage,
  } = useRootStore.getState();

  // Get activeEditorSide from splitViewStore
  const { splitView } = useSplitViewStore();
  const activeEditorSide = splitView?.activeSide;

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

  const batchToolsDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const aiReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const codegenReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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
    if (!editor || tabId !== activeTabId) return;

    // Prevent duplicate format operations
    const formatKey = `${tabId}-${language}`;
    if (pendingFormatRef.current.has(formatKey)) return;

    pendingFormatRef.current.add(formatKey);

    // Auto-format the document
    try {
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
    } catch (error) {
      console.warn('[EditorInstance] Failed to format document:', error);
      pendingFormatRef.current.delete(formatKey);
    }
  }, [activeTabId]);

  // --- Custom Hooks ---
  const { restoreScrollPosition } = useEditorScrollManager(editorRef, activeTabId);
  const { detectAndSetLanguage } = useLanguageDetection(updateTabLanguage, handleLanguageDetectedOnSignificantChange);
  const {
    showTabletSelector,
    tabletQuery,
    selectorPosition,
    tabletSelectorContainerRef,
    closeTabletSelector,
  } = useTabletSelector(editorRef, editorContainerRef, activeTabId, updateTabContent);

  // Guard against the tab being removed while a render is queued
  if (!activeTab) {
    return null;
  }

  // This effect manages model switching and view state restoration.
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeTab) return;

    const editor = editorRef.current;
    const previousTabId = currentTabIdRef.current;

    // Define an async function to handle the model switch
    const switchModel = async () => {
      try {
        // Save view state for the tab we are leaving, only if model is not disposed
        const prevModel = editor.getModel();
        if (previousTabId && prevModel && !isModelDisposed(prevModel)) {
          try {
            const viewState = editor.saveViewState();
            if (viewState) tabViewStates.set(previousTabId, viewState);
          } catch (error) {
            console.warn(`[EditorInstance] Failed to save view state for tab ${previousTabId}:`, error);
          }
        }

        // *** NEW: Await the model from the manager ***
        const newModel = await modelManager.get(activeTab);

        if (!newModel || isModelDisposed(newModel)) {
          console.error(`[EditorInstance] No valid model available for tab ${activeTab.id}`);
          return;
        }

        // If the editor is not already showing this model, set it
        if (editor.getModel() !== newModel) {
          try {
            editor.setModel(newModel);
          } catch (error) {
            console.error(`[EditorInstance] Failed to set model for tab ${activeTab.id}:`, error);
            return;
          }
        }

        // Only restore view state if the model is not disposed
        const newViewState = tabViewStates.get(activeTab.id);
        if (newViewState && !isModelDisposed(newModel)) {
          try {
            editor.restoreViewState(newViewState);
          } catch (error) {
            console.warn(`[EditorInstance] Failed to restore view state for tab ${activeTab.id}:`, error);
          }
        }

        try {
          editor.focus();
        } catch (error) {
          console.warn(`[EditorInstance] Failed to focus editor for tab ${activeTab.id}:`, error);
        }

        currentTabIdRef.current = activeTab.id;
      } catch (error) {
        console.error(`[EditorInstance] Failed to switch model for tab ${activeTab.id}:`, error);
      }
    };

    switchModel();
  }, [activeTabId, activeTab]);

  // Focus effect - only focus if this editor instance's side matches the globally active editor side
  useEffect(() => {
    const { splitView } = useSplitViewStore.getState();
    const shouldFocus =
      activeEditorSide === side &&
      ((side === 'left' && activeTabId === splitView.activeLeftTabId) ||
        (side === 'right' && activeTabId === splitView.activeRightTabId));

    if (shouldFocus) {
      const timer = setTimeout(() => {
        try {
          if (editorRef.current && document.activeElement !== editorRef.current.getDomNode()?.querySelector('textarea')) {
            editorRef.current.focus();
          }
        } catch (error) {
          console.warn('[EditorInstance] Failed to focus editor:', error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [side, activeTabId, activeEditorSide]);

  // Effect to stream AI code generation into the editor
  useEffect(() => {
    const editor = editorRef.current;
    const isStreamingForThisTab = isCodegenGenerating && activeCodegenTabId === activeTabId;

    if (editor && isStreamingForThisTab && codegenResult !== null) {
      try {
        const model = editor.getModel();
        if (model && !isModelDisposed(model) && getModelValue(model) !== codegenResult) {
          // Using executeEdits is better than setValue as it can be part of the undo stack
          // and preserves cursor position better if the changes are not full-document.
          editor.executeEdits('ai-stream', [{
            range: model.getFullModelRange(),
            text: codegenResult
          }]);
        }
      } catch (error) {
        console.warn('[EditorInstance] Failed to stream AI code:', error);
      }
    }
  }, [isCodegenGenerating, activeCodegenTabId, codegenResult, activeTabId]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = async (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    try {
      editorRef.current = editor;
      monacoRef.current = monaco;
      onEditorReady?.(editor);

      modelManager.initialize(monaco);

      if (activeTab) {
        try {
          // *** NEW: Await the initial model ***
          const initialModel = await modelManager.get(activeTab);
          if (initialModel && !isModelDisposed(initialModel) && editor.getModel() !== initialModel) {
            editor.setModel(initialModel);
          }
          const initialViewState = tabViewStates.get(activeTab.id);
          if (initialViewState) {
            try {
              editor.restoreViewState(initialViewState);
            } catch (error) {
              console.warn('[EditorInstance] Failed to restore initial view state:', error);
            }
          }
        } catch (error) {
          console.error('[EditorInstance] Failed to set initial model:', error);
        }
      }

      restoreScrollPosition(activeTabId);

      // Auto-format tabs that were likely created from paste or file import
      // First check if tab was created recently to avoid unnecessary work
      const now = Date.now();
      if ((now - activeTab.dateCreated) < 500) {
        // Only check other conditions if tab was recently created
        const content = activeTab.content || '';
        const hasSubstantialContent = content.trim().length > 50;
        const isFormattableLanguage = activeTab.language !== 'plaintext';
        const isNotTablet = !activeTab.isTablet;
        const isNotLikelyDuplicate = !activeTab.title.includes('(copy)') && !activeTab.title.includes('Copy of');

        if (hasSubstantialContent && isFormattableLanguage && isNotTablet && isNotLikelyDuplicate) {
          // Use setTimeout to ensure the model and language are fully set before formatting
          setTimeout(() => {
            try {
              const formatAction = editor.getAction('editor.action.formatDocument');
              if (formatAction) {
                formatAction.run();
              }
            } catch (error) {
              console.warn('[EditorInstance] Failed to auto-format document:', error);
            }
          }, 100); // Small delay to ensure everything is ready
        }
      }

      // Ctrl+K (Format)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        try {
          if (!editor.hasTextFocus()) {
            return;
          }
          const formatAction = editor.getAction('editor.action.formatDocument');
          if (formatAction) {
            formatAction.run();
          }
        } catch (error) {
          console.warn('[EditorInstance] Failed to format document via Ctrl+K:', error);
        }
      });

      // Cursor Position Listener
      editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
        try {
          const currentTab = latestActiveTabRef.current;
          if (currentTab) {
            setCursorPosition(currentTab.id, {
              lineNumber: e.position.lineNumber,
              column: e.position.column,
            });
          }
        } catch (error) {
          console.warn('[EditorInstance] Failed to update cursor position:', error);
        }
      });

      // Clean up previous batch tools action if it exists
      if (batchToolsDisposableRef.current) {
        try {
          batchToolsDisposableRef.current.dispose();
        } catch (error) {
          console.warn('[EditorInstance] Failed to dispose batch tools action:', error);
        }
      }

      // Add Batch Tools context menu action
      batchToolsDisposableRef.current = editor.addAction({
        id: 'batch-tools',
        label: 'Transformations',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 2.5,
        run: () => {
          try {
            const model = editor.getModel();
            const selectedText = model && !isModelDisposed(model) 
              ? model.getValueInRange(editor.getSelection()!) || ''
              : '';
            const fullContent = getModelValue(model);
            openBatchToolsModal(fullContent, selectedText);
          } catch (error) {
            console.warn('[EditorInstance] Failed to open batch tools modal:', error);
          }
        }
      });

      // Create context keys for AI actions (only once per editor instance)
      try {
        aiReadyContextKeyRef.current = editor.createContextKey('aiReady', isAiReady && !isAiLoading);
        codegenReadyContextKeyRef.current = editor.createContextKey('codegenReady', isCodegenReady && !isCodegenGenerating);
      } catch (error) {
        console.warn('[EditorInstance] Failed to create context keys:', error);
      }

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
          try {
            // Get fresh state directly from store to avoid stale state issues
            const freshAIState = useAIStore.getState().ai;

            // Update context keys with fresh state
            if (aiReadyContextKeyRef.current) {
              const freshAiReady = freshAIState.isReady && !freshAIState.isLoading;
              aiReadyContextKeyRef.current.set(freshAiReady);
            }

            const content = getModelValue(ed.getModel());

            const currentTab = latestActiveTabRef.current;
            if (!currentTab) return;

            // Use fresh state for condition check
            const shouldProceed = freshAIState.isReady &&
              !freshAIState.isLoading &&
              !currentTab.isTablet &&
              content.trim().length > 0;

            if (!shouldProceed) {
              return;
            }
            summarizeTextWithModal(content, currentTab.id);
          } catch (error) {
            console.warn('[EditorInstance] Failed to run summarize action:', error);
          }
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
          try {
            const originalValue = getModelValue(ed.getModel());
            if (!isCodegenReady || isCodegenGenerating) return;
            const currentTab = latestActiveTabRef.current;
            if (!currentTab) return;
            
            runCodegen({
              tabId: currentTab.id,
              text: originalValue,
              max_new_tokens: 128,
              temperature: 0.5,
              top_k: 5,
              do_sample: false,
            });
          } catch (error) {
            console.warn('[EditorInstance] Failed to run codegen action:', error);
          }
        },
      });
    } catch (error) {
      console.error('[EditorInstance] Failed to mount editor:', error);
    }
  };

  const handleEditorFocus = () => {
    try {
      if (side === 'left') {
        setActiveLeftTab(activeTabId);
      } else {
        setActiveRightTab(activeTabId);
      }
    } catch (error) {
      console.warn('[EditorInstance] Failed to handle editor focus:', error);
    }
  };

  const handleTabletSelect = (tablet: Tablet) => {
    try {
      // Convert to tablet
      const state = tablet.createInitialState();
      const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);
      updateTabState(activeTabId, {
        isTablet: true,
        tabletState: serializedState,
        content: '',
        language: 'plaintext',
        languageLocked: true,
        title: tablet.label,
      });
      closeTabletSelector(true);
    } catch (error) {
      console.warn('[EditorInstance] Failed to handle tablet select:', error);
    }
  };

  const handleTabletSelectorClose = () => {
    try {
      closeTabletSelector(true);
    } catch (error) {
      console.warn('[EditorInstance] Failed to close tablet selector:', error);
    }
  };

  const handleBatchToolsApply = useCallback((content: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const selection = editor.getSelection();
      const model = editor.getModel();
      const selectedText = selection && !selection.isEmpty() && model && !isModelDisposed(model)
        ? model.getValueInRange(selection) || ''
        : '';

      if (selectedText) {
        // Replace only the selected text
        editor.executeEdits('batch-tools', [{
          range: selection!,
          text: content
        }]);
      } else {
        // Replace entire content
        if (model && !isModelDisposed(model)) {
          editor.executeEdits('batch-tools', [{
            range: model.getFullModelRange(),
            text: content
          }]);
        }
      }
    } catch (error) {
      console.warn('[EditorInstance] Failed to apply batch tools:', error);
    }
  }, []);

  const editorKey = (activeTab.content || '').length > LARGE_CONTENT_THRESHOLD
    ? `${activeTabId}-large-${Date.now()}`
    : activeTabId;

  // CRITICAL FIX: Disable performance-heavy features for large content
  const isLargeContent = (activeTab.content?.length || 0) > LARGE_CONTENT_THRESHOLD;
  console.log(`[EditorInstance] Content size: ${activeTab.content?.length || 0} bytes, isLargeContent: ${isLargeContent}`);

  return (
    <div className="flex flex-col h-full w-full bg-gray-850">
      <div className="flex-grow relative overflow-hidden" ref={editorContainerRef}>
        <div className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            onMount={handleEditorDidMount}
            key={side} // Key by side to ensure we have two distinct editor instances
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: isLargeContent ? 'off' : 'on', // Disable word wrap for large content
              automaticLayout: true,
              copyWithSyntaxHighlighting: false,
              scrollBeyondLastLine: true,
              formatOnPaste: !isLargeContent, // Disable format on paste for large content
              formatOnType: !isLargeContent, // Disable format on type for large content
              find: {
                addExtraSpaceOnTop: false,
              },
              // Additional performance optimizations for large content
              ...(isLargeContent && {
                renderWhitespace: 'none',
                renderLineHighlight: 'none',
                occurrencesHighlight: 'off',
                selectionHighlight: false,
                bracketPairColorization: { enabled: false },
                guides: { bracketPairs: false },
              }),
            }}
            // NO `value`, `defaultValue`, `language`, or `onChange` props!
            // The model manager and the useEffect hook now control everything.
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
                searchQuery={tabletQuery}
                onSelect={handleTabletSelect}
                onClose={handleTabletSelectorClose}
              />
            </div>
          )}
        </div>
      </div>
      <BatchToolsModal onApply={handleBatchToolsApply} />
      {(() => {
        console.timeEnd(`[EditorInstance] Render for side ${side}`);
        return null;
      })()}
    </div>
  );
};