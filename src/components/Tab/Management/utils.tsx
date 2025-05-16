import { Tab, SplitViewState, SplitViewRecord } from '../../../types';
import { useTabsStore } from '../../../stores/tabsStore';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { StorageProviderFactory } from '../../../db';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { broadcastManager } from '../../../stores/broadcastStore'; 

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
    setTabManagementActionInProgress(false);
    setDraggedTabIds(new Set());
    return;
  }

  const storage = StorageProviderFactory.getProvider();

  try {
    setTabManagementActionInProgress(true);

    // 1. Update Tab Records in DB
    const tabsBeingMoved = allApplicationTabs.filter(tab => tabIdsToMove.includes(tab.id));
    if (tabsBeingMoved.length > 0) {
      const updatedTabsInDB = tabsBeingMoved.map(tab => ({
        ...tab,
        workspaceId: targetWorkspaceId,
        lastModified: Date.now(), // Update lastModified on move
      }));
      await storage.saveTabs(updatedTabsInDB);
    }

    let finalSourceSplitView: SplitViewRecord | null = null;
    let finalTargetSplitView: SplitViewRecord | null = null;

    // 2. Update Source Workspace's SplitView in DB (if different from target)
    if (sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
      const sourceSplitViewRecord = await storage.getSplitViewByWorkspace(sourceWorkspaceIdForOperation);
      if (sourceSplitViewRecord) {
        sourceSplitViewRecord.leftTabs = sourceSplitViewRecord.leftTabs.filter(id => !tabIdsToMove.includes(id));
        sourceSplitViewRecord.rightTabs = sourceSplitViewRecord.rightTabs.filter(id => !tabIdsToMove.includes(id));
        if (sourceSplitViewRecord.activeLeftTabId && tabIdsToMove.includes(sourceSplitViewRecord.activeLeftTabId)) {
          sourceSplitViewRecord.activeLeftTabId = sourceSplitViewRecord.leftTabs[0] || null;
        }
        if (sourceSplitViewRecord.activeRightTabId && tabIdsToMove.includes(sourceSplitViewRecord.activeRightTabId)) {
          sourceSplitViewRecord.activeRightTabId = sourceSplitViewRecord.rightTabs[0] || null;
        }
        if (!sourceSplitViewRecord.activeLeftTabId && sourceSplitViewRecord.leftTabs.length > 0) {
            sourceSplitViewRecord.activeLeftTabId = sourceSplitViewRecord.leftTabs[0];
        }
        if (!sourceSplitViewRecord.activeRightTabId && sourceSplitViewRecord.rightTabs.length > 0 && sourceSplitViewRecord.isSplit) {
            sourceSplitViewRecord.activeRightTabId = sourceSplitViewRecord.rightTabs[0];
        }
        sourceSplitViewRecord.lastModified = Date.now();
        await storage.saveSplitView(sourceSplitViewRecord);
        finalSourceSplitView = sourceSplitViewRecord;
      }
    }

    // 3. Update Target Workspace's SplitView in DB
    let targetSplitViewRecord = await storage.getSplitViewByWorkspace(targetWorkspaceId);
    if (!targetSplitViewRecord) {
      const defaultSVS = useSplitViewStore.getState().createDefaultSplitViewState(targetWorkspaceId);
      targetSplitViewRecord = { ...defaultSVS, lastModified: Date.now() };
    }

    // Add moved tabs to the target (e.g., to leftTabs by default)
    const currentTargetLeftTabs = targetSplitViewRecord.leftTabs || [];
    targetSplitViewRecord.leftTabs = [...new Set([...currentTargetLeftTabs, ...tabIdsToMove])];

    if (!targetSplitViewRecord.activeLeftTabId || !targetSplitViewRecord.leftTabs.includes(targetSplitViewRecord.activeLeftTabId)) {
      targetSplitViewRecord.activeLeftTabId = tabIdsToMove[0] || targetSplitViewRecord.leftTabs[0] || null;
    }
    targetSplitViewRecord.lastModified = Date.now();
    await storage.saveSplitView(targetSplitViewRecord);
    finalTargetSplitView = targetSplitViewRecord;

    // --- BROADCASTING ---
    // Fetch the latest state directly from DB for broadcasting to ensure consistency
    if (finalSourceSplitView && sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
      const updatedSourceTabsFromDB = await storage.getTabsByWorkspace(sourceWorkspaceIdForOperation);
      broadcastManager.broadcastWorkspaceState(sourceWorkspaceIdForOperation, {
        tabs: updatedSourceTabsFromDB,
        splitView: finalSourceSplitView as unknown as SplitViewState, // Cast needed if types differ slightly
      });
    }

    const updatedTargetTabsFromDB = await storage.getTabsByWorkspace(targetWorkspaceId);
    broadcastManager.broadcastWorkspaceState(targetWorkspaceId, {
      tabs: updatedTargetTabsFromDB,
      splitView: finalTargetSplitView as unknown as SplitViewState,
    });
    // --- END BROADCASTING ---

    // 4. Refresh Modal State (using the latest from DB)
    const refreshedAllTabsFromDBForModal = await storage.getTabs();
    setAllApplicationTabs(refreshedAllTabsFromDBForModal);
    await useWorkspaceStore.getState().loadWorkspaces({ preventAutoSwitch: true }); // Refreshes tab counts

    // 5. Refresh Main UI State (Zustand Stores for THIS browser tab)
    const mainUIActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

    if (mainUIActiveWorkspaceId) {
      if (mainUIActiveWorkspaceId === sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
        useTabsStore.setState({ tabs: await storage.getTabsByWorkspace(mainUIActiveWorkspaceId) });
        if (finalSourceSplitView) {
          useSplitViewStore.setState({ splitView: finalSourceSplitView as unknown as SplitViewState });
        }
      } else if (mainUIActiveWorkspaceId === targetWorkspaceId) {
        useTabsStore.setState({ tabs: await storage.getTabsByWorkspace(mainUIActiveWorkspaceId) });
        if (finalTargetSplitView) {
          useSplitViewStore.setState({ splitView: finalTargetSplitView as unknown as SplitViewState });
        }
      }
    }

    // Cache the target split view for potential immediate switch (if this tab switches)
    if (finalTargetSplitView) {
        cacheSplitViewForWorkspace(targetWorkspaceId, {
          ...(finalTargetSplitView as unknown as SplitViewState),
          activeSide: finalTargetSplitView.activeSide as 'left' | 'right' | null
        });
    }


  } catch (error) {
    console.error('[MoveToWorkspace] Failed to move tabs:', error);
    // Optionally: Revert DB changes in a more complex setup, or at least notify user.
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