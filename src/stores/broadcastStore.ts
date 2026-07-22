// stores/broadcastStore.ts
import { useTabsStore } from "./tabsStore";
import { useSplitViewStore } from "./splitViewStore";
import { useWorkspaceStore } from "./workspaceStore";
import { Tab, SplitViewState, Workspace, SidebarTabInfo } from "../types"; // Ensure these types are correct
import { prepareTabsForBroadcast } from "./broadcastPayload";

/**
 * Generates a UUID, with fallback for environments where crypto.randomUUID is not available
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Jest/Node.js environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Message types for type safety
type BroadcastMessage =
  | {
    type: "WORKSPACE_STATE_UPDATED"; // More specific: state for a PARTICULAR workspace
    payload: {
      workspaceId: string; // ID of the workspace that was updated
      tabs?: Tab[]; // Tabs belonging to THIS workspaceId
      splitView?: SplitViewState; // SplitView for THIS workspaceId
    };
  }
  | {
    type: "WORKSPACE_LIST_UPDATED"; // For create, rename workspace
    payload: {
      workspaces: Workspace[]; // The new complete list of workspaces
      // Optionally, include the ID of the workspace that was just created/renamed
      // if you want other tabs to potentially highlight it or offer to switch.
      updatedWorkspaceId?: string;
    };
  }
  | {
    type: "WORKSPACE_DELETED";
    payload: {
      deletedWorkspaceId: string;
      // newActiveWorkspaceId is NOT needed here anymore, each tab decides locally
    };
  }
  | {
    type: "WORKSPACE_TABS_METADATA_UPDATED"; // For sidebar metadata sync
    payload: {
      workspaceId: string;
      tabsMetadata: SidebarTabInfo[];
    };
  }
  | {
    type: "REQUEST_FULL_SYNC"; // A new tab requests all data from an existing tab
    payload: {
      senderId: string; // Unique ID for the requesting tab
    };
  }
  | {
    type: "FULL_SYNC_RESPONSE"; // Response to REQUEST_FULL_SYNC
    payload: {
      workspaces: Workspace[];
      activeWorkspaceId: string | null; // The sender's active workspace
      tabs: Tab[]; // Tabs for the sender's active workspace
      splitView: SplitViewState; // SplitView for the sender's active workspace
      recipientId: string; // ID of the tab that requested the sync
    };
  };

class BroadcastManager {
  private static instance: BroadcastManager;
  private channel: BroadcastChannel;
  private isInitialized = false;
  private tabInstanceId: string; // Unique ID for this browser tab instance
  private skipFullSyncResponse = false; // Flag to skip FULL_SYNC_RESPONSE when processing share URLs

  private constructor() {
    this.channel = new BroadcastChannel("scratch-tabs-sync-v2"); // New channel name for clarity
    this.tabInstanceId = generateUUID(); // Give each tab a unique ID
    this.setupListeners();
  }

  static getInstance(): BroadcastManager {
    if (!BroadcastManager.instance) {
      BroadcastManager.instance = new BroadcastManager();
    }
    return BroadcastManager.instance;
  }

  private setupListeners() {
    this.channel.onmessage = async (event: MessageEvent<BroadcastMessage>) => {
      const { type, payload } = event.data;
      const currentActiveWorkspaceId =
        useWorkspaceStore.getState().activeWorkspaceId;

      switch (type) {
        case "WORKSPACE_STATE_UPDATED":
          // Apply update only if it's for the workspace currently active in THIS tab
          if (payload.workspaceId === currentActiveWorkspaceId) {
            if (payload.tabs) {
              useTabsStore.setState({ tabs: payload.tabs });
            }
            if (payload.splitView) {
              const svWithHistory = {
                ...payload.splitView,
                leftTabHistory: payload.splitView.leftTabHistory || [],
                rightTabHistory: payload.splitView.rightTabHistory || [],
              };
              useSplitViewStore.setState({ splitView: svWithHistory });
            }
          }
          break;

        case "WORKSPACE_LIST_UPDATED":
          // Always update the list of available workspaces
          useWorkspaceStore.setState((state) => ({
            ...state,
            workspaces: payload.workspaces,
          }));
          // If the currently active workspace in this tab no longer exists in the new list,
          // this tab needs to decide what to do (e.g., switch to default, show welcome screen).
          // This case is better handled by WORKSPACE_DELETED if that's the cause.
          // For renames, the ID remains, so activeWorkspaceId is still valid.
          break;

        case "WORKSPACE_DELETED":
          const WStore = useWorkspaceStore.getState();
          const updatedWorkspaces = WStore.workspaces.filter(
            (ws) => ws.id !== payload.deletedWorkspaceId,
          );
          useWorkspaceStore.setState({ workspaces: updatedWorkspaces });

          if (currentActiveWorkspaceId === payload.deletedWorkspaceId) {
            // The workspace active in THIS tab was deleted.
            // THIS tab needs to decide what to do.
            // Option: Switch to the first available workspace or a "default" or clear.
            let newActiveId: string | null = null;
            if (updatedWorkspaces.length > 0) {
              // e.g., switch to the most recently accessed of the remaining
              const sortedRemaining = [...updatedWorkspaces].sort(
                (a, b) => b.lastAccessed - a.lastAccessed,
              );
              newActiveId = sortedRemaining[0].id;
            }

            if (newActiveId) {
              // Use the local switchWorkspace. It should NOT rebroadcast if it knows
              // it's being called reactively.
              WStore.switchWorkspace(newActiveId).catch((err) =>
                console.error(
                  "Error auto-switching workspace after delete:",
                  err,
                ),
              );
            } else {
              // No workspaces left, clear out state to show welcome screen
              useWorkspaceStore.setState({
                workspaces: [],
                activeWorkspaceId: null,
              });
              useTabsStore.setState({ tabs: [] });
              useSplitViewStore.setState({
                splitView: useSplitViewStore
                  .getState()
                  .createDefaultSplitViewState(),
              });
            }
          }
          break;

        case "REQUEST_FULL_SYNC":
          // Another tab is requesting the current state.
          // Only respond if this tab has meaningful state.
          if (
            payload.senderId !== this.tabInstanceId &&
            useWorkspaceStore.getState().activeWorkspaceId
          ) {
            const WsState = useWorkspaceStore.getState();
            const TState = useTabsStore.getState();
            const SpState = useSplitViewStore.getState();
            this.channel.postMessage({
              type: "FULL_SYNC_RESPONSE",
              payload: {
                workspaces: WsState.workspaces,
                activeWorkspaceId: WsState.activeWorkspaceId,
                tabs: prepareTabsForBroadcast(TState.tabs),
                splitView: SpState.splitView, // this is splitView for WsState.activeWorkspaceId
                recipientId: payload.senderId,
              },
            });
          }
          break;

        case "FULL_SYNC_RESPONSE":
          // This tab (which sent REQUEST_FULL_SYNC) received a response.
          if (payload.recipientId === this.tabInstanceId) {
            // CRITICAL: Don't process FULL_SYNC_RESPONSE if we're handling a share URL
            // The share URL processing creates a tab that would be overwritten by this sync
            if (this.skipFullSyncResponse) {
              break;
            }

            // Apply the full state. This is typically for initial load.
            useWorkspaceStore.setState({
              workspaces: payload.workspaces,
              // activeWorkspaceId: payload.activeWorkspaceId, // Let local switchWorkspace handle this
            });
            // IMPORTANT: The new tab should now try to activate the `payload.activeWorkspaceId`
            // from the other tab, or its own last known active, or a default.
            // It should *not* blindly adopt the other tab's active workspace if it has its own preference.
            // For simplicity on first load, it might adopt it.
            if (payload.activeWorkspaceId) {
              // If this tab has no active workspace yet, adopt the sender's
              if (!useWorkspaceStore.getState().activeWorkspaceId) {
                useWorkspaceStore
                  .getState()
                  .switchWorkspace(payload.activeWorkspaceId)
                  .then(() => {
                    // The switchWorkspace should load its own tabs/splitview.
                    // If the FULL_SYNC_RESPONSE's tabs/splitview are guaranteed
                    // to be for payload.activeWorkspaceId, we can apply them directly
                    // AFTER switchWorkspace has potentially cleared things.
                    useTabsStore.setState({ tabs: payload.tabs });
                    useSplitViewStore.setState({
                      splitView: payload.splitView,
                    });
                  })
                  .catch((err) =>
                    console.error(
                      "Error init-switching workspace from sync:",
                      err,
                    ),
                  );
              }
            } else {
              // If the responding tab had no active workspace (e.g., it was also new)
              useWorkspaceStore.getState().ensureWorkspace(); // Ensure this tab has a workspace
            }
          }
          break;

        case "WORKSPACE_TABS_METADATA_UPDATED":
          // Update sidebar metadata cache for the specified workspace
          const { useSidebarStore } = await import("./sidebarStore");
          useSidebarStore.getState().handleMetadataUpdate(
            payload.workspaceId,
            payload.tabsMetadata
          );
          break;
      }
    };
  }

  initialize() {
    if (this.isInitialized) return;
    // When a new tab initializes, it requests the current state from any other open tab.
    this.channel.postMessage({
      type: "REQUEST_FULL_SYNC",
      payload: { senderId: this.tabInstanceId },
    });
    this.isInitialized = true;
  }

  // Broadcasts changes specific to ONE workspace
  broadcastWorkspaceState(
    workspaceId: string,
    state: {
      tabs?: Tab[];
      splitView?: SplitViewState;
    },
  ) {
    this.channel.postMessage({
      type: "WORKSPACE_STATE_UPDATED",
      payload: {
        workspaceId,
        tabs: state.tabs ? prepareTabsForBroadcast(state.tabs) : undefined,
        splitView: state.splitView,
      },
    });
  }

  // Broadcasts changes to the overall list of workspaces
  broadcastWorkspaceList(workspaces: Workspace[], updatedWorkspaceId?: string) {
    this.channel.postMessage({
      type: "WORKSPACE_LIST_UPDATED",
      payload: {
        workspaces,
        updatedWorkspaceId,
      },
    });
  }

  // Broadcasts that a workspace was deleted
  broadcastWorkspaceDeletion(deletedWorkspaceId: string) {
    this.channel.postMessage({
      type: "WORKSPACE_DELETED",
      payload: { deletedWorkspaceId },
    });
  }

  // Broadcasts tab metadata updates for a workspace (for sidebar sync)
  broadcastWorkspaceTabsMetadata(
    workspaceId: string,
    tabsMetadata: SidebarTabInfo[]
  ) {
    this.channel.postMessage({
      type: "WORKSPACE_TABS_METADATA_UPDATED",
      payload: {
        workspaceId,
        tabsMetadata,
      },
    });
  }

  // Set flag to skip FULL_SYNC_RESPONSE processing (used when processing share URLs)
  setSkipFullSyncResponse(skip: boolean) {
    this.skipFullSyncResponse = skip;
  }

  cleanup() {
    this.channel.close();
  }
}

export const broadcastManager = BroadcastManager.getInstance();
