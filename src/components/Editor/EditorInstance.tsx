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
import { StatusBar } from '../StatusBar';

interface EditorInstanceProps {
  side: 'left' | 'right';
  activeTab: Tab;
}

export const EditorInstance: React.FC<EditorInstanceProps> = ({side, activeTab}) => {
  const {
    updateTabContent,
    setCursorPosition,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState,
    updateTabLanguage,
  } = useRootStore();

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previousContentRef = useRef<string>(activeTab.content);

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
    openTabletSelector,
    closeTabletSelector,
    updateTabletQuery,
  } = useTabletSelector(editorRef, editorContainerRef, activeTab?.id, updateTabContent);

  // --- Effects ---
  useEffect(() => {
    previousContentRef.current = activeTab.content;
  }, [activeTab.id, activeTab.content]);

  useEffect(() => {
    const timer = setTimeout(() => {
       if (editorRef.current) {
          editorRef.current.focus();
       }
    }, 100);
    return () => clearTimeout(timer);
  }, [side, activeTab.id]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    const currentTabId = activeTab.id;
    editorRef.current = editor;
    restoreScrollPosition(currentTabId);

    // --- Add Commands and Listeners ---
    // Ctrl+K (Format)
    const formatCommand = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
       if (!editor.hasTextFocus()) {
           return;
       }
       editor.getAction('editor.action.formatDocument')?.run();
    });

    // Cursor Position Listener
    const cursorListener = editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      const currentTabIdForCursor = latestActiveTabRef.current.id;
      setCursorPosition(currentTabIdForCursor, {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
      // Tablet selector logic
      if (showTabletSelector) { // Uses component state, which is up-to-date
        const currentLineContent = editor.getModel()?.getLineContent(e.position.lineNumber) ?? '';
        if (!currentLineContent.trim().startsWith('/')) {
          closeTabletSelector(false);
        }
      }
    });

    return () => {
        editorRef.current = null;

        if (formatCommand) {
             formatCommand.dispose();
        }
        if (cursorListener) {
            cursorListener.dispose();
        }
    };
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    const newContent = value;
    const prevContent = previousContentRef.current;
    const currentTabId = activeTab.id;

    updateTabContent(currentTabId, newContent);

    if (!activeTab.isTablet) {
      const trimmedContent = newContent.trim();
      if (trimmedContent.startsWith('/')) {
        updateTabletQuery(trimmedContent.slice(1));
        openTabletSelector();
      } else if (showTabletSelector) {
        closeTabletSelector(false);
      }
      detectAndSetLanguage(currentTabId, newContent, prevContent, activeTab.language, activeTab.languageLocked);
    }
    previousContentRef.current = newContent;
  };

  const handleEditorFocus = () => {
    if (side === 'left') {
      setActiveLeftTab(activeTab.id);
    } else {
      setActiveRightTab(activeTab.id);
    }
  };

  const handleTabletSelect = (tablet: Tablet) => {
    // activeTab here is the prop passed during this render
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
    <div className="flex flex-col h-full w-full bg-gray-850">
      <div className="flex-grow relative overflow-hidden" ref={editorContainerRef}>
        <div className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            language={activeTab.language} // Use current language prop
            value={activeTab.content}    // Use current content prop
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
            key={activeTab.id} // Key ensures component re-mounts if tab ID changes
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
      <div className="flex-shrink-0">
        {/* Pass the current editor instance and the current activeTab prop */}
        <StatusBar editor={editorRef.current} activeTab={activeTab} side={side}/>
      </div>
    </div>
  );
};