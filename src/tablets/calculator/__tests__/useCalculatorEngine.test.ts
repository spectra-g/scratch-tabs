import { renderHook, act } from "@testing-library/react";
import { useCalculatorEngine, CalculatorData, HistoryEntry } from "../useCalculatorEngine";
import { CALCULATOR_CONSTANTS } from "../constants";

describe("useCalculatorEngine", () => {
  let mockOnChange: jest.Mock;
  let initialData: CalculatorData;

  beforeEach(() => {
    mockOnChange = jest.fn();
    initialData = {
      mode: "standard",
      expression: "0",
      display: "0",
      history: [],
      notes: "",
      base: "DEC",
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with provided data", () => {
      const { result } = renderHook(() => 
        useCalculatorEngine(initialData, mockOnChange)
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe("handleInput", () => {
    it("should handle numeric input", () => {
      const { result } = renderHook(() =>
        useCalculatorEngine(initialData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("5");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...initialData,
        expression: "5",
        display: "5",
        isResultDisplayed: false,
      });
    });

    it("should handle operator input", () => {
      const testData = { ...initialData, expression: "5", display: "5" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("+");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "5+",
        display: "5+",
        isResultDisplayed: false,
      });
    });

    it("should not add operators to error state", () => {
      const errorData = { ...initialData, display: "Error" };
      const { result } = renderHook(() => 
        useCalculatorEngine(errorData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("+");
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should allow numeric input on error state", () => {
      const errorData = { ...initialData, display: "Error" };
      const { result } = renderHook(() =>
        useCalculatorEngine(errorData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("5");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...errorData,
        expression: "5",
        display: "5",
        isResultDisplayed: false,
      });
    });

    it("should start new calculation when number pressed after equals", () => {
      const testData = {
        ...initialData,
        expression: "4",
        display: "4",
        isResultDisplayed: true,
      };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("3");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "3",
        display: "3",
        isResultDisplayed: false,
      });
    });

    it("should chain calculation when operator pressed after equals", () => {
      const testData = {
        ...initialData,
        expression: "4",
        display: "4",
        isResultDisplayed: true,
      };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("*");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "4*",
        display: "4*",
        isResultDisplayed: false,
      });
    });

    it("should chain calculation with multiple operators after equals", () => {
      const testData = {
        ...initialData,
        expression: "10",
        display: "10",
        isResultDisplayed: true,
      };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleInput("+");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "10+",
        display: "10+",
        isResultDisplayed: false,
      });
    });

    describe("operator correction", () => {
      it("should replace consecutive same operators", () => {
        const testData = { ...initialData, expression: "5*", display: "5*" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("*");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5*",
          display: "5*",
          isResultDisplayed: false,
        });
      });

      it("should replace different consecutive operators", () => {
        const testData = { ...initialData, expression: "5*", display: "5*" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("+");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5+",
          display: "5+",
          isResultDisplayed: false,
        });
      });

      it("should allow minus after operator for negative numbers", () => {
        const testData = { ...initialData, expression: "5*", display: "5*" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("-");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5*-",
          display: "5*-",
          isResultDisplayed: false,
        });
      });

      it("should not allow double minus", () => {
        const testData = { ...initialData, expression: "5-", display: "5-" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("-");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5-",
          display: "5-",
          isResultDisplayed: false,
        });
      });

      it("should handle operator correction with division", () => {
        const testData = { ...initialData, expression: "10/", display: "10/" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("*");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10*",
          display: "10*",
          isResultDisplayed: false,
        });
      });

      it("should handle operator correction with modulo", () => {
        const testData = { ...initialData, expression: "10%", display: "10%" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("+");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10+",
          display: "10+",
          isResultDisplayed: false,
        });
      });

      it("should allow negative number after addition", () => {
        const testData = { ...initialData, expression: "5+", display: "5+" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("-");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5+-",
          display: "5+-",
          isResultDisplayed: false,
        });
      });

      it("should allow negative number after division", () => {
        const testData = { ...initialData, expression: "10/", display: "10/" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput("-");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10/-",
          display: "10/-",
          isResultDisplayed: false,
        });
      });
    });
  });

  describe("handleClear", () => {
    it("should reset to default state", () => {
      const testData = { ...initialData, expression: "123", display: "123" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleClear();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    });

    it("should reset isResultDisplayed flag", () => {
      const testData = {
        ...initialData,
        expression: "4",
        display: "4",
        isResultDisplayed: true,
      };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleClear();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    });
  });

  describe("handleBackspace", () => {
    it("should remove last character", () => {
      const testData = { ...initialData, expression: "123", display: "123" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleBackspace();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "12",
        display: "12",
        isResultDisplayed: false,
      });
    });

    it("should reset to default when expression has one character", () => {
      const testData = { ...initialData, expression: "5", display: "5" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleBackspace();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    });

    it("should reset to default when in error state", () => {
      const errorData = { ...initialData, expression: "123", display: "Error" };
      const { result } = renderHook(() =>
        useCalculatorEngine(errorData, mockOnChange)
      );

      act(() => {
        result.current.handleBackspace();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...errorData,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    });

    it("should reset isResultDisplayed flag", () => {
      const testData = {
        ...initialData,
        expression: "42",
        display: "42",
        isResultDisplayed: true,
      };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleBackspace();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "4",
        display: "4",
        isResultDisplayed: false,
      });
    });
  });

  describe("handleEquals", () => {
    it("should evaluate simple arithmetic", () => {
      const testData = { ...initialData, expression: "2+3", display: "2+3" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "5",
        display: "5",
        history: [{ expression: "2+3", result: "5", mode: "standard", base: "DEC" }],
        isResultDisplayed: true,
      });
    });

    it("should handle division by zero", () => {
      const testData = { ...initialData, expression: "5/0", display: "5/0" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "Infinity",
        display: "Infinity",
        history: [{ expression: "5/0", result: "Infinity", mode: "standard", base: "DEC" }],
        isResultDisplayed: true,
      });
    });

    it("should handle invalid expressions", () => {
      const testData = { ...initialData, expression: "2/0*", display: "2/0*" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.ERROR_DISPLAY,
        isResultDisplayed: true,
      });
    });

    it("should not evaluate when already in error state", () => {
      const errorData = { ...initialData, display: "Error" };
      const { result } = renderHook(() => 
        useCalculatorEngine(errorData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should limit history to HISTORY_LIMIT", () => {
      const existingHistory: HistoryEntry[] = Array.from({ length: CALCULATOR_CONSTANTS.HISTORY_LIMIT }, (_, i) => ({
        expression: `${i}+1`,
        result: `${i + 1}`,
        mode: "standard" as const,
        base: "DEC" as const,
      }));
      const testData = { 
        ...initialData, 
        expression: "2+3", 
        display: "2+3",
        history: existingHistory
      };
      const { result } = renderHook(() => 
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.history).toHaveLength(CALCULATOR_CONSTANTS.HISTORY_LIMIT);
      expect(call.history[0]).toEqual({ expression: "2+3", result: "5", mode: "standard", base: "DEC" });
    });
  });

  describe("handleModeChange", () => {
    it("should change mode and reset display", () => {
      const testData = { ...initialData, expression: "123", display: "123" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleModeChange("scientific");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        mode: "scientific",
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    });
  });

  describe("handleBaseChange", () => {
    it("should change base", () => {
      const { result } = renderHook(() => 
        useCalculatorEngine(initialData, mockOnChange)
      );

      act(() => {
        result.current.handleBaseChange("HEX");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...initialData,
        base: "HEX",
      });
    });
  });

  describe("handleHistoryClick", () => {
    it("should load expression from history and restore mode", () => {
      const { result } = renderHook(() =>
        useCalculatorEngine(initialData, mockOnChange)
      );

      const historyEntry: HistoryEntry = {
        expression: "sin(30)",
        result: "0.5",
        mode: "scientific",
        base: "DEC"
      };

      act(() => {
        result.current.handleHistoryClick(historyEntry);
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...initialData,
        expression: "sin(30)",
        display: "sin(30)",
        mode: "scientific",
        base: "DEC",
        isResultDisplayed: false,
      });
    });

    it("should use default base when history entry has no base", () => {
      const testData = { ...initialData, base: "HEX" as const };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      const historyEntry: HistoryEntry = {
        expression: "2+3",
        result: "5",
        mode: "standard"
      };

      act(() => {
        result.current.handleHistoryClick(historyEntry);
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...testData,
        expression: "2+3",
        display: "2+3",
        mode: "standard",
        base: "HEX", // Should fallback to current base
        isResultDisplayed: false,
      });
    });
  });

  describe("handleNotesChange", () => {
    it("should update notes", () => {
      const { result } = renderHook(() => 
        useCalculatorEngine(initialData, mockOnChange)
      );

      act(() => {
        result.current.handleNotesChange("Test notes");
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...initialData,
        notes: "Test notes",
      });
    });
  });
});