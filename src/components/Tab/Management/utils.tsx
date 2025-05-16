import { Tab } from '../../../types';
import { useTabsStore } from '../../../stores/tabsStore';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { StorageProviderFactory } from '../../../db';
import { SplitViewState } from '../../../types';

/**
 * Handle moving tabs to a different workspace
 */
export const moveTabsToWorkspace = async (
  targetWorkspaceId: string, 
  draggedIds: string[], 
  activeWorkspaceId: string | null,
  allApplicationTabs: Tab[],
  setTabManagementActionInProgress: (value: boolean) => void,
  setAllApplicationTabs: (tabs: Tab[]) => void,
  setDraggedTabIds: (ids: Set<string>) => void,
  cacheSplitViewForWorkspace: (workspaceId: string, splitView: SplitViewState) => void
) => {
  if (draggedIds.length === 0 || !targetWorkspaceId) {
    return;
  }

  // Store source workspace ID for the operation
  const sourceWorkspaceIdForOperation = activeWorkspaceId;

  // Calculate which tabs to actually move, ensuring we don't empty any workspace
  let tabIdsToMove = [...draggedIds]; // Create a mutable copy

  if (sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
    const sourceWorkspaceTabs = allApplicationTabs.filter(tab => tab.workspaceId === sourceWorkspaceIdForOperation);
    const sourceTabIds = sourceWorkspaceTabs.map(tab => tab.id);

    // Count how many source workspace tabs are in the draggedIds
    const selectedSourceTabs = draggedIds.filter(id => sourceTabIds.includes(id));

    // If we're trying to move all tabs from the source workspace, keep one behind
    if (selectedSourceTabs.length === sourceTabIds.length && sourceTabIds.length > 1) {
      // Remove the last tab from the list of tabs to move
      const tabToKeep = sourceTabIds[sourceTabIds.length - 1];
      tabIdsToMove = tabIdsToMove.filter(id => id !== tabToKeep);
    }
  }

  if (tabIdsToMove.length === 0) {
    return;
  }

  const storage = StorageProviderFactory.getProvider();

  try {
    setTabManagementActionInProgress(true);

    // 1. Update Tab Records in DB: Change workspaceId for each dragged tab
    const tabsToMove = allApplicationTabs.filter(tab => tabIdsToMove.includes(tab.id));

    if (tabsToMove.length > 0) {
      const updatedTabs = tabsToMove.map(tab => ({
        ...tab,
        workspaceId: targetWorkspaceId,
      }));
    
      await storage.saveTabs(updatedTabs);
    }

    // 2. Update Source Workspace's SplitView (if different from target)
    if (sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
      const sourceSplitView = await storage.getSplitViewByWorkspace(sourceWorkspaceIdForOperation);
      if (sourceSplitView) {
        sourceSplitView.leftTabs = sourceSplitView.leftTabs.filter(id => !tabIdsToMove.includes(id));
        sourceSplitView.rightTabs = sourceSplitView.rightTabs.filter(id => !tabIdsToMove.includes(id));
        if (sourceSplitView.activeLeftTabId && tabIdsToMove.includes(sourceSplitView.activeLeftTabId)) {
          sourceSplitView.activeLeftTabId = sourceSplitView.leftTabs[0] || null;
        }
        if (sourceSplitView.activeRightTabId && tabIdsToMove.includes(sourceSplitView.activeRightTabId)) {
          sourceSplitView.activeRightTabId = sourceSplitView.rightTabs[0] || null;
        }
        await storage.saveSplitView(sourceSplitView);
      }
    }

    // 3. Update Target Workspace's SplitView
    let targetSplitView = await storage.getSplitViewByWorkspace(targetWorkspaceId);
    if (!targetSplitView) {
      // Create a default split view if none exists
      targetSplitView = {
        id: crypto.randomUUID(),
        isSplit: false,
        leftTabs: [],
        rightTabs: [],
        activeLeftTabId: null,
        activeRightTabId: null,
        activeSide: 'left',
        splitRatio: 0.5,
        workspaceId: targetWorkspaceId,
        lastModified: Date.now()
      };
    }

    // Ensure leftTabs is an array before spreading
    const currentLeftTabs = targetSplitView.leftTabs || [];
    targetSplitView.leftTabs = [...new Set([...currentLeftTabs, ...tabIdsToMove])]; // Use Set to avoid duplicates

    // Set the active tab if there isn't one or the current one isn't valid
    if (!targetSplitView.activeLeftTabId || !targetSplitView.leftTabs.includes(targetSplitView.activeLeftTabId)) {
      targetSplitView.activeLeftTabId = tabIdsToMove[0] || targetSplitView.leftTabs[0] || null;
    }

    // Explicitly update lastModified timestamp
    targetSplitView.lastModified = Date.now();

    // Save the updated target split view
    await storage.saveSplitView(targetSplitView);

    // 4. Refresh Modal State
    const refreshedAllTabs = await storage.getTabs();
    setAllApplicationTabs(refreshedAllTabs);
    // Refresh workspace list in the modal (tab counts might have changed)
    await useWorkspaceStore.getState().loadWorkspaces({ preventAutoSwitch: true });

    // 5. Refresh Main UI State (Zustand Stores)
    const mainUIActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

    if (mainUIActiveWorkspaceId) {
      if (mainUIActiveWorkspaceId === sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
        // Main UI was showing the source workspace - Fetch its updated state
        const updatedSourceTabsForUI = await storage.getTabsByWorkspace(mainUIActiveWorkspaceId);
        const updatedSourceSplitViewRecord = await storage.getSplitViewByWorkspace(mainUIActiveWorkspaceId);
        useTabsStore.setState({ tabs: updatedSourceTabsForUI });
        if (updatedSourceSplitViewRecord) {
          const updatedSplitViewState: SplitViewState = {
            id: updatedSourceSplitViewRecord.id,
            isSplit: updatedSourceSplitViewRecord.isSplit,
            leftTabs: updatedSourceSplitViewRecord.leftTabs,
            rightTabs: updatedSourceSplitViewRecord.rightTabs,
            activeLeftTabId: updatedSourceSplitViewRecord.activeLeftTabId,
            activeRightTabId: updatedSourceSplitViewRecord.activeRightTabId,
            activeSide: updatedSourceSplitViewRecord.activeSide as 'left' | 'right' | null, // Assert type
            splitRatio: updatedSourceSplitViewRecord.splitRatio,
            workspaceId: updatedSourceSplitViewRecord.workspaceId,
            leftTabHistory: [], // Add empty history
            rightTabHistory: [] // Add empty history
          };
          useSplitViewStore.setState({ splitView: updatedSplitViewState });
        }
      } else if (mainUIActiveWorkspaceId === targetWorkspaceId) {
        // Main UI was showing the target workspace - Use the already modified targetSplitView object
        const updatedTargetTabsForUI = await storage.getTabsByWorkspace(mainUIActiveWorkspaceId);
        useTabsStore.setState({ tabs: updatedTargetTabsForUI });
        // Use the targetSplitView we modified earlier, ensuring correct type
        const updatedSplitViewState: SplitViewState = {
          id: targetSplitView.id,
          isSplit: targetSplitView.isSplit,
          leftTabs: targetSplitView.leftTabs,
          rightTabs: targetSplitView.rightTabs,
          activeLeftTabId: targetSplitView.activeLeftTabId,
          activeRightTabId: targetSplitView.activeRightTabId,
          activeSide: targetSplitView.activeSide as 'left' | 'right' | null, // Assert type
          splitRatio: targetSplitView.splitRatio,
          workspaceId: targetSplitView.workspaceId,
          leftTabHistory: [], // Add empty history
          rightTabHistory: [] // Add empty history
        };
        useSplitViewStore.setState({ splitView: updatedSplitViewState });
      }
      // else: Main UI is showing a different workspace, no immediate store update needed for it.
    }

    // Save the in-memory targetSplitView for potential workspace switching
    // We'll use this to avoid the race condition with database fetching
    cacheSplitViewForWorkspace(targetWorkspaceId, {
      ...targetSplitView,
      activeSide: targetSplitView.activeSide as 'left' | 'right' | null
    });

  } catch (error) {
    console.error('[MoveToWorkspaceWithId] Failed to move tabs:', error);
  } finally {
    setTabManagementActionInProgress(false);
    setDraggedTabIds(new Set());
  }
};

