import { create } from "zustand";

/**
 * Milestone interval - celebration triggers at every N tabs created
 */
const MILESTONE_INTERVAL = 100;

interface MilestoneCelebrationState {
  /** Whether the toast notification is visible */
  isToastOpen: boolean;
  /** Whether the celebration modal is visible */
  isModalOpen: boolean;
  /** The milestone count that triggered the celebration (e.g., 100, 200, 300) */
  milestoneCount: number;
}

interface MilestoneCelebrationActions {
  /** Check if the given total tab count is a milestone and trigger toast if so */
  checkMilestone: (totalTabsCreated: number) => void;
  /** Open the toast notification */
  openToast: (milestoneCount: number) => void;
  /** Close the toast notification */
  closeToast: () => void;
  /** Open the celebration modal */
  openModal: () => void;
  /** Close the celebration modal */
  closeModal: () => void;
  /** Handle toast click - close toast and open modal */
  handleToastClick: () => void;
}

type MilestoneCelebrationStore = MilestoneCelebrationState &
  MilestoneCelebrationActions;

export const useMilestoneCelebrationStore = create<MilestoneCelebrationStore>(
  (set, get) => ({
    // State
    isToastOpen: false,
    isModalOpen: false,
    milestoneCount: 0,

    // Actions
    checkMilestone: (totalTabsCreated: number) => {
      // Check if we've hit a milestone (100, 200, 300, etc.)
      if (
        totalTabsCreated > 0 &&
        totalTabsCreated % MILESTONE_INTERVAL === 0
      ) {
        get().openToast(totalTabsCreated);
      }
    },

    openToast: (milestoneCount: number) => {
      set({ isToastOpen: true, milestoneCount });
    },

    closeToast: () => {
      set({ isToastOpen: false });
    },

    openModal: () => {
      set({ isModalOpen: true });
    },

    closeModal: () => {
      set({ isModalOpen: false, isToastOpen: false });
    },

    handleToastClick: () => {
      set({ isToastOpen: false, isModalOpen: true });
    },
  })
);
