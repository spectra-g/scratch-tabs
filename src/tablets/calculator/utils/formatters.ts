// src/tablets/calculator/utils/formatters.ts

export const formatDisplay = (value: any): string => {
  if (typeof value === "number") {
    return parseFloat(value.toPrecision(14)).toString();
  }
  return String(value);
};

export const getDisplayFontSize = (text: string): string => {
  const length = text?.length || 1;
  if (length > 24) return "text-xl";
  if (length > 16) return "text-2xl";
  return "text-3xl";
};

const operatorMap: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "*": "times",
  "/": "divided by",
  "%": "percent of",
};

// --- VERSION 1: SIMPLE, MAGNITUDE-BASED HUMANIZER (for inside the display) ---

function humanizeNumberSimple(numStr: string): string {
  const num = parseFloat(numStr);
  if (isNaN(num)) return numStr;
  if (numStr.includes('.')) return numStr;

  const magnitudes = [
    { value: 1e12, name: "trillion" },
    { value: 1e9, name: "billion" },
    { value: 1e6, name: "million" },
    { value: 1e3, name: "thousand" },
  ];

  for (const mag of magnitudes) {
    if (Math.abs(num) >= mag.value) {
      const formattedNum = (num / mag.value).toLocaleString(undefined, { maximumFractionDigits: 2 });
      return `${formattedNum} ${mag.name}`;
    }
  }
  return num.toLocaleString();
}

export const humanizeExpressionSimple = (expression: string): string => {
  if (!expression || expression === "0") return "";
  const tokens = expression.match(/(-?\d+\.?\d*)|([+\-*/%()])/g) || [];
  return tokens.map(token => {
      if (operatorMap[token]) return ` ${token} `;
      if (!isNaN(parseFloat(token))) return humanizeNumberSimple(token);
      return token;
    }).join('').replace(/\s+/g, ' ').trim();
};

// --- VERSION 2: HYBRID, DETAILED HUMANIZER (for below the display) ---

function humanizeNumberHybrid(numStr: string): string {
  if (numStr.includes('.')) {
    const [integer, decimal] = numStr.split('.');
    return `${humanizeNumberHybrid(integer)} point ${decimal}`;
  }

  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr;
  if (num === 0) return "0";

  const sign = num < 0 ? "negative " : "";
  const absNumStr = Math.abs(num).toString();

  const groups: string[] = [];
  for (let i = absNumStr.length; i > 0; i -= 3) {
    groups.unshift(absNumStr.substring(Math.max(0, i - 3), i));
  }

  const magnitudes = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];
  let result = "";

  for (let i = 0; i < groups.length; i++) {
    const groupNum = parseInt(groups[i], 10);
    if (groupNum > 0) {
      const magnitudeIndex = groups.length - 1 - i;

      // Handle cases where we have more groups than magnitude names
      const magnitudeName = magnitudeIndex < magnitudes.length
        ? magnitudes[magnitudeIndex]
        : `×10^${magnitudeIndex * 3}`;

      result += `${groupNum} ${magnitudeName} `;
    }
  }

  return sign + result.trim();
}

export const humanizeExpressionHybrid = (expression: string): string => {
  if (!expression || expression === "0" || expression === "Error") return "";
  const tokens = expression.match(/(-?\d+\.?\d*)|([+\-*/%()])/g) || [];
  if (tokens.length === 0) return "";

  const humanizedTokens = tokens.map(token => {
    if (operatorMap[token]) return operatorMap[token];
    if (!isNaN(parseFloat(token))) return humanizeNumberHybrid(token);
    return token;
  }).filter(token => token !== '(' && token !== ')');

  const result = humanizedTokens.join(" ");
  return result.charAt(0).toUpperCase() + result.slice(1);
};
