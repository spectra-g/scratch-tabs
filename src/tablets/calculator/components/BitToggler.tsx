// src/tablets/calculator/components/BitToggler.tsx

import React from "react";
import { toDecimal, fromDecimal, type BaseType } from "../utils/baseConverter";

interface BitTogglerProps {
  currentNumber: string;
  currentBase: BaseType;
  onBitToggle: (newValue: string) => void;
  bitWidth?: 32 | 64;
}

const MAX_SAFE_BIT = 53; // JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1

/**
 * BitToggler component displays a visual representation of bits
 * and allows users to click individual bits to toggle them.
 *
 * Features:
 * - 32-bit or 64-bit display
 * - Grouped in bytes (8 bits) for readability
 * - Click to toggle individual bits
 * - Works with all number bases (HEX, DEC, OCT, BIN)
 * - Visual feedback for bit state
 */
export const BitToggler: React.FC<BitTogglerProps> = ({
  currentNumber,
  currentBase,
  onBitToggle,
  bitWidth = 64,
}) => {
  // Convert current number to decimal
  const decimalValue = toDecimal(currentNumber, currentBase) ?? 0;

  // Convert to binary string (padded to bitWidth)
  const getBinaryRepresentation = (value: number, width: number): string => {
    // Handle negative numbers (two's complement representation)
    if (value < 0) {
      // For negative numbers, we need to get the unsigned representation
      const unsigned = value >>> 0; // Convert to unsigned 32-bit
      return unsigned.toString(2).padStart(width, "0").slice(-width);
    }

    // For positive numbers, simple binary conversion
    return value.toString(2).padStart(width, "0").slice(-width);
  };

  const binaryString = getBinaryRepresentation(decimalValue, bitWidth);
  const bits = binaryString.split("").map((bit) => bit === "1");

  /**
   * Toggles a bit at the specified position (0 = rightmost/LSB)
   * @param bitPosition - The bit position to toggle (0 = LSB, bitWidth-1 = MSB)
   */
  const handleBitToggle = (bitPosition: number) => {
    // Calculate new value by toggling the bit
    const bitValue = Math.pow(2, bitPosition);

    let newValue: number;
    if ((decimalValue & (1 << bitPosition)) !== 0) {
      // Bit is currently 1, turn it off
      newValue = decimalValue - bitValue;
    } else {
      // Bit is currently 0, turn it on
      newValue = decimalValue + bitValue;
    }

    // Handle overflow/wrap for 32-bit
    if (bitWidth === 32) {
      newValue = newValue >>> 0; // Ensure unsigned 32-bit
    }

    // Convert back to current base
    const newValueInBase = fromDecimal(newValue, currentBase);
    onBitToggle(newValueInBase);
  };

  // Group bits into bytes (8 bits each)
  const bytesCount = bitWidth / 8;
  const byteGroups: boolean[][] = [];
  for (let i = 0; i < bytesCount; i++) {
    byteGroups.push(bits.slice(i * 8, (i + 1) * 8));
  }

  // Calculate byte values for labels
  const getByteValue = (byteBits: boolean[]): number => {
    let value = 0;
    for (let i = 0; i < byteBits.length; i++) {
      if (byteBits[i]) {
        value += Math.pow(2, 7 - i);
      }
    }
    return value;
  };

  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-400 font-semibold">
          BIT TOGGLER ({bitWidth}-BIT)
        </div>
        <div className="text-xs text-gray-400">
          Click bits to toggle
        </div>
      </div>

      {/* Bit display */}
      <div className="space-y-1.5">
        {byteGroups.map((byteBits, byteIndex) => {
          const byteValue = getByteValue(byteBits);
          const bitOffset = byteIndex * 8;

          return (
            <div key={byteIndex} className="flex items-center gap-2">
              {/* Byte label */}
              <div className="text-xs text-gray-500 font-mono w-16 text-right">
                B{bytesCount - 1 - byteIndex}: {byteValue.toString(16).toUpperCase().padStart(2, "0")}
              </div>

              {/* Bits */}
              <div className="flex gap-1">
                {byteBits.map((bit, bitInByteIndex) => {
                  const absoluteBitIndex = bitOffset + bitInByteIndex;
                  const bitNumber = bitWidth - 1 - absoluteBitIndex; // The actual bit position (0 = LSB)

                  return (
                    <button
                      key={bitInByteIndex}
                      onClick={() => handleBitToggle(bitNumber)}
                      className={`
                        w-7 h-7 rounded font-mono text-xs font-bold
                        transition-all duration-150
                        ${
                          bit
                            ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }
                        active:scale-95
                      `}
                      aria-label={`Bit ${bitNumber}, value: ${bit ? 1 : 0}`}
                    >
                      {bit ? "1" : "0"}
                    </button>
                  );
                })}
              </div>

              {/* Bit position labels */}
              <div className="text-xs text-gray-600 font-mono ml-1">
                {bitWidth - 1 - bitOffset}...{bitWidth - 8 - bitOffset}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary info */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex gap-3 text-xs">
        <div>
          <span className="text-gray-500">DEC:</span>{" "}
          <span className="text-blue-400 font-mono">{decimalValue}</span>
        </div>
        <div>
          <span className="text-gray-500">HEX:</span>{" "}
          <span className="text-purple-400 font-mono">
            0x{fromDecimal(decimalValue, "HEX")}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Bits set:</span>{" "}
          <span className="text-green-400 font-mono">
            {bits.filter(Boolean).length}/{bitWidth}
          </span>
        </div>
      </div>
    </div>
  );
};
