import React from "react";
import { getDisplayFontSize } from "../utils/formatters";

interface CalculatorDisplayProps {
  expression: string;
  display: string;
}

export const CalculatorDisplay: React.FC<CalculatorDisplayProps> = ({
  expression,
  display,
}) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4 text-right overflow-hidden">
      <div
        className="h-5 text-sm text-gray-400 font-mono truncate"
        aria-live="polite"
      >
        {expression}
      </div>
      <div
        className={`font-mono ${getDisplayFontSize(display)} text-gray-100 break-all h-10 flex items-center justify-end`}
        title={display}
      >
        {display || "0"}
      </div>
    </div>
  );
};