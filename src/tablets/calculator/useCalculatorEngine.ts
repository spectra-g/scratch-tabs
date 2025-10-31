// src/tablets/calculator/useCalculatorEngine.ts

import { useCallback } from "react";
import { evaluate } from "mathjs";
import { formatDisplay } from "./utils/formatters";
import { CALCULATOR_CONSTANTS } from "./constants";
import { prepareExpressionForEval, fromDecimal, type BaseType } from "./utils/baseConverter";

// --- Constants ---
const ARITHMETIC_OPERATORS = ["+", "-", "*", "/", "%"] as const;
const PARENTHESES = ["(", ")"] as const;
const ALL_OPERATORS = [...ARITHMETIC_OPERATORS, ...PARENTHESES] as const;

// --- Helper Functions ---
const isArithmeticOperator = (char: string): boolean => {
  return ARITHMETIC_OPERATORS.includes(char as typeof ARITHMETIC_OPERATORS[number]);
};

const shouldAllowNegativeNumber = (input: string, lastChar: string): boolean => {
  return input === "-" && lastChar !== "-";
};

const shouldReplaceOperator = (input: string, lastChar: string): boolean => {
  return isArithmeticOperator(input) && isArithmeticOperator(lastChar);
};

/**
 * Extracts the current number being typed from the expression.
 * Returns everything after the last operator or the entire expression if no operator.
 * Examples:
 * - "123" -> "123"
 * - "5+3.14" -> "3.14"
 * - "10*-2.5" -> "-2.5"
 */
const getCurrentNumber = (expression: string): string => {
  if (!expression) return "";

  // Find the last operator position
  let lastOperatorIndex = -1;
  for (let i = expression.length - 1; i >= 0; i--) {
    const char = expression[i];
    if (isArithmeticOperator(char)) {
      // Handle negative numbers: check if minus is part of a negative number
      if (char === "-" && i > 0 && isArithmeticOperator(expression[i - 1])) {
        continue; // This minus is part of a negative number, keep looking
      }
      lastOperatorIndex = i;
      break;
    }
  }

  return expression.slice(lastOperatorIndex + 1);
};

const hasDecimalPoint = (numberStr: string): boolean => {
  return numberStr.includes(".");
};

/**
 * Counts the number of unclosed opening brackets in an expression.
 * Returns the difference between opening and closing brackets.
 */
const countUnclosedBrackets = (expression: string): number => {
  let count = 0;
  for (const char of expression) {
    if (char === "(") count++;
    if (char === ")") count--;
  }
  return Math.max(0, count); // Never return negative
};

/**
 * Auto-closes any unclosed brackets in an expression.
 * Example: "sin(5+3" -> "sin(5+3)"
 */
const autoCloseBrackets = (expression: string): string => {
  const unclosed = countUnclosedBrackets(expression);
  return expression + ")".repeat(unclosed);
};

// --- State Interface ---
export type CalculatorMode = "standard" | "scientific" | "programmer";

export interface HistoryEntry {
  expression: string;
  result: string;
  mode: CalculatorMode;
  base?: "HEX" | "DEC" | "OCT" | "BIN";
}

export interface CalculatorData {
  mode: CalculatorMode;
  expression: string;
  display: string;
  history: HistoryEntry[];
  notes: string;
  base: "HEX" | "DEC" | "OCT" | "BIN";
  isResultDisplayed?: boolean;
}

export interface CalculatorEngine {
  data: CalculatorData;
  handleInput: (input: string) => void;
  handleClear: () => void;
  handleBackspace: () => void;
  handleEquals: () => void;
  handleModeChange: (mode: CalculatorMode) => void;
  handleBaseChange: (base: "HEX" | "DEC" | "OCT" | "BIN") => void;
  handleHistoryClick: (entry: HistoryEntry) => void;
  handleNotesChange: (notes: string) => void;
  getUnclosedBracketCount: () => number;
}


