import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { TabContextMenu } from "./TabContextMenu";
import { TabActions } from "./TabActions";
import { TabTooltip } from "./TabTooltip";
import { Tab } from "../../types";
import { formatRegistry } from "../../formats";
import { WorkspaceSwitcher } from "../Workspace/WorkspaceSwitcher";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { HamburgerMenu } from "./HamburgerMenu";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { KeyboardSensor } from "@dnd-kit/core";
import { SortableTabList } from "./SortableTabList";
import { NEW_TAB_PREFIX } from "../../constants";

interface TabBarProps {
  side?: "left" | "right";
  onOpenDiffModal: (
    fromHistory?: boolean,
    explicitSide?: "left" | "right",
    tabId?: string,
  ) => void;
  onOpenSummaryModal: (tabId: string) => void;
}

interface TooltipContent {
  title: string;
  language?: string;
  lineCount?: number;
  dateCreated: number;
  lastModified: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  side = "left",
  onOpenDiffModal,
  onOpenSummaryModal,
}) => {
  const { tabs } = useTabsStore();
  const { splitView } = useSplitViewStore();
  const {
    removeTab,
    updateTabTitle,
    setActiveLeftTab,
    setActiveRightTab,
    addTab,
    canAddNewTab,
    reorderTabs,
  } = useRootStore();

  const { activeWorkspaceId } = useWorkspaceStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);
  const hasInitializedWidths = useRef(false);
  const initialWidths = useRef<{ [key: string]: number }>({});
  const containerWidthRef = useRef<number>(0);
  const observerRef = useRef<MutationObserver | null>(null);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [isMouseOverTabBar, setIsMouseOverTabBar] = useState(false);
  const [hasInitialDelayPassed, setHasInitialDelayPassed] = useState(false);
  const initialDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredTabIdRef = useRef<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabletButtonRef = useRef<HTMLButtonElement>(null);
  const newTabButtonRef = useRef<HTMLButtonElement>(null);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Only activate after dragging 5px to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isRightSide = side === "right";
  const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;

  const tabsKey = tabIds.join("-");

  const activeSideTabId = isRightSide
    ? splitView.activeRightTabId
    : splitView.activeLeftTabId;

  const findTab = (tabId: string): Tab | undefined => {
    return tabs.find((tab) => tab.id === tabId);
  };

  const visibleTabs = tabIds
    .map((id) => findTab(id))
    .filter(Boolean) as typeof tabs;

  const getTabLineCount = (content: string | undefined): number => {
    if (!content) return 1; // Default to 1 line if content is undefined
    return content.split("\n").length;
  };

  const tabLineCounts = tabs
    .filter((tab) => tab.isTablet != true)
    .map((tab) => getTabLineCount(tab.content));
  const maxLineCount = Math.max(...tabLineCounts, 1);

  const calculateTabWidths = useCallback(() => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    // We use getElementsByClassName to get the *live* list of tabs currently in the DOM.
    // This ensures that our math is always based on what is rendered,
    // avoiding stale closures regarding `visibleTabs.length`.
    const tabElements = container.getElementsByClassName("tab-item");
    const count = tabElements.length;

    if (count === 0) return;

    // 1. Reset: Force all tabs to natural width to perform accurate measurement
    Array.from(tabElements).forEach((tab) => {
      const el = tab as HTMLElement;
      el.style.width = "";
      el.style.minWidth = "";
      el.style.maxWidth = "";
      el.style.flex = "0 0 auto"; // Allow natural growth
    });

    // 2. Measure: Check if the natural content overflows the container
    const containerWidth = container.clientWidth;
    const contentWidth = container.scrollWidth;

    // 3. Apply: If overflowing, force equal distribution
    if (contentWidth > containerWidth) {
      // Calculate exact width per tab to fit perfectly
      const availableWidth = containerWidth;
      // We set minWidth to 0 to ensure they can shrink infinitely if needed
      // to meet the "No scrollbar" requirement
      const newWidth = availableWidth / count;

      Array.from(tabElements).forEach((tab) => {
        const el = tab as HTMLElement;
        el.style.width = `${newWidth}px`;
        el.style.maxWidth = `${newWidth}px`;
        el.style.minWidth = "0px"; // Crucial for very small tabs
        el.style.flex = "1 1 0px"; // Ignore natural width, use strict sizing
      });
    }
    // Else: Leave them as natural width (reset state)
  }, []);

  // Use ResizeObserver to handle both Window resize AND Split View resize
  useLayoutEffect(() => {
    if (!tabsContainerRef.current) return;

    // Calculate immediately on render/update
    calculateTabWidths();

    // Create observer for container resize events
    const observer = new ResizeObserver(() => {
      // Wrap in requestAnimationFrame to prevent "ResizeObserver loop limit exceeded"
      // which can happen if setting widths triggers another resize immediately
      requestAnimationFrame(() => {
        calculateTabWidths();
      });
    });

    observer.observe(tabsContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [calculateTabWidths, visibleTabs.length]); // Re-run setup if tab count changes

  const [showToolSelector, setShowToolSelector] = useState(false);

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
      title: tab.title,
      dateCreated: tab.dateCreated || Date.now(),
      lastModified: tab.lastModified || Date.now(),
    };

    if (!tab.isTablet) {
      content.lineCount = getTabLineCount(tab.content);

      try {
        const detector = formatRegistry.getById(tab.language);

        if (detector) {
          content.language =
            detector.id === tab.language
              ? detector.id
              : tab.language || "Unknown";
        } else {
          content.language = tab.language || "Unknown";
        }
      } catch (error) {
        content.language = tab.language || "Error";
        console.error("[TAB TOOLTIP] Error getting language info:", error);
      }
    }

    setTooltipPosition(position);
    setTooltipContent(content);
    setTooltipVisible(true);
  }, []);

  const handleTabMouseEnter = useCallback(
    (tab: Tab, element: HTMLElement) => {
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
    },
    [isMouseOverTabBar, hasInitialDelayPassed, showTooltip],
  );

  const handleTabMouseLeave = useCallback(
    (_tabId: string) => {
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
    },
    [isMouseOverTabBar],
  );

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

  // Handle drag end event from dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find the indices of the tabs
    const oldIndex = tabIds.indexOf(active.id as string);
    const newIndex = tabIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    // Get the tab being dragged
    const draggedTab = findTab(active.id as string);

    // If pinned, don't allow drag
    if (draggedTab?.isPinned) {
      return;
    }

    // Check if we're trying to move past pinned tabs
    for (
      let i = Math.min(oldIndex, newIndex);
      i <= Math.max(oldIndex, newIndex);
      i++
    ) {
      const tabAtIndex = findTab(tabIds[i]);
      if (i === oldIndex) continue;

      if (tabAtIndex?.isPinned) {
        return; // Can't move past pinned tabs
      }
    }

    // Create the new order and call reorderTabs
    const newTabIds = arrayMove(tabIds, oldIndex, newIndex);
    reorderTabs(side, newTabIds);

    clearCommonTooltipState();
  };

  // Add a drag start handler that will activate the tab
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active) {
      const tabId = active.id as string;
      handleTabClick(tabId);
    }
  };

  const startEditingTab = useCallback(
    (tabId: string) => {
      const tabToEdit = findTab(tabId);
      if (tabToEdit) {
        clearCommonTooltipState();
        setEditingTabId(tabId);
        setEditingTitle(tabToEdit.title);
      }
    },
    [findTab, clearCommonTooltipState, setEditingTabId, setEditingTitle],
  );

  const handleDoubleClick = (tab: Tab, e: React.MouseEvent<HTMLDivElement>) => {
    clearCommonTooltipState();
    const target = e.target as HTMLElement;
    if (target.tagName === "SPAN" || target.tagName === "DIV") {
      setEditingTabId(tab.id);
      setEditingTitle(tab.title);
    } else {
      handleCreateNewTab();
    }

    e.stopPropagation();
  };

  const handleCreateNewTab = () => {
    if (!canAddNewTab(isRightSide)) return;

    // Count tabs excluding the Welcome tab for proper numbering (same logic as handleNewTab)
    const currentTabs = tabs.filter((t) => t.workspaceId === activeWorkspaceId);
    const nonWelcomeTabs = currentTabs.filter(
      (tab) => tab.title !== "Welcome",
    );
    const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;

    const newTabId = crypto.randomUUID();
    addTab(
      {
        id: newTabId,
        title: defaultTitle,
        content: "",
        language: "plaintext",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        workspaceId: activeWorkspaceId || "default",
        dateCreated: Date.now(),
        lastModified: Date.now(),
      },
      isRightSide,
    );
  };

  const handleInputBlur = () => {
    if (editingTabId && editingTitle.trim()) {
      updateTabTitle(editingTabId, editingTitle);
    }
    setEditingTabId(null);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    tabId: string,
  ) => {
    clearCommonTooltipState();
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleContextMenuClose = (payload?: {
    action: string;
    tabId?: string;
    side?: string;
  }) => {
    if (payload?.action === "compareSides") {
      onOpenDiffModal(false, undefined, payload.tabId);
    } else if (payload?.action === "compare") {
      onOpenDiffModal(
        true,
        (payload.side as "left" | "right") || side,
        payload.tabId,
      );
    } else if (payload?.action === "compareClipboard") {
      onOpenDiffModal(
        false,
        (payload.side as "left" | "right") || side,
        payload.tabId,
      );
    } else if (payload?.action === "summary" && payload.tabId) {
      onOpenSummaryModal(payload.tabId);
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

  const handleToolSelect = async (item: ToolItem) => {
    await toolService.executeTool(item, {
      side,
      activeWorkspaceId: activeWorkspaceId || "default",
      addTab: (tabData, isRight) => addTab(tabData, isRight),
    });
    setShowToolSelector(false);
  };

  // Get lists of pinned and unpinned tabs
  const pinnedTabs = visibleTabs.filter((tab) => tab.isPinned);
  const unpinnedTabs = visibleTabs.filter((tab) => !tab.isPinned);

  const handleTabClose = (tabId: string) => {
    removeTab(tabId);

    if (hoveredTabId === tabId) {
      setTooltipVisible(false);
      clearTooltipTimers();
      setHoveredTabId(null);
    }
  };


  return (
    <>
      <div
        ref={tabBarRef}
        className="flex bg-surface-tab-bar text-main w-full h-8 overflow-hidden"
        onMouseEnter={handleTabBarMouseEnter}
        onMouseLeave={handleTabBarMouseLeave}
        key={tabsKey}
      >
        <div
          ref={tabsContainerRef}
          className="flex-1 flex min-w-0 overflow-hidden"
          onDoubleClick={handleEmptyAreaDoubleClick}
          data-testid="tab-bar-empty-area"
        >
          <div ref={tabsWrapperRef} className="flex">
            <DndContext
              sensors={sensors}
              modifiers={[restrictToHorizontalAxis]}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
            >
              {/* Pinned tabs */}
              {pinnedTabs.length > 0 && (
                <SortableTabList
                  tabs={visibleTabs}
                  activeTabId={activeSideTabId}
                  tabIds={tabIds}
                  editingTabId={editingTabId}
                  editingTitle={editingTitle}
                  maxLineCount={maxLineCount}
                  isPinned={true}
                  side={side}
                  onTabClick={handleTabClick}
                  onTabClose={handleTabClose}
                  onTabDoubleClick={handleDoubleClick}
                  onTabContextMenu={handleContextMenu}
                  onEditChange={setEditingTitle}
                  onEditSubmit={handleInputBlur}
                  onEditCancel={() => setEditingTabId(null)}
                  onMouseEnterTab={handleTabMouseEnter}
                  onMouseLeaveTab={handleTabMouseLeave}
                  onForceHideTooltip={clearCommonTooltipState}
                />
              )}

              {/* Unpinned tabs */}
              {unpinnedTabs.length > 0 && (
                <SortableTabList
                  tabs={visibleTabs}
                  activeTabId={activeSideTabId}
                  tabIds={tabIds}
                  editingTabId={editingTabId}
                  editingTitle={editingTitle}
                  maxLineCount={maxLineCount}
                  side={side}
                  onTabClick={handleTabClick}
                  onTabClose={handleTabClose}
                  onTabDoubleClick={handleDoubleClick}
                  onTabContextMenu={handleContextMenu}
                  onEditChange={setEditingTitle}
                  onEditSubmit={handleInputBlur}
                  onEditCancel={() => setEditingTabId(null)}
                  onMouseEnterTab={handleTabMouseEnter}
                  onMouseLeaveTab={handleTabMouseLeave}
                  onForceHideTooltip={clearCommonTooltipState}
                />
              )}
            </DndContext>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <TabActions
            side={side}
            onShowTabletSelector={() => setShowToolSelector(!showToolSelector)}
            newTabButtonRef={newTabButtonRef}
            tabletButtonRef={tabletButtonRef}
          />
          {/* Only show WorkspaceSwitcher and HamburgerMenu on the right side when split, or on the left when not split */}
          {(isRightSide ? splitView.isSplit : !splitView.isSplit) && (
            <>
              <WorkspaceSwitcher />
              <HamburgerMenu />
            </>
          )}
        </div>
      </div>

      {showToolSelector && (
        <ToolSelectorModal
          onSelect={handleToolSelect}
          onClose={() => setShowToolSelector(false)}
        />
      )}

      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
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
