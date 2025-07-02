import { TransformationConfig } from '../../stores/batchToolsStore';

export function applyTransformations(content: string, config: TransformationConfig): string {
  if (!content) return '';

  const originalLines = content.split('\n');
  let processedLines = [...originalLines];

  let result: string;

  // If no condition is specified, apply transformations to all lines
  if (!config.condition) {
    const transformedLines = applyTransformationsToLines(processedLines, config);
    result = transformedLines.join('\n');
  } else {
    // Apply condition-based transformations
    const matchingIndices = getMatchingLineIndices(originalLines, config.condition);
    const matchingLines = matchingIndices.map(i => originalLines[i]);
    const transformedMatchingLines = applyTransformationsToLines(matchingLines, config);

    // Reconstruct the result with transformed matching lines
    const reconstructedLines = originalLines.map((line, index) => {
      const matchIndex = matchingIndices.indexOf(index);
      if (matchIndex !== -1) {
        return transformedMatchingLines[matchIndex] || line;
      }
      return line;
    });

    result = reconstructedLines.join('\n');
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

function getMatchingLineIndices(lines: string[], condition: NonNullable<Exclude<TransformationConfig['condition'], false>>): number[] {
  const matchingIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matches = false;

    switch (condition.type) {
      case 'contains':
        matches = condition.value ? line.includes(condition.value) : false;
        break;
      case 'not-contains':
        matches = condition.value ? !line.includes(condition.value) : true;
        break;
      case 'starts-with':
        matches = condition.value ? line.startsWith(condition.value) : false;
        break;
      case 'ends-with':
        matches = condition.value ? line.endsWith(condition.value) : false;
        break;
      case 'regex':
        if (condition.value) {
          try {
            const regex = new RegExp(condition.value, 'i');
            matches = regex.test(line);
          } catch (e) {
            matches = false;
          }
        }
        break;
      case 'blank':
        matches = line.trim() === '';
        break;
      case 'not-blank':
        matches = line.trim() !== '';
        break;
      case 'line-number':
        matches = condition.lineNumber ? (i + 1) === condition.lineNumber : false;
        break;
      case 'line-range':
        if (condition.startLine && condition.endLine) {
          const lineNum = i + 1;
          matches = lineNum >= condition.startLine && lineNum <= condition.endLine;
        }
        break;
      case 'every-nth':
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

function applyTransformationsToLines(lines: string[], config: TransformationConfig): string[] {
  let processedLines = [...lines];

  // 1. Whitespace & Cleanup
  if (config.trim) {
    processedLines = processedLines.map(line => line.trim());
  }

  if (config.removeExtraWhitespace === 'preserve-single') {
    processedLines = processedLines.map(line => line.replace(/\s+/g, ' '));
  } else if (config.removeExtraWhitespace === 'remove-all') {
    processedLines = processedLines.map(line => line.replace(/\s+/g, ''));
  }

  if (config.removeExtraBlankLines) {
    const result: string[] = [];
    let lastWasEmpty = false;
    for (const line of processedLines) {
      const isEmpty = line.trim() === '';
      if (!isEmpty || !lastWasEmpty) {
        result.push(line);
      }
      lastWasEmpty = isEmpty;
    }
    processedLines = result;
  }

  if (config.removeAllBlankLines) {
    processedLines = processedLines.filter(line => line.trim() !== '');
  }

  // 2. Case Conversion
  if (config.caseTransform) {
    processedLines = processedLines.map(line => transformCase(line, config.caseTransform!));
  }

  // 3. Duplicates
  if (config.removeDuplicates) {
    processedLines = [...new Set(processedLines)];
  }

  // 4. Filtering & Selection
  if (config.filterByRegex) {
    try {
      const { pattern, caseSensitive = true } = config.filterByRegex;
      const flags = caseSensitive ? 'gm' : 'gmi';
      const regex = new RegExp(pattern, flags);
      
      processedLines = processedLines.filter(line => {
        const matches = regex.test(line);
        regex.lastIndex = 0; // Reset for global flag to prevent state issues
        return matches;
      });
    } catch (e) {
      // Invalid regex, skip filtering
    }
  }

  if (config.filterByKeyword) {
    const { keyword, action, position = 'contains' } = config.filterByKeyword;
    processedLines = processedLines.filter(line => {
      const lowerLine = line.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      let matches = false;

      if (position === 'contains') {
        matches = lowerLine.includes(lowerKeyword);
      } else if (position === 'starts') {
        matches = lowerLine.startsWith(lowerKeyword);
      } else if (position === 'ends') {
        matches = lowerLine.endsWith(lowerKeyword);
      }

      return action === 'keep' ? matches : !matches;
    });
  }

  if (config.keepFirstNLines && config.keepFirstNLines > 0) {
    processedLines = processedLines.slice(0, config.keepFirstNLines);
  }

  if (config.keepLastNLines && config.keepLastNLines > 0) {
    processedLines = processedLines.slice(-config.keepLastNLines);
  }

  // 5. Duplicate lines (before numbering so numbers are sequential)
  if (config.duplicateLines && config.duplicateLines > 1) {
    const duplicated: string[] = [];
    for (const line of processedLines) {
      for (let i = 0; i < config.duplicateLines; i++) {
        duplicated.push(line);
      }
    }
    processedLines = duplicated;
  }

  // 6. Prefix/Suffix & Numbering
  if (config.addPrefix) {
    processedLines = processedLines.map(line => config.addPrefix + line);
  }

  if (config.addSuffix) {
    processedLines = processedLines.map(line => line + config.addSuffix);
  }

  if (config.numberLines) {
    processedLines = processedLines.map((line, index) => {
      let prefix: string;
      switch (config.numberLines) {
        case 'numeric':
          prefix = `${index + 1}. `;
          break;
        case 'roman':
          prefix = `${toRoman(index + 1)}. `;
          break;
        case 'alpha':
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
    const indentStr = type === 'spaces' ? ' '.repeat(amount) : '\t'.repeat(amount);

    if (action === 'add') {
      processedLines = processedLines.map(line => indentStr + line);
    } else {
      // Remove indentation
      const removeStr = type === 'spaces' ? ' '.repeat(amount) : '\t'.repeat(amount);
      processedLines = processedLines.map(line => {
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
    processedLines = processedLines.map(line => {
      if (line.length >= length) return line;
      const padding = char.repeat(length - line.length);

      switch (align) {
        case 'left': return line + padding;
        case 'right': return padding + line;
        case 'center': {
          const leftPad = Math.floor(padding.length / 2);
          const rightPad = padding.length - leftPad;
          return char.repeat(leftPad) + line + char.repeat(rightPad);
        }
        default: return line + padding;
      }
    });
  }

  // 9. Randomize
  if (config.shuffleLines) {
    processedLines = shuffleArray([...processedLines]);
  }

  // 10. Join/Split operations
  if (config.splitLines) {
    const allSplit: string[] = [];
    for (const line of processedLines) {
      allSplit.push(...line.split(config.splitLines));
    }
    processedLines = allSplit;
  }

  // 11. Sorting & Line Order
  if (config.sortLines) {
    processedLines = sortLines(processedLines, config.sortLines);
  }

  if (config.reverseLines) {
    processedLines = processedLines.reverse();
  }

  // Join back to string
  let result = processedLines.join('\n');

  // 12. Final formatting
  if (config.convertTabsSpaces === 'tabs-to-spaces') {
    result = result.replace(/\t/g, '    '); // 4 spaces
  } else if (config.convertTabsSpaces === 'spaces-to-tabs') {
    result = result.replace(/    /g, '\t'); // 4 spaces to 1 tab
  }

  if (config.normalizeLineEndings === 'lf') {
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  } else if (config.normalizeLineEndings === 'crlf') {
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  }

  if (config.wrapLines && config.wrapLines > 0) {
    result = wrapText(result, config.wrapLines);
  }

  // 13. Advanced Transformations (only regex find/replace, JS is handled separately)
  if (config.findReplaceRegex) {
    result = applyRegexFindReplace(result, config.findReplaceRegex);
  }

    // Apply join lines last
  if (config.joinLines) {
    result = result.replace(/\n/g, config.joinLines);
  }
  
  return result.split('\n');
}

function transformCase(text: string, transform: NonNullable<TransformationConfig['caseTransform']>): string {
  switch (transform) {
    case 'upper': return text.toUpperCase();
    case 'lower': return text.toLowerCase();
    case 'title': return text.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    case 'sentence': return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'camel': return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
    case 'pascal': return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) =>
      word.toUpperCase()).replace(/\s+/g, '');
    case 'kebab': return text.toLowerCase().replace(/\s+/g, '-');
    case 'snake': return text.toLowerCase().replace(/\s+/g, '_');
    case 'invert': return text.split('').map(char =>
      char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()).join('');
    case 'alternating': return text.split('').map((char, index) =>
      index % 2 === 0 ? char.toLowerCase() : char.toUpperCase()).join('');
    default: return text;
  }
}

function sortLines(lines: string[], sortType: NonNullable<TransformationConfig['sortLines']>): string[] {
  switch (sortType) {
    case 'asc': return [...lines].sort();
    case 'desc': return [...lines].sort().reverse();
    case 'natural': return [...lines].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    case 'numeric-asc': return [...lines].sort((a, b) => parseFloat(a) - parseFloat(b));
    case 'numeric-desc': return [...lines].sort((a, b) => parseFloat(b) - parseFloat(a));
    case 'length': return [...lines].sort((a, b) => a.length - b.length);
    default: return lines;
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
  return text.split('\n').map(line => {
    if (line.length <= width) return line;

    const words = line.split(' ');
    const wrapped: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) wrapped.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) wrapped.push(currentLine);
    return wrapped.join('\n');
  }).join('\n');
}

function toRoman(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';

  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }
  return result;
}

function toAlpha(num: number): string {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

function applyRegexFindReplace(text: string, config: { find: string; replace: string; flags?: string }): string {
  try {
    const flags = config.flags || 'g';
    const regex = new RegExp(config.find, flags);
    return text.replace(regex, config.replace);
  } catch (error) {
    console.error('Regex find/replace error:', error);
    return text; // Return original text if regex is invalid
  }
}

function applyJavaScriptSnippet(
  text: string,
  snippet: string,
  context?: { condition?: TransformationConfig['condition']; originalLines: string[] }
): string {
  try {
    // Create enhanced execution context
    const lines = text.split('\n');
    const selection = text; // For now, treat entire content as selection
    const originalLines = context?.originalLines || lines;

    // Get matching lines if condition exists
    let matchingLines = lines;
    if (context?.condition) {
      const matchingIndices = getMatchingLineIndices(originalLines, context.condition);
      matchingLines = matchingIndices.map(i => originalLines[i]);
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
    const result = userFunction(text, lines, selection, originalLines, matchingLines, context?.condition);

    // Handle different return types
    if (typeof result === 'string') {
      return result;
    } else if (Array.isArray(result)) {
      return result.join('\n');
    } else if (result !== undefined && result !== null) {
      return String(result);
    } else {
      return text; // Return original if no valid result
    }
  } catch (error) {
    console.error('JavaScript snippet error:', error);
    throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}