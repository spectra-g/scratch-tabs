import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { TabletView } from './components/TabletView';
import { TabletSelector } from './tablets';
import { useRootStore } from './stores';
import { initializeLanguageProviders, detectLanguage, isAmbiguousLanguage } from './languages';
import { debounce, createThrottledResizeObserver } from './utils/domUtils';
import {DiffModal} from "./components/DiffModal.tsx";

// Initialize language providers
initializeLanguageProviders();

// Add at the top level, outside of any component
const scrollPositions: { [tabId: string]: number } = {};

interface EditorPaneProps {
  side: 'left' | 'right';
}

const EditorPane: React.FC<EditorPaneProps> = ({side}) => {
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
  const [selectorPosition, setSelectorPosition] = useState({x: 0, y: 0});
  // --- Add Ref for the TabletSelector container ---
  const tabletSelectorRef = useRef<HTMLDivElement>(null);

  const activeTabId = side === 'left' ? splitView.activeLeftTabId : splitView.activeRightTabId;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // --- Add Effect for Click Outside Detection ---
  useEffect(() => {
    if (!showTabletSelector) {
      return; // Only run if selector is visible
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is outside the TabletSelector's container
      if (tabletSelectorRef.current && !tabletSelectorRef.current.contains(event.target as Node)) {
        setShowTabletSelector(false);
        setTabletQuery('');
        // Optional: Clear content only if it still starts with /?
        // Check if activeTabId exists before using it
        if (activeTabId && editorRef.current?.getValue()?.trim()?.startsWith('/')) {
          updateTabContent(activeTabId, ''); // Pass activeTabId here
        }
      }
    };

    // Add the listener when the effect runs (i.e., when selector is shown)
    document.addEventListener('mousedown', handleClickOutside);

    // Return a cleanup function to remove the listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // Re-run this effect if showTabletSelector changes
  }, [showTabletSelector, activeTabId, updateTabContent]); // Include dependencies

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

  const editorContainerRef = useRef<HTMLDivElement>(null);

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
          setShowTabletSelector(false);
          setTimeout(() => setShowTabletSelector(true), 0);
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
    updateTabState(activeTabId, {tabletState: newState});
  };

  // Determine if markdown preview should be active based on flags and tab
  const shouldShowMarkdownPreview = previewMode && activeTab?.language === 'markdown';
  const isFullPreview = false;

  // --- Full Preview Mode ---
  if (isFullPreview && shouldShowMarkdownPreview) {
    return (
        <div className="flex flex-col h-full w-full">
          <div className="flex-1 w-full h-full overflow-auto p-4 custom-scrollbar">
            <div className="prose prose-invert max-w-none p-4">
              <Markdown>{activeTab.content}</Markdown>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className={"flex h-full w-full flex-col"}>
          <div className={`flex h-full w-full ${previewMode ? 'flex-row' : 'flex-col'}`}>
            <div
                className={`flex-1 overflow-hidden relative ${previewMode ? 'w-1/2' : 'w-full'} h-full`}
                onClick={!previewMode ? handleEditorFocus : undefined} // Only apply focus click to full editor container
            >
              {activeTab ? (
                  activeTab.isTablet ? (
                      <TabletView tab={activeTab} onChange={handleTabletStateChange} />
                  ) : (
                      // Container for Editor and potential TabletSelector overlay
                      <div ref={editorContainerRef} className="w-full h-full relative" onClick={previewMode ? handleEditorFocus : undefined}> {/* Apply focus click here in split view */}
                        <Editor
                            height="100%" // Takes full height of its parent div
                            width="100%"  // Takes full width of its parent div
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
                        {/* Tablet Selector positioned relative to this container */}
                        {showTabletSelector && (
                            <div ref={tabletSelectorRef} style={{ position: 'absolute', left: selectorPosition.x, top: selectorPosition.y, zIndex: 10 }}> {/* Added z-index */}
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
                      </div>
                  )
              ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <p>No tab selected</p>
                  </div>
              )}
            </div>

            {shouldShowMarkdownPreview && (
                <div className="w-1/2 h-full flex-1 flex flex-col overflow-hidden"> {/* Added border */}
                  <div className="flex-1 w-full h-full overflow-auto p-4 custom-scrollbar"> {/* Ensure bg/text contrast */}
                    <div className="prose prose-invert max-w-none p-0.5 ">
                      <Markdown>{activeTab.content}</Markdown>
                    </div>
                  </div>
                </div>
            )}
          </div>
        {tabs.length > 0 && <StatusBar editor={editorRef?.current}/>}
      </div>
  );
}
function App() {
  const {tabs, splitView, addTab, handleNewTab, setSplitRatio} = useRootStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(`${splitView.splitRatio * 100}%`);
  const [rightWidth, setRightWidth] = useState(`${(1 - splitView.splitRatio) * 100}%`);
  const dragTimeoutRef = useRef<number | null>(null);
  const lastRatioRef = useRef<number>(splitView.splitRatio);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [showTabletSelector, setShowTabletSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({x: 0, y: 0});
  const welcomeRef = useRef<HTMLDivElement>(null);
  const tabletSelectorWelcomeRef = useRef<HTMLDivElement>(null);
  const [diffModal, setDiffModal] = useState<{ leftTabId: string | null; rightTabId: string | null } | null>(null);

  // Update width calculations when split ratio changes
  useEffect(() => {
    setLeftWidth(`${(splitView.isSplit ? splitView.splitRatio : 1) * 100}%`);
    setRightWidth(`${(1 - splitView.splitRatio) * 100}%`);
  }, [splitView.splitRatio, splitView.isSplit]);

  // Set up throttled resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      if (!isDragging && entries.length > 0) {
        setLeftWidth(`${(splitView.isSplit ? splitView.splitRatio : 1) * 100}%`);
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
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [tabs.length, showTabletSelector]);

  // --- Add Effect for Click Outside Detection (Welcome Screen) ---
  useEffect(() => {
    // Only run if welcome selector is shown and there are no tabs
    if (!showTabletSelector || tabs.length > 0) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the welcome selector's container
      if (tabletSelectorWelcomeRef.current && !tabletSelectorWelcomeRef.current.contains(event.target as Node)) {
        setShowTabletSelector(false); // Close the selector
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTabletSelector, tabs.length]); // Dependencies

  const handleOpenDiffModal = () => {
    setDiffModal({ leftTabId : splitView.activeLeftTabId, rightTabId: splitView.activeRightTabId });
  };

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
      <div className="flex w-full h-full overflow-hidden" ref={containerRef}>
        {tabs.length == 0 ? (
          <>
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
                <div ref={tabletSelectorWelcomeRef} style={{
                  position: 'absolute',
                  left: selectorPosition.x,
                  top: selectorPosition.y,
                  zIndex: 50
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
          </>
        ) : (
          <>
            <div className={`flex ${splitView.isSplit ? "w-1/2" : "w-full"} flex-col`}
                 style={{width: leftWidth}}>
              <div className="w-full">
                <TabBar side="left" onOpenDiffModal={handleOpenDiffModal}/>
              </div>
              <div className="w-full h-full overflow-hidden">
                <EditorPane side="left"/>
              </div>
            </div>
            {splitView.isSplit && (
              <>
                <div
                  className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize relative ${isDragging ? 'bg-blue-500' : ''}`}
                  onMouseDown={handleDragStart}
                >
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center">
                    <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
                <div className={`flex ${splitView.isSplit ? "w-1/2" : "w-full"} flex-col`}
                     style={{width: rightWidth}}>
                  <div className="w-full">
                    <TabBar side="right" onOpenDiffModal={handleOpenDiffModal}/>
                  </div>
                  <div className="w-full h-full overflow-hidden">
                    <EditorPane side="right"/>
                  </div>
                </div>
              </>
            )}
            {diffModal && (
                <DiffModal
                    leftTabId={diffModal.leftTabId || ""}
                    rightTabId={diffModal.rightTabId || ""}
                    onClose={() => setDiffModal(null)}
                />
            )}

          </>
        )}
      </div>
    </div>
  );
}

export default App;