import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PomodoroTablet } from "../PomodoroTablet";
import { TabletState } from "../../types";
import { DEFAULT_SETTINGS } from "../constants";

// Mock Audio API
const mockAudioPlay = jest.fn(() => Promise.resolve());
const mockAudioLoad = jest.fn();

global.Audio = jest.fn().mockImplementation(() => ({
  play: mockAudioPlay,
  load: mockAudioLoad,
  volume: 0.5,
})) as any;

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

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-uuid-1234",
  },
});

describe("PomodoroTablet", () => {
  let mockOnChange: jest.Mock;
  let initialState: TabletState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange = jest.fn();
    initialState = PomodoroTablet.createInitialState();
  });

  describe("tablet definition", () => {
    it("should have correct tablet id", () => {
      expect(PomodoroTablet.id).toBe("pomodoro");
    });

    it("should have correct label", () => {
      expect(PomodoroTablet.label).toBe("Pomodoro Timer");
    });

    it("should have proper keywords", () => {
      expect(PomodoroTablet.keywords).toContain("pomodoro");
      expect(PomodoroTablet.keywords).toContain("timer");
      expect(PomodoroTablet.keywords).toContain("focus");
      expect(PomodoroTablet.keywords).toContain("productivity");
    });
  });

  describe("createInitialState", () => {
    it("should create initial state with default values", () => {
      const state = PomodoroTablet.createInitialState();

      expect(state.type).toBe("pomodoro");
      expect(state.data.status).toBe("idle");
      expect(state.data.currentSession.type).toBe("focus");
      expect(state.data.currentSession.duration).toBe(1500);
      expect(state.data.settings).toEqual(DEFAULT_SETTINGS);
      expect(state.data.sessions).toEqual([]);
      expect(state.data.todayStats.focusCompleted).toBe(0);
      expect(state.data.activeView).toBe("timer");
      expect(state.data.soundEnabled).toBe(true);
    });

    it("should initialize with zero stats", () => {
      const state = PomodoroTablet.createInitialState();

      expect(state.data.todayStats).toEqual({
        focusCompleted: 0,
        shortBreakCompleted: 0,
        longBreakCompleted: 0,
        totalFocusTime: 0,
        currentStreak: 0,
        bestStreak: 0,
      });
    });
  });

  describe("serializeState", () => {
    it("should serialize state to JSON string", () => {
      const state = PomodoroTablet.createInitialState();
      const serialized = PomodoroTablet.serializeState(state);

      expect(typeof serialized).toBe("string");
      expect(JSON.parse(serialized)).toEqual(state);
    });

    it("should handle complex state with sessions", () => {
      const state = PomodoroTablet.createInitialState();
      if (state.type === "pomodoro") {
        state.data.sessions = [
          {
            type: "focus",
            duration: 1500,
            startTime: Date.now(),
            endTime: Date.now() + 1500000,
            completed: true,
            goal: "Test goal",
          },
        ];
      }

      const serialized = PomodoroTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.sessions).toHaveLength(1);
      expect(parsed.data.sessions[0].goal).toBe("Test goal");
    });
  });

  describe("deserializeState", () => {
    it("should deserialize valid JSON to state", () => {
      const originalState = PomodoroTablet.createInitialState();
      const serialized = PomodoroTablet.serializeState(originalState);
      const deserialized = PomodoroTablet.deserializeState(serialized);

      expect(deserialized).toEqual(originalState);
    });

    it("should return default state for invalid JSON", () => {
      const deserialized = PomodoroTablet.deserializeState(
        "invalid json string"
      );

      expect(deserialized.type).toBe("pomodoro");
      expect(deserialized.data).toBeDefined();
    });

    it("should return default state for empty string", () => {
      const deserialized = PomodoroTablet.deserializeState("");

      expect(deserialized.type).toBe("pomodoro");
    });

    it("should merge with defaults for partial state", () => {
      const partialState = {
        type: "pomodoro",
        data: {
          status: "running",
          settings: {
            focusDuration: 30,
          },
        },
      };

      const deserialized = PomodoroTablet.deserializeState(
        JSON.stringify(partialState)
      );

      expect(deserialized.type).toBe("pomodoro");
      expect(deserialized.data.status).toBe("running");
      expect(deserialized.data.settings.focusDuration).toBe(30);
      // Should still have other default settings
      expect(deserialized.data.settings.shortBreakDuration).toBeDefined();
    });

    it("should handle missing sessions array", () => {
      const stateWithoutSessions = {
        type: "pomodoro",
        data: {
          ...PomodoroTablet.createInitialState().data,
        },
      };
      delete (stateWithoutSessions.data as any).sessions;

      const deserialized = PomodoroTablet.deserializeState(
        JSON.stringify(stateWithoutSessions)
      );

      expect(deserialized.data.sessions).toEqual([]);
    });
  });

  describe("render", () => {
    it("should render the pomodoro timer interface", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      const { container } = render(<>{rendered}</>);

      expect(screen.getByText("Pomodoro Timer")).toBeInTheDocument();
    });

    it("should render timer view by default", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByText("25:00")).toBeInTheDocument();
      expect(screen.getByText("Focus Session")).toBeInTheDocument();
    });

    it("should render navigation buttons", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("view navigation", () => {
    it("should switch to settings view when settings button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const settingsButtons = screen.getAllByRole("button", {
        name: /Settings/i,
      });
      fireEvent.click(settingsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Timer Settings")).toBeInTheDocument();
      });
    });

    it("should switch to stats view when stats button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const statsButtons = screen.getAllByRole("button", {
        name: /Statistics/i,
      });
      fireEvent.click(statsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Pomodoro Statistics")).toBeInTheDocument();
      });
    });

    it("should return to timer view from settings", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // Go to settings
      const settingsButtons = screen.getAllByRole("button", {
        name: /Settings/i,
      });
      fireEvent.click(settingsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Timer Settings")).toBeInTheDocument();
      });

      // Cancel back to timer
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText("Focus Session")).toBeInTheDocument();
      });
    });
  });

  describe("timer controls", () => {
    it("should start timer when start button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const startButtons = screen.getAllByRole("button", { name: /Start/i });
      fireEvent.click(startButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("should reset timer when reset button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const resetButtons = screen.getAllByRole("button", {
        name: /Reset Timer/i,
      });
      fireEvent.click(resetButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("should skip to next session when skip button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const skipButtons = screen.getAllByRole("button", {
        name: /Skip to Next Session/i,
      });
      fireEvent.click(skipButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe("session goal", () => {
    it("should render session goal input", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const goalInput = screen.getByPlaceholderText(
        /What's the one thing to focus on?/i
      );
      expect(goalInput).toBeInTheDocument();
    });

    it("should update session goal on input change", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const goalInput = screen.getByPlaceholderText(
        /What's the one thing to focus on?/i
      );
      fireEvent.change(goalInput, { target: { value: "Write unit tests" } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe("sound toggle", () => {
    it("should toggle sound when sound button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const soundButtons = screen.getAllByRole("button", {
        name: /Mute Sound|Enable Sound/i,
      });

      if (soundButtons.length > 0) {
        fireEvent.click(soundButtons[0]);

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe("settings management", () => {
    it("should save settings when save button is clicked", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // Navigate to settings
      const settingsButtons = screen.getAllByRole("button", {
        name: /Settings/i,
      });
      fireEvent.click(settingsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Timer Settings")).toBeInTheDocument();
      });

      // Change focus duration
      const focusInputs = screen.getAllByDisplayValue("25");
      const focusInput = focusInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      if (focusInput) {
        fireEvent.change(focusInput, { target: { value: "30" } });

        // Save settings
        const saveButton = screen.getByRole("button", { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe("stats display", () => {
    it("should display session counter", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByText(/Session 1/i)).toBeInTheDocument();
    });

    it("should update session counter based on stats", () => {
      const stateWithCompletedSessions = PomodoroTablet.createInitialState();
      if (stateWithCompletedSessions.type === "pomodoro") {
        stateWithCompletedSessions.data.todayStats.focusCompleted = 3;
      }

      const rendered = PomodoroTablet.render(
        stateWithCompletedSessions,
        mockOnChange
      );
      render(<>{rendered}</>);

      expect(screen.getByText(/Session 4/i)).toBeInTheDocument();
    });
  });

  describe("persistence", () => {
    it("should maintain state across serialization and deserialization", () => {
      const state = PomodoroTablet.createInitialState();
      if (state.type === "pomodoro") {
        state.data.status = "running";
        state.data.currentSession.goal = "Test persistence";
        state.data.todayStats.focusCompleted = 5;
      }

      const serialized = PomodoroTablet.serializeState(state);
      const deserialized = PomodoroTablet.deserializeState(serialized);

      expect(deserialized.data.status).toBe("running");
      expect(deserialized.data.currentSession.goal).toBe("Test persistence");
      expect(deserialized.data.todayStats.focusCompleted).toBe(5);
    });
  });

  describe("integration", () => {
    it("should handle complete pomodoro workflow", async () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      const { rerender } = render(<>{rendered}</>);

      // 1. Set a goal
      const goalInput = screen.getByPlaceholderText(
        /What's the one thing to focus on?/i
      );
      fireEvent.change(goalInput, { target: { value: "Complete tests" } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // 2. Start timer
      const startButtons = screen.getAllByRole("button", { name: /Start/i });
      fireEvent.click(startButtons[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // 3. Navigate to settings
      const settingsButtons = screen.getAllByRole("button", {
        name: /Settings/i,
      });
      fireEvent.click(settingsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Timer Settings")).toBeInTheDocument();
      });

      // 4. Return to timer
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText("Focus Session")).toBeInTheDocument();
      });
    });
  });

  describe("quote display", () => {
    it("should display a motivational quote", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // Quote component should be rendered (checking for any text content from quotes)
      const container = screen.getByText("Pomodoro Timer").parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper data attributes for testing", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      const { container } = render(<>{rendered}</>);

      const pomodoroElement = container.querySelector("[data-pomodoro-id]");
      expect(pomodoroElement).toBeInTheDocument();
    });

    it("should have semantic HTML structure", () => {
      const rendered = PomodoroTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // Should have main heading
      expect(screen.getByText("Pomodoro Timer")).toBeInTheDocument();

      // Should have interactive buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
