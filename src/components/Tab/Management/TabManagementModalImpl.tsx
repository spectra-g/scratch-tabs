import React, { useMemo } from 'react';
import { Tab } from '../../../types';
import { useRootStore } from '../../../stores';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { moveTabsToWorkspace, applyTabOrder } from './utils';
import { DragEndEvent } from '@dnd-kit/core';
import { SORT_OPTIONS, GROUP_OPTIONS } from '../../../constants';

// This file contains implementation details for the TabManagementModal component

// Filter and sort tabs
export const useFilteredTabs = (
  activeWorkspaceTabs: Tab[],
  activeWorkspaceId: string | null,
  searchQuery: string,
  languageFilter: string[],
  sortOption: string,
) => {
  return useMemo(() => {
    let result = [...activeWorkspaceTabs]; // Start with tabs from the currently active workspace

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tab =>
        tab.title.toLowerCase().includes(query)
      );
    }

    // Filter by language
    if (languageFilter.length > 0) {
      result = result.filter(tab => {
        if (tab.isTablet && languageFilter.includes('tablet')) {
          return true;
        }
        return languageFilter.includes(tab.language);
      });
    }

    // Sort tabs
    switch (sortOption) {
      case SORT_OPTIONS.CURRENT:
        // Get the current order from the root store
        const { splitView } = useSplitViewStore.getState();
        const currentOrder = [...splitView.leftTabs, ...splitView.rightTabs];

        // Create a map of tab positions for quick lookup
        const positionMap = new Map(currentOrder.map((id, index) => [id, index]));

        // Sort based on current positions, keeping pinned tabs at the front
        result.sort((a, b) => {
          // Keep pinned tabs at the front
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;

          // For non-pinned tabs, sort by their current position
          const posA = positionMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const posB = positionMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return posA - posB;
        });
        break;
      case SORT_OPTIONS.TITLE_ASC:
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case SORT_OPTIONS.TITLE_DESC:
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case SORT_OPTIONS.CREATED_ASC:
        result.sort((a, b) => a.dateCreated - b.dateCreated);
        break;
      case SORT_OPTIONS.CREATED_DESC:
        result.sort((a, b) => b.dateCreated - a.dateCreated);
        break;
      case SORT_OPTIONS.MODIFIED_ASC:
        result.sort((a, b) => a.lastModified - b.lastModified);
        break;
      case SORT_OPTIONS.MODIFIED_DESC:
        result.sort((a, b) => b.lastModified - a.lastModified);
        break;
      case SORT_OPTIONS.LANGUAGE:
        result.sort((a, b) => {
          const aLang = a.isTablet ? 'tablet' : a.language;
          const bLang = b.isTablet ? 'tablet' : b.language;
          return aLang.localeCompare(bLang);
        });
        break;
      case SORT_OPTIONS.LINES_MOST:
        result.sort((a, b) => {
          const aLines = a.isTablet ? 0 : ((a.content || '').split('\n').length);
          const bLines = b.isTablet ? 0 : ((b.content || '').split('\n').length);
          return bLines - aLines; // Descending order (most first)
        });
        break;
      case SORT_OPTIONS.LINES_LEAST:
        result.sort((a, b) => {
          const aLines = a.isTablet ? 0 : ((a.content || '').split('\n').length);
          const bLines = b.isTablet ? 0 : ((b.content || '').split('\n').length);
          return aLines - bLines; // Ascending order (least first)
        });
        break;
    }

    return result;
  }, [activeWorkspaceTabs, activeWorkspaceId, searchQuery, languageFilter, sortOption]);
};