/**
 * Applies the current tab order to the state
 */
export const applyTabOrder = (
  newOrder: Tab[],
  useSplitViewStore: any,
  useRootStore: any
) => {
  // Get the current split view state
  const { splitView } = useSplitViewStore.getState();
  const { updateTabOrder } = useRootStore.getState();
  const { setActiveSide } = useSplitViewStore.getState();

  // Create sets to track which tabs belong to which side
  const leftTabSet = new Set(splitView.leftTabs);

  // Initialize arrays for pinned and unpinned tabs on each side
  const leftPinnedTabs: string[] = [];
  const leftUnpinnedTabs: string[] = [];
  const rightPinnedTabs: string[] = [];
  const rightUnpinnedTabs: string[] = [];

  // Distribute tabs based on their original side and pinned status
  newOrder.forEach(tab => {
    if (leftTabSet.has(tab.id)) {
      if (tab.isPinned) {
        leftPinnedTabs.push(tab.id);
      } else {
        leftUnpinnedTabs.push(tab.id);
      }
    } else {
      if (tab.isPinned) {
        rightPinnedTabs.push(tab.id);
      } else {
        rightUnpinnedTabs.push(tab.id);
      }
    }
  });

  // Combine pinned and unpinned tabs for each side
  const newLeftTabs = [...leftPinnedTabs, ...leftUnpinnedTabs];
  const newRightTabs = [...rightPinnedTabs, ...rightUnpinnedTabs];

  // Update the tab order while preserving the split view
  updateTabOrder(newLeftTabs, newRightTabs);

  // Set active tabs if they exist in the new arrays
  const activeLeftTab = newLeftTabs.find(id => id === splitView.activeLeftTabId);
  const activeRightTab = newRightTabs.find(id => id === splitView.activeRightTabId);

  if (activeLeftTab) {
    useSplitViewStore.getState().setActiveLeftTab(activeLeftTab);
  } else if (newLeftTabs.length > 0) {
    useSplitViewStore.getState().setActiveLeftTab(newLeftTabs[0]);
  }

  if (activeRightTab) {
    useSplitViewStore.getState().setActiveRightTab(activeRightTab);
  } else if (newRightTabs.length > 0) {
    useSplitViewStore.getState().setActiveRightTab(newRightTabs[0]);
  }

  // Preserve the active side
  if (splitView.activeSide) {
    setActiveSide(splitView.activeSide);
  }
};

// Import needed for the store reference
import { useWorkspaceStore } from '../../../stores/workspaceStore'; 