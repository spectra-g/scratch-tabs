import { create } from "zustand";

interface XmlSmartViewState {
  search: string;
  selectedNodeId: string;
  bottomTab: "diagnostics" | "xpath";
  xpathExpression: string;
  expandedNodeIds: string[];
  treeScrollTop: number;
}

interface XmlSmartViewStore {
  tabs: Record<string, XmlSmartViewState>;
  getStateForTab: (tabId: string) => XmlSmartViewState;
  setSearch: (tabId: string, search: string) => void;
  setSelectedNodeId: (tabId: string, id: string) => void;
  setBottomTab: (tabId: string, tab: "diagnostics" | "xpath") => void;
  setXpathExpression: (tabId: string, expression: string) => void;
  setExpandedNodeIds: (tabId: string, ids: string[]) => void;
  setTreeScrollTop: (tabId: string, scrollTop: number) => void;
  removeTabState: (tabId: string) => void;
}

const defaultState: XmlSmartViewState = {
  search: "",
  selectedNodeId: "node-0",
  bottomTab: "diagnostics",
  xpathExpression: "/*",
  expandedNodeIds: [],
  treeScrollTop: 0,
};

function updateTab(
  state: XmlSmartViewStore,
  tabId: string,
  patch: Partial<XmlSmartViewState>,
): Pick<XmlSmartViewStore, "tabs"> {
  const current = state.tabs[tabId] ?? defaultState;
  return { tabs: { ...state.tabs, [tabId]: { ...current, ...patch } } };
}

export const useXmlSmartViewStore = create<XmlSmartViewStore>((set, get) => ({
  tabs: {},

  getStateForTab: (tabId) => get().tabs[tabId] ?? defaultState,

  setSearch: (tabId, search) => set((s) => updateTab(s, tabId, { search })),
  setSelectedNodeId: (tabId, selectedNodeId) => set((s) => updateTab(s, tabId, { selectedNodeId })),
  setBottomTab: (tabId, bottomTab) => set((s) => updateTab(s, tabId, { bottomTab })),
  setXpathExpression: (tabId, xpathExpression) => set((s) => updateTab(s, tabId, { xpathExpression })),
  setExpandedNodeIds: (tabId, expandedNodeIds) => set((s) => updateTab(s, tabId, { expandedNodeIds })),
  setTreeScrollTop: (tabId, treeScrollTop) => set((s) => updateTab(s, tabId, { treeScrollTop })),

  removeTabState: (tabId) =>
    set((s) => {
      const { [tabId]: _, ...rest } = s.tabs;
      return { tabs: rest };
    }),
}));
