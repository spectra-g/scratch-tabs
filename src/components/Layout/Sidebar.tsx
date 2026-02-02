import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";

import { FixedSizeList as List } from "react-window";
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
    pointerWithin,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useRootStore } from "../../stores/rootStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useModalStore } from "../../stores/modalStore";
import { useNavigationStore } from "../../stores/navigationStore";
import { SidebarTabInfo } from "../../types";
import {
    Folder,
    ChevronLeft,
    ArrowLeft,
    ArrowRight,
    File,
    FileCode,
    FileText,
    Search,
    Plus,
    Pin,
    Calculator,
    Type,
    X,
    Upload,
    Download
} from "../Icons";
import { ExportWorkspacesModal } from "../Workspace/ExportWorkspacesModal";
import { ImportWorkspacesModal } from "../Workspace/ImportWorkspacesModal";
import { clsx } from "clsx";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { SidebarTabContextMenu } from "./SidebarTabContextMenu";
import { IconRail } from "./IconRail";
import { SidebarDraggableTab } from "./SidebarDraggableTab";
import { SidebarDraggableWorkspace } from "./SidebarDraggableWorkspace";

const ROW_HEIGHT = 32;
const MIN_WIDTH = 150;
const MAX_WIDTH = 600;
const SNAP_THRESHOLD = 100;

type TreeItem =
    | { type: 'workspace'; id: string; name: string; isExpanded: boolean; isActive: boolean; tabCount: number }
    | { type: 'tab'; id: string; title: string; language: string; workspaceId: string; isActive: boolean; isPinned?: boolean; isTablet?: boolean; isRich?: boolean };

