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

    describe("decimal point logic", () => {
      it("should allow first decimal point in a number", () => {
        const testData = { ...initialData, expression: "3", display: "3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "3.",
          display: "3.",
          isResultDisplayed: false,
        });
      });

      it("should prevent second decimal point in same number", () => {
        const testData = { ...initialData, expression: "3.14", display: "3.14" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it("should allow decimal point after operator", () => {
        const testData = { ...initialData, expression: "3.14+", display: "3.14+" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "3.14+.",
          display: "3.14+.",
          isResultDisplayed: false,
        });
      });

      it("should allow decimal point in second number after subtraction", () => {
        const testData = { ...initialData, expression: "10.5-2", display: "10.5-2" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10.5-2.",
          display: "10.5-2.",
          isResultDisplayed: false,
        });
      });

      it("should allow decimal point in negative number", () => {
        const testData = { ...initialData, expression: "5*-3", display: "5*-3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "5*-3.",
          display: "5*-3.",
          isResultDisplayed: false,
        });
      });

      it("should prevent second decimal in negative number", () => {
        const testData = { ...initialData, expression: "5*-3.14", display: "5*-3.14" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it("should allow decimal point after multiplication", () => {
        const testData = { ...initialData, expression: "2.5*", display: "2.5*" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "2.5*.",
          display: "2.5*.",
          isResultDisplayed: false,
        });
      });

      it("should allow decimal point after division", () => {
        const testData = { ...initialData, expression: "10/", display: "10/" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10/.",
          display: "10/.",
          isResultDisplayed: false,
        });
      });

      it("should allow decimal point at start of expression", () => {
        const testData = { ...initialData, expression: "0", display: "0" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: ".",
          display: ".",
          isResultDisplayed: false,
        });
      });

      it("should handle multiple numbers with decimals correctly", () => {
        const testData = { ...initialData, expression: "3.14+2.71", display: "3.14+2.71" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it("should allow decimal after modulo operator", () => {
        const testData = { ...initialData, expression: "10%", display: "10%" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleInput(".");
        });

        expect(mockOnChange).toHaveBeenCalledWith({
          ...testData,
          expression: "10%.",
          display: "10%.",
          isResultDisplayed: false,
        });
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

  describe("scientific functions", () => {
    describe("trigonometric functions", () => {
      it("should evaluate sin function", () => {
        const testData = { ...initialData, expression: "sin(0)", display: "sin(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate cos function", () => {
        const testData = { ...initialData, expression: "cos(0)", display: "cos(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "1",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate tan function", () => {
        const testData = { ...initialData, expression: "tan(0)", display: "tan(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("inverse trigonometric functions", () => {
      it("should evaluate asin function", () => {
        const testData = { ...initialData, expression: "asin(0)", display: "asin(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate acos function", () => {
        const testData = { ...initialData, expression: "acos(1)", display: "acos(1)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate atan function", () => {
        const testData = { ...initialData, expression: "atan(0)", display: "atan(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("logarithmic functions", () => {
      it("should evaluate log10 (base 10)", () => {
        const testData = { ...initialData, expression: "log10(100)", display: "log10(100)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "2",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate log (natural log)", () => {
        const testData = { ...initialData, expression: "log(e)", display: "log(e)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "1",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate log with base 2", () => {
        const testData = { ...initialData, expression: "log(8, 2)", display: "log(8, 2)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "3",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate log2 (base 2)", () => {
        const testData = { ...initialData, expression: "log2(16)", display: "log2(16)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "4",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("power and root functions", () => {
      it("should evaluate square (x^2)", () => {
        const testData = { ...initialData, expression: "5^2", display: "5^2" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "25",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate power (x^y)", () => {
        const testData = { ...initialData, expression: "2^10", display: "2^10" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "1024",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate sqrt function", () => {
        const testData = { ...initialData, expression: "sqrt(16)", display: "sqrt(16)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "4",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate cube root", () => {
        const testData = { ...initialData, expression: "8^(1/3)", display: "8^(1/3)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "2",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("absolute value", () => {
      it("should evaluate abs of positive number", () => {
        const testData = { ...initialData, expression: "abs(5)", display: "abs(5)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "5",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate abs of negative number", () => {
        const testData = { ...initialData, expression: "abs(-5)", display: "abs(-5)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "5",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate abs of zero", () => {
        const testData = { ...initialData, expression: "abs(0)", display: "abs(0)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "0",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("factorial", () => {
      it("should evaluate factorial of 5", () => {
        const testData = { ...initialData, expression: "5!", display: "5!" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "120",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate factorial of 0", () => {
        const testData = { ...initialData, expression: "0!", display: "0!" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "1",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate factorial of 10", () => {
        const testData = { ...initialData, expression: "10!", display: "10!" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "3628800",
            isResultDisplayed: true,
          })
        );
      });
    });

    describe("constants", () => {
      it("should evaluate pi constant", () => {
        const testData = { ...initialData, expression: "pi", display: "pi" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(3.141592653589793, 10);
      });

      it("should evaluate e constant", () => {
        const testData = { ...initialData, expression: "e", display: "e" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(2.718281828459045, 10);
      });

      it("should use pi in calculations", () => {
        const testData = { ...initialData, expression: "2*pi", display: "2*pi" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(6.283185307179586, 10);
      });

      it("should use e in calculations", () => {
        const testData = { ...initialData, expression: "e^2", display: "e^2" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(7.3890560989306495, 10);
      });
    });

    describe("complex expressions", () => {
      it("should evaluate expression with multiple functions", () => {
        const testData = { ...initialData, expression: "sin(pi/2)", display: "sin(pi/2)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(1, 10);
      });

      it("should evaluate nested functions", () => {
        const testData = { ...initialData, expression: "sqrt(abs(-16))", display: "sqrt(abs(-16))" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "4",
            isResultDisplayed: true,
          })
        );
      });

      it("should evaluate logarithm with power", () => {
        const testData = { ...initialData, expression: "log10(10^3)", display: "log10(10^3)" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(parseFloat(call.display)).toBeCloseTo(3, 10);
      });

      it("should evaluate factorial in expression", () => {
        const testData = { ...initialData, expression: "3!+2!", display: "3!+2!" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            display: "8",
            isResultDisplayed: true,
          })
        );
      });
    });
  });

  describe("smart bracket handling", () => {
    it("should return zero unclosed brackets for balanced expression", () => {
      const testData = { ...initialData, expression: "(1+2)", display: "(1+2)" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      expect(result.current.getUnclosedBracketCount()).toBe(0);
    });

    it("should count one unclosed bracket", () => {
      const testData = { ...initialData, expression: "sin(5", display: "sin(5" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      expect(result.current.getUnclosedBracketCount()).toBe(1);
    });

    it("should count multiple unclosed brackets", () => {
      const testData = { ...initialData, expression: "((1+2", display: "((1+2" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      expect(result.current.getUnclosedBracketCount()).toBe(2);
    });

    it("should auto-close brackets on equals", () => {
      const testData = { ...initialData, expression: "sin(5+3", display: "sin(5+3" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      // Should have evaluated "sin(5+3)" which is sin(8)
      const call = mockOnChange.mock.calls[0][0];
      expect(call.isResultDisplayed).toBe(true);
      expect(call.history[0].expression).toBe("sin(5+3)");
    });

    it("should auto-close multiple brackets on equals", () => {
      const testData = { ...initialData, expression: "((2+3)+(4+5", display: "((2+3)+(4+5" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.isResultDisplayed).toBe(true);
      expect(call.display).toBe("14");
      expect(call.history[0].expression).toBe("((2+3)+(4+5))");
    });

    it("should handle nested function brackets", () => {
      const testData = { ...initialData, expression: "sqrt(abs(-16", display: "sqrt(abs(-16" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.isResultDisplayed).toBe(true);
      expect(call.display).toBe("4");
      expect(call.history[0].expression).toBe("sqrt(abs(-16))");
    });

    it("should not affect expressions with balanced brackets", () => {
      const testData = { ...initialData, expression: "sin(pi/2)", display: "sin(pi/2)" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.isResultDisplayed).toBe(true);
      expect(call.history[0].expression).toBe("sin(pi/2)");
    });

    it("should handle complex expressions with mixed brackets", () => {
      const testData = { ...initialData, expression: "2*(3+sin(0", display: "2*(3+sin(0" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      act(() => {
        result.current.handleEquals();
      });

      const call = mockOnChange.mock.calls[0][0];
      expect(call.isResultDisplayed).toBe(true);
      expect(call.display).toBe("6");
      expect(call.history[0].expression).toBe("2*(3+sin(0))");
    });

    it("should return zero for more closing than opening brackets", () => {
      const testData = { ...initialData, expression: "1+2))", display: "1+2))" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      expect(result.current.getUnclosedBracketCount()).toBe(0);
    });

    it("should handle empty expression", () => {
      const testData = { ...initialData, expression: "0", display: "0" };
      const { result } = renderHook(() =>
        useCalculatorEngine(testData, mockOnChange)
      );

      expect(result.current.getUnclosedBracketCount()).toBe(0);
    });
  });

  describe("Programmer Mode - Bitwise Operations", () => {
    describe("AND operation", () => {
      it("should perform AND in DEC mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "5 & 3", display: "5 & 3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("1"); // 5 & 3 = 1 (101 & 011 = 001)
      });

      it("should perform AND in HEX mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "FF & A", display: "FF & A" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("A"); // 255 & 10 = 10 (0xA)
      });

      it("should perform AND in BIN mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "BIN" as const, expression: "1010 & 1100", display: "1010 & 1100" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("1000"); // 10 & 12 = 8 (0b1000)
      });

      it("should perform AND in OCT mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "OCT" as const, expression: "77 & 17", display: "77 & 17" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("17"); // 63 & 15 = 15 (017)
      });
    });

    describe("OR operation", () => {
      it("should perform OR in DEC mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "5 | 3", display: "5 | 3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("7"); // 5 | 3 = 7 (101 | 011 = 111)
      });

      it("should perform OR in HEX mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "F0 | 0F", display: "F0 | 0F" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("FF"); // 240 | 15 = 255 (0xFF)
      });

      it("should perform OR in BIN mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "BIN" as const, expression: "1010 | 1100", display: "1010 | 1100" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("1110"); // 10 | 12 = 14 (0b1110)
      });
    });

    describe("XOR operation", () => {
      it("should perform XOR in DEC mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "5 ^ 3", display: "5 ^ 3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("6"); // 5 ^ 3 = 6 (101 ^ 011 = 110)
      });

      it("should perform XOR in HEX mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "FF ^ A", display: "FF ^ A" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("F5"); // 255 ^ 10 = 245 (0xF5)
      });

      it("should perform XOR in BIN mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "BIN" as const, expression: "1010 ^ 1100", display: "1010 ^ 1100" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("110"); // 10 ^ 12 = 6 (0b110)
      });
    });

    describe("NOT operation", () => {
      it("should perform NOT in DEC mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "~5", display: "~5" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("-6"); // ~5 = -6 (two's complement)
      });

      it("should perform NOT in HEX mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "~FF", display: "~FF" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("-100"); // ~255 = -256 (0x-100)
      });

      it("should perform NOT in BIN mode", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "BIN" as const, expression: "~1010", display: "~1010" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("-1011"); // ~10 = -11 (0b-1011)
      });
    });

    describe("Combined bitwise operations", () => {
      it("should handle AND and OR", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "5 & 3 | 2", display: "5 & 3 | 2" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("3"); // (5 & 3) | 2 = 1 | 2 = 3
      });

      it("should handle XOR and AND", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "5 ^ 3 & 7", display: "5 ^ 3 & 7" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("6"); // (5 ^ 3) & 7 = 6 & 7 = 6
      });

      it("should handle NOT with AND", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "~5 & 3", display: "~5 & 3" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("2"); // ~5 & 3 = -6 & 3 = 2
      });

      it("should handle complex hex expression", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "DEAD & BEEF | CAFE", display: "DEAD & BEEF | CAFE" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        // DEAD & BEEF = 0x9EAD, 0x9EAD | 0xCAFE = 0xDEFF
        expect(call.display).toBe("DEFF");
      });
    });

    describe("Edge cases", () => {
      it("should handle zero with bitwise operations", () => {
        const testData = { ...initialData, mode: "programmer" as const, expression: "0 & 5", display: "0 & 5" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("0");
      });

      it("should handle all ones with AND", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "HEX" as const, expression: "FF & FF", display: "FF & FF" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[0][0];
        expect(call.isResultDisplayed).toBe(true);
        expect(call.display).toBe("FF");
      });

      it("should handle switching bases and evaluating", () => {
        const testData = { ...initialData, mode: "programmer" as const, base: "BIN" as const, expression: "1111", display: "1111" };
        const { result } = renderHook(() =>
          useCalculatorEngine(testData, mockOnChange)
        );

        // Switch to DEC
        act(() => {
          result.current.handleBaseChange("DEC");
        });

        // Now evaluate in DEC (but expression was typed in BIN, so it should still work as DEC now)
        act(() => {
          result.current.handleEquals();
        });

        const call = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(call.isResultDisplayed).toBe(true);
      });
    });
  });
});