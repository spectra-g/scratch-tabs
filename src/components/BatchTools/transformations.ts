import { TransformationConfig } from "../../stores/batchToolsStore";

export function applyTransformations(
  content: string,
  config: TransformationConfig,
): string {
  if (!content) return "";

  const originalLines = content.split("\n");
  const processedLines = [...originalLines];

  let result: string;

  // If no condition is specified, apply transformations to all lines
  if (!config.condition) {
    const transformedLines = applyTransformationsToLines(
      processedLines,
      config,
    );
    result = transformedLines.join("\n");
  } else {
    // Apply condition-based transformations
    const matchingIndices = getMatchingLineIndices(
      originalLines,
      config.condition,
    );
    const matchingLines = matchingIndices.map((i) => originalLines[i]);
    const transformedMatchingLines = applyTransformationsToLines(
      matchingLines,
      config,
    );

    // Reconstruct the result with transformed matching lines
    const reconstructedLines = originalLines.map((line, index) => {
      const matchIndex = matchingIndices.indexOf(index);
      if (matchIndex !== -1) {
        return transformedMatchingLines[matchIndex] || line;
      }
      return line;
    });

    result = reconstructedLines.join("\n");
  }

  // Handle JavaScript snippet with enhanced context AFTER all other transformations
  if (config.javascriptSnippet) {
    return applyJavaScriptSnippet(result, config.javascriptSnippet, {
      condition: config.condition,
      originalLines,
    });
  }

  return result;
}

function getMatchingLineIndices(
  lines: string[],
  condition: NonNullable<Exclude<TransformationConfig["condition"], false>>,
): number[] {
  const matchingIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matches = false;

    switch (condition.type) {
      case "contains":
        matches = condition.value ? line.includes(condition.value) : false;
        break;
      case "not-contains":
        matches = condition.value ? !line.includes(condition.value) : true;
        break;
      case "starts-with":
        matches = condition.value ? line.startsWith(condition.value) : false;
        break;
      case "ends-with":
        matches = condition.value ? line.endsWith(condition.value) : false;
        break;
      case "regex":
        if (condition.value) {
          try {
            const regex = new RegExp(condition.value, "i");
            matches = regex.test(line);
          } catch (e) {
            matches = false;
          }
        }
        break;
      case "blank":
        matches = line.trim() === "";
        break;
      case "not-blank":
        matches = line.trim() !== "";
        break;
      case "line-number":
        matches = condition.lineNumber ? i + 1 === condition.lineNumber : false;
        break;
      case "line-range":
        if (condition.startLine && condition.endLine) {
          const lineNum = i + 1;
          matches =
            lineNum >= condition.startLine && lineNum <= condition.endLine;
        }
        break;
      case "every-nth":
        if (condition.nthInterval && condition.nthInterval > 0) {
          matches = (i + 1) % condition.nthInterval === 0;
        }
        break;
    }

    if (matches) {
      matchingIndices.push(i);
    }
  }

  return matchingIndices;
}

