import { create } from 'zustand';

interface QueryPanelState {
  isQueryPanelOpen: boolean;
  toggleQueryPanel: () => void;
  openQueryPanel: () => void;
  closeQueryPanel: () => void;
}

/**
 * Store to manage the JSON Query Panel's open/closed state
 */
export const useQueryPanelStore = create<QueryPanelState>((set) => ({
  isQueryPanelOpen: false,

  toggleQueryPanel: () => set((state) => ({
    isQueryPanelOpen: !state.isQueryPanelOpen
  })),

  openQueryPanel: () => set({ isQueryPanelOpen: true }),

  closeQueryPanel: () => set({ isQueryPanelOpen: false }),
}));
