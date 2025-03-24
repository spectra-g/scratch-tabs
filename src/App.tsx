import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { marked } from 'marked';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { TabletView } from './components/TabletView';
import { TabletSelector } from './tablets';
import { useRootStore } from './stores';
import { initializeLanguageProviders, detectLanguage, isAmbiguousLanguage } from './languages';
import { debounce, createThrottledResizeObserver } from './utils/domUtils';

// Initialize language providers
initializeLanguageProviders();

// Configure marked for secure rendering
marked.setOptions({
  gfm: true,
  breaks: true
});

// Add at the top level, outside of any component
const scrollPositions: { [tabId: string]: number } = {};

interface EditorPaneProps {
  side: 'left' | 'right';
}

const EditorPane: React.FC<EditorPaneProps> = ({ side }) => {
  const {
    tabs,
    previewMode,
    splitView,
    updateTabContent,
    setCursorPosition,
    updateTabLanguage,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState
  } = useRootStore();

  const editorRef = useRef<any>(null);
  const previousContentRef = useRef<string>('');
  const [showTabletSelector, setShowTabletSelector] = useState(false);
  const [tabletQuery, setTabletQuery] = useState('');
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });

  const activeTabId = side === 'left' ? splitView.activeLeftTabId : splitView.activeRightTabId;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Save scroll position when switching tabs
  useEffect(() => {
    if (!activeTabId || !editorRef.current) return;

    // Restore scroll position when switching to a tab
    const savedPosition = scrollPositions[activeTabId] ?? 0;
    editorRef.current.setScrollTop(savedPosition);

    // Save scroll position when leaving a tab
    return () => {
      if (editorRef.current) {
        scrollPositions[activeTabId] = editorRef.current.getScrollTop();
      }
    };
  }, [activeTabId]);

  // Clean up scroll positions when tabs are removed
  useEffect(() => {
    const currentTabIds = tabs.map(tab => tab.id);
    Object.keys(scrollPositions).forEach(tabId => {
      if (!currentTabIds.includes(tabId)) {
        delete scrollPositions[tabId];
      }
    });
  }, [tabs]);

  // Focus editor when activeTabId changes
  useEffect(() => {
    if (activeTabId && editorRef.current && !previewMode) {
      editorRef.current.focus();
    }
  }, [activeTabId, previewMode]);

  // Update previous content reference when active tab changes
  useEffect(() => {
    if (activeTab) {
      previousContentRef.current = activeTab.content;
    }
  }, [activeTab, activeTabId]);

  // Handle keyboard events for the editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTabletSelector) {
        e.preventDefault();
        setShowTabletSelector(false);
        if (activeTabId) {
          updateTabContent(activeTabId, '');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTabletSelector, activeTabId, updateTabContent]);

  const handleEditorChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined && activeTab) {
      const prevContent = previousContentRef.current;
      const newContent = value;

      // Update the content first
      updateTabContent(activeTabId, newContent);

      // Check if we should show/hide the tablet selector
      if (!activeTab.isTablet) {
        const trimmedContent = newContent.trim();

        if (trimmedContent === '') {
          // Content is empty, hide selector
          setShowTabletSelector(false);
          setTabletQuery('');
        } else if (trimmedContent.startsWith('/')) {
          // Show tablet selector and update query
          if (!showTabletSelector) {
            const editor = editorRef.current;
            if (editor) {
              const position = editor.getPosition();
              const coordinates = editor.getScrolledVisiblePosition(position);
              const editorContainer = editor.getContainerDomNode();
              const rect = editorContainer.getBoundingClientRect();

              setSelectorPosition({
                x: rect.left + coordinates.left,
                y: rect.top + coordinates.top + 20
              });
              setShowTabletSelector(true);
            }
          }
          // Update search query (remove the leading slash)
          setTabletQuery(trimmedContent.slice(1));
        } else {
          // Content doesn't start with /, hide selector
          setShowTabletSelector(false);
          setTabletQuery('');
        }

        // Handle language detection
        if (trimmedContent.length === 0) {
          updateTabLanguage(activeTabId, 'plaintext', false);
        } else {
          const isCompleteReplacement =
              Math.abs(prevContent.length - newContent.length) > 10 &&
              !newContent.includes(prevContent) &&
              !prevContent.includes(newContent);

          if (isCompleteReplacement) {
            const detectedLanguage = detectLanguage(newContent);
            const shouldLock = detectedLanguage !== 'plaintext' && !isAmbiguousLanguage(newContent);
            updateTabLanguage(activeTabId, detectedLanguage, shouldLock);
          } else if (!activeTab.languageLocked) {
            const detectedLanguage = detectLanguage(newContent);
            if (detectedLanguage !== activeTab.language) {
              const shouldLock = detectedLanguage !== 'plaintext' && !isAmbiguousLanguage(newContent);
              updateTabLanguage(activeTabId, detectedLanguage, shouldLock);
            }
          }
        }
      }

      // Update the previous content reference
      previousContentRef.current = newContent;
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Restore initial scroll position
    if (activeTabId && scrollPositions[activeTabId]) {
      editor.setScrollTop(scrollPositions[activeTabId]);
    }

    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });

      // Hide tablet selector if cursor moves to a different line
      if (showTabletSelector) {
        const content = editor.getValue();
        const lines = content.split('\n');
        const currentLine = lines[e.position.lineNumber - 1] || '';

        if (!currentLine.trim().startsWith('/')) {
          setShowTabletSelector(false);
          setTabletQuery('');
        }
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      editor.getAction('editor.action.formatDocument').run();
    });

    // Focus editor immediately after mounting if we have an active tab
    if (activeTabId && !previewMode) {
      editor.focus();
    }
  };

  const handleEditorFocus = () => {
    // When editor gets focus, make sure the tab on this side is set as active
    if (side === 'left' && activeTabId) {
      setActiveLeftTab(activeTabId);
    } else if (side === 'right' && activeTabId) {
      setActiveRightTab(activeTabId);
    }
  };

  const handleTabletSelect = (tablet: any) => {
    if (!activeTabId || !activeTab) return;

    // Create initial tablet state
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState(state);

    // Update the tab with tablet state and title
    updateTabState(activeTabId, {
      isTablet: true,
      tabletState: serializedState,
      content: '', // Clear the content since we're using tablet state
      language: 'plaintext', // Reset language
      title: tablet.label // Set the title to the tablet's label
    });

    setShowTabletSelector(false);
    setTabletQuery('');
  };

  const handleTabletStateChange = (newState: string) => {
    if (!activeTabId) return;
    updateTabState(activeTabId, { tabletState: newState });
  };

  const renderMarkdownPreview = () => {
    if (!activeTab?.content) return <div className="p-8">No content to preview</div>;

    const htmlContent = marked(activeTab.content);
    return (
        <div
            className="prose prose-invert max-w-none p-8 overflow-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
  };

  return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 overflow-hidden w-full relative" onClick={handleEditorFocus}>
          {activeTab ? (
              activeTab.isTablet ? (
                  <TabletView tab={activeTab} onChange={handleTabletStateChange} />
              ) : activeTab.language === 'markdown' && previewMode ? (
                  renderMarkdownPreview()
              ) : (
                  <>
                    <Editor
                        height="100%"
                        width="100%"
                        theme="vs-dark"
                        language={activeTab.language}
                        value={activeTab.content}
                        onChange={handleEditorChange}
                        onMount={handleEditorDidMount}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                          automaticLayout: true,
                          copyWithSyntaxHighlighting: false,
                          scrollBeyondLastLine: false,
                          formatOnPaste: true,
                          formatOnType: true,
                          find: {
                            addExtraSpaceOnTop: false,
                          },
                        }}
                    />
                    {showTabletSelector && (
                        <div style={{ position: 'absolute', left: selectorPosition.x, top: selectorPosition.y }}>
                          <TabletSelector
                              searchQuery={tabletQuery}
                              onSelect={handleTabletSelect}
                              onClose={() => {
                                setShowTabletSelector(false);
                                setTabletQuery('');
                                if (activeTabId) {
                                  updateTabContent(activeTabId, '');
                                }
                              }}
                          />
                        </div>
                    )}
                  </>
              )
          ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>No tab selected</p>
              </div>
          )}
        </div>
      </div>
  );
};