// Group tabs based on grouping option
export const useGroupedTabs = (
  filteredTabs: Tab[],
  groupOption: string,
  workspaces: any[],
  languageRegistry: any
) => {
  return useMemo(() => {
    if (groupOption === GROUP_OPTIONS.NONE) {
      return { 'All Tabs': filteredTabs };
    }

    const groups: Record<string, Tab[]> = {};

    if (groupOption === GROUP_OPTIONS.LANGUAGE) {
      filteredTabs.forEach(tab => {
        const key = tab.isTablet ? 'Tablets' : (languageRegistry.getById(tab.language)?.name || tab.language);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(tab);
      });
    } else if (groupOption === GROUP_OPTIONS.WORKSPACE) {
      const workspaceMap = new Map(workspaces.map(w => [w.id, w.name]));

      filteredTabs.forEach(tab => {
        const key = workspaceMap.get(tab.workspaceId) || 'Unknown Workspace';
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(tab);
      });
    }

    return groups;
  }, [filteredTabs, groupOption, workspaces, languageRegistry]);
};

// Find duplicate tabs in the current workspace
export const useDuplicateTabs = (
  activeWorkspaceTabs: Tab[],
  activeWorkspaceId: string | null
) => {
  return useMemo(() => {
    const contentMap = new Map<string, Tab[]>();
    // Use activeWorkspaceTabs for finding duplicates *within the current view*
    const currentViewTabs = activeWorkspaceTabs.filter(tab => tab.workspaceId === activeWorkspaceId);

    currentViewTabs.forEach(tab => {
      if (!tab.isTablet) {
        const content = (tab.content || '').trim();
        if (content) {
          if (!contentMap.has(content)) {
            contentMap.set(content, []);
          }
          contentMap.get(content)!.push(tab);
        }
      }
    });

    // Filter to only include content with multiple tabs
    const duplicates: Record<string, Tab[]> = {};
    contentMap.forEach((tabsWithContent, content) => {
      if (tabsWithContent.length > 1) {
        // Use the first tab's title as the key
        const key = tabsWithContent[0].title;
        duplicates[key] = tabsWithContent;
      }
    });

    return duplicates;
  }, [activeWorkspaceTabs, activeWorkspaceId]);
};

// Find empty tabs in the current workspace
export const useEmptyTabs = (
  activeWorkspaceTabs: Tab[],
  activeWorkspaceId: string | null
) => {
  return useMemo(() => {
    // Use activeWorkspaceTabs for finding empty tabs *within the current view*
    const currentViewTabs = activeWorkspaceTabs.filter(tab => tab.workspaceId === activeWorkspaceId);

    // Find tabs with empty content
    return currentViewTabs.filter(tab => {
      // For regular tabs, check if content is empty
      if (!tab.isTablet) {
        return (tab.content || '').trim() === '';
      }
      // For tablets, consider them non-empty as they might have state
      return false;
    });
  }, [activeWorkspaceTabs, activeWorkspaceId]);
};

// Handler for applying current tab order
export const handleApplyCurrentOrder = (
  eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[],
  filteredTabs: Tab[]
) => {
  // If it's a mouse event, use the current filtered tabs
  const newOrder = Array.isArray(eventOrTabs) ? eventOrTabs : filteredTabs;
  applyTabOrder(newOrder, useSplitViewStore, useRootStore);
  
  // Return 'current' as the new sort option after applying
  return 'current';
};

// Handler for switching workspace and keeping the modal open
export const handleSwitchWorkspaceAndKeepModal = async (
  workspaceId: string,
  event: React.MouseEvent,
  activeWorkspaceId: string | null,
  switchWorkspaceFromStore: (id: string) => Promise<void>,
  setTabManagementActionInProgress: (value: boolean) => void,
  setSelectedTabIds: (ids: Set<string>) => void
) => {
  event.stopPropagation(); // Stop event from bubbling up

  if (workspaceId === activeWorkspaceId) {
    return;
  }

  // Set the flag before any async operations
  setTabManagementActionInProgress(true);

  try {
    await switchWorkspaceFromStore(workspaceId);
    setSelectedTabIds(new Set());
  } catch (error) {
    console.error("Error switching workspace from modal:", error);
  } finally {
    setTimeout(() => {
      setTabManagementActionInProgress(false);
    }, 150);
  }
};

// Handler for closing the base modal
export const handleBaseModalClose = (
  onClose: () => void,
  isTabManagementActionInProgress: boolean
) => {
  // Only close if no internal action is flagged
  if (!isTabManagementActionInProgress) {
    onClose();
  }
};

