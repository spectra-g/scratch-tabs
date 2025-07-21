// src/tablets/calculator/useCalculatorEngine.ts

import { useCallback } from "react";
import { evaluate } from "mathjs";
import { formatDisplay } from "./utils/formatters";
import { CALCULATOR_CONSTANTS } from "./constants";

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
      if (initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY && isNaN(Number(input))) return;

      const currentExpression =
        initialData.expression === CALCULATOR_CONSTANTS.DEFAULT_DISPLAY || 
        initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY
          ? ""
          : initialData.expression;

      const newExpression = currentExpression + input;
      updateData({ expression: newExpression, display: newExpression });
    },
    [initialData.expression, initialData.display, updateData],
  );

  const handleClear = useCallback(() => {
    updateData({ expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY, display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY });
  }, [updateData]);

  const handleBackspace = useCallback(() => {
    if (initialData.expression.length <= 1 || initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY) {
      updateData({ expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY, display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY });
    } else {
      const newExpression = initialData.expression.slice(0, -1);
      updateData({ expression: newExpression, display: newExpression });
    }
  }, [initialData.expression, initialData.display, updateData]);

  const handleEquals = useCallback(() => {
    if (initialData.display === CALCULATOR_CONSTANTS.ERROR_DISPLAY) return;
    try {
      const result = evaluate(initialData.expression);
      const formattedResult = formatDisplay(result);
      const newHistoryEntry: HistoryEntry = {
        expression: initialData.expression,
        result: formattedResult,
        mode: initialData.mode,
        base: initialData.base,
      };

      updateData({
        display: formattedResult,
        expression: formattedResult,
        history: [newHistoryEntry, ...initialData.history].slice(0, CALCULATOR_CONSTANTS.HISTORY_LIMIT),
      });
    } catch (error) {
      updateData({ display: CALCULATOR_CONSTANTS.ERROR_DISPLAY, expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY });
    }
  }, [
    initialData.expression,
    initialData.history,
    initialData.display,
    updateData,
  ]);

  const handleModeChange = useCallback(
    (mode: CalculatorMode) => {
      updateData({ mode, expression: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY, display: CALCULATOR_CONSTANTS.DEFAULT_DISPLAY });
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
  };
};
