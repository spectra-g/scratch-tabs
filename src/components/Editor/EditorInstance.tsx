import React, { useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useRootStore } from '../../stores';
import { Tab } from '../../types'; // Assuming Tab type is exported
import { useEditorScrollManager } from '../../hooks/useEditorScrollManager';
import { useLanguageDetection } from '../../hooks/useLanguageDetection';
import { useTabletSelector } from '../../hooks/useTabletSelector';
import { TabletSelector } from '../../tablets';
import { Tablet } from '../../tablets';
import { StatusBar } from '../StatusBar'; // Import StatusBar here

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

  // --- Custom Hooks ---
  const {restoreScrollPosition} = useEditorScrollManager(editorRef, activeTab.id); // Pass activeTab.id
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
      editorRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab.id]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    restoreScrollPosition(activeTab.id); // Restore scroll on mount

    // --- Force a re-render AFTER editorRef is set ---
    // This ensures StatusBar receives the non-null editor instance sooner.
    // Use a simple state update for this.
    forceUpdate(x => x + 1); // See below for forceUpdate implementation

    editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      // Use a functional update for setCursorPosition if it reads previous state
      setCursorPosition(activeTab.id, {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
      if (showTabletSelector) {
        const currentLineContent = editor.getModel()?.getLineContent(e.position.lineNumber) ?? '';
        if (!currentLineContent.trim().startsWith('/')) {
          closeTabletSelector(false);
        }
      }
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    const newContent = value;
    const prevContent = previousContentRef.current;
    updateTabContent(activeTab.id, newContent);
    if (!activeTab.isTablet) {
      const trimmedContent = newContent.trim();
      if (trimmedContent.startsWith('/')) {
        updateTabletQuery(trimmedContent.slice(1));
        openTabletSelector();
      } else if (showTabletSelector) {
        closeTabletSelector(false);
      }
      detectAndSetLanguage(activeTab.id, newContent, prevContent, activeTab.language, activeTab.languageLocked);
    }
    previousContentRef.current = newContent;
  };

  const handleEditorFocus = () => {
    if (side === 'left') setActiveLeftTab(activeTab.id);
    else setActiveRightTab(activeTab.id);
  };

  // --- Tablet Selector Interaction ---
  const handleTabletSelect = (tablet: Tablet) => {
    // ... (implementation remains the same)
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);
    updateTabState(activeTab.id, {
      isTablet: true,
      tabletState: serializedState,
      content: '',
      language: 'plaintext',
      languageLocked: true,
      title: tablet.label,
    });
    closeTabletSelector(true);
  };

  const handleTabletSelectorClose = () => {
    closeTabletSelector(true);
  };

  // --- Helper to force re-render after ref is set ---
  const [, forceUpdate] = React.useState(0);

  return (
    // --- NEW: Outer flex container for Editor + StatusBar ---
    <div className="flex flex-col h-full w-full bg-gray-850">
      {/* --- Editor Area (takes remaining space) --- */}
      <div className="flex-grow relative overflow-hidden">
        {/* Container for Editor and potential TabletSelector overlay */}
        <div ref={editorContainerRef} className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            language={activeTab.language}
            value={activeTab.content}
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
            key={activeTab.id} // Force remount on tab change
          />
          {/* Tablet Selector positioned absolutely */}
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
      {/* --- StatusBar Area (fixed height at bottom) --- */}
      <div className="flex-shrink-0">
        {/* Render StatusBar directly here, passing the current editor instance */}
        <StatusBar editor={editorRef.current} activeTab={activeTab}/>
      </div>
    </div>
  );
};