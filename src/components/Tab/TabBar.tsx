import React, {useState, useRef, useEffect} from 'react';
import {
    Plus,
    ClipboardPlus,
    Tablet
} from 'lucide-react';
import {useRootStore} from '../../stores';
import {TabletSelector} from '../../tablets';
import {TabItem} from "./TabItem";
import {TabContextMenu} from "./TabContextMenu";

interface TabBarProps {
    side?: 'left' | 'right';
    onOpenDiffModal: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({side = 'left', onOpenDiffModal}) => {
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
    const [showTabletSelector, setShowTabletSelector] = useState(false);
    const [tabletSelectorPosition, setTabletSelectorPosition] = useState({x: 0, y: 0});

    const inputRef = useRef<HTMLInputElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const tabletButtonRef = useRef<HTMLButtonElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const tabletSelectorTabBarRef = useRef<HTMLDivElement>(null);

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

    // --- Add Effect for Click Outside Detection (TabBar's TabletSelector) ---
    useEffect(() => {
        // Only run if this specific selector is shown
        if (!showTabletSelector) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            // Check click against this selector's ref
            if (tabletSelectorTabBarRef.current && !tabletSelectorTabBarRef.current.contains(event.target as Node)) {
                // Also check if the click was on the button that opens it, otherwise it closes immediately
                if (tabletButtonRef.current && !tabletButtonRef.current.contains(event.target as Node)) {
                    setShowTabletSelector(false); // Close the selector
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
        // Depend on showTabletSelector to add/remove listener
    }, [showTabletSelector]);

    useEffect(() => {
        const updateTabWidths = () => {
            if (!tabsContainerRef.current) return;

            const container = tabsContainerRef.current;
            const containerWidth = container.offsetWidth;
            const numTabs = visibleTabs.length;

            if (numTabs < 7) return;

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
            languageLocked: false,
            cursorPosition: {
                lineNumber: 1,
                column: 1
            }
        }, isRightSide);
    };

    const handleInputBlur = () => {
        if (editingTabId && editingTitle.trim()) {
            updateTabTitle(editingTabId, editingTitle.trim());
        }
        setEditingTabId(null);
    };

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        setContextMenu({tabId, x: e.clientX, y: e.clientY});
    };

    const handleContextMenuClose = (action?: 'compare') => {
        if (action === 'compare' && contextMenu) {
            onOpenDiffModal();
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
            tabletState: serializedState,
            cursorPosition: {
                lineNumber: 1,
                column: 1
            }
        }, side === 'right');

        setShowTabletSelector(false);
    };

    // Show tablet selector
    const handleShowTabletSelector = () => {
        if (tabletButtonRef.current) {
            if (showTabletSelector) {
                setShowTabletSelector(false);
            } else {
                const rect = tabletButtonRef.current.getBoundingClientRect();
                setTabletSelectorPosition({
                    x: rect.left,
                    y: rect.bottom + 4
                });
                setShowTabletSelector(true);
            }
        }
    };

    return (
        <>
            <div
                ref={tabBarRef}
                className="flex bg-gray-800 text-gray-300 w-full h-8 overflow-hidden"
                key={tabsKey}
            >
                <div
                    ref={tabsContainerRef}
                    className="flex-1 flex min-w-0 overflow-hidden"
                    onDoubleClick={handleEmptyAreaDoubleClick}
                >
                    {visibleTabs.map(tab => (
                        <TabItem
                            key={tab.id}
                            tab={tab}
                            isActive={activeSideTabId === tab.id}
                            isEditing={editingTabId === tab.id}
                            editingTitle={editingTitle}
                            maxLineCount={maxLineCount}
                            onClick={handleTabClick}
                            onClose={(tabId, e) => { /* stopPropagation already handled inside */
                                removeTab(tabId);
                            }}
                            onDoubleClick={handleDoubleClick}
                            onContextMenu={(tabId, e) => handleContextMenu(e, tabId)}
                            onEditChange={setEditingTitle}
                            onEditSubmit={handleInputBlur} // Renamed from handleInputBlur
                            onEditCancel={() => setEditingTabId(null)}
                        />
                    ))}
                </div>

                <button
                    onClick={() => handleNewTab(isRightSide)}
                    className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                    title="New tab"
                >
                    <Plus size={16}/>
                </button>
                <button
                    onClick={() => handleNewTabFromPaste(isRightSide)}
                    className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                    title="New tab with contents from clipboard"
                >
                    <ClipboardPlus size={16}/>
                </button>
                <button
                    ref={tabletButtonRef}
                    onClick={handleShowTabletSelector}
                    className="px-2 py-1 hover:bg-gray-700 flex items-center h-8"
                    title="New tablet"
                >
                    <Tablet size={16}/>
                </button>

            </div>

            {showTabletSelector && (
                <div
                    ref={tabletSelectorTabBarRef}
                    style={{
                        position: 'fixed',
                        left: tabletSelectorPosition.x - 255,
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
                    position={{x: contextMenu.x, y: contextMenu.y}}
                    onClose={handleContextMenuClose}
                    isRightSide={isRightSide}
                />
            )}
        </>
    );
};