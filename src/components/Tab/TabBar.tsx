import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRootStore } from '../../stores';
import { TabletSelector } from '../../tablets';
import { TabItem } from "./TabItem";
import { TabContextMenu } from "./TabContextMenu";
import { TabActions } from './TabActions';
import { DragDropContext, Draggable, DropResult, DraggableProvided, DroppableProvided } from 'react-beautiful-dnd';
import { StrictModeDroppable } from './StrictModeDroppable';
import { TabTooltip } from './TabTooltip';
import { Tab } from '../../types';
import { languageRegistry } from '../../languages';

interface TabBarProps {
  side?: 'left' | 'right';
  onOpenDiffModal: () => void;
}

interface TooltipContent {
    title: string;
    language?: string;
    lineCount?: number;
}

// Helper function to reorder an array
const reorder = (list: string[], startIndex: number, endIndex: number): string[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export const TabBar: React.FC<TabBarProps> = ({ side = 'left', onOpenDiffModal }) => {
    const {
        tabs,
        splitView,
        removeTab,
        updateTabTitle,
        setActiveLeftTab,
        setActiveRightTab,
        addTab,
        canAddNewTab,
        reorderTabs,
    } = useRootStore();

    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
    const [isTabWidthsAdjusting, setIsTabWidthsAdjusting] = useState(false);
    const [showTabletSelector, setShowTabletSelector] = useState(false);
    const [tabletSelectorPosition, setTabletSelectorPosition] = useState({x: 0, y: 0});

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
    const [isMouseOverTabBar, setIsMouseOverTabBar] = useState(false);
    const [hasInitialDelayPassed, setHasInitialDelayPassed] = useState(false);
    const initialDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hideTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hoveredTabIdRef = useRef<string | null>(null);
    const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null); // Use the new type

    const inputRef = useRef<HTMLInputElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const tabletButtonRef = useRef<HTMLButtonElement>(null);
    const newTabButtonRef = useRef<HTMLButtonElement>(null);
    const tabsWrapperRef = useRef<HTMLDivElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const tabletSelectorTabBarRef = useRef<HTMLDivElement>(null);

    const isRightSide = side === 'right';
    const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;

    const tabsKey = tabIds.join('-'); // Key for the outer div to force re-render on order change

    const visibleTabs = tabIds.map(id => tabs.find(tab => tab.id === id)).filter(Boolean) as typeof tabs;
    const activeSideTabId = isRightSide ? splitView.activeRightTabId : splitView.activeLeftTabId;

    const getTabLineCount = (content: string): number => {
        return content.split('\n').length;
    };

    const tabLineCounts = tabs.filter(tab => tab.isTablet != true).map(tab => getTabLineCount(tab.content));
    const maxLineCount = Math.max(...tabLineCounts, 1);

    useEffect(() => {
        if (!showTabletSelector) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (tabletSelectorTabBarRef.current && !tabletSelectorTabBarRef.current.contains(event.target as Node)) {
                if (tabletButtonRef.current && !tabletButtonRef.current.contains(event.target as Node)) {
                    setShowTabletSelector(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTabletSelector]);

    useEffect(() => {

        updateTabWidths();
        window.addEventListener('resize', updateTabWidths);

        return () => window.removeEventListener('resize', updateTabWidths);
    }, [visibleTabs.length, splitView.splitRatio]);

    useEffect(() => {
        setIsTabWidthsAdjusting(false);
    }, [tabs.length]);

    useEffect(() => {
        if (editingTabId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingTabId]);

    useEffect(() => {
        return () => {
            if (initialDelayTimerRef.current) {
                clearTimeout(initialDelayTimerRef.current);
            }
            if (hideTooltipTimerRef.current) {
                clearTimeout(hideTooltipTimerRef.current);
            }
        };
    }, []);

    const clearTooltipTimers = () => {
        if (initialDelayTimerRef.current) {
            clearTimeout(initialDelayTimerRef.current);
            initialDelayTimerRef.current = null;
        }
        if (hideTooltipTimerRef.current) {
            clearTimeout(hideTooltipTimerRef.current);
            hideTooltipTimerRef.current = null;
        }
    };

    const showTooltip = useCallback((tab: Tab, element: HTMLElement) => {
        clearTooltipTimers(); // Clear any pending hide timer

        const rect = element.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.bottom + 6, // Position below the tab + small gap
        };

        const content: TooltipContent = {
            title: tab.title
        };

        if (!tab.isTablet) {
            try {
                const detector = languageRegistry.getById(tab.language);
                // Check if detector exists AND has getName before calling it
                if (detector && typeof detector.getName === 'function') {
                    content.language = detector.getName();
                } else {
                    // Fallback if detector is invalid or language string is set but unknown
                    content.language = tab.language || 'Unknown';
                }
            } catch (error) {
                content.language = tab.language || 'Error'; // Indicate an error occurred
            }
        }

        setTooltipPosition(position);
        setTooltipContent(content);
        setTooltipVisible(true);
    }, []); // No dependencies needed if getTabLineCount and languageRegistry are stable

    const handleTabMouseEnter = useCallback((tab: Tab, element: HTMLElement) => {
        setHoveredTabId(tab.id);
        hoveredTabIdRef.current = tab.id; // <<< Update the ref immediately

        clearTooltipTimers(); // Clear any pending timers

        if (isMouseOverTabBar && hasInitialDelayPassed) {
            // Already hovered on the bar, show immediately
            showTooltip(tab, element);
        } else {
            // Start initial delay timer
            initialDelayTimerRef.current = setTimeout(() => {
                if (hoveredTabIdRef.current === tab.id) {
                    showTooltip(tab, element);
                    setHasInitialDelayPassed(true);
                }
                initialDelayTimerRef.current = null;
            }, 1000); // 1 second delay
        }
    }, [isMouseOverTabBar, hasInitialDelayPassed, showTooltip]); // Added hoveredTabId dependency

    const handleTabMouseLeave = useCallback((tabId: string) => {
        // Clear the initial delay timer if it hasn't fired yet
        if (initialDelayTimerRef.current) {
            clearTimeout(initialDelayTimerRef.current);
            initialDelayTimerRef.current = null;
        }

        // Don't reset hoveredTabIdRef here yet, wait for the hide timer or tab bar leave

        // Start a short timer to hide the tooltip
        hideTooltipTimerRef.current = setTimeout(() => {
            // Only truly hide if the mouse has left the *entire* tab bar
            // And hasn't entered another tab (which would clear this timer)
            if (!isMouseOverTabBar) {
                 setTooltipVisible(false);
                 setHoveredTabId(null);
                 hoveredTabIdRef.current = null;
            }
             hideTooltipTimerRef.current = null;
        }, 50);

    }, [isMouseOverTabBar]); // Dependency is correct

    const handleTabBarMouseEnter = () => {
        setIsMouseOverTabBar(true);
        // Don't reset hasInitialDelayPassed here, reset it on MouseLeave
    };

    const handleTabBarMouseLeave = () => {
        setIsMouseOverTabBar(false);
        setHasInitialDelayPassed(false);
        clearCommonTooltipState();
    };

    const clearCommonTooltipState = () => {
        clearTooltipTimers();
        setTooltipVisible(false);
        setHoveredTabId(null);
        hoveredTabIdRef.current = null;
    };

    const updateTabWidths = () => {
        setTimeout(() => { // Add a small delay for testing
            if (!newTabButtonRef.current) return;
            if (!tabsWrapperRef.current) return;

            if (newTabButtonRef.current.getBoundingClientRect().left > tabsWrapperRef.current.getBoundingClientRect().right && !isTabWidthsAdjusting) return;
            if (!tabsContainerRef.current) return;

            setIsTabWidthsAdjusting(true);

            const container = tabsContainerRef.current;
            const containerWidth = container.offsetWidth;

            const numTabs = visibleTabs.length;

            const actionButtonsWidth = 0;
            const availableWidth = containerWidth - actionButtonsWidth;

            const minTabWidth = 5;

            let tabWidth = availableWidth / numTabs;

            tabWidth = Math.max(tabWidth, minTabWidth);

            const tabs = container.getElementsByClassName('tab-item');
            Array.from(tabs).forEach((tab: Element) => {
                (tab as HTMLElement).style.width = `${tabWidth}px`;
                (tab as HTMLElement).style.minWidth = `${minTabWidth}px`;
                (tab as HTMLElement).style.maxWidth = `${tabWidth}px`;
            });
        }, 0);
    };

    // --- Drag and Drop Logic ---
    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        // 1. Basic checks: Dropped outside, no movement.
        if (!destination || destination.index === source.index) {
            return;
        }

        // 2. Get the actual tab objects involved
        const sourceIndex = source.index;
        const destinationIndex = destination.index;
        const draggedTab = visibleTabs[sourceIndex]; // The tab being dragged

        // 3. Double-check: Should not be possible to drag a pinned tab due to isDragDisabled
        if (draggedTab.isPinned) {
             console.warn("Attempted to drag a pinned tab - this shouldn't happen.");
             return;
        }

        // 4. *** Pinning Logic: Check if the move crosses a pinned tab ***
        const startIndex = Math.min(sourceIndex, destinationIndex);
        const endIndex = Math.max(sourceIndex, destinationIndex);

        for (let i = startIndex; i <= endIndex; i++) {
            // Check the tab at the potential destination index AND
            // any tabs between the source and destination.
            // We don't need to check the source index itself because we know it's not pinned.
            if (i === sourceIndex) continue;

            const tabAtIndex = visibleTabs[i];
            if (tabAtIndex && tabAtIndex.isPinned) {
                // Found a pinned tab in the path of the drag.
                // This move is invalid because it would change the relative position
                // of the dragged item with respect to this pinned item.
                return; // Cancel the reorder operation
            }
        }

        // 5. If the loop completes without returning, the move is valid. Proceed with reorder.
        const newTabIds = reorder(
            tabIds, // Use the original ID list
            sourceIndex,
            destinationIndex
        );

        // Update the store with the new order
        reorderTabs(side, newTabIds);

        updateTabWidths();

        clearCommonTooltipState();
    };

    const handleDoubleClick = (tab: { id: string; title: string }, e: React.MouseEvent) => {
        clearCommonTooltipState();
        const target = e.target as HTMLElement;
        if (target.tagName === 'SPAN' && target.textContent === tab.title) {
            setEditingTabId(tab.id);
            setEditingTitle(tab.title);
        } else {
            handleCreateNewTab();
        }

        e.stopPropagation();
    };

    const handleCreateNewTab = () => {
        if (!canAddNewTab(isRightSide)) {
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
        clearCommonTooltipState();
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
        if (e.currentTarget === e.target) {
            handleCreateNewTab();
        }
    };

    const handleTabletSelect = (tablet: any) => {
        const state = tablet.createInitialState();
        const serializedState = tablet.serializeState(state);

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

    return (
        <>
            <div
                ref={tabBarRef}
                className="flex bg-gray-800 text-gray-300 w-full h-8 overflow-hidden"
                onMouseEnter={handleTabBarMouseEnter}
                onMouseLeave={handleTabBarMouseLeave}
                key={tabsKey}
            >
                <div
                    ref={tabsContainerRef}
                    className="flex-1 flex min-w-0 overflow-hidden"
                    onDoubleClick={handleEmptyAreaDoubleClick}
                >
                    <div ref={tabsWrapperRef} className="flex">
                        <DragDropContext onDragEnd={onDragEnd}>
                            <StrictModeDroppable droppableId={side} direction="horizontal">
                                {(provided: DroppableProvided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex"
                                        >
                                            {visibleTabs.map((tab, index) => (
                                                <Draggable key={tab.id} draggableId={tab.id} index={index} isDragDisabled={tab.isPinned}>
                                                    {(providedDraggable: DraggableProvided, snapshot) => ( // Renamed provided to avoid conflict
                                                        <TabItem
                                                            tab={tab}
                                                            isActive={activeSideTabId === tab.id}
                                                            isEditing={editingTabId === tab.id}
                                                            editingTitle={editingTitle}
                                                            maxLineCount={maxLineCount}
                                                            onClick={handleTabClick}
                                                            onClose={(tabId, e) => {
                                                                removeTab(tabId);
                                                                // Hide tooltip if the closed tab was hovered
                                                                if (hoveredTabId === tabId) {
                                                                    setTooltipVisible(false);
                                                                    clearTooltipTimers();
                                                                    setHoveredTabId(null);
                                                                }
                                                            }}
                                                            onDoubleClick={handleDoubleClick}
                                                            onContextMenu={(tabId, e) => handleContextMenu(e, tabId)}
                                                            onEditChange={setEditingTitle}
                                                            onEditSubmit={handleInputBlur}
                                                            onEditCancel={() => setEditingTabId(null)}
                                                            provided={providedDraggable} // Use renamed prop
                                                            snapshot={snapshot}
                                                            onMouseEnterTab={handleTabMouseEnter}
                                                            onMouseLeaveTab={handleTabMouseLeave}
                                                        />
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                )}
                            </StrictModeDroppable>
                        </DragDropContext>
                    </div>
                </div>

                <TabActions
                    side={side}
                    onShowTabletSelector={() => {
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
                    }}
                    newTabButtonRef={newTabButtonRef}
                    tabletButtonRef={tabletButtonRef}
                />
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

            <TabTooltip
                visible={tooltipVisible}
                content={tooltipContent}
                position={tooltipPosition}
            />
        </>
    );
};