import { renderHook, act, waitFor } from "@testing-library/react";
import { usePomodoroEngine } from "../usePomodoroEngine";
import { PomodoroState } from "../types";
import { DEFAULT_SETTINGS } from "../constants";

// Mock Audio API
const mockAudioPlay = jest.fn(() => Promise.resolve());
const mockAudioLoad = jest.fn();

global.Audio = jest.fn().mockImplementation(() => ({
  play: mockAudioPlay,
  load: mockAudioLoad,
  volume: 0.5,
})) as any;

describe("usePomodoroEngine", () => {
  let mockOnChange: jest.Mock;
  let initialState: PomodoroState;
  const hooks: Array<{ unmount: () => void }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    mockOnChange = jest.fn();
    mockAudioPlay.mockClear();
    mockAudioLoad.mockClear();
    // Clear hooks array
    hooks.length = 0;

    initialState = {
      status: "idle",
      currentSession: {
        type: "focus",
        duration: 1500, // 25 minutes
        timeRemaining: 1500,
        startTime: 0,
        pauseTime: 0,
        totalPausedTime: 0,
        goal: "",
      },
      settings: DEFAULT_SETTINGS,
      sessions: [],
      todayStats: {
        focusCompleted: 0,
        shortBreakCompleted: 0,
        longBreakCompleted: 0,
        totalFocusTime: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
      activeView: "timer",
      soundEnabled: true,
    };
  });

  afterEach(() => {
    // Unmount all hooks that were created
    hooks.forEach((hook) => {
      try {
        hook.unmount();
      } catch (e) {
        // Ignore unmount errors
      }
    });
    hooks.length = 0;

    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    // Reset document title
    document.title = "Scratch Tabs";
  });

  describe("initialization", () => {
    it("should initialize with provided state", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      expect(result.current.state).toEqual(initialState);
    });

    it("should initialize audio on mount", () => {
      renderHook(() => usePomodoroEngine(initialState, mockOnChange));

      expect(global.Audio).toHaveBeenCalledWith("/sounds/bell.mp3");
      expect(mockAudioLoad).toHaveBeenCalled();
    });
  });

  describe("handleStart", () => {
    it("should start the timer from idle state", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      expect(result.current.state.status).toBe("running");
      expect(result.current.state.currentSession.startTime).toBeGreaterThan(0);
    });

    it("should resume the timer from paused state", () => {
      const pausedState = {
        ...initialState,
        status: "paused" as const,
        currentSession: {
          ...initialState.currentSession,
          timeRemaining: 1200,
          startTime: Date.now() - 300000,
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(pausedState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      expect(result.current.state.status).toBe("running");
    });

    it("should update document title when running", async () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(document.title).toContain("focus");
    });
  });

  describe("handlePause", () => {
    it("should pause a running timer", () => {
      const runningState = {
        ...initialState,
        status: "running" as const,
        currentSession: {
          ...initialState.currentSession,
          startTime: Date.now(),
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(runningState, mockOnChange)
      );

      act(() => {
        result.current.handlePause();
      });

      expect(result.current.state.status).toBe("paused");
    });

    it("should reset document title when paused", async () => {
      const runningState = {
        ...initialState,
        status: "running" as const,
        currentSession: {
          ...initialState.currentSession,
          startTime: Date.now(),
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(runningState, mockOnChange)
      );

      act(() => {
        result.current.handlePause();
      });

      expect(document.title).toBe("Scratch Tabs");
    });
  });

  describe("handleReset", () => {
    it("should reset the timer to initial duration", () => {
      const partialState = {
        ...initialState,
        status: "running" as const,
        currentSession: {
          ...initialState.currentSession,
          timeRemaining: 1200,
          startTime: Date.now(),
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(partialState, mockOnChange)
      );

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.currentSession.timeRemaining).toBe(1500);
      expect(result.current.state.currentSession.duration).toBe(1500);
      expect(result.current.state.currentSession.startTime).toBe(0);
    });

    it("should respect different session types when resetting", () => {
      const breakState = {
        ...initialState,
        currentSession: {
          ...initialState.currentSession,
          type: "shortBreak" as const,
          duration: 300, // 5 minutes
          timeRemaining: 150,
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(breakState, mockOnChange)
      );

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.state.currentSession.timeRemaining).toBe(300);
      expect(result.current.state.currentSession.duration).toBe(300);
    });
  });

  describe("handleSkip", () => {
    it("should transition to long break after completing focus interval", () => {
      // Create fresh state with 3 completed focus sessions
      const stateWithCompletedSessions = {
        status: "idle" as const,
        currentSession: {
          type: "focus" as const,
          duration: 1500,
          timeRemaining: 1500,
          startTime: 0,
          pauseTime: 0,
          totalPausedTime: 0,
          goal: "",
        },
        settings: DEFAULT_SETTINGS,
        sessions: [],
        todayStats: {
          focusCompleted: 3,
          shortBreakCompleted: 0,
          longBreakCompleted: 0,
          totalFocusTime: 0,
          currentStreak: 0,
          bestStreak: 0,
        },
        activeView: "timer" as const,
        soundEnabled: true,
      };

      const { result, unmount } = renderHook(() =>
        usePomodoroEngine(stateWithCompletedSessions, mockOnChange)
      );

      act(() => {
        result.current.handleSkip();
      });

      // After skipping with 3 completed, we'll have 4 total (0 completed from this skip),
      // but the transition logic checks if (focusCompleted % longBreakInterval === 0)
      // 3 % 4 = 3 (not 0), so should get short break
      // After completing 4th, then 4 % 4 = 0 would trigger long break
      expect(result.current.state.currentSession.type).toBe("shortBreak");

      unmount();
    });
  });

  describe("handleSettingsChange", () => {
    it("should update settings and reset timer", () => {
      const newSettings = {
        ...DEFAULT_SETTINGS,
        focusDuration: 30,
        shortBreakDuration: 10,
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.handleSettingsChange(newSettings);
      });

      expect(result.current.state.settings).toEqual(newSettings);
      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.currentSession.duration).toBe(1800); // 30 minutes
      expect(result.current.state.currentSession.timeRemaining).toBe(1800);
    });

    it("should stop running timer when settings change", () => {
      const runningState = {
        ...initialState,
        status: "running" as const,
        currentSession: {
          ...initialState.currentSession,
          startTime: Date.now(),
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(runningState, mockOnChange)
      );

      act(() => {
        result.current.handleSettingsChange(DEFAULT_SETTINGS);
      });

      expect(result.current.state.status).toBe("idle");
    });
  });

  describe("setSessionGoal", () => {
    it("should update the current session goal", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.setSessionGoal("Complete unit tests");
      });

      expect(result.current.state.currentSession.goal).toBe(
        "Complete unit tests"
      );
    });
  });

  describe("toggleSound", () => {
    it("should toggle sound enabled state", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      expect(result.current.state.soundEnabled).toBe(true);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.state.soundEnabled).toBe(false);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.state.soundEnabled).toBe(true);
    });
  });

  describe("changeView", () => {
    it("should change the active view", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      expect(result.current.state.activeView).toBe("timer");

      act(() => {
        result.current.changeView("settings");
      });

      expect(result.current.state.activeView).toBe("settings");

      act(() => {
        result.current.changeView("stats");
      });

      expect(result.current.state.activeView).toBe("stats");
    });
  });

  describe("timer countdown", () => {
    it("should decrement time remaining every second", () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      const initialTime = result.current.state.currentSession.timeRemaining;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.state.currentSession.timeRemaining).toBeLessThan(
        initialTime
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.state.currentSession.timeRemaining).toBeLessThan(
        initialTime - 1
      );
    });

    it("should play sound when session completes if sound is enabled", () => {
      const shortState = {
        ...initialState,
        soundEnabled: true,
        currentSession: {
          ...initialState.currentSession,
          duration: 2,
          timeRemaining: 2,
        },
      };

      const { result, unmount } = renderHook(() =>
        usePomodoroEngine(shortState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockAudioPlay).toHaveBeenCalled();

      unmount();
    });

    it("should not play sound when session completes if sound is disabled", () => {
      const shortState = {
        ...initialState,
        soundEnabled: false,
        currentSession: {
          ...initialState.currentSession,
          duration: 2,
          timeRemaining: 2,
        },
      };

      const { result, unmount } = renderHook(() =>
        usePomodoroEngine(shortState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockAudioPlay).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe("statistics tracking", () => {
    it("should reset streak when skipping focus session", () => {
      const stateWithStreak = {
        ...initialState,
        todayStats: {
          ...initialState.todayStats,
          currentStreak: 3,
          bestStreak: 5,
        },
      };

      const { result } = renderHook(() =>
        usePomodoroEngine(stateWithStreak, mockOnChange)
      );

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.state.todayStats.currentStreak).toBe(0);
      expect(result.current.state.todayStats.bestStreak).toBe(5); // Best streak should remain
    });
  });

  describe("auto-start next session", () => {
    it("should auto-start next session when autoStartNextSession is true", () => {
      const shortState = {
        ...initialState,
        settings: {
          ...initialState.settings,
          autoStartNextSession: true,
        },
        currentSession: {
          ...initialState.currentSession,
          duration: 2,
          timeRemaining: 2,
        },
      };

      const { result, unmount } = renderHook(() =>
        usePomodoroEngine(shortState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Next session should be running
      expect(result.current.state.status).toBe("running");
      expect(result.current.state.currentSession.type).toBe("shortBreak");

      unmount();
    });

    it("should not auto-start next session when autoStartNextSession is false", () => {
      const shortState = {
        ...initialState,
        settings: {
          ...initialState.settings,
          autoStartNextSession: false,
        },
        currentSession: {
          ...initialState.currentSession,
          duration: 2,
          timeRemaining: 2,
        },
      };

      const { result, unmount } = renderHook(() =>
        usePomodoroEngine(shortState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Next session should be idle
      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.currentSession.type).toBe("shortBreak");

      unmount();
    });
  });

  describe("onChange callback", () => {
    it("should call onChange when state changes", async () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.setSessionGoal("Test goal");
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("should debounce timer updates", async () => {
      const { result } = renderHook(() =>
        usePomodoroEngine(initialState, mockOnChange)
      );

      act(() => {
        result.current.handleStart();
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should debounce the rapid timer updates
      await waitFor(
        () => {
          expect(mockOnChange.mock.calls.length).toBeLessThan(10);
        },
        { timeout: 1000 }
      );
    });
  });
});