function applyTransformationsToLines(
  lines: string[],
  config: TransformationConfig,
): string[] {
  // Track both current text and original text for the first phase of transformations
  let processedLines: { text: string; original: string }[] = lines.map(
    (line) => ({
      text: line,
      original: line,
    }),
  );

  // 1. Whitespace & Cleanup
  if (config.trim) {
    processedLines = processedLines.map((line) => ({
      ...line,
      text: line.text.trim(),
    }));
  }

  if (config.removeExtraWhitespace === "preserve-single") {
    processedLines = processedLines.map((line) => ({
      ...line,
      text: line.text.replace(/\s+/g, " "),
    }));
  } else if (config.removeExtraWhitespace === "remove-all") {
    processedLines = processedLines.map((line) => ({
      ...line,
      text: line.text.replace(/\s+/g, ""),
    }));
  }

  if (config.removeExtraBlankLines) {
    const result: { text: string; original: string }[] = [];
    let lastWasEmpty = false;
    for (const line of processedLines) {
      const isEmpty = line.text.trim() === "";
      if (!isEmpty || !lastWasEmpty) {
        result.push(line);
      }
      lastWasEmpty = isEmpty;
    }
    processedLines = result;
  }

  if (config.removeAllBlankLines) {
    processedLines = processedLines.filter((line) => line.text.trim() !== "");
  }

  // 2. Case Conversion
  if (config.caseTransform) {
    processedLines = processedLines.map((line) => ({
      ...line,
      text: transformCase(line.text, config.caseTransform!),
    }));
  }

  // 3. Duplicates
  if (config.removeDuplicates) {
    const seen = new Set<string>();
    const result: { text: string; original: string }[] = [];
    for (const line of processedLines) {
      if (!seen.has(line.text)) {
        seen.add(line.text);
        result.push(line);
      }
    }
    processedLines = result;
  }

  // 4. Filtering & Selection
  if (config.filterByRegex) {
    try {
      const { pattern, caseSensitive = true } = config.filterByRegex;
      const flags = caseSensitive ? "gm" : "gmi";
      const regex = new RegExp(pattern, flags);

      processedLines = processedLines.filter((line) => {
        const matches = regex.test(line.text);
        regex.lastIndex = 0; // Reset for global flag
        return matches;
      });
    } catch (e) {
      // Invalid regex
    }
  }

  if (config.filterByKeyword) {
    const { keyword, action, position = "contains" } = config.filterByKeyword;
    processedLines = processedLines.filter((line) => {
      const lowerLine = line.text.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      let matches = false;

      if (position === "contains") {
        matches = lowerLine.includes(lowerKeyword);
      } else if (position === "starts") {
        matches = lowerLine.startsWith(lowerKeyword);
      } else if (position === "ends") {
        matches = lowerLine.endsWith(lowerKeyword);
      }

      return action === "keep" ? matches : !matches;
    });
  }

  if (config.keepFirstNLines && config.keepFirstNLines > 0) {
    processedLines = processedLines.slice(0, config.keepFirstNLines);
  }

  if (config.keepLastNLines && config.keepLastNLines > 0) {
    processedLines = processedLines.slice(-config.keepLastNLines);
  }

  // 5. Duplicate lines
  if (config.duplicateLines && config.duplicateLines > 1) {
    const duplicated: { text: string; original: string }[] = [];
    for (const line of processedLines) {
      for (let i = 0; i < config.duplicateLines; i++) {
        duplicated.push({ ...line });
      }
    }
    processedLines = duplicated;
  }

  // 6. Prefix/Suffix & Numbering
  // IMPORTANT: This creates the "final" text content for this line, but still using .original for interpolation
  let finalLines: string[] = processedLines.map((line) => {
    let resultText = line.text;

    if (config.addPrefix || config.addSuffix) {
      const valueForSubstitution = line.original; // USE ORIGINAL VALUE
      let prefix = "";
      let suffix = "";

      if (config.addPrefix) {
        prefix = config.addPrefix.replace(/\$value/g, valueForSubstitution);
      }

      if (config.addSuffix) {
        suffix = config.addSuffix.replace(/\$value/g, valueForSubstitution);
      }

      resultText = prefix + resultText + suffix;
    }
    return resultText;
  });

  // ------- Transition to string[] processing for layout/formatting steps -------

  if (config.numberLines) {
    finalLines = finalLines.map((line, index) => {
      let prefix: string;
      switch (config.numberLines) {
        case "numeric":
          prefix = `${index + 1}. `;
          break;
        case "roman":
          prefix = `${toRoman(index + 1)}. `;
          break;
        case "alpha":
          prefix = `${toAlpha(index + 1)}. `;
          break;
        default:
          prefix = `${index + 1}. `;
      }
      return prefix + line;
    });
  }

  // 7. Indentation
  if (config.changeIndentation) {
    const { action, amount, type } = config.changeIndentation;
    const indentStr =
      type === "spaces" ? " ".repeat(amount) : "\t".repeat(amount);

    if (action === "add") {
      finalLines = finalLines.map((line) => indentStr + line);
    } else {
      // Remove indentation
      const removeStr =
        type === "spaces" ? " ".repeat(amount) : "\t".repeat(amount);
      finalLines = finalLines.map((line) => {
        if (line.startsWith(removeStr)) {
          return line.slice(removeStr.length);
        }
        return line;
      });
    }
  }

  // 8. Padding
  if (config.padLines) {
    const { length, align, char } = config.padLines;
    finalLines = finalLines.map((line) => {
      if (line.length >= length) return line;
      const padding = char.repeat(length - line.length);

      switch (align) {
        case "left":
          return line + padding;
        case "right":
          return padding + line;
        case "center": {
          const leftPad = Math.floor(padding.length / 2);
          const rightPad = padding.length - leftPad;
          return char.repeat(leftPad) + line + char.repeat(rightPad);
        }
        default:
          return line + padding;
      }
    });
  }

  // 9. Randomize
  if (config.shuffleLines) {
    finalLines = shuffleArray([...finalLines]);
  }

  // 10. Join/Split operations
  if (config.splitLines) {
    const allSplit: string[] = [];
    for (const line of finalLines) {
      allSplit.push(...line.split(config.splitLines));
    }
    finalLines = allSplit;
  }

  // 11. Sorting & Line Order
  if (config.sortLines) {
    finalLines = sortLines(finalLines, config.sortLines);
  }

  if (config.reverseLines) {
    finalLines = finalLines.reverse();
  }

  // Join back to string
  let result = finalLines.join("\n");

  // 12. Final formatting
  if (config.convertTabsSpaces === "tabs-to-spaces") {
    result = result.replace(/\t/g, "    "); // 4 spaces
  } else if (config.convertTabsSpaces === "spaces-to-tabs") {
    result = result.replace(/ {4}/g, "\t"); // 4 spaces to 1 tab
  }

  if (config.normalizeLineEndings === "lf") {
    result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  } else if (config.normalizeLineEndings === "crlf") {
    result = result
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "\r\n");
  }

  if (config.wrapLines && config.wrapLines > 0) {
    result = wrapText(result, config.wrapLines);
  }

  // 13. Redaction
  if (config.redaction) {
    result = applyRedaction(result, config.redaction);
  }

  // 14. Advanced Transformations (only regex find/replace, JS is handled separately)
  if (config.findReplaceRegex) {
    result = applyRegexFindReplace(result, config.findReplaceRegex);
  }

  // Apply join lines last
  if (config.joinLines) {
    result = result.replace(/\n/g, config.joinLines);
  }

  return result.split("\n");
}

