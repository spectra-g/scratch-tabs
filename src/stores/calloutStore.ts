import { create } from 'zustand';
import { SmartView } from '../views/registry';

interface CalloutState {
  isVisible: boolean;
  tabId: string | null;
  view: SmartView | null;
  languageId: string | null;
  showCallout: (tabId: string, view: SmartView, languageId: string) => void;
  hideCallout: () => void;
}

export const useCalloutStore = create<CalloutState>((set) => ({
  isVisible: false,
  tabId: null,
  view: null,
  languageId: null,
  showCallout: (tabId, view, languageId) => set({ isVisible: true, tabId, view, languageId }),
  hideCallout: () => set({ isVisible: false, tabId: null, view: null, languageId: null }),
}));
