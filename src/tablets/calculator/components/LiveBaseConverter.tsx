// src/tablets/calculator/components/LiveBaseConverter.tsx

import React from "react";
import {
  convertToAllBases,
  extractCurrentNumber,
  formatBinary,
  formatHex,
  BaseType,
} from "../utils/baseConverter";

interface LiveBaseConverterProps {
  expression: string;
  currentBase: BaseType;
}

export const LiveBaseConverter: React.FC<LiveBaseConverterProps> = ({
  expression,
  currentBase,
}) => {
  // Extract the current number being typed
  const currentNumber = extractCurrentNumber(expression);

  // Convert to all bases
  const conversions = convertToAllBases(currentNumber, currentBase);

  if (!conversions) {
    return (
      <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-sm text-gray-400 text-center">
          Invalid number for base {currentBase}
        </div>
      </div>
    );
  }

  const bases = [
    {
      label: "HEX",
      value: formatHex(conversions.hex),
      color: "text-purple-400",
      active: currentBase === "HEX",
    },
    {
      label: "DEC",
      value: conversions.dec,
      color: "text-blue-400",
      active: currentBase === "DEC",
    },
    {
      label: "OCT",
      value: conversions.oct,
      color: "text-green-400",
      active: currentBase === "OCT",
    },
    {
      label: "BIN",
      value: formatBinary(conversions.bin),
      color: "text-orange-400",
      active: currentBase === "BIN",
    },
  ];

  return (
    <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="text-xs text-gray-400 mb-2 font-semibold">
        LIVE CONVERSIONS
      </div>
      <div className="space-y-2">
        {bases.map((base) => (
          <div
            key={base.label}
            className={`flex items-center justify-between p-2 rounded ${
              base.active ? "bg-gray-700" : "bg-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${base.color} w-8`}
              >
                {base.label}
              </span>
              {base.active && (
                <span className="text-xs px-1 py-0.5 bg-gray-600 text-gray-300 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <div className={`text-sm font-mono ${base.color}`}>
              {base.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