function transformCase(
  text: string,
  transform: NonNullable<TransformationConfig["caseTransform"]>,
): string {
  switch (transform) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
    case "sentence":
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case "camel":
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase(),
        )
        .replace(/\s+/g, "");
    case "pascal":
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, "");
    case "kebab":
      return text.toLowerCase().replace(/\s+/g, "-");
    case "snake":
      return text.toLowerCase().replace(/\s+/g, "_");
    case "invert":
      return text
        .split("")
        .map((char) =>
          char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase(),
        )
        .join("");
    case "alternating":
      return text
        .split("")
        .map((char, index) =>
          index % 2 === 0 ? char.toLowerCase() : char.toUpperCase(),
        )
        .join("");
    case "screaming-snake":
      return text
        .replace(/([a-z])([A-Z])/g, "$1_$2") // Handle camelCase boundaries
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""); // Trim leading/trailing underscores
    default:
      return text;
  }
}

function sortLines(
  lines: string[],
  sortType: NonNullable<TransformationConfig["sortLines"]>,
): string[] {
  switch (sortType) {
    case "asc":
      return [...lines].sort();
    case "desc":
      return [...lines].sort().reverse();
    case "natural":
      return [...lines].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
    case "numeric-asc":
      return [...lines].sort((a, b) => parseFloat(a) - parseFloat(b));
    case "numeric-desc":
      return [...lines].sort((a, b) => parseFloat(b) - parseFloat(a));
    case "length":
      return [...lines].sort((a, b) => a.length - b.length);
    default:
      return lines;
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function wrapText(text: string, width: number): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= width) return line;

      const words = line.split(" ");
      const wrapped: string[] = [];
      let currentLine = "";

      for (const word of words) {
        if (currentLine.length + word.length + 1 <= width) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) wrapped.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) wrapped.push(currentLine);
      return wrapped.join("\n");
    })
    .join("\n");
}

function toRoman(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I",
  ];
  let result = "";

  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }
  return result;
}

