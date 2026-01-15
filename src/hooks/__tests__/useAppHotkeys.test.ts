/**
 * Tests for useAppHotkeys hook
 *
 * Verifies:
 * - handleKeyboardCloseConfirmation sets state correctly
 * - handleKeyboardCloseConfirm closes the dialog and triggers close
 * - handleKeyboardCloseCancel closes the dialog
 */

import { renderHook, act } from "@testing-library/react";
import { useAppHotkeys } from "../useAppHotkeys";

// Mock dependencies
jest.mock("../useGlobalHotkeys", () => ({
  useGlobalHotkeys: jest.fn(),
}));

jest.mock("../../stores/rootStore", () => ({
  useRootStore: jest.fn(),
}));

jest.mock("zustand/traditional", () => ({
  useStoreWithEqualityFn: jest.fn().mockReturnValue({ removeTab: jest.fn() }),
}));

describe("useAppHotkeys", () => {
  let mockRemoveTab: jest.Mock;
  let capturedOnKeyboardCloseConfirmation: ((tabId: string, tabTitle: string) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnKeyboardCloseConfirmation = null;
    mockRemoveTab = jest.fn();

    // Mock useStoreWithEqualityFn to return removeTab
    const { useStoreWithEqualityFn } = require("zustand/traditional");
    useStoreWithEqualityFn.mockReturnValue({ removeTab: mockRemoveTab });

    // Capture the callback passed to useGlobalHotkeys
    const { useGlobalHotkeys } = require("../useGlobalHotkeys");
    useGlobalHotkeys.mockImplementation((params: { onKeyboardCloseConfirmation: (tabId: string, tabTitle: string) => void }) => {
      capturedOnKeyboardCloseConfirmation = params.onKeyboardCloseConfirmation;
    });
  });

  describe("initial state", () => {
    it("should have null keyboardCloseConfirmation initially", () => {
      const { result } = renderHook(() => useAppHotkeys());

      expect(result.current.keyboardCloseConfirmation).toBeNull();
    });
  });

  describe("handleKeyboardCloseConfirmation", () => {
    it("should set confirmation state when triggered via useGlobalHotkeys callback", () => {
      const { result } = renderHook(() => useAppHotkeys());

      // Verify the callback was captured
      expect(capturedOnKeyboardCloseConfirmation).not.toBeNull();

      // Simulate the callback being called (as would happen from a keyboard shortcut)
      act(() => {
        capturedOnKeyboardCloseConfirmation!("test-tab-id", "Test Tab Title");
      });

      expect(result.current.keyboardCloseConfirmation).toEqual({
        isOpen: true,
        tabId: "test-tab-id",
        tabTitle: "Test Tab Title",
      });
    });
  });

  describe("handleKeyboardCloseConfirm", () => {
    it("should close the tab and clear confirmation state", () => {
      const { result } = renderHook(() => useAppHotkeys());

      // First, trigger the confirmation
      act(() => {
        capturedOnKeyboardCloseConfirmation!("test-tab-id", "Test Tab Title");
      });

      // Verify confirmation is set
      expect(result.current.keyboardCloseConfirmation).not.toBeNull();

      // Now confirm the close
      act(() => {
        result.current.handleKeyboardCloseConfirm();
      });

      // Should have called removeTab with the tab ID
      expect(mockRemoveTab).toHaveBeenCalledWith("test-tab-id");

      // Should have cleared the confirmation state
      expect(result.current.keyboardCloseConfirmation).toBeNull();
    });

    it("should do nothing if no confirmation is pending", () => {
      const { result } = renderHook(() => useAppHotkeys());

      // Try to confirm without setting up confirmation first
      act(() => {
        result.current.handleKeyboardCloseConfirm();
      });

      // removeTab should not have been called
      expect(mockRemoveTab).not.toHaveBeenCalled();
    });
  });

  describe("handleKeyboardCloseCancel", () => {
    it("should clear confirmation state without closing the tab", () => {
      const { result } = renderHook(() => useAppHotkeys());

      // First, trigger the confirmation
      act(() => {
        capturedOnKeyboardCloseConfirmation!("test-tab-id", "Test Tab Title");
      });

      // Verify confirmation is set
      expect(result.current.keyboardCloseConfirmation).not.toBeNull();

      // Now cancel
      act(() => {
        result.current.handleKeyboardCloseCancel();
      });

      // Should NOT have called removeTab
      expect(mockRemoveTab).not.toHaveBeenCalled();

      // Should have cleared the confirmation state
      expect(result.current.keyboardCloseConfirmation).toBeNull();
    });
  });
});
