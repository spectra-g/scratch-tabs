import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneModal } from "../MilestoneModal";
import { useMilestoneCelebrationStore } from "../../../stores/milestoneCelebrationStore";

// Mock framer-motion to simplify testing
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      onClick,
      onKeyDown,
      ...props
    }: {
      children: React.ReactNode;
      onClick?: (e: React.MouseEvent) => void;
      onKeyDown?: (e: React.KeyboardEvent) => void;
      [key: string]: unknown;
    }) => (
      <div onClick={onClick} onKeyDown={onKeyDown} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock canvas-confetti
jest.mock("canvas-confetti", () => jest.fn());

// Mock window.open
const mockOpen = jest.fn();
window.open = mockOpen;

describe("MilestoneModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store before each test
    useMilestoneCelebrationStore.setState({
      isToastOpen: false,
      isModalOpen: false,
      milestoneCount: 0,
    });
  });

  describe("Rendering", () => {
    it("should not render when modal is closed", () => {
      render(<MilestoneModal />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render when modal is open", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should display the milestone count prominently", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      // The large milestone count should be displayed with specific styling
      const largeCount = screen.getByText("100", {
        selector: ".text-7xl",
      });
      expect(largeCount).toBeInTheDocument();
    });

    it("should display 'tabs created!' text", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      expect(screen.getByText("tabs created!")).toBeInTheDocument();
    });

    it("should display the descriptive text with dynamic count", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 500,
      });

      render(<MilestoneModal />);

      expect(
        screen.getByText(/Your local browser storage indicates you've created/)
      ).toBeInTheDocument();
      // Check that the count appears in the large display
      const largeCount = screen.getByText("500", {
        selector: ".text-7xl",
      });
      expect(largeCount).toBeInTheDocument();
    });

    it("should display the support message", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      expect(
        screen.getByText(
          /I hope the app has saved you time.*a coffee is always appreciated/
        )
      ).toBeInTheDocument();
    });

    it("should have correct accessibility attributes", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute(
        "aria-labelledby",
        "milestone-modal-title"
      );
    });
  });

  describe("Buttons", () => {
    it("should render Ko-fi support button", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      expect(screen.getByText("Support the Dev (Ko-fi)")).toBeInTheDocument();
    });

    it("should render 'Keep Scratching' button", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      expect(screen.getByText("Keep Scratching")).toBeInTheDocument();
    });

    it("should open Ko-fi URL when support button is clicked", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const supportButton = screen.getByText("Support the Dev (Ko-fi)");
      fireEvent.click(supportButton);

      expect(mockOpen).toHaveBeenCalledWith(
        "https://ko-fi.com/scratchtabs",
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should close modal when 'Keep Scratching' button is clicked", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const keepScratchingButton = screen.getByText("Keep Scratching");
      fireEvent.click(keepScratchingButton);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(false);
    });

    it("should close modal when close button (X) is clicked", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(false);
    });
  });

  describe("Backdrop Interaction", () => {
    it("should close modal when backdrop is clicked", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const backdrop = screen.getByRole("dialog");
      fireEvent.click(backdrop);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(false);
    });

    it("should not close modal when modal content is clicked", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      // Click on the milestone count (inside modal content)
      const content = screen.getByText("100", {
        selector: ".text-7xl",
      });
      fireEvent.click(content);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(true);
    });
  });

  describe("Keyboard Interaction", () => {
    it("should close modal when Escape key is pressed", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const dialog = screen.getByRole("dialog");
      fireEvent.keyDown(dialog, { key: "Escape" });

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(false);
    });

    it("should not close modal on other keys", () => {
      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      const dialog = screen.getByRole("dialog");
      fireEvent.keyDown(dialog, { key: "Enter" });

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isModalOpen).toBe(true);
    });
  });

  describe("Confetti Effect", () => {
    it("should fire confetti when modal opens", async () => {
      const confetti = require("canvas-confetti");

      useMilestoneCelebrationStore.setState({
        isModalOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneModal />);

      // Wait for the confetti to be fired (it's in useEffect)
      await waitFor(() => {
        expect(confetti).toHaveBeenCalled();
      });
    });
  });

  describe("Different Milestone Counts", () => {
    const testCounts = [100, 200, 500, 1000, 10000];

    testCounts.forEach((count) => {
      it(`should display correct content for ${count} tabs milestone`, () => {
        useMilestoneCelebrationStore.setState({
          isModalOpen: true,
          milestoneCount: count,
        });

        render(<MilestoneModal />);

        // Check that the count appears in the large display
        const largeCount = screen.getByText(count.toString(), {
          selector: ".text-7xl",
        });
        expect(largeCount).toBeInTheDocument();
      });
    });
  });
});