function toAlpha(num: number): string {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

function applyRegexFindReplace(
  text: string,
  config: { find: string; replace: string; flags?: string },
): string {
  try {
    // Default flags include 'gm' to support line anchors (^ and $) properly
    const defaultFlags = "gm";
    const flags = config.flags || defaultFlags;

    // Ensure 'm' flag is included if the pattern contains ^ or $ anchors
    let finalFlags = flags;
    if ((config.find.includes('^') || config.find.includes('$')) && !flags.includes('m')) {
      finalFlags = flags + 'm';
    }

    const regex = new RegExp(config.find, finalFlags);
    return text.replace(regex, config.replace);
  } catch (error) {
    console.error("Regex find/replace error:", error);
    return text; // Return original text if regex is invalid
  }
}

function applyRedaction(
  text: string,
  config: NonNullable<Exclude<TransformationConfig["redaction"], false>>,
): string {
  let result = text;

  // Built-in patterns
  const builtInRegexes: { [key: string]: RegExp } = {
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ipAddresses: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    creditCards: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    ssn: /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g,
    phoneNumbers: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    dates: /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-\d{1,2}-\d{2,4})\b/g,
    urls: /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?/g,
    secrets: /\b(?:(?:api[_-]?key|token|secret|password|auth[_-]?key)[_-]?[:=]\s*[^\s\n"']+|[A-Za-z0-9]{32,})\b/gi,
  };

  // Apply built-in patterns
  for (const [patternType, regex] of Object.entries(builtInRegexes)) {
    if (config.builtInPatterns[patternType as keyof typeof config.builtInPatterns]) {
      result = result.replace(regex, (match) => getRedactedValue(match, config));
    }
  }

  // Apply custom patterns
  for (const pattern of config.customPatterns) {
    if (!pattern.trim()) continue;

    try {
      let regex: RegExp;

      if (config.patternType === "exact") {
        // Escape special regex characters for exact matching
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escapedPattern, 'g');
      } else if (config.patternType === "wildcard") {
        // Convert wildcard pattern to regex
        const wildcardPattern = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars except * and ?
          .replace(/\*/g, '[^\\s]*') // Convert * to [^\s]* (match non-whitespace)
          .replace(/\?/g, '.'); // Convert ? to .
        regex = new RegExp(`\\b${wildcardPattern}\\b`, 'g');
      } else {
        // Use as regex pattern
        regex = new RegExp(pattern, 'g');
      }

      result = result.replace(regex, (match) => getRedactedValue(match, config));
    } catch (error) {
      // Skip invalid patterns
      console.warn(`Invalid redaction pattern: ${pattern}`, error);
    }
  }

  return result;
}

function getRedactedValue(
  originalValue: string,
  config: NonNullable<Exclude<TransformationConfig["redaction"], false>>,
): string {
  switch (config.redactionMode) {
    case "block":
      return "█".repeat(originalValue.length);
    case "placeholder":
      return config.placeholderText || "[REDACTED]";
    case "mask":
      const maskChar = config.maskCharacter || "*";
      return maskChar.repeat(originalValue.length);
    case "delete":
      return "";
    default:
      return "[REDACTED]";
  }
}

function applyJavaScriptSnippet(
  text: string,
  snippet: string,
  context?: {
    condition?: TransformationConfig["condition"];
    originalLines: string[];
  },
): string {
  try {
    // Create enhanced execution context
    const lines = text.split("\n");
    const selection = text; // For now, treat entire content as selection
    const originalLines = context?.originalLines || lines;

    // Get matching lines if condition exists
    let matchingLines = lines;
    if (context?.condition) {
      const matchingIndices = getMatchingLineIndices(
        originalLines,
        context.condition,
      );
      matchingLines = matchingIndices.map((i) => originalLines[i]);
    }

    // Create the function wrapper with enhanced context
    const functionBody = `
      try {
        const text = arguments[0];
        const lines = arguments[1];
        const selection = arguments[2];
        const originalLines = arguments[3];
        const matchingLines = arguments[4];
        const condition = arguments[5];
        
        // User's code goes here
        ${snippet}
      } catch (error) {
        throw new Error('JavaScript execution error: ' + error.message);
      }
    `;

    // Create and execute the function
    const userFunction = new Function(functionBody);
    const result = userFunction(
      text,
      lines,
      selection,
      originalLines,
      matchingLines,
      context?.condition,
    );

    // Handle different return types
    if (typeof result === "string") {
      return result;
    } else if (Array.isArray(result)) {
      return result.join("\n");
    } else if (result !== undefined && result !== null) {
      return String(result);
    } else {
      return text; // Return original if no valid result
    }
  } catch (error) {
    console.error("JavaScript snippet error:", error);
    throw new Error(
      `JavaScript execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
