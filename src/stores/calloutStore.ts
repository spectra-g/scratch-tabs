import { create } from 'zustand';
import { SmartView } from '../views/registry';

interface CalloutState {
  isVisible: boolean;
  tabId: string | null;
  view: SmartView | null;
  showCallout: (tabId: string, view: SmartView) => void;
  hideCallout: () => void;
}

export const useCalloutStore = create<CalloutState>((set) => ({
  isVisible: false,
  tabId: null,
  view: null,
  showCallout: (tabId, view) => set({ isVisible: true, tabId, view }),
  hideCallout: () => set({ isVisible: false, tabId: null, view: null }),
}));
