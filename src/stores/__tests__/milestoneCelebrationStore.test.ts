import { describe, it, expect, beforeEach } from "@jest/globals";
import { useMilestoneCelebrationStore } from "../milestoneCelebrationStore";

describe("MilestoneCelebrationStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useMilestoneCelebrationStore.setState({
      isToastOpen: false,
      isModalOpen: false,
      milestoneCount: 0,
    });
  });

  describe("Initial State", () => {
    it("should initialize with toast and modal closed", () => {
      const state = useMilestoneCelebrationStore.getState();

      expect(state.isToastOpen).toBe(false);
      expect(state.isModalOpen).toBe(false);
      expect(state.milestoneCount).toBe(0);
    });
  });

  describe("checkMilestone", () => {
    it("should open toast when count is exactly 100", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(100);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(true);
      expect(state.milestoneCount).toBe(100);
    });

    it("should open toast when count is 200", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(200);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(true);
      expect(state.milestoneCount).toBe(200);
    });

    it("should open toast when count is 1000", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(1000);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(true);
      expect(state.milestoneCount).toBe(1000);
    });

    it("should not open toast when count is 99", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(99);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.milestoneCount).toBe(0);
    });

    it("should not open toast when count is 101", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(101);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.milestoneCount).toBe(0);
    });

    it("should not open toast when count is 0", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(0);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.milestoneCount).toBe(0);
    });

    it("should not open toast for negative numbers", () => {
      const { checkMilestone } = useMilestoneCelebrationStore.getState();

      checkMilestone(-100);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
    });
  });

  describe("openToast", () => {
    it("should open toast and set milestone count", () => {
      const { openToast } = useMilestoneCelebrationStore.getState();

      openToast(500);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(true);
      expect(state.milestoneCount).toBe(500);
    });
  });

  describe("closeToast", () => {
    it("should close the toast", () => {
      // First open the toast
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      const { closeToast } = useMilestoneCelebrationStore.getState();
      closeToast();

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      // Milestone count should remain
      expect(state.milestoneCount).toBe(100);
    });
  });

  describe("openModal", () => {
    it("should open the modal", () => {
      const { openModal } = useMilestoneCelebrationStore.getState();

      openModal();

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(true);
    });
  });

  describe("closeModal", () => {
    it("should close both modal and toast", () => {
      // First open both
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        isModalOpen: true,
        milestoneCount: 100,
      });

      const { closeModal } = useMilestoneCelebrationStore.getState();
      closeModal();

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(false);
      expect(state.isToastOpen).toBe(false);
    });
  });

  describe("handleToastClick", () => {
    it("should close toast and open modal", () => {
      // First open the toast
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      const { handleToastClick } = useMilestoneCelebrationStore.getState();
      handleToastClick();

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.isModalOpen).toBe(true);
      expect(state.milestoneCount).toBe(100);
    });
  });

  describe("Store Subscription", () => {
    it("should notify subscribers when state changes", () => {
      let callbackInvoked = false;
      let capturedState: ReturnType<
        typeof useMilestoneCelebrationStore.getState
      > | null = null;

      const unsubscribe = useMilestoneCelebrationStore.subscribe((state) => {
        callbackInvoked = true;
        capturedState = state;
      });

      useMilestoneCelebrationStore.getState().checkMilestone(100);

      unsubscribe();

      expect(callbackInvoked).toBe(true);
      expect(capturedState?.isToastOpen).toBe(true);
      expect(capturedState?.milestoneCount).toBe(100);
    });
  });

  describe("State Immutability", () => {
    it("should not mutate the state object directly", () => {
      const initialState = useMilestoneCelebrationStore.getState();

      useMilestoneCelebrationStore.getState().openToast(100);

      const newState = useMilestoneCelebrationStore.getState();
      expect(newState).not.toBe(initialState);
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = useMilestoneCelebrationStore.getState();
      const store2 = useMilestoneCelebrationStore.getState();

      expect(store1.checkMilestone).toBe(store2.checkMilestone);
      expect(store1.openToast).toBe(store2.openToast);
      expect(store1.closeToast).toBe(store2.closeToast);
      expect(store1.openModal).toBe(store2.openModal);
      expect(store1.closeModal).toBe(store2.closeModal);
      expect(store1.handleToastClick).toBe(store2.handleToastClick);
    });
  });
});
