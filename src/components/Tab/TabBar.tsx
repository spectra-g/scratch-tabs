import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
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
import { WorkspaceSwitcher } from '../Workspace/WorkspaceSwitcher';

interface TabBarProps {
  side?: 'left' | 'right';
  onOpenDiffModal: (fromHistory?: boolean) => void;
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
    const [isShrinkMode, setIsShrinkMode] = useState(false);
    const [showTabletSelector, setShowTabletSelector] = useState(false);
    const [tabletSelectorPosition, setTabletSelectorPosition] = useState({x: 0, y: 0});
    const hasInitializedWidths = useRef(false);
    const initialWidths = useRef<{ [key: string]: number }>({});
    const containerWidthRef = useRef<number>(0);
    const observerRef = useRef<MutationObserver | null>(null);

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
    const [isMouseOverTabBar, setIsMouseOverTabBar] = useState(false);
    const [hasInitialDelayPassed, setHasInitialDelayPassed] = useState(false);
    const initialDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hideTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hoveredTabIdRef = useRef<string | null>(null);
    const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const tabletButtonRef = useRef<HTMLButtonElement>(null);
    const newTabButtonRef = useRef<HTMLButtonElement>(null);
    const tabsWrapperRef = useRef<HTMLDivElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const tabletSelectorTabBarRef = useRef<HTMLDivElement>(null);

    const isRightSide = side === 'right';
    const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;

    const tabsKey = tabIds.join('-');

    const activeSideTabId = isRightSide ? splitView.activeRightTabId : splitView.activeLeftTabId;

    const findTab = (tabId: string): Tab => {
        return tabs.find(tab => tab.id === tabId);
    };

    const visibleTabs = tabIds.map(id => findTab(id)).filter(Boolean) as typeof tabs;

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