export const Sidebar: React.FC = () => {
    const { workspaces, activeWorkspaceId, switchWorkspace, createWorkspace } = useWorkspaceStore();
    const { tabs: activeTabs } = useTabsStore();
    const { setActiveTab, moveTabBetweenWorkspaces, reorderTabsInWorkspace, navigateBack, navigateForward } = useRootStore();
    const { canGoBack, canGoForward } = useNavigationStore();
    const {
        isSidebarExpanded,
        isMobileOpen,
        setMobileOpen,
        toggleSidebar,
        expandedWorkspaceIds,
        workspaceTabsMetadata,
        expandWorkspace,
        collapseWorkspace,
        searchQuery,
        setSearchQuery,
        refreshWorkspaceMetadata,
        sidebarWidth,
        setSidebarWidth,
        setSidebarExpanded,
        initializeSidebarState,
        isHydrated
    } = useSidebarStore();

    const { splitView } = useSplitViewStore();
    const activeTabId = splitView?.activeSide === 'right' ? splitView?.activeRightTabId : splitView?.activeLeftTabId;

    const [switchingToWorkspaceId, setSwitchingToWorkspaceId] = useState<string | null>(null);
    const prevActiveWorkspaceIdRef = useRef<string | null>(activeWorkspaceId);
    const [workspaceContextMenu, setWorkspaceContextMenu] = useState<{
        workspaceId: string;
        position: { x: number; y: number };
    } | null>(null);
    const [tabContextMenu, setTabContextMenu] = useState<{
        tabId: string;
        workspaceId: string;
        position: { x: number; y: number };
    } | null>(null);

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const { isImportModalActive, openImportModal, closeImportModal } = useModalStore();

    // Drag and drop state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedTab, setDraggedTab] = useState<SidebarTabInfo | null>(null);
    const [draggedWorkspace, setDraggedWorkspace] = useState<{ id: string, name: string } | null>(null);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    // Initialize sidebar state from IndexedDB on mount
    useEffect(() => {
        initializeSidebarState();
    }, [initializeSidebarState]);

    // Debounced search: separate input value from store query
    const [searchInputValue, setSearchInputValue] = useState(searchQuery);

    // Debounce search input (300ms delay)
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchInputValue);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInputValue, setSearchQuery]);

    // Resize logic
    const isResizingRef = useRef(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isDraggingBelowThreshold, setIsDraggingBelowThreshold] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current || !sidebarRef.current) return;
        e.preventDefault();

        const newWidth = e.clientX;

        // Visual Snap Feedback
        if (newWidth < SNAP_THRESHOLD) {
            // Show IconRail instead of thin sidebar
            setIsDraggingBelowThreshold(true);
            // Hide the main sidebar during drag below threshold
            if (sidebarRef.current) {
                sidebarRef.current.style.width = '0px';
            }
        } else {
            // Normal drag behavior with clamping
            setIsDraggingBelowThreshold(false);
            let clampedWidth = newWidth;
            if (clampedWidth < MIN_WIDTH) clampedWidth = MIN_WIDTH;
            if (clampedWidth > MAX_WIDTH) clampedWidth = MAX_WIDTH;

            sidebarRef.current.style.width = `${clampedWidth}px`;
            sidebarRef.current.style.opacity = '1';
        }
    }, []);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current) return;

        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';

        // Remove listeners
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        // Clear dragging state
        setIsDraggingBelowThreshold(false);

        // Restore transitions (we removed them on mouse down to avoid drag lag)
        if (sidebarRef.current) {
            sidebarRef.current.style.transition = '';
            sidebarRef.current.style.opacity = '';
        }

        const finalWidth = e.clientX;

        if (finalWidth < SNAP_THRESHOLD) {
            // Commit collapse
            setSidebarExpanded(false);
            setSidebarWidth(288); // Reset to default width for next expansion
        } else {
            // Commit new width
            let clamped = finalWidth;
            if (clamped < MIN_WIDTH) clamped = MIN_WIDTH;
            if (clamped > MAX_WIDTH) clamped = MAX_WIDTH;
            setSidebarWidth(clamped);
        }
    }, [handleMouseMove, setSidebarExpanded, setSidebarWidth]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;

        // Disable transitions for instant resizing
        if (sidebarRef.current) {
            sidebarRef.current.style.transition = 'none';
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Cleanup event listeners on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    // Load metadata for all workspaces on mount to show tab counts
    useEffect(() => {
        const loadAllWorkspaceMetadata = async () => {
            // Load metadata for all non-active workspaces
            const inactiveWorkspaces = workspaces.filter(w => w.id !== activeWorkspaceId);
            await Promise.all(
                inactiveWorkspaces.map(ws => refreshWorkspaceMetadata(ws.id))
            );
        };

        if (workspaces.length > 0 && activeWorkspaceId) {
            loadAllWorkspaceMetadata();
        }
    }, [workspaces.length, activeWorkspaceId, refreshWorkspaceMetadata]);

    // Refresh previous workspace metadata when switching workspaces
    useEffect(() => {
        const prevWorkspaceId = prevActiveWorkspaceIdRef.current;
        if (prevWorkspaceId && prevWorkspaceId !== activeWorkspaceId) {
            // Refresh the metadata for the workspace we just left
            refreshWorkspaceMetadata(prevWorkspaceId);
        }
        prevActiveWorkspaceIdRef.current = activeWorkspaceId;
    }, [activeWorkspaceId, refreshWorkspaceMetadata]);

    // Calculate workspace tab counts for IconRail
    const workspaceTabCounts = useMemo(() => {
        const counts = new Map<string, number>();

        workspaces.forEach(ws => {
            const isActiveWs = ws.id === activeWorkspaceId;

            if (isActiveWs) {
                const allTabIds = [...(splitView?.leftTabs || []), ...(splitView?.rightTabs || [])];
                counts.set(ws.id, allTabIds.length);
            } else {
                const metadata = workspaceTabsMetadata.get(ws.id) || [];
                counts.set(ws.id, metadata.length);
            }
        });

        return counts;
    }, [workspaces, activeWorkspaceId, activeTabs, workspaceTabsMetadata, splitView?.leftTabs, splitView?.rightTabs]);

    const treeItems = useMemo(() => {
        const items: TreeItem[] = [];
        const lowerQuery = (searchQuery || '').toLowerCase();

        workspaces.forEach(ws => {
            const isExpanded = expandedWorkspaceIds.has(ws.id);
            const isActiveWs = ws.id === activeWorkspaceId;

            let wsTabs: (SidebarTabInfo)[] = [];

            if (isActiveWs) {
                // For active workspace, use the order from splitView
                const allTabIds = [...(splitView?.leftTabs || []), ...(splitView?.rightTabs || [])];
                // Create a map for quick lookup
                const tabMap = new Map(activeTabs.map(t => [t.id, t]));
                // Map IDs to tabs in the correct order, converting to SidebarTabInfo
                wsTabs = allTabIds
                    .map(id => {
                        const tab = tabMap.get(id);
                        if (!tab) return undefined;
                        return {
                            id: tab.id,
                            title: tab.title,
                            language: tab.language,
                            isTablet: tab.isTablet,
                            isRich: tab.isRich,
                            isPinned: tab.isPinned,
                            lastModified: tab.lastModified,
                            workspaceId: tab.workspaceId,
                        } as SidebarTabInfo;
                    })
                    .filter((t): t is SidebarTabInfo => t !== undefined);
            } else {
                // For inactive workspaces, use cached metadata
                wsTabs = workspaceTabsMetadata.get(ws.id) || [];
            }

            const filteredTabs = wsTabs.filter(t =>
                t.title.toLowerCase().includes(lowerQuery) ||
                t.language.toLowerCase().includes(lowerQuery)
            );

            // If searching and no tabs match, and workspace name doesn't match, skip
            if (searchQuery && filteredTabs.length === 0 && !ws.name.toLowerCase().includes(lowerQuery)) {
                return;
            }

            items.push({
                type: 'workspace',
                id: ws.id,
                name: ws.name,
                isExpanded,
                isActive: isActiveWs,
                tabCount: wsTabs.length
            });

            if (isExpanded || searchQuery) {
                filteredTabs.forEach(tab => {
                    items.push({
                        type: 'tab',
                        id: tab.id,
                        title: tab.title,
                        language: tab.language,
                        workspaceId: ws.id,
                        isActive: tab.id === activeTabId,
                        isPinned: tab.isPinned,
                        isTablet: tab.isTablet,
                        isRich: tab.isRich
                    });
                });
            }
        });

        return items;
    }, [workspaces, activeWorkspaceId, activeTabs, workspaceTabsMetadata, expandedWorkspaceIds, activeTabId, searchQuery, splitView?.leftTabs, splitView?.rightTabs]);

    const handleWorkspaceClick = async (wsId: string, isExpanded: boolean, tabCount: number) => {
        const isEmpty = tabCount === 0;
        const isActive = wsId === activeWorkspaceId;

        // Case 1: Empty AND Inactive
        // Action: Switch to it (Selection behavior)
        if (isEmpty && !isActive) {
            setSwitchingToWorkspaceId(wsId);
            await switchWorkspace(wsId);
            setSwitchingToWorkspaceId(null);
            return;
        }

        // Case 2: All other scenarios
        // - Empty AND Active
        // - Non-Empty (regardless of active state)
        // Action: Toggle Expand/Collapse
        if (isExpanded) {
            collapseWorkspace(wsId);
        } else {
            expandWorkspace(wsId);
        }
    };

    const handleTabClick = async (tabId: string, workspaceId: string) => {
        if (workspaceId !== activeWorkspaceId) {
            // Don't manually refresh metadata here - let the useEffect handle it
            // after the workspace switch completes and state is persisted
            setSwitchingToWorkspaceId(workspaceId);
            await switchWorkspace(workspaceId);
            setSwitchingToWorkspaceId(null);
        }
        setActiveTab(tabId);

        // Auto-close sidebar on mobile after selection
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileOpen(false);
        }
    };

    const handleWorkspaceContextMenu = (e: React.MouseEvent, workspaceId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setWorkspaceContextMenu({
            workspaceId,
            position: { x: e.clientX, y: e.clientY }
        });
    };

    const handleTabContextMenu = (e: React.MouseEvent, tabId: string, workspaceId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setTabContextMenu({
            tabId,
            workspaceId,
            position: { x: e.clientX, y: e.clientY }
        });
    };

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);

        // Find the dragged tab info
        if (active.data.current?.type === "tab") {
            const tabId = active.data.current.tabId;
            const workspaceId = active.data.current.workspaceId;

            // Find the tab in treeItems
            const tabItem = treeItems.find(
                item => item.type === "tab" && item.id === tabId
            ) as TreeItem & { type: "tab" } | undefined;

            if (tabItem) {
                setDraggedTab({
                    id: tabItem.id,
                    title: tabItem.title,
                    language: tabItem.language,
                    workspaceId: workspaceId,
                    isTablet: tabItem.isTablet,
                    isRich: tabItem.isRich,
                    isPinned: tabItem.isPinned,
                    lastModified: Date.now()
                });
            }
        } else if (active.data.current?.type === "workspace") {
            const workspaceId = active.data.current.workspaceId;
            const workspace = workspaces.find(w => w.id === workspaceId);
            if (workspace) {
                setDraggedWorkspace({ id: workspace.id, name: workspace.name });
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setDraggedTab(null);
        setDraggedWorkspace(null);

        if (!over || active.id === over.id) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        // Handle workspace reordering
        if (activeData?.type === "workspace" && overData?.type === "workspace") {
            const sourceWorkspaceId = activeData.workspaceId as string;
            const targetWorkspaceId = overData.workspaceId as string;

            if (sourceWorkspaceId !== targetWorkspaceId) {
                const oldIndex = workspaces.findIndex(w => w.id === sourceWorkspaceId);
                const newIndex = workspaces.findIndex(w => w.id === targetWorkspaceId);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newWorkspaceOrder = [...workspaces.map(w => w.id)];
                    const [removed] = newWorkspaceOrder.splice(oldIndex, 1);
                    newWorkspaceOrder.splice(newIndex, 0, removed);

                    const { reorderWorkspaces } = useWorkspaceStore.getState();
                    await reorderWorkspaces(newWorkspaceOrder);
                }
            }
            return;
        }

        // Only handle tab dragging from here on
        if (activeData?.type !== "tab") return;

        const draggedTabId = activeData.tabId as string;
        const sourceWorkspaceId = activeData.workspaceId as string;

        // Case 1: Dropped on another tab (reorder within same workspace)
        if (overData?.type === "tab") {
            const targetTabId = overData.tabId as string;
            const targetWorkspaceId = overData.workspaceId as string;

            if (sourceWorkspaceId === targetWorkspaceId) {
                // Reorder within same workspace
                let tabs: SidebarTabInfo[];

                if (sourceWorkspaceId === activeWorkspaceId) {
                    // Active workspace - get from splitView order
                    const allTabIds = [...(splitView?.leftTabs || []), ...(splitView?.rightTabs || [])];
                    tabs = allTabIds
                        .map(id => activeTabs.find(t => t.id === id))
                        .filter((t): t is typeof activeTabs[0] => t !== undefined)
                        .map(t => ({
                            id: t.id,
                            title: t.title,
                            language: t.language,
                            isTablet: t.isTablet,
                            isRich: t.isRich,
                            isPinned: t.isPinned,
                            lastModified: t.lastModified,
                            workspaceId: t.workspaceId,
                        }));
                } else {
                    // Inactive workspace - get from metadata
                    tabs = workspaceTabsMetadata.get(sourceWorkspaceId) || [];
                }

                const oldIndex = tabs.findIndex(t => t.id === draggedTabId);
                const newIndex = tabs.findIndex(t => t.id === targetTabId);

                if (oldIndex === -1 || newIndex === -1) return;

                // Reorder the array
                const newTabOrder = [...tabs];
                const [removed] = newTabOrder.splice(oldIndex, 1);
                newTabOrder.splice(newIndex, 0, removed);

                // Update the order
                if (sourceWorkspaceId === activeWorkspaceId) {
                    // For active workspace, use the existing reorderTabs action
                    const newTabIds = newTabOrder.map(t => t.id);
                    // Determine which side this tab is on
                    const isOnLeft = splitView?.leftTabs.includes(draggedTabId);
                    if (splitView?.isSplit && isOnLeft !== undefined) {
                        // If split, only reorder the relevant side
                        const side = isOnLeft ? "left" : "right";
                        const { reorderTabs } = useRootStore.getState();
                        const sideTabIds = isOnLeft ? splitView.leftTabs : splitView.rightTabs;

                        // Get the new order for the specific side
                        const oldSideIndex = sideTabIds.indexOf(draggedTabId);
                        const targetInSide = sideTabIds.indexOf(targetTabId);
                        if (oldSideIndex !== -1 && targetInSide !== -1) {
                            const newSideOrder = [...sideTabIds];
                            const [removed] = newSideOrder.splice(oldSideIndex, 1);
                            newSideOrder.splice(targetInSide, 0, removed);
                            reorderTabs(side, newSideOrder);
                        }
                    } else {
                        // Not split, reorder all on left side
                        const { reorderTabs } = useRootStore.getState();
                        reorderTabs("left", newTabIds);
                    }
                } else {
                    // For inactive workspace, update via new action
                    await reorderTabsInWorkspace(sourceWorkspaceId, newTabOrder.map(t => t.id));
                }
            } else {
                // Different workspaces - move tab
                try {
                    await moveTabBetweenWorkspaces(draggedTabId, sourceWorkspaceId, targetWorkspaceId);
                } catch (error) {
                    console.error('Failed to move tab between workspaces:', error);
                }
            }
        }
        // Case 2: Dropped on a workspace (move to that workspace)
        else if (overData?.type === "workspace") {
            const targetWorkspaceId = overData.workspaceId as string;

            if (sourceWorkspaceId !== targetWorkspaceId) {
                try {
                    await moveTabBetweenWorkspaces(draggedTabId, sourceWorkspaceId, targetWorkspaceId);
                } catch (error) {
                    console.error('Failed to move tab to workspace:', error);
                }
            }
        }
    };

    const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = treeItems[index];
        if (!item) return null;

        if (item.type === 'workspace') {
            const isSwitching = switchingToWorkspaceId === item.id;
            // If we have a search query, visually force expand indicator
            const isVisuallyExpanded = item.isExpanded || !!searchQuery;

            return (
                <SidebarDraggableWorkspace
                    id={item.id}
                    name={item.name}
                    isExpanded={item.isExpanded}
                    isActive={item.isActive}
                    tabCount={item.tabCount}
                    isSwitching={isSwitching}
                    isVisuallyExpanded={isVisuallyExpanded}
                    style={style}
                    onClick={() => handleWorkspaceClick(item.id, item.isExpanded, item.tabCount)}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        switchWorkspace(item.id);
                    }}
                    onContextMenu={(e) => handleWorkspaceContextMenu(e, item.id)}
                />
            );
        }

        return (
            <SidebarDraggableTab
                id={item.id}
                title={item.title}
                language={item.language}
                workspaceId={item.workspaceId}
                isActive={item.isActive}
                isPinned={item.isPinned}
                isTablet={item.isTablet}
                isRich={item.isRich}
                style={style}
                onClick={() => handleTabClick(item.id, item.workspaceId)}
                onContextMenu={(e) => handleTabContextMenu(e, item.id, item.workspaceId)}
            />
        );
    };

    const listContainerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<List>(null);
    const [listHeight, setListHeight] = useState(800);

    useEffect(() => {
        if (!listContainerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setListHeight(entry.contentRect.height);
            }
        });

        observer.observe(listContainerRef.current);
        return () => observer.disconnect();
    }, []);

    // Reveal in Sidebar: Auto-scroll to active tab
    // Only triggers when activeTabId changes (not when workspaces expand/collapse)
    const prevActiveTabIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!activeTabId || !listRef.current) return;

        // Only proceed if the active tab actually changed
        if (prevActiveTabIdRef.current === activeTabId) return;
        prevActiveTabIdRef.current = activeTabId;

        // Find the index of the active tab in treeItems
        const activeTabIndex = treeItems.findIndex(
            item => item.type === 'tab' && item.id === activeTabId
        );

        if (activeTabIndex === -1) {
            // Active tab not found in current tree (maybe workspace is collapsed)
            // Auto-expand the workspace containing the active tab
            const activeTab = activeTabs.find(t => t.id === activeTabId);
            if (activeTab && !expandedWorkspaceIds.has(activeTab.workspaceId)) {
                expandWorkspace(activeTab.workspaceId);
            }
            return;
        }

        // Scroll to the active tab
        listRef.current.scrollToItem(activeTabIndex, "smart");
    }, [activeTabId, activeTabs, expandedWorkspaceIds, expandWorkspace]);

    // Responsive container classes
    const containerClasses = clsx(
        "flex flex-col h-full bg-surface-secondary border-r border-base transition-all duration-300 ease-in-out",
        // Mobile: Fixed overlay
        "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transform",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: Relative flow
        "md:relative md:transform-none md:shadow-none md:z-0",
        // Desktop collapse: w-0 when collapsed (smooth animation via CSS)
        isSidebarExpanded ? "" : "md:w-0 md:border-r-0 md:overflow-hidden"
    );

    const sidebarStyle = useMemo(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) return {}; // Mobile default
        return isSidebarExpanded ? { width: `${sidebarWidth}px` } : {};
    }, [isSidebarExpanded, sidebarWidth]);

    // Don't render on desktop until hydrated to prevent flash
    // Mobile is fine since isMobileOpen defaults to false (sidebar hidden)
    if (!isHydrated && typeof window !== 'undefined' && window.innerWidth >= 768) {
        return null;
    }

    return (
        <>
            {/* Mobile backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close sidebar"
                />
            )}

            {/* Desktop: Show IconRail when collapsed or dragging below threshold */}
            {(!isSidebarExpanded || isDraggingBelowThreshold) && (
                <IconRail
                    workspaces={workspaces}
                    activeWorkspaceId={activeWorkspaceId}
                    workspaceTabCounts={workspaceTabCounts}
                    onWorkspaceClick={switchWorkspace}
                    onCreateWorkspace={() => createWorkspace("New Workspace")}
                    onExpandSidebar={toggleSidebar}
                />
            )}

            <div className={containerClasses} style={sidebarStyle} ref={sidebarRef} data-testid="sidebar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {/* Navigation buttons */}
                                <div className="flex bg-surface-raised rounded-md border border-base p-0.5">
                                    <button
                                        onClick={navigateBack}
                                        disabled={!canGoBack()}
                                        className="p-1 hover:bg-element-hover rounded text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-main transition-colors"
                                        title="Go Back (Ctrl+Shift+-)"
                                        aria-label="Go Back"
                                        data-testid="sidebar-nav-back"
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                    <button
                                        onClick={navigateForward}
                                        disabled={!canGoForward()}
                                        className="p-1 hover:bg-element-hover rounded text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-main transition-colors"
                                        title="Go Forward (Ctrl+Shift+=)"
                                        aria-label="Go Forward"
                                        data-testid="sidebar-nav-forward"
                                    >
                                        <ArrowRight size={14} />
                                    </button>
                                </div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">Explorer</h2>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => createWorkspace("New Workspace")}
                                    className="p-1 hover:bg-element-hover rounded text-secondary hover:text-main"
                                    title="New Workspace"
                                    data-testid="sidebar-create-workspace"
                                >
                                    <Plus size={16} />
                                </button>
                                {/* Desktop only: collapse button */}
                                <button
                                    onClick={toggleSidebar}
                                    className="hidden md:block p-1 hover:bg-element-hover rounded text-secondary hover:text-main"
                                    title="Collapse sidebar (Cmd+B)"
                                    aria-label="Collapse sidebar"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {/* Mobile only: close button */}
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="p-1 hover:bg-element-hover rounded text-secondary hover:text-main md:hidden"
                                    title="Close sidebar"
                                    aria-label="Close sidebar"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary" size={14} />
                            <input
                                type="text"
                                placeholder="Filter tabs..."
                                className="w-full bg-canvas border border-base rounded py-1 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                data-testid="sidebar-search"
                            />
                        </div>
                    </div>

                    <div ref={listContainerRef} className="flex-1 overflow-hidden font-[system-ui]">
                        {treeItems.length > 0 ? (
                            <List
                                ref={listRef}
                                height={listHeight}
                                itemCount={treeItems.length}
                                itemSize={ROW_HEIGHT}
                                width="100%"
                                className="custom-scrollbar"
                            >
                                {renderRow}
                            </List>
                        ) : (
                            <div className="p-4 text-center text-secondary text-sm italic">
                                {searchQuery ? "No matches found" : "No workspaces"}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Footer with Import/Export - h-[29px] to align with status bar */}
                    <div className="px-2 h-[29px] border-t border-base flex items-center justify-between gap-1 flex-shrink-0">
                        <button
                            onClick={() => openImportModal()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 h-full text-[11px] text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                            title="Import Workspaces"
                        >
                            <Upload size={12} />
                            <span className="truncate">Import</span>
                        </button>
                        <div className="w-px h-3 bg-base self-center" />
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 h-full text-[11px] text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                            title="Export Workspaces"
                        >
                            <Download size={12} />
                            <span className="truncate">Export</span>
                        </button>
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {draggedTab && (
                            <div className="px-6 py-2 bg-surface-highlight shadow-xl rounded flex items-center gap-2 border border-primary">
                                <span className="opacity-70">
                                    <TabIcon language={draggedTab.language} isTablet={draggedTab.isTablet} />
                                </span>
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                    {draggedTab.title}
                                </span>
                                {draggedTab.isPinned && <Pin size={12} className="opacity-50" />}
                                {draggedTab.isRich && <Type size={12} className="opacity-50" />}
                            </div>
                        )}
                        {draggedWorkspace && (
                            <div className="px-6 py-2 bg-surface-highlight shadow-xl rounded flex items-center gap-2 border border-primary">
                                <span className="text-primary opacity-70">
                                    <Folder size={16} />
                                </span>
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                    {draggedWorkspace.name}
                                </span>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>

                {workspaceContextMenu && (
                    <WorkspaceContextMenu
                        workspaceId={workspaceContextMenu.workspaceId}
                        position={workspaceContextMenu.position}
                        onClose={() => setWorkspaceContextMenu(null)}
                    />
                )}

                {tabContextMenu && (
                    <SidebarTabContextMenu
                        tabId={tabContextMenu.tabId}
                        workspaceId={tabContextMenu.workspaceId}
                        position={tabContextMenu.position}
                        onClose={() => setTabContextMenu(null)}
                    />
                )}

                {/* Resize Handle */}
                {isSidebarExpanded && (
                    <div
                        className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary transition-colors z-10"
                        onMouseDown={handleMouseDown}
                    />
                )}

                {/* Modals */}
                <ExportWorkspacesModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                />
                <ImportWorkspacesModal
                    isOpen={isImportModalActive}
                    onClose={closeImportModal}
                />
            </div>
        </>
    );
};

const TabIcon: React.FC<{ language: string; isTablet?: boolean }> = ({ language, isTablet }) => {
    if (isTablet) return <Calculator size={14} />;

    switch (language.toLowerCase()) {
        case 'typescript':
        case 'javascript':
        case 'json':
            return <FileCode size={14} />;
        case 'markdown':
        case 'plaintext':
            return <FileText size={14} />;
        default:
            return <File size={14} />;
    }
};