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
import { languageRegistry } from '../../languages';

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
  // This ref will be updated whenever the activeTab prop changes,
  // allowing callbacks defined only once (like in handleEditorDidMount)
  // to access the latest tab information.
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
      editorRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab.id]);

  // --- Editor Event Handlers ---
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    restoreScrollPosition(activeTab.id);

    // Add command for Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // --- Use the ref to get the LATEST tab data ---
      const currentTab = latestActiveTabRef.current;
      // --- Get the CURRENT content directly from the editor ---
      const currentContent = editorRef.current?.getValue() ?? '';

      if (!currentTab.isTablet) {
        // --- Use the latest tab language ---
        const detector = languageRegistry.getById(currentTab.language);
        const extension = detector?.getFileExtension() || 'txt';
        // --- Use the current editor content ---
        const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // --- Use the latest tab title ---
        a.download = `${currentTab.title}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });

    // Force a re-render AFTER editorRef is set
    // Note: This forceUpdate might not be strictly necessary if other state updates
    // already cause re-renders, but keeping it if it was needed before.
    forceUpdate(x => x + 1);

    editor.onDidChangeCursorPosition((e: Monaco.editor.ICursorPositionChangedEvent) => {
      // Using latestActiveTabRef here too, just in case, although activeTab.id probably doesn't change
      const currentTabId = latestActiveTabRef.current.id;
      setCursorPosition(currentTabId, {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
      if (showTabletSelector) { // showTabletSelector is state, so it's current
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
    // Update the store - this will eventually trigger the useEffect
    // that updates latestActiveTabRef.current
    updateTabContent(activeTab.id, newContent);
    if (!activeTab.isTablet) {
      const trimmedContent = newContent.trim();
      if (trimmedContent.startsWith('/')) {
        updateTabletQuery(trimmedContent.slice(1));
        openTabletSelector();
      } else if (showTabletSelector) {
        closeTabletSelector(false);
      }
      // Pass the latest activeTab properties needed by the detection logic
      detectAndSetLanguage(activeTab.id, newContent, prevContent, activeTab.language, activeTab.languageLocked);
    }
    previousContentRef.current = newContent;
  };

  const handleEditorFocus = () => {
    // activeTab here is the prop passed during this render, so it's current for this action
    if (side === 'left') setActiveLeftTab(activeTab.id);
    else setActiveRightTab(activeTab.id);
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

  const [, forceUpdate] = React.useState(0); // Keep this if needed

  return (
    <div className="flex flex-col h-full w-full bg-gray-850">
      <div className="flex-grow relative overflow-hidden">
        <div ref={editorContainerRef} className="w-full h-full absolute inset-0" onClick={handleEditorFocus}>
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
        <StatusBar editor={editorRef.current} activeTab={activeTab}/>
      </div>
    </div>
  );
};