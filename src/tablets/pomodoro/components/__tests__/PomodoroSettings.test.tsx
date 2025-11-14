import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import { PomodoroSettings } from "../PomodoroSettings";
import { PomodoroSettings as SettingsType } from "../../types";

describe("PomodoroSettings", () => {
  const defaultSettings: SettingsType = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartNextSession: true,
  };

  let mockOnSave: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    mockOnSave = jest.fn();
    mockOnCancel = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render settings form with default values", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("Timer Settings")).toBeInTheDocument();
      expect(
        screen.getByText(/Focus Duration \(minutes\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Short Break Duration \(minutes\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Long Break Duration \(minutes\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Long Break Interval \(sessions\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Auto-start next session/i)
      ).toBeInTheDocument();
    });

    it("should display current settings values", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const focusDurationInputs = screen.getAllByDisplayValue("25");
      expect(focusDurationInputs.length).toBeGreaterThan(0);

      const shortBreakInputs = screen.getAllByDisplayValue("5");
      expect(shortBreakInputs.length).toBeGreaterThan(0);

      const longBreakInputs = screen.getAllByDisplayValue("15");
      expect(longBreakInputs.length).toBeGreaterThan(0);

      const intervalInputs = screen.getAllByDisplayValue("4");
      expect(intervalInputs.length).toBeGreaterThan(0);

      const checkbox = screen.getByRole("checkbox", {
        name: /Auto-start next session/i,
      });
      expect(checkbox).toBeChecked();
    });

    it("should render save and cancel buttons", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByRole("button", { name: /Save/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i })
      ).toBeInTheDocument();
    });
  });

  describe("focus duration", () => {
    it("should update focus duration via number input", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("25");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      fireEvent.change(numberInput, { target: { value: "30" } });

      expect(numberInput.value).toBe("30");
    });

    it("should update focus duration via range slider", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const rangeInputs = screen.getAllByDisplayValue("25");
      const rangeInput = rangeInputs.find(
        (input) => input.getAttribute("type") === "range"
      ) as HTMLInputElement;

      fireEvent.change(rangeInput, { target: { value: "35" } });

      expect(rangeInput.value).toBe("35");
    });

    it("should handle empty input by defaulting to 1", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("25");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      fireEvent.change(numberInput, { target: { value: "" } });

      // The component should handle empty input
      expect(numberInput.value).toBe("1");
    });
  });

  describe("short break duration", () => {
    it("should update short break duration", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("5");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      fireEvent.change(numberInput, { target: { value: "10" } });

      expect(numberInput.value).toBe("10");
    });
  });

  describe("long break duration", () => {
    it("should update long break duration", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("15");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      fireEvent.change(numberInput, { target: { value: "20" } });

      expect(numberInput.value).toBe("20");
    });
  });

  describe("long break interval", () => {
    it("should update long break interval", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("4");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      fireEvent.change(numberInput, { target: { value: "6" } });

      expect(numberInput.value).toBe("6");
    });
  });

  describe("auto-start next session", () => {
    it("should toggle auto-start checkbox", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /Auto-start next session/i,
      });

      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("should display unchecked state when autoStartNextSession is false", () => {
      const settings = {
        ...defaultSettings,
        autoStartNextSession: false,
      };

      render(
        <PomodoroSettings
          settings={settings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByRole("checkbox", {
        name: /Auto-start next session/i,
      });

      expect(checkbox).not.toBeChecked();
    });
  });

  describe("save functionality", () => {
    it("should call onSave with updated settings when save button is clicked", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Update focus duration
      const focusInputs = screen.getAllByDisplayValue("25");
      const focusNumberInput = focusInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(focusNumberInput, { target: { value: "30" } });

      // Update short break duration
      const shortBreakInputs = screen.getAllByDisplayValue("5");
      const shortBreakNumberInput = shortBreakInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(shortBreakNumberInput, { target: { value: "10" } });

      // Click save
      const saveButton = screen.getByRole("button", { name: /Save/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith({
        focusDuration: 30,
        shortBreakDuration: 10,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartNextSession: true,
      });
    });

    it("should call onSave with all updated settings", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Update all settings
      const focusInputs = screen.getAllByDisplayValue("25");
      const focusInput = focusInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(focusInput, { target: { value: "45" } });

      const shortBreakInputs = screen.getAllByDisplayValue("5");
      const shortBreakInput = shortBreakInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(shortBreakInput, { target: { value: "8" } });

      const longBreakInputs = screen.getAllByDisplayValue("15");
      const longBreakInput = longBreakInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(longBreakInput, { target: { value: "20" } });

      const intervalInputs = screen.getAllByDisplayValue("4");
      const intervalInput = intervalInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(intervalInput, { target: { value: "6" } });

      const checkbox = screen.getByRole("checkbox", {
        name: /Auto-start next session/i,
      });
      fireEvent.click(checkbox);

      const saveButton = screen.getByRole("button", { name: /Save/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        focusDuration: 45,
        shortBreakDuration: 8,
        longBreakDuration: 20,
        longBreakInterval: 6,
        autoStartNextSession: false,
      });
    });
  });

  describe("cancel functionality", () => {
    it("should call onCancel when cancel button is clicked", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should not call onSave when cancel button is clicked", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make some changes
      const focusInputs = screen.getAllByDisplayValue("25");
      const focusInput = focusInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;
      fireEvent.change(focusInput, { target: { value: "30" } });

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("input validation", () => {
    it("should respect min and max values for focus duration", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("25");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      expect(numberInput.min).toBe("1");
      expect(numberInput.max).toBe("60");
    });

    it("should respect min and max values for short break duration", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("5");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      expect(numberInput.min).toBe("1");
      expect(numberInput.max).toBe("30");
    });

    it("should respect min and max values for long break duration", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("15");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      expect(numberInput.min).toBe("1");
      expect(numberInput.max).toBe("60");
    });

    it("should respect min and max values for long break interval", () => {
      render(
        <PomodoroSettings
          settings={defaultSettings}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByDisplayValue("4");
      const numberInput = numberInputs.find(
        (input) => input.getAttribute("type") === "number"
      ) as HTMLInputElement;

      expect(numberInput.min).toBe("1");
      expect(numberInput.max).toBe("10");
    });
  });
});
