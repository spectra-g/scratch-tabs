import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";

import { FixedSizeList as List } from "react-window";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useRootStore } from "../../stores/rootStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { SidebarTabInfo } from "../../types";
import {
    Folder,
    FolderOpen,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    File,
    FileCode,
    FileText,
    Search,
    Plus,
    Pin,
    Calculator,
    Type,
    X
} from "../Icons";
import { clsx } from "clsx";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { SidebarTabContextMenu } from "./SidebarTabContextMenu";
import { IconRail } from "./IconRail";

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
    const { setActiveTab } = useRootStore();
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
        setSidebarExpanded
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

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current || !sidebarRef.current) return;
        e.preventDefault();

        const newWidth = e.clientX;

        // Visual Snap Feedback
        if (newWidth < SNAP_THRESHOLD) {
            // Visual feedback for "will collapse"
            // We force a small width and opacity to indicate it's about to disappear
            sidebarRef.current.style.width = '24px';
            sidebarRef.current.style.opacity = '0.5';
        } else {
            // Normal drag behavior with clamping
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

    const handleWorkspaceClick = (wsId: string, isExpanded: boolean) => {
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

    const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = treeItems[index];
        if (!item) return null;

        if (item.type === 'workspace') {
            const isSwitching = switchingToWorkspaceId === item.id;
            // If we have a search query, visually force expand indicator
            const isVisuallyExpanded = item.isExpanded || !!searchQuery;
            return (
                <div
                    style={style}
                    className={clsx(
                        "flex items-center px-2 cursor-pointer hover:bg-element-hover group select-none",
                        item.isActive ? "text-main font-semibold border-l-2 border-primary" : "text-secondary",
                        isSwitching && "bg-primary-subtle animate-pulse"
                    )}
                    onClick={() => handleWorkspaceClick(item.id, item.isExpanded)}
                    onDoubleClick={() => switchWorkspace(item.id)}
                    onContextMenu={(e) => handleWorkspaceContextMenu(e, item.id)}
                >
                    <span className="mr-1">
                        {isVisuallyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="mr-2">
                        {isVisuallyExpanded ? <FolderOpen size={16} className={item.isActive ? "text-primary" : ""} /> : <Folder size={16} className={item.isActive ? "text-primary" : ""} />}
                    </span>
                    <span className="flex-1 truncate text-sm">
                        {item.name}
                        {isSwitching && <span className="ml-2 text-xs opacity-70">Switching...</span>}
                    </span>
                    <span className="text-[10px] opacity-50 px-1.5 py-0.5 rounded-full bg-surface-secondary">
                        {item.tabCount}
                    </span>
                </div>
            );
        }

        return (
            <div
                style={style}
                className={clsx(
                    "flex items-center px-6 cursor-pointer hover:bg-element-hover group select-none",
                    item.isActive ? "bg-primary-subtle border-r-2 border-primary" : "text-secondary"
                )}
                onClick={() => handleTabClick(item.id, item.workspaceId)}
                onContextMenu={(e) => handleTabContextMenu(e, item.id, item.workspaceId)}
            >
                <span className="mr-2 opacity-70">
                    <TabIcon language={item.language} isTablet={item.isTablet} />
                </span>
                <span className={clsx("flex-1 truncate text-sm", item.isActive && "text-main font-medium")}>
                    {item.title}
                </span>
                {item.isPinned && <Pin size={12} className="ml-1 opacity-50" />}
                {item.isRich && <Type size={12} className="ml-1 opacity-50" />}
            </div>
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
    useEffect(() => {
        if (!activeTabId || !listRef.current) return;

        // Find the index of the active tab in treeItems
        const activeTabIndex = treeItems.findIndex(
            item => item.type === 'tab' && item.id === activeTabId
        );

        if (activeTabIndex === -1) {
            // Active tab not found in current tree (maybe workspace is collapsed)
            // Find the workspace containing the active tab and expand it
            const activeTab = activeTabs.find(t => t.id === activeTabId);
            if (activeTab && !expandedWorkspaceIds.has(activeTab.workspaceId)) {
                expandWorkspace(activeTab.workspaceId).then(() => {
                    // After expansion, the effect will re-run and scroll
                });
            }
            return;
        }

        // Scroll to the active tab
        listRef.current.scrollToItem(activeTabIndex, "smart");
    }, [activeTabId, treeItems, activeTabs, expandedWorkspaceIds, expandWorkspace]);

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

            {/* Desktop: Show IconRail when collapsed */}
            {!isSidebarExpanded && (
                <IconRail
                    workspaces={workspaces}
                    activeWorkspaceId={activeWorkspaceId}
                    workspaceTabCounts={workspaceTabCounts}
                    onWorkspaceClick={switchWorkspace}
                    onCreateWorkspace={() => createWorkspace("New Workspace")}
                    onExpandSidebar={toggleSidebar}
                />
            )}

            <div className={containerClasses} style={sidebarStyle} ref={sidebarRef}>
                <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">Explorer</h2>
                        <div className="flex gap-1">
                            <button
                                onClick={() => createWorkspace("New Workspace")}
                                className="p-1 hover:bg-element-hover rounded text-secondary hover:text-main"
                                title="New Workspace"
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
                        />
                    </div>
                </div>

                <div ref={listContainerRef} className="flex-1 overflow-hidden">
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