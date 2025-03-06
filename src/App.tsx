import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { Plus } from 'lucide-react';
import { marked } from 'marked';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { useEditorStore } from './store';
import { initializeLanguageProviders, detectLanguage, isAmbiguousLanguage } from './languages';

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
    setActiveRightTab
  } = useEditorStore();
  
  const editorRef = useRef<any>(null);
  const previousContentRef = useRef<string>('');
  
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
  }, [activeTabId]);
  
  const handleEditorChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined && activeTab) {
      const prevContent = previousContentRef.current;
      const newContent = value;
      
      // Update the content
      updateTabContent(activeTabId, newContent);
      
      // If content is empty, reset to plaintext and unlock
      if (newContent.trim().length === 0) {
        updateTabLanguage(activeTabId, 'plaintext', false);
      } else {
        // Check if this is a complete content replacement
        const isCompleteReplacement = 
          Math.abs(prevContent.length - newContent.length) > 10 && // Length changed significantly
          !newContent.includes(prevContent) && // New content doesn't contain old content
          !prevContent.includes(newContent); // Old content doesn't contain new content
        
        // If it's a complete replacement, unlock the language for recalculation
        if (isCompleteReplacement) {
          const detectedLanguage = detectLanguage(newContent);
          const shouldLock = detectedLanguage !== 'plaintext' && !isAmbiguousLanguage(newContent);
          updateTabLanguage(activeTabId, detectedLanguage, shouldLock);
        } 
        // Otherwise, only detect if not locked
        else if (!activeTab.languageLocked) {
          const detectedLanguage = detectLanguage(newContent);
          if (detectedLanguage !== activeTab.language) {
            const shouldLock = detectedLanguage !== 'plaintext' && !isAmbiguousLanguage(newContent);
            updateTabLanguage(activeTabId, detectedLanguage, shouldLock);
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
      <div className="flex-1 overflow-hidden w-full" onClick={handleEditorFocus}>
        {activeTab ? (
          activeTab.language === 'markdown' && previewMode ? (
            renderMarkdownPreview()
          ) : (
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
                scrollBeyondLastLine: false,
                formatOnPaste: true,
                formatOnType: true,
                find: {
                  addExtraSpaceOnTop: false,
                },
              }}
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No tab selected</p>
          </div>
        )}
      </div>
      
      <StatusBar side={side} />
    </div>
  );
};

// Utility function to debounce function calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

// Utility to throttle resize observer notifications
function createThrottledResizeObserver(callback: ResizeObserverCallback, delay: number): ResizeObserver {
  let timeoutId: number | null = null;
  let pendingEntries: ResizeObserverEntry[] = [];
  
  const throttledCallback: ResizeObserverCallback = (entries, observer) => {
    // Store the latest entries
    pendingEntries = entries;
    
    // If we already have a timeout scheduled, don't do anything
    if (timeoutId !== null) return;
    
    // Schedule processing on the next animation frame to avoid layout thrashing
    timeoutId = window.requestAnimationFrame(() => {
      callback(pendingEntries, observer);
      pendingEntries = [];
      timeoutId = null;
    });
  };
  
  return new ResizeObserver(throttledCallback);
}

function App() {
  const { tabs, splitView, addTab, activeTabId, canAddNewTab, setSplitRatio } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(`${splitView.splitRatio * 100}%`);
  const [rightWidth, setRightWidth] = useState(`${(1 - splitView.splitRatio) * 100}%`);
  const dragTimeoutRef = useRef<number | null>(null);
  const lastRatioRef = useRef<number>(splitView.splitRatio);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Update width calculations when split ratio changes
  useEffect(() => {
    setLeftWidth(`${splitView.splitRatio * 100}%`);
    setRightWidth(`${(1 - splitView.splitRatio) * 100}%`);
  }, [splitView.splitRatio]);
  
  // Set up throttled resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create a throttled resize observer to prevent loop errors
    const handleResize = (entries: ResizeObserverEntry[]) => {
      // Only update if we're not currently dragging
      if (!isDragging && entries.length > 0) {
        // Recalculate widths based on current ratio
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
  
  const handleNewTab = () => {
    // Determine which side is active based on the current activeTabId
    const isRightSideActive = splitView.isSplit && 
      splitView.rightTabs.includes(splitView.activeRightTabId || '') && 
      activeTabId === splitView.activeRightTabId;
    
    // Check if we can add a new tab
    if (!canAddNewTab(isRightSideActive)) {
      // Don't add a new tab if we've reached the limit of empty tabs
      return;
    }
    
    addTab({
      id: crypto.randomUUID(),
      title: `new ${tabs.length + 1}`,
      content: '',
      language: 'plaintext',
      languageLocked: false
    }, isRightSideActive);
  };
  
  // Debounced version of setSplitRatio to prevent too many updates
  const debouncedSetSplitRatio = useCallback(
    debounce((ratio: number) => {
      setSplitRatio(ratio);
    }, 50), // Increased debounce time to further reduce updates
    [setSplitRatio]
  );
  
  // Update local state immediately for smooth UI, but debounce the store update
  const updateSplitRatio = useCallback((ratio: number) => {
    // Update local state immediately for smooth UI
    setLeftWidth(`${ratio * 100}%`);
    setRightWidth(`${(1 - ratio) * 100}%`);
    
    // Only update the store if the ratio has changed significantly
    if (Math.abs(ratio - lastRatioRef.current) > 0.01) { // Increased threshold to reduce updates
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
      <div className="flex items-center bg-gray-800 text-white">
        {splitView.isSplit ? (
          <>
            {/* Left side tabs */}
            <div style={{ width: leftWidth }}>
              <TabBar side="left" />
            </div>
            
            {/* Right side tabs */}
            <div style={{ width: rightWidth }}>
              <TabBar side="right" />
            </div>
          </>
        ) : (
          <div className="flex-1">
            <TabBar side="left" />
          </div>
        )}
        
        <button
          onClick={handleNewTab}
          className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
        >
          <Plus size={16} />
        </button>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 overflow-hidden flex" ref={containerRef}>
        {splitView.isSplit ? (
          <>
            <div style={{ width: leftWidth }} className="h-full">
              <EditorPane side="left" />
            </div>
            
            {/* Draggable divider */}
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
              className="h-full w-full flex items-center justify-center text-gray-400 cursor-pointer"
              onDoubleClick={handleNewTab}
            >
              <p>Double-click here or click the + button to create a new tab</p>
            </div>
          )
        )}
      </div>
      
      {!splitView.isSplit && tabs.length === 0 && <StatusBar />}
    </div>
  );
}

export default App;