// Handler for drag end events
export const handleDragEnd = (
  event: DragEndEvent,
  setActiveDragId: (id: string | null) => void,
  setDraggedTabIds: (ids: Set<string>) => void,
  draggedTabIds: Set<string>,
  activeWorkspaceId: string | null,
  filteredTabs: Tab[],
  handleMoveToWorkspaceWithId: (targetWorkspaceId: string, draggedIds: string[]) => void,
  handleApplyCurrentOrder: (eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]) => void
) => {
  const { over } = event;
  setActiveDragId(null);

  if (!over) {
    setDraggedTabIds(new Set());
    return;
  }

  const overId = over.id as string;
  const overData = over.data.current;
  const overDataType = overData?.type as string | undefined;
  const draggedTabIdsToMove = Array.from(draggedTabIds);

  if (overDataType === 'workspace' && overData?.workspaceId) {
    const targetWorkspaceId = overData.workspaceId as string;
    if (targetWorkspaceId && targetWorkspaceId !== activeWorkspaceId) {
      handleMoveToWorkspaceWithId(targetWorkspaceId, draggedTabIdsToMove);
    } else if (targetWorkspaceId === activeWorkspaceId) {
      // Dropped on current workspace item - move to end of current list
      const itemsToMove = filteredTabs.filter(tab => draggedTabIdsToMove.includes(tab.id));
      const otherItemsInCurrentWorkspace = filteredTabs.filter(tab => !draggedTabIdsToMove.includes(tab.id));
      const finalNewOrderInCurrentWorkspace = [...otherItemsInCurrentWorkspace, ...itemsToMove];
      handleApplyCurrentOrder(finalNewOrderInCurrentWorkspace);
    }
  } else if (overDataType === 'tab' || overDataType === 'group') {
    const targetItemWorkspaceId = overDataType === 'tab' ? overData?.tab?.workspaceId : overData?.groupWorkspaceId;
    if (targetItemWorkspaceId === activeWorkspaceId) {
      // Reordering within the current workspace
      const itemsToMove = filteredTabs.filter(tab => draggedTabIdsToMove.includes(tab.id));
      const currentWorkspaceFilteredTabs = filteredTabs.filter(t => t.workspaceId === activeWorkspaceId);
      const otherItemsInCurrentWorkspace = currentWorkspaceFilteredTabs.filter(tab => !draggedTabIdsToMove.includes(tab.id));

      let finalNewOrderInCurrentWorkspace: Tab[];
      const targetIndexInOthers = otherItemsInCurrentWorkspace.findIndex(tab => tab.id === overId);

      if (targetIndexInOthers !== -1) { // Dropped on a specific tab
        finalNewOrderInCurrentWorkspace = [
          ...otherItemsInCurrentWorkspace.slice(0, targetIndexInOthers),
          ...itemsToMove,
          ...otherItemsInCurrentWorkspace.slice(targetIndexInOthers)
        ];
      } else { // Dropped on a group area or end of list
        finalNewOrderInCurrentWorkspace = [...otherItemsInCurrentWorkspace, ...itemsToMove];
      }
      handleApplyCurrentOrder(finalNewOrderInCurrentWorkspace);
    }
  }

  setDraggedTabIds(new Set());
};

// Wrapper for handling moveToWorkspaceWithId
export const createMoveToWorkspaceWithIdHandler = (
  activeWorkspaceId: string | null,
  allApplicationTabs: Tab[],
  setTabManagementActionInProgress: (value: boolean) => void,
  setAllApplicationTabs: (tabs: Tab[]) => void,
  setDraggedTabIds: (ids: Set<string>) => void,
  cacheSplitViewForWorkspace: any
) => {
  return async (targetWorkspaceId: string, draggedIds: string[]) => {
    await moveTabsToWorkspace(
      targetWorkspaceId,
      draggedIds,
      activeWorkspaceId,
      allApplicationTabs,
      setTabManagementActionInProgress,
      setAllApplicationTabs,
      setDraggedTabIds,
      cacheSplitViewForWorkspace
    );
  };
}; 