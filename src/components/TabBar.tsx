import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Maximize,
  XCircle,
  ChevronLeftSquare,
  ChevronRightSquare,
  Copy,
  Layers,
  GitCompare,
  Split,
  Plus,
  ClipboardPlus,
  FileCode,
  Tablet
} from 'lucide-react';
import { useRootStore } from '../stores';
import { DiffModal } from './DiffModal';
import { languageRegistry } from '../languages';
import { TabletSelector } from '../tablets';

interface TabContextMenuProps {
  tabId: string;
  position: { x: number; y: number };
  onClose: (action?: 'compare') => void;
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
    groupTabsByType,
    updateTabContent,
    updateTabLanguage
  } = useRootStore();

  const menuRef = useRef<HTMLDivElement>(null);
  const [showLanguages, setShowLanguages] = useState(false);
  const [languagesPosition, setLanguagesPosition] = useState({ x: 0, y: 0 });

  // Determine which menu items to show
  const canSplit = !splitView.isSplit && tabs.length >= 2;
  const canDuplicateAndSplit = !splitView.isSplit && tabs.length === 1;
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

  // Determine if we can compare with the other side
  const canCompare = (() => {
    if (!splitView.isSplit) return false;

    // Get the current tab and the active tab from the other side
    const currentTab = tabs.find(t => t.id === tabId);
    const otherSideTabId = isRightSide ? splitView.activeLeftTabId : splitView.activeRightTabId;
    const otherSideTab = tabs.find(t => t.id === otherSideTabId);

    // Can only compare if both tabs exist and neither is a tablet
    return currentTab && otherSideTab && !currentTab.isTablet && !otherSideTab.isTablet;
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

  const handleDuplicateAndSplit = () => {
    // First duplicate the tab
    const newTabId = duplicateTab(tabId, true); // Pass true to indicate this is for the right side
    // Then split with the original tab on the left and new tab on the right
    splitScreen(tabId, newTabId);
    onClose();
  };

  const handleFromSample = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setLanguagesPosition({
      x: rect.right,
      y: rect.top
    });
    setShowLanguages(true);
  };

  const handleLanguageSelect = (languageId: string) => {
    const language = languageRegistry.getById(languageId);
    if (language && language.sampleContent) {
      const tab = tabs.find(t => t.id === tabId);
      if (tab && !tab.isTablet) {
        updateTabContent(tabId, language.sampleContent());
        updateTabLanguage(tabId, languageId, true);
      }
    }
    setShowLanguages(false);
    onClose();
  };

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
            className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs group relative"
            onClick={handleFromSample}
            onMouseEnter={(e) => handleFromSample(e)}
            onMouseLeave={() => setShowLanguages(false)}
        >
          <FileCode size={14} className="mr-2" />
          From sample
          {showLanguages && (
              <div
                  className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg py-1 left-full top-0 min-w-[150px]"
                  style={{
                    left: languagesPosition.x - position.x,
                    top: languagesPosition.y - position.y,
                  }}
              >
                {languageRegistry.getAll().map(lang => (
                    <button
                        key={lang.id}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-600 text-xs"
                        onClick={() => handleLanguageSelect(lang.id)}
                    >
                      {lang.name}
                    </button>
                ))}
              </div>
          )}
        </button>

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

        {canDuplicateAndSplit && (
            <button
                className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
                onClick={handleDuplicateAndSplit}
            >
              <Split size={14} className="mr-2" />
              Duplicate and split
            </button>
        )}

        {canCompare && (
            <button
                className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs"
                onClick={() => {
                  onClose('compare');
                }}
            >
              <GitCompare size={14} className="mr-2" />
              Compare with other side
            </button>
        )}

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
    handleNewTab,
    handleNewTabFromPaste,
    updateTabTitle,
    setActiveLeftTab,
    setActiveRightTab,
    addTab,
    canAddNewTab,
  } = useRootStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [diffModal, setDiffModal] = useState<{ leftTabId: string; rightTabId: string } | null>(null);
  const [showTabletSelector, setShowTabletSelector] = useState(false);
  const [tabletSelectorPosition, setTabletSelectorPosition] = useState({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabletButtonRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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

  const tabLineCounts = tabs.filter(tab => tab.isTablet != true).map(tab => getTabLineCount(tab.content));
  const maxLineCount = Math.max(...tabLineCounts, 1); // Avoid division by zero

  useEffect(() => {
    const updateTabWidths = () => {
      if (!tabsContainerRef.current) return;

      const container = tabsContainerRef.current;
      const containerWidth = container.offsetWidth;
      const numTabs = visibleTabs.length;

      console.log("container width", containerWidth);

      if (numTabs < 5) return;

      // Calculate available width for tabs (subtracting width of action buttons)
      const actionButtonsWidth = 0; // Approximate width of all action buttons
      const availableWidth = containerWidth - actionButtonsWidth;

      // Minimum tab width before text is hidden completely
      const minTabWidth = 5; // You can adjust this value as needed

      // Calculate the ideal tab width based on the available space
      let tabWidth = availableWidth / numTabs;

      // Apply minimum width to prevent tabs from shrinking too small
      tabWidth = Math.max(tabWidth, minTabWidth);

      // Apply the calculated width to each tab
      const tabs = container.getElementsByClassName('tab-item');
      Array.from(tabs).forEach((tab: Element) => {
        (tab as HTMLElement).style.width = `${tabWidth}px`;
        (tab as HTMLElement).style.minWidth = `${minTabWidth}px`;
        (tab as HTMLElement).style.maxWidth = `${tabWidth}px`;
      });
    };

    // Update tab widths initially and on window resize
    updateTabWidths();
    window.addEventListener('resize', updateTabWidths);

    return () => window.removeEventListener('resize', updateTabWidths);
  }, [visibleTabs.length]); // Recalculate whenever the number of visible tabs changes


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
      // Double-click on the text - edit the title
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

  const handleContextMenuClose = (action?: 'compare') => {
    if (action === 'compare' && contextMenu) {
      const isRightSide = side === 'right';
      const otherSideTabId = isRightSide ? splitView.activeLeftTabId : splitView.activeRightTabId;

      if (splitView.isSplit && otherSideTabId) {
        // Open diff modal
        const leftTabId = isRightSide ? otherSideTabId : contextMenu.tabId;
        const rightTabId = isRightSide ? contextMenu.tabId : otherSideTabId;

        setDiffModal({ leftTabId, rightTabId });
      }
    }

    setContextMenu(null);
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
    }, side === 'right');

    setShowTabletSelector(false);
  };

  // Show tablet selector
  const handleShowTabletSelector = () => {
    if (tabletButtonRef.current) {
      const rect = tabletButtonRef.current.getBoundingClientRect();
      setTabletSelectorPosition({
        x: rect.left,
        y: rect.bottom + 4
      });
      setShowTabletSelector(true);
    }
  };

  return (
      <>
        <div
            ref={tabBarRef}
            className="flex bg-gray-800 text-gray-300 w-full h-8 overflow-hidden"
            onDoubleClick={handleEmptyAreaDoubleClick}
            key={tabsKey}
        >
          <div
              ref={tabsContainerRef}
              className="flex-1 flex min-w-0 overflow-hidden"
          >
            {visibleTabs.map(tab => {
              // Calculate the relative width of the indicator bar
              const lineCount = getTabLineCount(tab.content);
              const relativeWidth = Math.max(Math.min(lineCount / maxLineCount, 1), 0.05) * 100;
              return (
                  <div
                      key={tab.id}
                      className={`tab-item relative flex items-center flex-shrink-0 px-1 py-1 cursor-pointer border-r border-gray-700 text-xs ${
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
                        <div className="flex-1 min-w-0 flex items-center">
                    <span className="truncate">
                      {tab.title}
                    </span>
                        </div>
                    )}
                    <button
                        className="flex-shrink-0 hover:bg-gray-600 rounded p-0.5 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(tab.id);
                        }}
                    >
                      <X size={12}/>
                    </button>
                  </div>
              );
            })}
          </div>
          
            <button
                onClick={() => handleNewTab(isRightSide)}
                className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                title="New tab"
            >
              <Plus size={16} />
            </button>
            <button
                onClick={() => handleNewTabFromPaste(isRightSide)}
                className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                title="New tab with contents from clipboard"
            >
              <ClipboardPlus size={16} />
            </button>
            <button
                ref={tabletButtonRef}
                onClick={handleShowTabletSelector}
                className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                title="New tablet"
            >
              <Tablet size={16} />
            </button>
         
        </div>

        {showTabletSelector && (
            <div
                style={{
                  position: 'fixed',
                  left: tabletSelectorPosition.x,
                  top: tabletSelectorPosition.y,
                  zIndex: 50
                }}
            >
              <TabletSelector
                  searchQuery=""
                  onSelect={handleTabletSelect}
                  onClose={() => setShowTabletSelector(false)}
                  showSearch={true}
              />
            </div>
        )}

        {contextMenu && (
            <TabContextMenu
                tabId={contextMenu.tabId}
                position={{ x: contextMenu.x, y: contextMenu.y }}
                onClose={handleContextMenuClose}
                isRightSide={isRightSide}
            />
        )}

        {diffModal && (
            <DiffModal
                leftTabId={diffModal.leftTabId}
                rightTabId={diffModal.rightTabId}
                onClose={() => setDiffModal(null)}
            />
        )}
      </>
  );
};