export const useCalculatorEngine = (
  initialData: CalculatorData,
  onChange: (newData: CalculatorData) => void,
): CalculatorEngine => {
  const updateData = useCallback(
    (newData: Partial<CalculatorData>) => {
      onChange({ ...initialData, ...newData });
    },
    [initialData, onChange],
  );

  const handleInput = useCallback(
    (input: string) => {
      // Don't add operators to an error state
      if (initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY && isNaN(Number(input))) {
        return;
      }

      const isOperator = ALL_OPERATORS.includes(input as typeof ALL_OPERATORS[number]);

      // Handle post-calculation input
      if (initialData.isResultDisplayed) {
        if (!isOperator) {
          // Start new calculation with a number
          updateData({
            expression: input,
            display: input,
            isResultDisplayed: false,
          });
          return;
        }

        // Chain calculation with operator
        updateData({
          expression: initialData.display + input,
          display: initialData.display + input,
          isResultDisplayed: false,
        });
        return;
      }

      const currentExpression =
        initialData.expression === CALCULATOR_CONSTANTS.DEFAULT_DISPLAY ||
        initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY
          ? ""
          : initialData.expression;

      // Prevent multiple decimal points in a single number
      if (input === ".") {
        const currentNumber = getCurrentNumber(currentExpression);
        if (hasDecimalPoint(currentNumber)) {
          return; // Already has a decimal point, don't add another
        }
      }

      // Handle operator correction for consecutive operators
      if (isArithmeticOperator(input) && currentExpression.length > 0) {
        const lastChar = currentExpression[currentExpression.length - 1];

        if (shouldReplaceOperator(input, lastChar)) {
          // Allow negative numbers: "5 * -3"
          if (shouldAllowNegativeNumber(input, lastChar)) {
            updateData({
              expression: currentExpression + input,
              display: currentExpression + input,
              isResultDisplayed: false,
            });
            return;
          }

          // Replace consecutive operators: "5 * *" becomes "5 *"
          updateData({
            expression: currentExpression.slice(0, -1) + input,
            display: currentExpression.slice(0, -1) + input,
            isResultDisplayed: false,
          });
          return;
        }
      }

      // Append input to expression
      const newExpression = currentExpression + input;
      updateData({ expression: newExpression, display: newExpression, isResultDisplayed: false });
    },
    [initialData.expression, initialData.display, initialData.isResultDisplayed, updateData],
  );

  const handleClear = useCallback(() => {
    updateData({
      expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
      display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
      isResultDisplayed: false,
    });
  }, [updateData]);

  const handleBackspace = useCallback(() => {
    if (initialData.expression.length <= 1 || initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY) {
      updateData({
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    } else {
      const newExpression = initialData.expression.slice(0, -1);
      updateData({ expression: newExpression, display: newExpression, isResultDisplayed: false });
    }
  }, [initialData.expression, initialData.display, updateData]);

  const handleEquals = useCallback(() => {
    if (initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY) return;
    try {
      // Auto-close any unclosed brackets before evaluation
      const closedExpression = autoCloseBrackets(initialData.expression);

      let expressionToEval = closedExpression;

      // For programmer mode, prepare expression with base conversion and bitwise operators
      if (initialData.mode === "programmer") {
        expressionToEval = prepareExpressionForEval(closedExpression, initialData.base);
      }

      const result = evaluate(expressionToEval);

      // For programmer mode, convert result back to current base
      let formattedResult: string;
      if (initialData.mode === "programmer") {
        // Ensure result is an integer for bitwise operations
        const intResult = Math.floor(Number(result));
        formattedResult = fromDecimal(intResult, initialData.base);
      } else {
        formattedResult = formatDisplay(result);
      }

      const newHistoryEntry: HistoryEntry = {
        expression: closedExpression,
        result: formattedResult,
        mode: initialData.mode,
        base: initialData.base,
      };

      updateData({
        display: formattedResult,
        expression: formattedResult,
        history: [newHistoryEntry, ...initialData.history].slice(0, CALCULATOR_CONSTANTS.HISTORY_LIMIT),
        isResultDisplayed: true,
      });
    } catch (error) {
      updateData({
        display: CALCULATOR_CONSTANTS.ERROR_DISPLAY,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: true,
      });
    }
  }, [
    initialData.expression,
    initialData.history,
    initialData.display,
    initialData.mode,
    initialData.base,
    updateData,
  ]);

  const handleModeChange = useCallback(
    (mode: CalculatorMode) => {
      updateData({
        mode,
        expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY,
        isResultDisplayed: false,
      });
    },
    [updateData],
  );

  const handleBaseChange = useCallback(
    (base: "HEX" | "DEC" | "OCT" | "BIN") => {
      updateData({ base });
    },
    [updateData],
  );

  const handleHistoryClick = useCallback(
    (entry: HistoryEntry) => {
      updateData({
        expression: entry.expression,
        display: entry.expression,
        mode: entry.mode,
        base: entry.base || initialData.base,
        isResultDisplayed: false,
      });
    },
    [updateData, initialData.base],
  );

  const handleNotesChange = useCallback(
    (notes: string) => {
      updateData({ notes });
    },
    [updateData],
  );

  const getUnclosedBracketCount = useCallback(() => {
    return countUnclosedBrackets(initialData.expression);
  }, [initialData.expression]);

  return {
    data: initialData,
    handleInput,
    handleClear,
    handleBackspace,
    handleEquals,
    handleModeChange,
    handleBaseChange,
    handleHistoryClick,
    handleNotesChange,
    getUnclosedBracketCount,
  };
};
