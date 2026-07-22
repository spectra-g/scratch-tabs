import { create } from "zustand";

export interface RendererSaveStatus {
  state: "loading" | "saved" | "saving" | "error";
  revision: number;
  scopeLabel: string;
  error?: string;
}

export interface RendererStatusContribution {
  label: string;
  itemCount?: number;
  selectionCount?: number;
  zoomPercent?: number;
  save?: RendererSaveStatus;
}

interface RendererStatusStore {
  contributions: Record<string, RendererStatusContribution>;
  setContribution: (
    tabId: string,
    contribution: RendererStatusContribution,
  ) => void;
  clearContribution: (tabId: string) => void;
}

export const useRendererStatusStore = create<RendererStatusStore>((set) => ({
  contributions: {},
  setContribution: (tabId, contribution) =>
    set((state) => ({
      contributions: {
        ...state.contributions,
        [tabId]: contribution,
      },
    })),
  clearContribution: (tabId) =>
    set((state) => {
      if (!(tabId in state.contributions)) return state;
      const contributions = { ...state.contributions };
      delete contributions[tabId];
      return { contributions };
    }),
}));
