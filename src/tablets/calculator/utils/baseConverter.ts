// src/tablets/calculator/utils/baseConverter.ts

/**
 * Base conversion utilities for programmer mode
 * Handles conversion between HEX, DEC, OCT, and BIN
 */

export type BaseType = "HEX" | "DEC" | "OCT" | "BIN";

export interface BaseConversions {
  hex: string;
  dec: string;
  oct: string;
  bin: string;
}

/**
 * Validates if a string is a valid number in the given base
 */
export const isValidNumber = (value: string, base: BaseType): boolean => {
  if (!value || value === "0") return true;

  const patterns: Record<BaseType, RegExp> = {
    HEX: /^-?[0-9A-Fa-f]+$/,
    DEC: /^-?\d+$/,
    OCT: /^-?[0-7]+$/,
    BIN: /^-?[01]+$/,
  };

  return patterns[base].test(value);
};

/**
 * Converts a number from any base to decimal
 */
export const toDecimal = (value: string, fromBase: BaseType): number | null => {
  if (!value) return 0;
  if (!isValidNumber(value, fromBase)) return null;

  const bases: Record<BaseType, number> = {
    HEX: 16,
    DEC: 10,
    OCT: 8,
    BIN: 2,
  };

  try {
    return parseInt(value, bases[fromBase]);
  } catch {
    return null;
  }
};

/**
 * Converts a decimal number to the target base
 */
export const fromDecimal = (value: number, toBase: BaseType): string => {
  if (isNaN(value)) return "0";

  const isNegative = value < 0;
  const absValue = Math.abs(value);

  let result: string;
  switch (toBase) {
    case "HEX":
      result = absValue.toString(16).toUpperCase();
      break;
    case "DEC":
      result = absValue.toString(10);
      break;
    case "OCT":
      result = absValue.toString(8);
      break;
    case "BIN":
      result = absValue.toString(2);
      break;
  }

  return isNegative ? `-${result}` : result;
};

/**
 * Converts a number from one base to another
 */
export const convertBase = (
  value: string,
  fromBase: BaseType,
  toBase: BaseType
): string | null => {
  if (!value) return "0";
  if (fromBase === toBase) return value;

  const decimal = toDecimal(value, fromBase);
  if (decimal === null) return null;

  return fromDecimal(decimal, toBase);
};

/**
 * Converts a number to all bases simultaneously
 */
export const convertToAllBases = (
  value: string,
  fromBase: BaseType
): BaseConversions | null => {
  if (!value) {
    return {
      hex: "0",
      dec: "0",
      oct: "0",
      bin: "0",
    };
  }

  const decimal = toDecimal(value, fromBase);
  if (decimal === null) return null;

  return {
    hex: fromDecimal(decimal, "HEX"),
    dec: fromDecimal(decimal, "DEC"),
    oct: fromDecimal(decimal, "OCT"),
    bin: fromDecimal(decimal, "BIN"),
  };
};

/**
 * Formats binary with spaces for readability (groups of 4)
 * Example: "11010101" -> "1101 0101"
 */
export const formatBinary = (bin: string): string => {
  const isNegative = bin.startsWith("-");
  const value = isNegative ? bin.slice(1) : bin;

  // Pad to multiple of 4
  const paddedLength = Math.ceil(value.length / 4) * 4;
  const padded = value.padStart(paddedLength, "0");

  // Group by 4
  const groups = padded.match(/.{1,4}/g) || [];
  const formatted = groups.join(" ");

  return isNegative ? `-${formatted}` : formatted;
};

/**
 * Formats hex with spaces for readability (groups of 4)
 * Example: "DEADBEEF" -> "DEAD BEEF"
 */
export const formatHex = (hex: string): string => {
  const isNegative = hex.startsWith("-");
  const value = isNegative ? hex.slice(1) : hex;

  const groups = value.match(/.{1,4}/g) || [];
  const formatted = groups.join(" ");

  return isNegative ? `-${formatted}` : formatted;
};

/**
 * Extracts the current number from an expression (rightmost number)
 */
export const extractCurrentNumber = (expression: string): string => {
  if (!expression || expression === "0") return "0";

  // Remove any trailing operators
  const trimmed = expression.replace(/[\+\-\*\/\%\(\)]+$/, "");

  // Extract the last number (handles negative numbers)
  const match = trimmed.match(/([\+\-\*\/\%\(\)]|^)-?\w+$/);
  if (!match) return "0";

  const number = match[0].replace(/^[\+\-\*\/\%\(\)]/, "");
  return number || "0";
};

/**
 * Prepares an expression for evaluation in programmer mode
 * Converts numbers from the current base to decimal and replaces bitwise operators
 *
 * @param expression - The expression to prepare (e.g., "FF & A" in HEX mode)
 * @param base - The current number base
 * @returns The expression ready for mathjs evaluation (e.g., "255 & 10")
 *
 * @example
 * prepareExpressionForEval("FF & A", "HEX") // Returns "255 & 10"
 * prepareExpressionForEval("~5", "DEC") // Returns "bitNot(5)"
 * prepareExpressionForEval("5 ^ 3", "DEC") // Returns "bitXor(5, 3)"
 */
export const prepareExpressionForEval = (
  expression: string,
  base: BaseType
): string => {
  if (!expression || expression === "0") return "0";

  // Bitwise operators that need special handling
  const BITWISE_OPS = {
    " & ": " & ",     // AND - works as-is
    " | ": " | ",     // OR - works as-is
    " ^ ": "§XOR§",   // XOR - needs to be replaced (temporary marker)
    "~": "§NOT§",     // NOT - needs to be replaced (temporary marker)
  };

  // Step 1: Mark XOR and NOT operators with temporary markers
  let prepared = expression;
  prepared = prepared.replace(/\s\^\s/g, BITWISE_OPS[" ^ "]);
  prepared = prepared.replace(/~/g, BITWISE_OPS["~"]);

  // Step 2: Extract all tokens (numbers, operators, parentheses, functions)
  // Match: hex digits, decimal digits, operators, parentheses, function names, whitespace
  const tokenRegex = /([A-Fa-f0-9]+|[\+\-\*\/\%\(\)\&\|\s]|§[A-Z]+§)/g;
  const tokens = prepared.match(tokenRegex) || [];

  // Step 3: Convert numbers from current base to decimal
  const converted = tokens.map((token) => {
    // Skip operators, parentheses, whitespace, and markers
    if (
      /^[\+\-\*\/\%\(\)\&\|\s§]/.test(token) ||
      token === "" ||
      token.includes("§")
    ) {
      return token;
    }

    // Check if it's a valid number in the current base
    if (isValidNumber(token, base)) {
      const decimal = toDecimal(token, base);
      return decimal !== null ? decimal.toString() : token;
    }

    return token;
  });

  let result = converted.join("");

  // Step 4: Replace temporary markers with mathjs functions
  // Handle NOT: §NOT§5 -> bitNot(5)
  // Need to find what comes after NOT
  result = result.replace(/§NOT§\s*(\d+)/g, "bitNot($1)");
  result = result.replace(/§NOT§\s*\(/g, "bitNot(");

  // Handle XOR: 5§XOR§3 -> bitXor(5, 3)
  // This is tricky because we need to find the operands on both sides
  // Use a regex that captures the left operand, marker, and right operand
  result = result.replace(/(\d+)\s*§XOR§\s*(\d+)/g, "bitXor($1, $2)");

  return result;
};
