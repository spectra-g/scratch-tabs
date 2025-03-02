import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Maximize, XCircle, ChevronLeftSquare, ChevronRightSquare, Copy, Layers } from 'lucide-react';
import { useEditorStore } from '../store';

interface TabContextMenuProps {
  tabId: string;
  position: { x: number; y: number };
  onClose: () => void;
  isRightSide: boolean;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({ tabId, position, onClose, isRightSide }) => {
  const { 
    tabs, 
    splitView, 
    splitScreen, 
    moveTabToRight, 
    moveTabToLeft, 
    unsplitScreen,
    closeTabsToLeft,
    closeTabsToRight,
    closeAllExcept,
    duplicateTab,
    groupTabsByType
  } = useEditorStore();
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Determine which menu items to show
  const canSplit = !splitView.isSplit && tabs.length >= 2;
  const canMoveRight = splitView.isSplit && !isRightSide && splitView.leftTabs.length > 1;
  const canMoveLeft = splitView.isSplit && isRightSide && splitView.rightTabs.length > 1;
  const canUnsplit = splitView.isSplit && 
    ((isRightSide && splitView.rightTabs.length === 1) || 
     (!isRightSide && splitView.leftTabs.length === 1));
  
  // Get the current tab list based on which side we're on
  const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
  
  // Find the index of the current tab in its list
  const tabIndex = currentTabList.indexOf(tabId);
  
  // Determine if we can close tabs to the left or right
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  
  // Can close all except this tab if there are other tabs
  const canCloseAllExcept = currentTabList.length > 1;
  
  // Check if we can group tabs by type
  const canGroupTypes = (() => {
    // Need at least 3 tabs to make grouping meaningful
    if (currentTabList.length < 3) return false;
    
    // Get the languages of all tabs in the current list
    const tabLanguages = currentTabList.map(id => {
      const tab = tabs.find(t => t.id === id);
      return tab ? tab.language : '';
    });
    
    // Check if there are at least two different languages
    const uniqueLanguages = new Set(tabLanguages);
    if (uniqueLanguages.size < 2) return false;
    
    // Check if the tabs are already grouped by type
    let currentLanguage = tabLanguages[0];
    let languageChangePoints = 0;
    
    for (let i = 1; i < tabLanguages.length; i++) {
      if (tabLanguages[i] !== currentLanguage) {
        languageChangePoints++;
        currentLanguage = tabLanguages[i];
      }
    }
    
    // If we have more language changes than unique languages, they're not grouped
    return languageChangePoints > uniqueLanguages.size - 1;
  })();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  return (
    <div 
      ref={menuRef}
      className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        minWidth: "200px"
      }}
    >
      <button 
        className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
        onClick={() => {
          duplicateTab(tabId, isRightSide);
          onClose();
        }}
      >
        <Copy size={14} className="mr-2" />
        Duplicate tab
      </button>
      
      {canGroupTypes && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            groupTabsByType(isRightSide);
            onClose();
          }}
        >
          <Layers size={14} className="mr-2" />
          Group tabs by type
        </button>
      )}
      
      {(canSplit || canMoveRight || canMoveLeft || canUnsplit) && (
        <div className="border-t border-gray-600 my-1"></div>
      )}
      
      {canSplit && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            splitScreen(tabId);
            onClose();
          }}
        >
          <ChevronRight size={14} className="mr-2" />
          Split
        </button>
      )}
      
      {canMoveRight && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            moveTabToRight(tabId);
            onClose();
          }}
        >
          <ChevronRight size={14} className="mr-2" />
          Move right
        </button>
      )}
      
      {canMoveLeft && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            moveTabToLeft(tabId);
            onClose();
          }}
        >
          <ChevronLeft size={14} className="mr-2" />
          Move left
        </button>
      )}
      
      {canUnsplit && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            unsplitScreen(isRightSide);
            onClose();
          }}
        >
          <Maximize size={14} className="mr-2" />
          Unsplit
        </button>
      )}
      
      {(canCloseToLeft || canCloseToRight || canCloseAllExcept) && (
        <div className="border-t border-gray-600 my-1"></div>
      )}
      
      {canCloseAllExcept && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            closeAllExcept(tabId, isRightSide);
            onClose();
          }}
        >
          <XCircle size={14} className="mr-2" />
          Close all except this
        </button>
      )}
      
      {canCloseToLeft && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            closeTabsToLeft(tabId, isRightSide);
            onClose();
          }}
        >
          <ChevronLeftSquare size={14} className="mr-2" />
          Close tabs to the left
        </button>
      )}
      
      {canCloseToRight && (
        <button 
          className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
          onClick={() => {
            closeTabsToRight(tabId, isRightSide);
            onClose();
          }}
        >
          <ChevronRightSquare size={14} className="mr-2" />
          Close tabs to the right
        </button>
      )}
    </div>
  );
};

