import React, { useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useRootStore } from '../../stores/rootStore';
import { useEditorStore } from '../../stores/editorStore';
import { useAIStore } from '../../stores/aiStore';
import { useBatchToolsStore } from '../../stores/batchToolsStore';
import { BatchToolsModal } from '../BatchTools/BatchToolsModal';
import { useEditorScrollManager } from '../../hooks/useEditorScrollManager';
import { useLanguageDetection } from '../../hooks/useLanguageDetection';
import { useTabletSelector } from '../../hooks/useTabletSelector';
import { TabletSelector } from '../../tablets';
import { Tablet } from '../../tablets';

interface EditorInstanceProps {
  side: 'left' | 'right';
  activeTab: any;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

export const EditorInstance: React.FC<EditorInstanceProps> = ({side, activeTab, onEditorReady}) => {
  // Store large content in a ref to avoid React reconciliation
  const largeContentRef = useRef<string>('');
  
  // Check if we have large content in the ref for this tab
  const hasLargeContentInRef = largeContentRef.current.length > 100000;
  const displayContent = hasLargeContentInRef ? '' : activeTab.content;
  
  console.log(`🚀 [EditorInstance] RENDER START - Side: ${side}, Tab: ${activeTab.id}, Content size: ${displayContent.length} bytes (${hasLargeContentInRef ? 'large content in ref' : 'normal content'})`);
  console.time(`⏱️ [EditorInstance] Render time for ${activeTab.id}`);
  
  const {
    updateTabContent,
    updateTabLanguage,
    setCursorPosition,
    splitView,
  } = useRootStore();

  const {
    ai: {
      isReady: isAiReady,
      isLoading: isAiLoading,
      isCodegenReady,
      isCodegenGenerating,
    },
    summarizeTextWithModal,
    runCodegen,
  } = useAIStore();

  const { openModal: openBatchToolsModal } = useBatchToolsStore();

  // --- Ref to hold the latest activeTab data ---
  const latestActiveTabRef = useRef(activeTab);
  useEffect(() => {
    console.log(`🔄 [EditorInstance] latestActiveTabRef updated - Tab: ${activeTab.id}, Content size: ${activeTab.content.length}`);
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const batchToolsDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const aiReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const codegenReadyContextKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const currentTabIdRef = useRef<string>(activeTab.id);

  // Add a ref to track pending format operations to avoid duplicate formatting
  const pendingFormatRef = useRef<Set<string>>(new Set());

  // Handler for auto-format when language is detected on significant change
  const handleLanguageDetectedOnSignificantChange = useCallback((tabId: string, language: string) => {
    console.log(`🎯 [EditorInstance] handleLanguageDetectedOnSignificantChange called - Tab: ${tabId}, Language: ${language}`);
    const editor = editorRef.current;
    if (!editor || tabId !== activeTab.id) {
      console.log(`❌ [EditorInstance] handleLanguageDetectedOnSignificantChange early return - Editor: ${!!editor}, Tab match: ${tabId === activeTab.id}`);
      return;
    }

    // Prevent duplicate format operations
    const formatKey = `${tabId}-${language}`;
    if (pendingFormatRef.current.has(formatKey)) {
      console.log(`⏭️ [EditorInstance] Skipping duplicate format operation for key: ${formatKey}`);
      return;
    }
    
    console.log(`✅ [EditorInstance] Adding format operation to pending set: ${formatKey}`);
    pendingFormatRef.current.add(formatKey);

    // Auto-format the document
    const formatAction = editor.getAction('editor.action.formatDocument');
    if (formatAction) {
      console.log(`🎨 [EditorInstance] Running format action for tab: ${tabId}`);
      formatAction.run().finally(() => {
        console.log(`🧹 [EditorInstance] Cleaning up format operation: ${formatKey}`);
        pendingFormatRef.current.delete(formatKey);
      });
    } else {
      console.log(`❌ [EditorInstance] Format action not found for tab: ${tabId}`);
      pendingFormatRef.current.delete(formatKey);
    }
  }, [activeTab.id]);

  // --- Custom Hooks ---
  console.log(`🔧 [EditorInstance] Setting up custom hooks for tab: ${activeTab.id}`);
  const { restoreScrollPosition } = useEditorScrollManager(editorRef, activeTab.id);
  const {detectAndSetLanguage} = useLanguageDetection(updateTabLanguage, handleLanguageDetectedOnSignificantChange);
  const {
    showTabletSelector,
    tabletQuery,
    selectorPosition,
    tabletSelectorContainerRef,
    openTabletSelector,
    closeTabletSelector,
    updateTabletQuery,
  } = useTabletSelector(editorRef, editorContainerRef, activeTab?.id, updateTabContent);

  const previousContentRef = useRef<string>(activeTab.content);

  // Model switching effect
  // This effect should only run when the tab ID or language changes, not the content.
  // It's responsible for setting up the editor for a *new* tab.
  useEffect(() => {
    console.log(`🔄 [EditorInstance] Model switching effect triggered - Tab: ${activeTab.id}, Language: ${activeTab.language}, Content size: ${activeTab.content.length}`);
    previousContentRef.current = activeTab.content;
    
    // Clear the large content ref when switching tabs to avoid cross-tab contamination
    console.log(`🧹 [EditorInstance] BEFORE clearing - largeContentRef length: ${largeContentRef.current.length}, switching to tab: ${activeTab.id}`);
    if (largeContentRef.current.length > 0) {
      console.log(`🧹 [EditorInstance] Clearing large content ref for new tab: ${activeTab.id}`);
      largeContentRef.current = '';
    }
    console.log(`🧹 [EditorInstance] AFTER clearing - largeContentRef length: ${largeContentRef.current.length}`);
  }, [activeTab.id, activeTab.language]);

  // Effect to update context keys when AI state changes
  useEffect(() => {
    console.log(`🤖 [EditorInstance] AI context keys effect triggered - isAiReady: ${isAiReady}, isAiLoading: ${isAiLoading}, isCodegenReady: ${isCodegenReady}, isCodegenGenerating: ${isCodegenGenerating}`);
    const aiReadyValue = isAiReady && !isAiLoading;
    const codegenReadyValue = isCodegenReady && !isCodegenGenerating;
    
    if (aiReadyContextKeyRef.current) {
      console.log(`🔑 [EditorInstance] Setting aiReady context key to: ${aiReadyValue}`);
      aiReadyContextKeyRef.current.set(aiReadyValue);
    }
    if (codegenReadyContextKeyRef.current) {
      console.log(`🔑 [EditorInstance] Setting codegenReady context key to: ${codegenReadyValue}`);
      codegenReadyContextKeyRef.current.set(codegenReadyValue);
    }
  }, [isAiReady, isAiLoading, isCodegenReady, isCodegenGenerating]);

  // Cleanup batch tools disposable on unmount
  useEffect(() => {
    console.log(`🧹 [EditorInstance] Setting up cleanup effect for batch tools`);
    return () => {
      console.log(`🗑️ [EditorInstance] Cleaning up batch tools disposable for tab: ${currentTabIdRef.current}`);
      batchToolsDisposableRef.current?.dispose();
    };
  }, []);

  // --- Effects ---
  useEffect(() => {
    console.log(`🎯 [EditorInstance] Focus effect triggered - Side: ${side}, ActiveSide: ${splitView.activeSide}, Tab: ${activeTab.id}, HasEditor: ${!!editorRef.current}`);
    // Only focus if this editor instance's side matches the globally active editor side
    if (side === splitView.activeSide && editorRef.current) {
      console.log(`🎯 [EditorInstance] Setting focus for tab: ${activeTab.id}`);
      const timer = setTimeout(() => {
        console.log(`🎯 [EditorInstance] Executing focus for tab: ${activeTab.id}`);
        editorRef.current?.focus();
      }, 100);
      return () => {
        console.log(`⏹️ [EditorInstance] Clearing focus timer for tab: ${activeTab.id}`);
        clearTimeout(timer);
      };
    } else {
      console.log(`⏭️ [EditorInstance] Skipping focus - Side match: ${side === splitView.activeSide}, HasEditor: ${!!editorRef.current}`);
    }
  }, [side, activeTab.id, splitView.activeSide]);

  // Effect to stream AI code generation into the editor
  useEffect(() => {
    console.log(`🤖 [EditorInstance] AI streaming effect triggered - isCodegenGenerating: ${isCodegenGenerating}, HasEditor: ${!!editorRef.current}`);
    if (editorRef.current && isCodegenGenerating) {
      console.log(`🤖 [EditorInstance] Setting up AI streaming subscription for tab: ${activeTab.id}`);
      const unsubscribe = useAIStore.subscribe((state) => {
        console.log(`🤖 [EditorInstance] AI store subscription triggered - hasGeneratedCode: ${!!state.ai.codegenResult}`);
        if (state.ai.codegenResult && editorRef.current) {
          console.log(`🤖 [EditorInstance] Setting AI generated code in editor - Length: ${state.ai.codegenResult.length}`);
          editorRef.current.setValue(state.ai.codegenResult);
        }
      });
      return () => {
        console.log(`🤖 [EditorInstance] Cleaning up AI streaming subscription for tab: ${activeTab.id}`);
        unsubscribe();
      };
    }
  }, [isCodegenGenerating]);

  // Track when the Editor component receives new value prop
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      console.log(`🔧 [EditorInstance] Editor value prop changed - Tab: ${activeTab.id}, Content size: ${activeTab.content.length}`);
      console.time(`⏱️ [EditorInstance] Editor value prop change processing for ${activeTab.id}`);
      
      // For large content, defer the Monaco setValue to prevent blocking
      if (activeTab.content.length > 100000) { // 100KB threshold
        console.log(`🚀 [EditorInstance] Deferring large content setValue for ${activeTab.content.length} bytes`);
        setTimeout(() => {
          if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
              console.log(`🔧 [Monaco] Deferred setValue called - Length: ${activeTab.content.length}, Language: ${model.getLanguageId()}`);
              console.time(`⏱️ [Monaco] Deferred setValue execution time for ${activeTab.content.length} bytes`);
              try {
                model.setValue(activeTab.content);
                console.timeEnd(`⏱️ [Monaco] Deferred setValue execution time for ${activeTab.content.length} bytes`);
                console.log(`✅ [Monaco] Deferred setValue completed successfully`);
              } catch (error) {
                console.error(`❌ [Monaco] Deferred setValue failed:`, error);
              }
            }
          }
          console.timeEnd(`⏱️ [EditorInstance] Editor value prop change processing for ${activeTab.id}`);
          console.log(`✅ [EditorInstance] Editor value prop change processing completed for ${activeTab.id}`);
        }, 0);
      } else {
        // Small content can be set immediately
        setTimeout(() => {
          console.timeEnd(`⏱️ [EditorInstance] Editor value prop change processing for ${activeTab.id}`);
          console.log(`✅ [EditorInstance] Editor value prop change processing completed for ${activeTab.id}`);
        }, 0);
      }
    }
  }, [activeTab.content, activeTab.id]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    console.log(`🎉 [EditorInstance] handleEditorDidMount called - Tab: ${activeTab.id}, Content size: ${activeTab.content.length}`);
    console.time(`⏱️ [EditorInstance] handleEditorDidMount execution time for ${activeTab.id}`);
    
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    console.log(`🔗 [EditorInstance] Editor refs set for tab: ${activeTab.id}`);
    
    // Notify parent component that editor is ready
    onEditorReady?.(editor);
    
    currentTabIdRef.current = activeTab.id;
    previousContentRef.current = activeTab.content;

    console.log(`📜 [EditorInstance] Restoring scroll position for tab: ${activeTab.id}`);
    restoreScrollPosition(activeTab.id);
    
    // Add logging for Monaco's internal model operations
    const originalSetValue = editor.getModel()?.setValue;
    if (originalSetValue) {
      const model = editor.getModel()!;
      model.setValue = function(value: string) {
        console.log(`🔧 [Monaco] setValue called - Length: ${value.length}, Language: ${model.getLanguageId()}`);
        console.time(`⏱️ [Monaco] setValue execution time for ${value.length} bytes`);
        try {
          const result = originalSetValue.call(this, value);
          console.timeEnd(`⏱️ [Monaco] setValue execution time for ${value.length} bytes`);
          console.log(`✅ [Monaco] setValue completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ [Monaco] setValue failed:`, error);
          throw error;
        }
      };
    }
    
    // Add logging for Monaco's model change events
    const model = editor.getModel();
    if (model) {
      model.onDidChangeContent((e) => {
        console.log(`🔧 [Monaco] onDidChangeContent triggered - Changes: ${e.changes.length}, Language: ${model.getLanguageId()}`);
        console.time(`⏱️ [Monaco] onDidChangeContent processing time`);
        // This will be called after the change is processed
        setTimeout(() => {
          console.timeEnd(`⏱️ [Monaco] onDidChangeContent processing time`);
          console.log(`✅ [Monaco] onDidChangeContent processing completed`);
        }, 0);
      });
      
      model.onDidChangeLanguage((e) => {
        console.log(`🔧 [Monaco] Language changed - From: ${e.oldLanguage}, To: ${e.newLanguage}`);
      });
    }
    
    // Restore large content to Monaco if it exists in the ref
    console.log(`🎉 [EditorInstance] handleEditorDidMount - Tab: ${activeTab.id}, activeTab.content.length: ${activeTab.content.length}, largeContentRef.length: ${largeContentRef.current.length}`);
    if (largeContentRef.current && largeContentRef.current.length > 100000) {
      console.log(`🔄 [EditorInstance] Restoring large content to Monaco (${largeContentRef.current.length} bytes)`);
      setTimeout(() => {
        if (editor.getModel()) {
          editor.getModel()!.setValue(largeContentRef.current);
          console.log(`✅ [EditorInstance] Large content restored to Monaco`);
        }
      }, 0);
    } else {
      console.log(`❌ [EditorInstance] No large content to restore - ref empty or too small`);
    }
    
    // Auto-format tabs that were likely created from paste or file import
    // First check if tab was created recently to avoid unnecessary work
    const now = Date.now();
    console.log(`⏰ [EditorInstance] Tab creation check - Created: ${activeTab.dateCreated}, Now: ${now}, Diff: ${now - activeTab.dateCreated}ms`);
    if ((now - activeTab.dateCreated) < 500) {
      console.log(`🆕 [EditorInstance] Tab was created recently, checking formatting conditions`);
      // Only check other conditions if tab was recently created
      const hasSubstantialContent = activeTab.content && activeTab.content.trim().length > 50;
      const isFormattableLanguage = activeTab.language !== 'plaintext';
      const isNotTablet = !activeTab.isTablet;
      const isNotLikelyDuplicate = !activeTab.title.includes('(copy)') && !activeTab.title.includes('Copy of');
      
      console.log(`📋 [EditorInstance] Formatting conditions - HasContent: ${hasSubstantialContent}, Formattable: ${isFormattableLanguage}, NotTablet: ${isNotTablet}, NotDuplicate: ${isNotLikelyDuplicate}`);
      
      if (hasSubstantialContent && isFormattableLanguage && isNotTablet && isNotLikelyDuplicate) {
        console.log(`🎨 [EditorInstance] Setting up auto-format for tab: ${activeTab.id}`);
        // Use setTimeout to ensure the model and language are fully set before formatting
        setTimeout(() => {
          console.log(`🎨 [EditorInstance] Executing auto-format for tab: ${activeTab.id}`);
          const formatAction = editor.getAction('editor.action.formatDocument');
          if (formatAction) {
            formatAction.run();
            console.log(`✅ [EditorInstance] Auto-format completed for tab: ${activeTab.id}`);
          } else {
            console.log(`❌ [EditorInstance] Format action not found for tab: ${activeTab.id}`);
          }
        }, 100); // Small delay to ensure everything is ready
      } else {
        console.log(`⏭️ [EditorInstance] Skipping auto-format - conditions not met`);
      }
    } else {
      console.log(`⏭️ [EditorInstance] Tab not recently created, skipping auto-format`);
    }
    
    // Ctrl+K (Format)
    console.log(`⌨️ [EditorInstance] Adding Ctrl+K format command for tab: ${activeTab.id}`);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
       console.log(`⌨️ [EditorInstance] Ctrl+K format command triggered for tab: ${activeTab.id}`);
       if (!editor.hasTextFocus()) {
           console.log(`⏭️ [EditorInstance] Skipping format - editor not focused`);
           return;
       }
       editor.getAction('editor.action.formatDocument')?.run();
    });

    // Cursor Position Listener
    console.log(`👆 [EditorInstance] Setting up cursor position listener for tab: ${activeTab.id}`);
    editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      const currentTabIdForCursor = latestActiveTabRef.current.id;
      console.log(`👆 [EditorInstance] Cursor position changed - Tab: ${currentTabIdForCursor}, Position: ${e.position.lineNumber}:${e.position.column}`);
      setCursorPosition(currentTabIdForCursor, {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    console.log(`🔧 [EditorInstance] Adding batch tools action for tab: ${activeTab.id}`);
    batchToolsDisposableRef.current = editor.addAction({
      id: 'batch-tools',
      label: 'Transformations',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2.5,
      run: () => {
        console.log(`🔧 [EditorInstance] Batch tools action triggered for tab: ${activeTab.id}`);
        const selectedText = editor.getModel()?.getValueInRange(editor.getSelection()!) || '';
        // For large content, get the content from the ref instead of editor.getValue()
        const fullContent = largeContentRef.current.length > 100000 ? largeContentRef.current : editor.getValue();
        console.log(`🔧 [EditorInstance] Batch tools - Selected: ${selectedText.length}, Full: ${fullContent.length}`);
        openBatchToolsModal(fullContent, selectedText);
      }
    });

    console.log(`🤖 [EditorInstance] Creating AI context keys for tab: ${activeTab.id}`);
    aiReadyContextKeyRef.current = editor.createContextKey('aiReady', isAiReady && !isAiLoading);
    codegenReadyContextKeyRef.current = editor.createContextKey('codegenReady', isCodegenReady && !isCodegenGenerating);
    
    // Add AI actions
    const summarizeActionId = 'ai-summarize';
    const codegenActionId = 'ai-generate-code';
    
    console.log(`🤖 [EditorInstance] Adding AI summarize action for tab: ${activeTab.id}`);
    // Add the summarize action
    editor.addAction({
      id: summarizeActionId,
      label: 'Summarize',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.0,
      precondition: 'aiReady',
      run: (ed) => {
        console.log(`🤖 [EditorInstance] AI summarize action triggered for tab: ${activeTab.id}`);
        // Get fresh state directly from store to avoid stale state issues
        const freshAIState = useAIStore.getState().ai;
        
        const content = ed.getValue();
        console.log(`🤖 [EditorInstance] AI summarize - Content length: ${content.length}`);
        
        // Use fresh state for condition check
        const shouldProceed = freshAIState.isReady && 
                             !freshAIState.isLoading && 
                             !latestActiveTabRef.current.isTablet && 
                             content.trim().length > 0;
        
        console.log(`🤖 [EditorInstance] AI summarize conditions - Ready: ${freshAIState.isReady}, Loading: ${freshAIState.isLoading}, NotTablet: ${!latestActiveTabRef.current.isTablet}, HasContent: ${content.trim().length > 0}`);
                             
        if (!shouldProceed) {
          console.log(`❌ [EditorInstance] AI summarize conditions not met, skipping`);
          return;
        }
        console.log(`✅ [EditorInstance] Calling summarizeTextWithModal for tab: ${activeTab.id}`);
        summarizeTextWithModal(content, latestActiveTabRef.current.id);
      },
    });

    console.log(`🤖 [EditorInstance] Adding AI codegen action for tab: ${activeTab.id}`);
    // Add the code generation action
    editor.addAction({
      id: codegenActionId,
      label: 'Generate Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      precondition: 'codegenReady',
      run: (ed) => {
        console.log(`🤖 [EditorInstance] AI codegen action triggered for tab: ${activeTab.id}`);
        const originalValue = ed.getValue();
        console.log(`🤖 [EditorInstance] AI codegen - Content length: ${originalValue.length}, isCodegenReady: ${isCodegenReady}, isCodegenGenerating: ${isCodegenGenerating}`);
        if (!isCodegenReady || isCodegenGenerating) {
          console.log(`❌ [EditorInstance] AI codegen conditions not met, skipping`);
          return;
        }
        console.log(`✅ [EditorInstance] Calling runCodegen for tab: ${activeTab.id}`);
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

    console.timeEnd(`⏱️ [EditorInstance] handleEditorDidMount execution time for ${activeTab.id}`);
    console.log(`✅ [EditorInstance] handleEditorDidMount completed for tab: ${activeTab.id}`);
  };

  const handleEditorChange = (value: string | undefined) => {
    console.log(`📝 [EditorInstance] handleEditorChange called - Tab: ${activeTab.id}, Value length: ${value?.length || 0}`);
    console.time(`⏱️ [EditorInstance] handleEditorChange processing for ${activeTab.id}`);
    
    if (value === undefined) {
      console.log(`❌ [EditorInstance] handleEditorChange early return - value is undefined`);
      console.timeEnd(`⏱️ [EditorInstance] handleEditorChange processing for ${activeTab.id}`);
      return;
    }
    
    if (value === previousContentRef.current) {
      console.log(`⏭️ [EditorInstance] handleEditorChange early return - value unchanged`);
      console.timeEnd(`⏱️ [EditorInstance] handleEditorChange processing for ${activeTab.id}`);
      return;
    }

    const newContent = value;
    const prevContent = previousContentRef.current;
    const currentTab = latestActiveTabRef.current; // Use ref to get latest tab data
    const currentTabId = currentTab.id;
    
    console.log(`📊 [EditorInstance] Content change analysis - Previous: ${prevContent.length}, New: ${newContent.length}, Difference: ${Math.abs(newContent.length - prevContent.length)}`);

    // For large content, don't update the state to prevent React re-renders
    if (newContent.length > 100000) {
      console.log(`🚀 [EditorInstance] Large content detected (${newContent.length} bytes) - storing in ref only, skipping state update`);
      largeContentRef.current = newContent;
      previousContentRef.current = newContent;
      
      // Still run language detection for large content (safe - doesn't involve React state)
      if (!currentTab.isTablet) {
        console.log(`🔍 [EditorInstance] Running language detection for large content - Tab: ${currentTabId}`);
        const trimmedContent = newContent.trim();
        if (trimmedContent.startsWith('/')) {
          console.log(`📱 [EditorInstance] Tablet selector trigger detected - Query: ${trimmedContent.slice(1)}`);
          updateTabletQuery(trimmedContent.slice(1));
          openTabletSelector();
        } else if (showTabletSelector) {
          console.log(`📱 [EditorInstance] Closing tablet selector`);
          closeTabletSelector(false);
        }
        console.log(`🔍 [EditorInstance] Calling detectAndSetLanguage for large content - Tab: ${currentTabId}`);
        detectAndSetLanguage(currentTabId, newContent, prevContent, currentTab.language, currentTab.languageLocked);
      }
      
      console.log(`✅ [EditorInstance] Large content stored in ref for tab: ${currentTabId}`);
      console.timeEnd(`⏱️ [EditorInstance] handleEditorChange processing for ${activeTab.id}`);
      return;
    }

    console.log(`💾 [EditorInstance] Calling updateTabContent for tab: ${currentTabId}`);
    updateTabContent(currentTabId, newContent);
    
    // Language detection logic
    if (!currentTab.isTablet) {
      console.log(`🔍 [EditorInstance] Running language detection for tab: ${currentTabId}`);
      const trimmedContent = newContent.trim();
      if (trimmedContent.startsWith('/')) {
        console.log(`📱 [EditorInstance] Tablet selector trigger detected - Query: ${trimmedContent.slice(1)}`);
        updateTabletQuery(trimmedContent.slice(1));
        openTabletSelector();
      } else if (showTabletSelector) {
        console.log(`📱 [EditorInstance] Closing tablet selector`);
        closeTabletSelector(false);
      }
      console.log(`🔍 [EditorInstance] Calling detectAndSetLanguage for tab: ${currentTabId}`);
      detectAndSetLanguage(currentTabId, newContent, prevContent, currentTab.language, currentTab.languageLocked);
    } else {
      console.log(`⏭️ [EditorInstance] Skipping language detection - tab is tablet`);
    }
    
    previousContentRef.current = newContent;
    console.log(`✅ [EditorInstance] handleEditorChange completed for tab: ${currentTabId}`);
    console.timeEnd(`⏱️ [EditorInstance] handleEditorChange processing for ${activeTab.id}`);
  };

  const handleEditorFocus = () => {
    console.log(`🎯 [EditorInstance] handleEditorFocus called - Side: ${side}, Tab: ${activeTab.id}`);
    if (side === 'left') {
      console.log(`🎯 [EditorInstance] Setting active left tab: ${activeTab.id}`);
      useRootStore.getState().setActiveLeftTab(activeTab.id);
    } else {
      console.log(`🎯 [EditorInstance] Setting active right tab: ${activeTab.id}`);
      useRootStore.getState().setActiveRightTab(activeTab.id);
    }
  };

  const handleTabletSelectorClose = () => {
    console.log(`📱 [EditorInstance] handleTabletSelectorClose called`);
    closeTabletSelector(true);
  };

  const handleBatchToolsApply = useCallback((content: string) => {
    console.log(`🔧 [EditorInstance] handleBatchToolsApply called - Content length: ${content.length}`);
    const editor = editorRef.current;
    if (!editor) {
      console.log(`❌ [EditorInstance] handleBatchToolsApply early return - no editor`);
      return;
    }

    const selection = editor.getSelection();
    const selectedText = selection && !selection.isEmpty() 
      ? editor.getModel()?.getValueInRange(selection) || ''
      : '';

    console.log(`🔧 [EditorInstance] Batch tools apply - Selected: ${selectedText.length}, Full content: ${content.length}`);

    if (selectedText) {
      console.log(`🔧 [EditorInstance] Replacing selected text`);
      // Replace only the selected text
      editor.executeEdits('batch-tools', [{
        range: selection!,
        text: content
      }]);
    } else {
      console.log(`🔧 [EditorInstance] Replacing entire content`);
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

  const handleTabletSelect = (tablet: Tablet) => {
    console.log(`📱 [EditorInstance] handleTabletSelect called - Tablet: ${tablet.label}, Tab: ${activeTab.id}`);
    
    // Convert to tablet
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);
    console.log(`📱 [EditorInstance] Converting tab to tablet - State size: ${serializedState.length}`);
    useRootStore.getState().updateTabState(activeTab.id, {
      isTablet: true,
      tabletState: serializedState,
      content: '', // Clear content when switching to a tablet
      language: 'plaintext', // Reset language? Or keep tablet-specific?
      languageLocked: true,
      title: tablet.label, // Update title
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    console.log(`⌨️ [EditorInstance] Setting up keyboard shortcuts for tab: ${activeTab.id}`);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            console.log(`⌨️ [EditorInstance] Ctrl+K pressed for tab: ${activeTab.id}`);
            e.preventDefault();
            openTabletSelector();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log(`⌨️ [EditorInstance] Cleaning up keyboard shortcuts for tab: ${activeTab.id}`);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  console.log(`🎨 [EditorInstance] Rendering Editor component - Tab: ${activeTab.id}`);
  const editorValue = displayContent.length > 0 ? displayContent : undefined;
  console.log(`🎨 [EditorInstance] Editor props - value: ${editorValue ? `${editorValue.length} bytes` : 'undefined (large content)'}, onChange: handleEditorChange`);
  
  const editorElement = (
            <Editor
          key={activeTab.id}
          height="100%"
          defaultLanguage="plaintext"
          language={activeTab.language}
          value={editorValue}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        lineNumbers: "on",
        folding: true,
        fontSize: 14,
        fontFamily: "JetBrains Mono, Consolas, 'Courier New', monospace",
        theme: "vs-dark",
        automaticLayout: true,
        suggestOnTriggerCharacters: false,
        quickSuggestions: false,
        parameterHints: { enabled: false },
        hover: { enabled: false },
        contextmenu: true,
        find: { addExtraSpaceOnTop: false },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        overviewRulerLanes: 0,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          useShadows: false,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  );

  console.timeEnd(`⏱️ [EditorInstance] Render time for ${activeTab.id}`);
  console.log(`✅ [EditorInstance] RENDER COMPLETE - Side: ${side}, Tab: ${activeTab.id}`);

  return (
    <div className="h-full w-full bg-gray-850 relative overflow-hidden" ref={editorContainerRef}>
      <div className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
        {editorElement}
      </div>
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
      <BatchToolsModal onApply={handleBatchToolsApply} />
    </div>
  );
};