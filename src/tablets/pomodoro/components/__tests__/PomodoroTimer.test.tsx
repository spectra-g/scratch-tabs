import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PomodoroTimer } from "../PomodoroTimer";
import { CurrentSession, TimerStatus } from "../../types";

// Mock canvas context
const mockGetContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "",
}));

HTMLCanvasElement.prototype.getContext = mockGetContext as any;

describe("PomodoroTimer", () => {
  const mockOnStart = jest.fn();
  const mockOnPause = jest.fn();
  const mockOnReset = jest.fn();
  const mockOnSkip = jest.fn();

  const focusSession: CurrentSession = {
    type: "focus",
    duration: 1500, // 25 minutes
    timeRemaining: 1500,
    startTime: 0,
    pauseTime: 0,
    totalPausedTime: 0,
    goal: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render timer display with formatted time", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("25:00")).toBeInTheDocument();
    });

    it("should render session type label for focus session", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Focus Session")).toBeInTheDocument();
    });

    it("should render session type label for short break", () => {
      const shortBreakSession: CurrentSession = {
        ...focusSession,
        type: "shortBreak",
        duration: 300,
        timeRemaining: 300,
      };

      render(
        <PomodoroTimer
          currentSession={shortBreakSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Short Break")).toBeInTheDocument();
    });

    it("should render session type label for long break", () => {
      const longBreakSession: CurrentSession = {
        ...focusSession,
        type: "longBreak",
        duration: 900,
        timeRemaining: 900,
      };

      render(
        <PomodoroTimer
          currentSession={longBreakSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText("Long Break")).toBeInTheDocument();
    });

    it("should render all control buttons", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(
        screen.getByRole("button", { name: /Reset Timer/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Start/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Skip to Next Session/i })
      ).toBeInTheDocument();
    });

    it("should render keyboard shortcuts hint", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText(/Space/i)).toBeInTheDocument();
      expect(screen.getByText(/to start\/pause/i)).toBeInTheDocument();
      expect(screen.getByText("R")).toBeInTheDocument();
      expect(screen.getByText(/to reset/i)).toBeInTheDocument();
      expect(screen.getByText("S")).toBeInTheDocument();
      expect(screen.getByText(/to skip/i)).toBeInTheDocument();
    });
  });

  describe("timer display", () => {
    it("should display correct time format for different durations", () => {
      const testCases = [
        { timeRemaining: 0, expected: "00:00" },
        { timeRemaining: 30, expected: "00:30" },
        { timeRemaining: 60, expected: "01:00" },
        { timeRemaining: 599, expected: "09:59" },
        { timeRemaining: 1500, expected: "25:00" },
      ];

      testCases.forEach(({ timeRemaining, expected }) => {
        const session = { ...focusSession, timeRemaining };
        const { rerender } = render(
          <PomodoroTimer
            currentSession={session}
            status="idle"
            onStart={mockOnStart}
            onPause={mockOnPause}
            onReset={mockOnReset}
            onSkip={mockOnSkip}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        rerender(<div />);
      });
    });
  });

  describe("button interactions", () => {
    it("should call onStart when start button is clicked in idle state", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const startButton = screen.getByRole("button", { name: /Start/i });
      fireEvent.click(startButton);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
      expect(mockOnPause).not.toHaveBeenCalled();
    });

    it("should call onPause when pause button is clicked in running state", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="running"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const pauseButton = screen.getByRole("button", { name: /Pause/i });
      fireEvent.click(pauseButton);

      expect(mockOnPause).toHaveBeenCalledTimes(1);
      expect(mockOnStart).not.toHaveBeenCalled();
    });

    it("should call onStart when start button is clicked in paused state", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="paused"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const startButton = screen.getByRole("button", { name: /Start/i });
      fireEvent.click(startButton);

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it("should call onReset when reset button is clicked", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="running"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const resetButton = screen.getByRole("button", { name: /Reset Timer/i });
      fireEvent.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it("should call onSkip when skip button is clicked", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="running"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const skipButton = screen.getByRole("button", {
        name: /Skip to Next Session/i,
      });
      fireEvent.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe("button states", () => {
    it("should show Play icon when timer is idle", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const startButton = screen.getByRole("button", { name: /Start/i });
      expect(startButton).toBeInTheDocument();
    });

    it("should show Pause icon when timer is running", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="running"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const pauseButton = screen.getByRole("button", { name: /Pause/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it("should show Play icon when timer is paused", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="paused"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const startButton = screen.getByRole("button", { name: /Start/i });
      expect(startButton).toBeInTheDocument();
    });
  });

  describe("canvas rendering", () => {
    it("should render canvas element", () => {
      const { container } = render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
      expect(canvas?.width).toBe(300);
      expect(canvas?.height).toBe(300);
    });

    it("should call canvas drawing methods when rendering timer", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(mockGetContext).toHaveBeenCalled();
    });

    it("should re-render canvas when time remaining changes", () => {
      const { rerender } = render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const initialCallCount = mockGetContext.mock.calls.length;

      const updatedSession = {
        ...focusSession,
        timeRemaining: 1400,
      };

      rerender(
        <PomodoroTimer
          currentSession={updatedSession}
          status="running"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      expect(mockGetContext.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  describe("session type colors", () => {
    it("should apply blue color class for focus session", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const timeDisplay = screen.getByText("25:00");
      expect(timeDisplay).toHaveClass("text-blue-400");
    });

    it("should apply green color class for short break", () => {
      const shortBreakSession: CurrentSession = {
        ...focusSession,
        type: "shortBreak",
        duration: 300,
        timeRemaining: 300,
      };

      render(
        <PomodoroTimer
          currentSession={shortBreakSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const timeDisplay = screen.getByText("05:00");
      expect(timeDisplay).toHaveClass("text-green-400");
    });

    it("should apply purple color class for long break", () => {
      const longBreakSession: CurrentSession = {
        ...focusSession,
        type: "longBreak",
        duration: 900,
        timeRemaining: 900,
      };

      render(
        <PomodoroTimer
          currentSession={longBreakSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const timeDisplay = screen.getByText("15:00");
      expect(timeDisplay).toHaveClass("text-purple-400");
    });
  });

  describe("accessibility", () => {
    it("should have proper button titles", () => {
      render(
        <PomodoroTimer
          currentSession={focusSession}
          status="idle"
          onStart={mockOnStart}
          onPause={mockOnPause}
          onReset={mockOnReset}
          onSkip={mockOnSkip}
        />
      );

      const startButton = screen.getByRole("button", { name: /Start/i });
      expect(startButton).toHaveAttribute("title");

      const resetButton = screen.getByRole("button", { name: /Reset Timer/i });
      expect(resetButton).toHaveAttribute("title");

      const skipButton = screen.getByRole("button", {
        name: /Skip to Next Session/i,
      });
      expect(skipButton).toHaveAttribute("title");
    });
  });
});
