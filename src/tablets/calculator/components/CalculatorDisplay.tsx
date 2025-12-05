// src/tablets/calculator/components/CalculatorDisplay.tsx

import React from "react";
import { getDisplayFontSize, humanizeExpressionSimple } from "../utils/formatters";
import { CalculatorMode } from "../useCalculatorEngine";

interface CalculatorDisplayProps {
  expression: string;
  display: string;
  mode: CalculatorMode;
}

export const CalculatorDisplay: React.FC<CalculatorDisplayProps> = ({
  expression,
  display,
  mode,
}) => {
  const shouldShowHumanized = mode === "standard" || mode === "scientific";
  const simpleHumanized = shouldShowHumanized ? humanizeExpressionSimple(expression) : expression;

  return (
    <div className="bg-surface border border-base rounded-lg p-4 text-right overflow-hidden shadow-inner">
      <div
        className="h-5 text-sm text-secondary font-mono truncate"
        aria-live="polite"
        title={expression}
      >
        {simpleHumanized}
      </div>
      <div
        className={`font-mono ${getDisplayFontSize(display)} text-main break-all h-10 flex items-center justify-end font-semibold`}
        title={display}
      >
        {display || "0"}
      </div>
    </div>
  );
};
