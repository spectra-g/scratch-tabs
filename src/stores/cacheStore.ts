import { create } from "zustand";
import { SplitViewRecord } from "../types";

interface CacheStore {
  // Split view cache for recent move operations
  cachedSplitView: {
    workspaceId: string;
    splitView: SplitViewRecord;
  } | null;

  // Actions
  cacheSplitViewForWorkspace: (
    workspaceId: string,
    splitView: SplitViewRecord,
  ) => void;
  clearCachedSplitView: () => void;
}

export const useCacheStore = create<CacheStore>((set) => ({
  cachedSplitView: null,

  cacheSplitViewForWorkspace: (workspaceId, splitView) => {
    set({
      cachedSplitView: {
        workspaceId,
        splitView: {
          ...splitView,
          activeSide: splitView.activeSide as "left" | "right" | null,
        },
      },
    });
  },

  clearCachedSplitView: () => {
    set({ cachedSplitView: null });
  },
}));
