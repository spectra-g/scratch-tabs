import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneToast } from "../MilestoneToast";
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
      onClick?: () => void;
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

describe("MilestoneToast", () => {
  beforeEach(() => {
    // Reset store before each test
    useMilestoneCelebrationStore.setState({
      isToastOpen: false,
      isModalOpen: false,
      milestoneCount: 0,
    });
  });

  describe("Rendering", () => {
    it("should not render when toast is closed", () => {
      render(<MilestoneToast />);

      expect(screen.queryByText(/Tab Milestone/)).not.toBeInTheDocument();
    });

    it("should render when toast is open", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      expect(screen.getByText("100th Tab Milestone!")).toBeInTheDocument();
    });

    it("should display the correct milestone count", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 500,
      });

      render(<MilestoneToast />);

      expect(screen.getByText("500th Tab Milestone!")).toBeInTheDocument();
    });

    it("should display celebration emoji", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      expect(screen.getByRole("img", { name: "celebration" })).toBeInTheDocument();
    });

    it("should have correct accessibility attributes", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      expect(toast).toHaveAttribute(
        "aria-label",
        "100 tabs milestone reached. Click to learn more."
      );
    });
  });

  describe("Interaction", () => {
    it("should call handleToastClick when clicked", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      fireEvent.click(toast);

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.isModalOpen).toBe(true);
    });

    it("should call handleToastClick when Enter key is pressed", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      fireEvent.keyDown(toast, { key: "Enter" });

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.isModalOpen).toBe(true);
    });

    it("should call handleToastClick when Space key is pressed", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      fireEvent.keyDown(toast, { key: " " });

      const state = useMilestoneCelebrationStore.getState();
      expect(state.isToastOpen).toBe(false);
      expect(state.isModalOpen).toBe(true);
    });

    it("should not respond to other keys", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      fireEvent.keyDown(toast, { key: "Escape" });

      const state = useMilestoneCelebrationStore.getState();
      // Toast should still be open
      expect(state.isToastOpen).toBe(true);
      expect(state.isModalOpen).toBe(false);
    });
  });

  describe("Styling", () => {
    it("should have fixed positioning in bottom-right corner", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      expect(toast).toHaveClass("fixed", "bottom-10", "right-6");
    });

    it("should have cursor-pointer class", () => {
      useMilestoneCelebrationStore.setState({
        isToastOpen: true,
        milestoneCount: 100,
      });

      render(<MilestoneToast />);

      const toast = screen.getByRole("button");
      expect(toast).toHaveClass("cursor-pointer");
    });
  });
});