function App() {
  const { tabs, splitView, addTab, handleNewTab, setSplitRatio } = useRootStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(`${splitView.splitRatio * 100}%`);
  const [rightWidth, setRightWidth] = useState(`${(1 - splitView.splitRatio) * 100}%`);
  const dragTimeoutRef = useRef<number | null>(null);
  const lastRatioRef = useRef<number>(splitView.splitRatio);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [showTabletSelector, setShowTabletSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const welcomeRef = useRef<HTMLDivElement>(null);

  // Update width calculations when split ratio changes
  useEffect(() => {
    setLeftWidth(`${splitView.splitRatio * 100}%`);
    setRightWidth(`${(1 - splitView.splitRatio) * 100}%`);
  }, [splitView.splitRatio]);

  // Set up throttled resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!isDragging && entries.length > 0) {
        setLeftWidth(`${splitView.splitRatio * 100}%`);
        setRightWidth(`${(1 - splitView.splitRatio) * 100}%`);
      }
    };

    resizeObserverRef.current = createThrottledResizeObserver(handleResize, 100);
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [splitView.splitRatio, isDragging]);

  // Global keyboard event handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (tabs.length === 0 && e.key === '/' && !showTabletSelector) {
        e.preventDefault();
        if (welcomeRef.current) {
          const rect = welcomeRef.current.getBoundingClientRect();
          setSelectorPosition({
            x: rect.left + rect.width / 2 - 144,
            y: rect.top + 100
          });
          setShowTabletSelector(true);
        }
      } else if (e.key === 'Escape' && showTabletSelector) {
        setShowTabletSelector(false);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [tabs.length, showTabletSelector]);

  // Handle tablet selection
  const handleTabletSelect = (tablet: any) => {
    // Create initial tablet state
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState(state);

    // Create a new tab with the tablet
    addTab({
      id: crypto.randomUUID(),
      title: tablet.label,
      content: '',
      language: 'plaintext',
      languageLocked: false,
      isTablet: true,
      tabletState: serializedState
    });

    setShowTabletSelector(false);
  };

  // Handle paste event on the welcome screen
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (tabs.length > 0) return;
    const text = e.clipboardData.getData('text');
    if (!text) return;
    handleNewTab(false, text);
  };

  // Debounced version of setSplitRatio to prevent too many updates
  const debouncedSetSplitRatio = useCallback(
      debounce((ratio: number) => {
        setSplitRatio(ratio);
      }, 50),
      [setSplitRatio]
  );

  // Update local state immediately for smooth UI, but debounce the store update
  const updateSplitRatio = useCallback((ratio: number) => {
    // Update local state immediately for smooth UI
    setLeftWidth(`${ratio * 100}%`);
    setRightWidth(`${(1 - ratio) * 100}%`);

    // Only update the store if the ratio has changed significantly
    if (Math.abs(ratio - lastRatioRef.current) > 0.01) {
      lastRatioRef.current = ratio;
      debouncedSetSplitRatio(ratio);
    }
  }, [debouncedSetSplitRatio]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    // Disconnect resize observer during drag to prevent conflicts
    if (resizeObserverRef.current && containerRef.current) {
      resizeObserverRef.current.unobserve(containerRef.current);
    }

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;

      // Prevent default to avoid text selection during drag
      moveEvent.preventDefault();

      // Use requestAnimationFrame to throttle updates during drag
      if (dragTimeoutRef.current === null) {
        dragTimeoutRef.current = window.requestAnimationFrame(() => {
          const containerRect = containerRef.current!.getBoundingClientRect();
          const containerWidth = containerRect.width;
          const mouseX = moveEvent.clientX - containerRect.left;

          // Calculate ratio (0 to 1)
          let ratio = mouseX / containerWidth;

          // Limit the ratio to ensure neither pane gets too small (minimum 20%)
          ratio = Math.max(0.2, Math.min(0.8, ratio));

          // Update the split ratio using our optimized method
          updateSplitRatio(ratio);

          dragTimeoutRef.current = null;
        });
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);

      // Ensure final ratio is committed to the store
      if (lastRatioRef.current !== splitView.splitRatio) {
        setSplitRatio(lastRatioRef.current);
      }

      // Reconnect resize observer after drag is complete
      if (resizeObserverRef.current && containerRef.current) {
        resizeObserverRef.current.observe(containerRef.current);
      }

      // Cancel any pending animation frame
      if (dragTimeoutRef.current !== null) {
        window.cancelAnimationFrame(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current !== null) {
        window.cancelAnimationFrame(dragTimeoutRef.current);
      }
    };
  }, []);

  return (
      <div className="h-screen flex flex-col bg-gray-900">
        {/* Header with tabs */}
        <div className="items-center bg-gray-800 text-white">
          {splitView.isSplit ? (
              <>
                <div style={{ width: leftWidth }}>
                  <TabBar side="left" />
                </div>
                <div style={{ width: rightWidth }}>
                  <TabBar side="right" />
                </div>
              </>
          ) : (
              <div className="flex-1">
                <TabBar side="left" />
              </div>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden flex" ref={containerRef}>
          {splitView.isSplit ? (
              <>
                <div style={{ width: leftWidth }} className="h-full">
                  <EditorPane side="left" />
                </div>
                <div
                    className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize relative ${isDragging ? 'bg-blue-500' : ''}`}
                    onMouseDown={handleDragStart}
                >
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
                <div style={{ width: rightWidth }} className="h-full">
                  <EditorPane side="right" />
                </div>
              </>
          ) : (
              tabs.length > 0 ? (
                  <div className="w-full h-full">
                    <EditorPane side="left" />
                  </div>
              ) : (
                  <div
                      ref={welcomeRef}
                      className="h-full w-full flex flex-col items-center pt-32 text-gray-400 cursor-pointer relative outline-none"
                      onDoubleClick={() => handleNewTab(false)}
                      onPaste={handlePaste}
                  >
                    <img
                        src="/favicon-gray.svg"
                        alt="Scratch Tabs Logo"
                        className="w-16 h-16 mb-6"
                    />
                    <h1 className="text-2xl font-semibold mb-8">Welcome to Scratch Tabs beta!</h1>
                    <div className="text-center">
                      <p className="mb-8 text-lg">To start Scratching:</p>
                      <ol className="list-decimal list-inside text-left space-y-3">
                        <li>Double click here</li>
                        <li>Or click the icons at the top left</li>
                        <li>Or click here and paste</li>
                        <li>Or type '/'</li>
                      </ol>
                    </div>
                    {showTabletSelector && (
                        <div style={{
                          position: 'absolute',
                          left: selectorPosition.x,
                          top: selectorPosition.y
                        }}>
                          <TabletSelector
                              searchQuery=""
                              onSelect={handleTabletSelect}
                              onClose={() => setShowTabletSelector(false)}
                              showSearch={true}
                          />
                        </div>
                    )}
                  </div>
              )
          )}
        </div>
        {tabs.length > 0 && <StatusBar />}
      </div>
  );
}

export default App;