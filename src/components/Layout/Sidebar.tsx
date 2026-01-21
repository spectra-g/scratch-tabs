import React, { useMemo, useRef, useState, useEffect } from "react";

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
    File,
    FileCode,
    FileText,
    Search,
    Plus,
    Pin,
    Calculator,
    Type
} from "../Icons";
import { clsx } from "clsx";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { SidebarTabContextMenu } from "./SidebarTabContextMenu";

const ROW_HEIGHT = 32;

type TreeItem =
    | { type: 'workspace'; id: string; name: string; isExpanded: boolean; isActive: boolean; tabCount: number }
    | { type: 'tab'; id: string; title: string; language: string; workspaceId: string; isActive: boolean; isPinned?: boolean; isTablet?: boolean; isRich?: boolean };

export const Sidebar: React.FC = () => {
    const { workspaces, activeWorkspaceId, switchWorkspace, createWorkspace } = useWorkspaceStore();
    const { tabs: activeTabs } = useTabsStore();
    const { setActiveTab } = useRootStore();
    const {
        isSidebarExpanded,
        expandedWorkspaceIds,
        workspaceTabsMetadata,
        expandWorkspace,
        collapseWorkspace,
        searchQuery,
        setSearchQuery,
        refreshWorkspaceMetadata
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
    }, [workspaces.length, activeWorkspaceId, refreshWorkspaceMetadata]); // Include all dependencies

    // Refresh previous workspace metadata when switching workspaces
    useEffect(() => {
        const prevWorkspaceId = prevActiveWorkspaceIdRef.current;
        if (prevWorkspaceId && prevWorkspaceId !== activeWorkspaceId) {
            // Refresh the metadata for the workspace we just left
            refreshWorkspaceMetadata(prevWorkspaceId);
        }
        prevActiveWorkspaceIdRef.current = activeWorkspaceId;
    }, [activeWorkspaceId, refreshWorkspaceMetadata]);

    const treeItems = useMemo(() => {
        const items: TreeItem[] = [];
        const lowerQuery = (searchQuery || '').toLowerCase();

        workspaces.forEach(ws => {
            const isExpanded = expandedWorkspaceIds.has(ws.id);
            const isActiveWs = ws.id === activeWorkspaceId;

            let wsTabs: (SidebarTabInfo)[] = [];

            if (isActiveWs) {
                // For active workspace, use the order from splitView
                const allTabIds = [...splitView.leftTabs, ...splitView.rightTabs];
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
    }, [workspaces, activeWorkspaceId, activeTabs, workspaceTabsMetadata, expandedWorkspaceIds, activeTabId, searchQuery, splitView.leftTabs, splitView.rightTabs]);

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

    if (!isSidebarExpanded) return null;

    return (
        <div className="tablet-sidebar w-72 flex-shrink-0 flex flex-col h-full border-r border-base bg-surface-secondary">
            <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">Explorer</h2>
                    <button
                        onClick={() => createWorkspace("New Workspace")}
                        className="p-1 hover:bg-element-hover rounded text-secondary hover:text-main"
                        title="New Workspace"
                    >
                        <Plus size={16} />
                    </button>
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
        </div>
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