    // Handle initial tab rendering and width calculations
    useLayoutEffect(() => {
        if (!tabsContainerRef.current) return;

        const container = tabsContainerRef.current;
        
        // Set up mutation observer to detect when tabs are added
        if (!observerRef.current) {
            observerRef.current = new MutationObserver((mutations) => {
                const hasTabChanges = mutations.some(mutation => 
                    mutation.addedNodes.length > 0 || 
                    mutation.removedNodes.length > 0
                );
                
                if (hasTabChanges) {
                    hasInitializedWidths.current = false;
                    calculateTabWidths();
                }
            });

            observerRef.current.observe(container, {
                childList: true,
                subtree: true
            });
        }

        // Initial width calculation
        calculateTabWidths();

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [visibleTabs.length, splitView.splitRatio]);

    const calculateTabWidths = () => {
        if (!tabsContainerRef.current) return;

        const container = tabsContainerRef.current;
        const containerWidth = container.offsetWidth;
        containerWidthRef.current = containerWidth;

        const tabs = container.getElementsByClassName('tab-item');
        if (tabs.length === 0) return;

        let totalNaturalWidth = 0;
        
        // Temporarily set all tabs to natural width for measurement
        Array.from(tabs).forEach((tab: Element) => {
            const tabElement = tab as HTMLElement;
            tabElement.style.width = '';
            tabElement.style.minWidth = '';
            tabElement.style.maxWidth = '';
        });

        // Force a reflow to ensure measurements are accurate
        container.offsetHeight;

        // Measure natural widths
        Array.from(tabs).forEach((tab: Element) => {
            const tabElement = tab as HTMLElement;
            const naturalWidth = tabElement.offsetWidth;
            initialWidths.current[tabElement.id] = naturalWidth;
            totalNaturalWidth += naturalWidth;
        });

        // Check if we need to enter shrink mode
        const needsShrinkMode = totalNaturalWidth > containerWidth;
        
        if (needsShrinkMode !== isShrinkMode) {
            setIsShrinkMode(needsShrinkMode);
        }

        if (needsShrinkMode) {
            const actionButtonsWidth = 0;
            const availableWidth = containerWidth - actionButtonsWidth;
            const minTabWidth = 5;
            let tabWidth = availableWidth / visibleTabs.length;
            tabWidth = Math.max(tabWidth, minTabWidth);

            Array.from(tabs).forEach((tab: Element) => {
                const tabElement = tab as HTMLElement;
                tabElement.style.width = `${tabWidth}px`;
                tabElement.style.minWidth = `${minTabWidth}px`;
                tabElement.style.maxWidth = `${tabWidth}px`;
            });
        } else {
            // Reset to natural widths
            Array.from(tabs).forEach((tab: Element) => {
                const tabElement = tab as HTMLElement;
                tabElement.style.width = '';
                tabElement.style.minWidth = '';
                tabElement.style.maxWidth = '';
            });
        }

        hasInitializedWidths.current = true;
    };

    // Handle resize events
    useEffect(() => {
        const handleResize = () => {
            if (!tabsContainerRef.current) return;
            const newWidth = tabsContainerRef.current.offsetWidth;
            if (newWidth !== containerWidthRef.current) {
                containerWidthRef.current = newWidth;
                hasInitializedWidths.current = false;
                calculateTabWidths();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        clearTooltipTimers();

        const rect = element.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.bottom + 6,
        };

        const content: TooltipContent = {
            title: tab.title
        };

        if (!tab.isTablet) {
            content.lineCount = getTabLineCount(tab.content);
            try {
                const detector = languageRegistry.getById(tab.language);
                if (detector && typeof detector.getName === 'function') {
                    content.language = detector.getName();
                } else {
                    content.language = tab.language || 'Unknown';
                }
            } catch (error) {
                content.language = tab.language || 'Error';
            }
        }
        content.dateCreated = tab.dateCreated;
        content.lastModified = tab.lastModified;

        setTooltipPosition(position);
        setTooltipContent(content);
        setTooltipVisible(true);
    }, []);

    const handleTabMouseEnter = useCallback((tab: Tab, element: HTMLElement) => {
        setHoveredTabId(tab.id);
        hoveredTabIdRef.current = tab.id;

        clearTooltipTimers();

        if (isMouseOverTabBar && hasInitialDelayPassed) {
            showTooltip(tab, element);
        } else {
            initialDelayTimerRef.current = setTimeout(() => {
                if (hoveredTabIdRef.current === tab.id) {
                    showTooltip(tab, element);
                    setHasInitialDelayPassed(true);
                }
                initialDelayTimerRef.current = null;
            }, 1000);
        }
    }, [isMouseOverTabBar, hasInitialDelayPassed, showTooltip]);

    const handleTabMouseLeave = useCallback((tabId: string) => {
        if (initialDelayTimerRef.current) {
            clearTimeout(initialDelayTimerRef.current);
            initialDelayTimerRef.current = null;
        }

        hideTooltipTimerRef.current = setTimeout(() => {
            if (!isMouseOverTabBar) {
                 setTooltipVisible(false);
                 setHoveredTabId(null);
                 hoveredTabIdRef.current = null;
            }
             hideTooltipTimerRef.current = null;
        }, 50);

    }, [isMouseOverTabBar]);

    const handleTabBarMouseEnter = () => {
        setIsMouseOverTabBar(true);
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

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        if (!destination || destination.index === source.index) {
            return;
        }

        const sourceIndex = source.index;
        const destinationIndex = destination.index;
        const draggedTab = visibleTabs[sourceIndex];

        if (draggedTab.isPinned) {
             console.warn("Attempted to drag a pinned tab - this shouldn't happen.");
             return;
        }

        const startIndex = Math.min(sourceIndex, destinationIndex);
        const endIndex = Math.max(sourceIndex, destinationIndex);

        for (let i = startIndex; i <= endIndex; i++) {
            if (i === sourceIndex) continue;

            const tabAtIndex = visibleTabs[i];
            if (tabAtIndex && tabAtIndex.isPinned) {
                return;
            }
        }

        const newTabIds = reorder(
            tabIds,
            sourceIndex,
            destinationIndex
        );

        reorderTabs(side, newTabIds);

        clearCommonTooltipState();
    };

    const startEditingTab = useCallback((tabId: string) => {
        const tabToEdit = findTab(tabId);
        if (tabToEdit) {
            clearCommonTooltipState();
            setEditingTabId(tabId);
            setEditingTitle(tabToEdit.title);
        }
    }, [tabs, findTab, clearCommonTooltipState, setEditingTabId, setEditingTitle]);

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
        if (action === 'compareSides') {
            onOpenDiffModal(false);
        } else if (action === 'compare') {
            onOpenDiffModal(true);
        }
        setContextMenu(null);
    };

    const handleTabClick = (tabId: string) => {
        clearCommonTooltipState();
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
                                                    {(providedDraggable: DraggableProvided, snapshot) => (
                                                        <TabItem
                                                            tab={tab}
                                                            isActive={activeSideTabId === tab.id}
                                                            isEditing={editingTabId === tab.id}
                                                            editingTitle={editingTitle}
                                                            maxLineCount={maxLineCount}
                                                            onClick={handleTabClick}
                                                            onClose={(tabId, e) => {
                                                                removeTab(tabId);
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
                                                            provided={providedDraggable}
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

                <div className="flex items-center">
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
                    {/* Only show WorkspaceSwitcher on the right side when split, or on the left when not split */}
                    {(isRightSide ? splitView.isSplit : !splitView.isSplit) && (
                        <WorkspaceSwitcher />
                    )}
                </div>
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
                    startEditingTab={startEditingTab}
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