interface TabBarProps {
  side?: 'left' | 'right';
}

export const TabBar: React.FC<TabBarProps> = ({ side = 'left' }) => {
  const { 
    tabs, 
    splitView,
    removeTab, 
    updateTabTitle,
    setActiveLeftTab,
    setActiveRightTab,
    addTab,
    canAddNewTab,
  } = useEditorStore();
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  
  // Determine which tabs to show based on the side
  const isRightSide = side === 'right';
  const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;
  
  // Use a key derived from the tab IDs to force re-render when the order changes
  const tabsKey = tabIds.join('-');
  
  // Create visibleTabs array that preserves the order of tabIds
  const visibleTabs = tabIds.map(id => tabs.find(tab => tab.id === id)).filter(Boolean) as typeof tabs;
  const activeSideTabId = isRightSide ? splitView.activeRightTabId : splitView.activeLeftTabId;
  
  // Calculate line counts and find the maximum
  const getTabLineCount = (content: string): number => {
    return content.split('\n').length;
  };
  
  const tabLineCounts = visibleTabs.map(tab => getTabLineCount(tab.content));
  const maxLineCount = Math.max(...tabLineCounts, 1); // Avoid division by zero
  
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);
  
  const handleDoubleClick = (tab: { id: string; title: string }, e: React.MouseEvent) => {
    // Check if the double click was on the text span
    const target = e.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.textContent === tab.title) {
      // Double click on the text - edit the title
      setEditingTabId(tab.id);
      setEditingTitle(tab.title);
    } else {
      // Double click elsewhere in the tab - create a new tab
      handleCreateNewTab();
    }
    
    // Stop propagation to prevent the empty area handler from firing
    e.stopPropagation();
  };
  
  const handleCreateNewTab = () => {
    // Check if we can add a new tab
    if (!canAddNewTab(isRightSide)) {
      // Don't add a new tab if we've reached the limit of empty tabs
      return;
    }
    
    const newTabId = crypto.randomUUID();
    addTab({
      id: newTabId,
      title: `new ${tabs.length + 1}`,
      content: '',
      language: 'plaintext',
      languageLocked: false
    }, isRightSide);
  };
  
  const handleInputBlur = () => {
    if (editingTabId && editingTitle.trim()) {
      updateTabTitle(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };
  
  const handleTabClick = (tabId: string) => {
    if (isRightSide) {
      setActiveRightTab(tabId);
    } else {
      setActiveLeftTab(tabId);
    }
  };
  
  const handleEmptyAreaDoubleClick = (e: React.MouseEvent) => {
    // Only handle double clicks on the tab bar itself, not on tabs
    if (e.currentTarget === e.target) {
      handleCreateNewTab();
    }
  };
  
  return (
    <div 
      ref={tabBarRef}
      className="flex bg-gray-800 text-gray-300 overflow-x-auto w-full h-8"
      onDoubleClick={handleEmptyAreaDoubleClick}
      key={tabsKey} // Add a key to force re-render when tab order changes
    >
      {visibleTabs.map((tab, index) => {
        // Calculate the relative width of the indicator bar
        const lineCount = getTabLineCount(tab.content);
        const relativeWidth = Math.max(Math.min(lineCount / maxLineCount, 1), 0.05) * 100;
        
        return (
          <div
            key={tab.id}
            className={`relative flex items-center px-3 py-1 cursor-pointer border-r border-gray-700 text-xs ${
              activeSideTabId === tab.id ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
            onClick={() => handleTabClick(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onDoubleClick={(e) => handleDoubleClick(tab, e)}
          >
            {/* Line count indicator bar - horizontal at bottom */}
            <div 
              className="absolute left-0 bottom-0 h-0.5 bg-gray-500 opacity-50" 
              style={{ 
                width: `${relativeWidth}%`,
              }}
            />
            
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="bg-gray-600 text-gray-200 px-2 py-0.5 rounded outline-none w-32 text-xs"
              />
            ) : (
              <span className="mr-2">
                {tab.title}
              </span>
            )}
            <button
              className="hover:bg-gray-600 rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      
      {contextMenu && (
        <TabContextMenu 
          tabId={contextMenu.tabId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          isRightSide={isRightSide}
        />
      )}
    </div>
  );
};