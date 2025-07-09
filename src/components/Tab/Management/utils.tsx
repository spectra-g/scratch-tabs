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

  if (!sourceWorkspaceIdForOperation || sourceWorkspaceIdForOperation == targetWorkspaceId) {
    return;
  }

  // Calculate which tabs to actually move, ensuring we don't empty any workspace
  let tabIdsToMove = [...draggedIds]; // Create a mutable copy

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
        workspaceId: targetWorkspaceId
      }));
      await storage.saveTabsNow(updatedTabsInDB);
    }

    let finalSourceSplitView: SplitViewRecord | null = null;
    let finalTargetSplitView: SplitViewRecord | null = null;

    // 2. Update Source Workspace's SplitView in DB
    const sourceSplitViewRecord = await storage.getSplitViewByWorkspace(sourceWorkspaceIdForOperation);
    if (sourceSplitViewRecord) {
      sourceSplitViewRecord.leftTabs = sourceSplitViewRecord.leftTabs.filter(id => !tabIdsToMove.includes(id));
      sourceSplitViewRecord.rightTabs = sourceSplitViewRecord.rightTabs.filter(id => !tabIdsToMove.includes(id));
      if (sourceSplitViewRecord.activeLeftTabId && tabIdsToMove.includes(sourceSplitViewRecord.activeLeftTabId)) {
        const fallbackTabId = Array.isArray(sourceSplitViewRecord.leftTabs) && sourceSplitViewRecord.leftTabs.length > 0
          ? sourceSplitViewRecord.leftTabs[0]
          : null;
        sourceSplitViewRecord.activeLeftTabId = fallbackTabId;
      }
      if (sourceSplitViewRecord.activeRightTabId && tabIdsToMove.includes(sourceSplitViewRecord.activeRightTabId)) {
        const fallbackTabId = Array.isArray(sourceSplitViewRecord.rightTabs) && sourceSplitViewRecord.rightTabs.length > 0
          ? sourceSplitViewRecord.rightTabs[0]
          : null;
        sourceSplitViewRecord.activeRightTabId = fallbackTabId;
      }
      sourceSplitViewRecord.lastModified = Date.now();
      await storage.saveSplitViewNow(sourceSplitViewRecord);
      finalSourceSplitView = sourceSplitViewRecord;
    }

    // 3. Update Target Workspace's SplitView in DB
    let targetSplitViewRecord = await storage.getSplitViewByWorkspace(targetWorkspaceId);
    if (!targetSplitViewRecord) {
      const defaultSplitViewState = useSplitViewStore.getState().createDefaultSplitViewState(targetWorkspaceId);
      targetSplitViewRecord = {
        id: defaultSplitViewState.id,
        isSplit: defaultSplitViewState.isSplit,
        leftTabs: defaultSplitViewState.leftTabs,
        rightTabs: defaultSplitViewState.rightTabs,
        activeLeftTabId: defaultSplitViewState.activeLeftTabId,
        activeRightTabId: defaultSplitViewState.activeRightTabId,
        activeSide: defaultSplitViewState.activeSide,
        splitRatio: defaultSplitViewState.splitRatio,
        workspaceId: defaultSplitViewState.workspaceId,
        lastModified: Date.now(),
        leftTabHistory: defaultSplitViewState.leftTabHistory,
        rightTabHistory: defaultSplitViewState.rightTabHistory
      };
    }

    // Add moved tabs to the target (e.g., to leftTabs by default)
    const currentTargetLeftTabs = targetSplitViewRecord?.leftTabs || [];

    if (targetSplitViewRecord) {
      targetSplitViewRecord.leftTabs = [...new Set([...currentTargetLeftTabs, ...tabIdsToMove])];

      if (!targetSplitViewRecord.activeLeftTabId || !targetSplitViewRecord.leftTabs.includes(targetSplitViewRecord.activeLeftTabId)) {
        const newActiveLeftTabId = tabIdsToMove[0] || targetSplitViewRecord.leftTabs[0] || null;
        targetSplitViewRecord.activeLeftTabId = newActiveLeftTabId;
      }

      targetSplitViewRecord.lastModified = Date.now();
      await storage.saveSplitViewNow(targetSplitViewRecord);
      finalTargetSplitView = targetSplitViewRecord;
    }

    // Cache the target split view for potential immediate switch (if this tab switches)
    if (finalTargetSplitView) {
      const splitViewState: SplitViewState = {
        id: finalTargetSplitView.id,
        isSplit: finalTargetSplitView.isSplit,
        leftTabs: finalTargetSplitView.leftTabs,
        rightTabs: finalTargetSplitView.rightTabs,
        activeLeftTabId: finalTargetSplitView.activeLeftTabId,
        activeRightTabId: finalTargetSplitView.activeRightTabId,
        activeSide: finalTargetSplitView.activeSide as 'left' | 'right' | null,
        splitRatio: finalTargetSplitView.splitRatio,
        workspaceId: finalTargetSplitView.workspaceId,
        leftTabHistory: finalTargetSplitView.leftTabHistory,
        rightTabHistory: finalTargetSplitView.rightTabHistory
      };
      cacheSplitViewForWorkspace(targetWorkspaceId, splitViewState);
    }

    // --- BROADCASTING ---
    // Fetch the latest state directly from DB for broadcasting to ensure consistency
    if (finalSourceSplitView) {
      const updatedSourceTabsFromDB = await storage.getTabsByWorkspace(sourceWorkspaceIdForOperation);
      const sourceSplitViewState: SplitViewState = {
        id: finalSourceSplitView.id,
        isSplit: finalSourceSplitView.isSplit,
        leftTabs: finalSourceSplitView.leftTabs,
        rightTabs: finalSourceSplitView.rightTabs,
        activeLeftTabId: finalSourceSplitView.activeLeftTabId,
        activeRightTabId: finalSourceSplitView.activeRightTabId,
        activeSide: finalSourceSplitView.activeSide as 'left' | 'right' | null,
        splitRatio: finalSourceSplitView.splitRatio,
        workspaceId: finalSourceSplitView.workspaceId,
        leftTabHistory: finalSourceSplitView.leftTabHistory,
        rightTabHistory: finalSourceSplitView.rightTabHistory
      };
      broadcastManager.broadcastWorkspaceState(sourceWorkspaceIdForOperation, {
        tabs: updatedSourceTabsFromDB,
        splitView: sourceSplitViewState,
      });
    }

    const updatedTargetTabsFromDB = await storage.getTabsByWorkspace(targetWorkspaceId);
    const targetSplitViewState: SplitViewState = {
      id: finalTargetSplitView!.id,
      isSplit: finalTargetSplitView!.isSplit,
      leftTabs: finalTargetSplitView!.leftTabs,
      rightTabs: finalTargetSplitView!.rightTabs,
      activeLeftTabId: finalTargetSplitView!.activeLeftTabId,
      activeRightTabId: finalTargetSplitView!.activeRightTabId,
      activeSide: finalTargetSplitView!.activeSide as 'left' | 'right' | null,
      splitRatio: finalTargetSplitView!.splitRatio,
      workspaceId: finalTargetSplitView!.workspaceId,
      leftTabHistory: finalTargetSplitView!.leftTabHistory,
      rightTabHistory: finalTargetSplitView!.rightTabHistory
    };
    broadcastManager.broadcastWorkspaceState(targetWorkspaceId, {
      tabs: updatedTargetTabsFromDB,
      splitView: targetSplitViewState,
    });
    // --- END BROADCASTING ---

    // 4. Refresh Modal State
    const refreshedAllTabsFromDBForModal = await storage.getTabs();
    setAllApplicationTabs(refreshedAllTabsFromDBForModal);
    await useWorkspaceStore.getState().loadWorkspaces();

    // 5. Refresh Main UI State
    const mainUIActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

    if (mainUIActiveWorkspaceId) {
      if (mainUIActiveWorkspaceId === sourceWorkspaceIdForOperation && sourceWorkspaceIdForOperation !== targetWorkspaceId) {
        const sourceTabs = await storage.getTabsByWorkspace(mainUIActiveWorkspaceId);
        useTabsStore.setState({ tabs: sourceTabs });
        if (finalSourceSplitView) {
          const sourceSplitViewState: SplitViewState = {
            id: finalSourceSplitView.id,
            isSplit: finalSourceSplitView.isSplit,
            leftTabs: finalSourceSplitView.leftTabs,
            rightTabs: finalSourceSplitView.rightTabs,
            activeLeftTabId: finalSourceSplitView.activeLeftTabId,
            activeRightTabId: finalSourceSplitView.activeRightTabId,
            activeSide: finalSourceSplitView.activeSide as 'left' | 'right' | null,
            splitRatio: finalSourceSplitView.splitRatio,
            workspaceId: finalSourceSplitView.workspaceId,
            leftTabHistory: finalSourceSplitView.leftTabHistory,
            rightTabHistory: finalSourceSplitView.rightTabHistory
          };
          useSplitViewStore.setState({ splitView: sourceSplitViewState });
        }
      } else if (mainUIActiveWorkspaceId === targetWorkspaceId) {
        const targetTabs = await storage.getTabsByWorkspace(mainUIActiveWorkspaceId);
        useTabsStore.setState({ tabs: targetTabs });
        if (finalTargetSplitView) {
          const targetSplitViewState: SplitViewState = {
            id: finalTargetSplitView.id,
            isSplit: finalTargetSplitView.isSplit,
            leftTabs: finalTargetSplitView.leftTabs,
            rightTabs: finalTargetSplitView.rightTabs,
            activeLeftTabId: finalTargetSplitView.activeLeftTabId,
            activeRightTabId: finalTargetSplitView.activeRightTabId,
            activeSide: finalTargetSplitView.activeSide as 'left' | 'right' | null,
            splitRatio: finalTargetSplitView.splitRatio,
            workspaceId: finalTargetSplitView.workspaceId,
            leftTabHistory: finalTargetSplitView.leftTabHistory,
            rightTabHistory: finalTargetSplitView.rightTabHistory
          };
          useSplitViewStore.setState({ splitView: targetSplitViewState });
        }
      }
    }

  } catch (error) {
    console.error('[MoveTabsToWorkspace] Failed to move tabs:', error);
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