import { create } from 'zustand';

export interface TransformationConfig {
  // Whitespace & Cleanup
  trim?: boolean;
  removeExtraWhitespace?: 'preserve-single' | 'remove-all' | false;
  removeExtraBlankLines?: boolean;
  removeAllBlankLines?: boolean;

  // Sorting & Line Order  
  sortLines?: 'asc' | 'desc' | 'natural' | 'numeric-asc' | 'numeric-desc' | 'length' | false;
  reverseLines?: boolean;
  removeDuplicates?: boolean;

  // Case Conversion
  caseTransform?: 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'kebab' | 'snake' | 'invert' | 'alternating' | false;

  // Prefix/Suffix & Numbering
  addPrefix?: string;
  addSuffix?: string;
  numberLines?: 'numeric' | 'roman' | 'alpha' | false;

  // Join / Split Lines
  joinLines?: string | false; // separator
  splitLines?: string | false; // delimiter

  // Indentation
  changeIndentation?: { action: 'add' | 'remove'; amount: number; type: 'tabs' | 'spaces' } | false;

  // Duplicate / Pad
  duplicateLines?: number | false;
  padLines?: { length: number; align: 'left' | 'right' | 'center'; char: string } | false;

  // Filtering & Selection
  filterByRegex?: string | false;
  filterByKeyword?: { keyword: string; action: 'keep' | 'remove'; position?: 'contains' | 'starts' | 'ends' } | false;
  keepFirstNLines?: number | false;
  keepLastNLines?: number | false;

  // Randomize
  shuffleLines?: boolean;

  // Other Formatting
  convertTabsSpaces?: 'tabs-to-spaces' | 'spaces-to-tabs' | false;
  normalizeLineEndings?: 'lf' | 'crlf' | false;
  wrapLines?: number | false; // width
}

interface BatchToolsState {
  isOpen: boolean;
  originalContent: string;
  selectedText: string;
  config: TransformationConfig;
  previewMode: 'unified' | 'side-by-side';
  
  // Actions
  openModal: (content: string, selectedText?: string) => void;
  closeModal: () => void;
  updateConfig: (updates: Partial<TransformationConfig>) => void;
  resetConfig: () => void;
  setPreviewMode: (mode: 'unified' | 'side-by-side') => void;
}

const defaultConfig: TransformationConfig = {};

export const useBatchToolsStore = create<BatchToolsState>((set) => ({
  isOpen: false,
  originalContent: '',
  selectedText: '',
  config: defaultConfig,
  previewMode: 'side-by-side',

  openModal: (content: string, selectedText: string = '') =>
    set({
      isOpen: true,
      originalContent: content,
      selectedText,
      config: defaultConfig,
    }),

  closeModal: () =>
    set({
      isOpen: false,
      originalContent: '',
      selectedText: '',
      config: defaultConfig,
    }),

  updateConfig: (updates: Partial<TransformationConfig>) =>
    set((state) => ({ config: { ...state.config, ...updates } })),

  resetConfig: () => set({ config: defaultConfig }),

  setPreviewMode: (mode: 'unified' | 'side-by-side') =>
    set({ previewMode: mode }),
}));

// Transformation utilities
function applyTransformations(content: string, config: TransformationConfig): string {
  let result = content;
  const lines = result.split(/\r?\n/);
  let processedLines = [...lines];

  // Apply transformations in order
  
  // 1. Filtering first (reduces data to process)
  if (config.filterByRegex) {
    try {
      const regex = new RegExp(config.filterByRegex, 'gi');
      processedLines = processedLines.filter(line => regex.test(line));
    } catch (e) {
      throw new Error('Invalid regular expression');
    }
  }
  
  if (config.filterByKeyword) {
    const { keyword, action, position } = config.filterByKeyword;
    processedLines = processedLines.filter(line => {
      const lowerLine = line.toLowerCase();
      if (position === 'contains') {
        return lowerLine.includes(keyword.toLowerCase());
      } else if (position === 'starts') {
        return lowerLine.startsWith(keyword.toLowerCase());
      } else if (position === 'ends') {
        return lowerLine.endsWith(keyword.toLowerCase());
      }
      return true;
    });
  }
  
  // 2. Whitespace & Cleanup
  if (config.trim) {
    processedLines = processedLines.map(line => line.trim());
  }
  
  if (config.removeExtraWhitespace === 'preserve-single') {
    processedLines = processedLines.map(line => line.replace(/\s+/g, ' ').trim());
  } else if (config.removeExtraWhitespace === 'remove-all') {
    processedLines = processedLines.map(line => line.replace(/\s+/g, ''));
  }
  
  if (config.removeExtraBlankLines) {
    const filtered: string[] = [];
    let prevWasBlank = false;
    for (const line of processedLines) {
      const isBlank = line.trim() === '';
      if (!isBlank || !prevWasBlank) {
        filtered.push(line);
      }
      prevWasBlank = isBlank;
    }
    processedLines = filtered;
  }
  
  if (config.removeAllBlankLines) {
    processedLines = processedLines.filter(line => line.trim() !== '');
  }

  // 3. Case transformations
  if (config.caseTransform) {
    processedLines = processedLines.map(line => {
      switch (config.caseTransform) {
        case 'upper': return line.toUpperCase();
        case 'lower': return line.toLowerCase();
        case 'title': return line.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        case 'sentence': return line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
        case 'camel': return line.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
        case 'pascal': return line.replace(/(?:^\w|[A-Z]|\b\w)/g, word => 
          word.toUpperCase()).replace(/\s+/g, '');
        case 'kebab': return line.toLowerCase().replace(/[\s_]+/g, '-');
        case 'snake': return line.toLowerCase().replace(/[\s-]+/g, '_');
        case 'invert': return line.split('').map(char => 
          char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()).join('');
        case 'alternating': return line.split('').map((char, i) => 
          i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()).join('');
        default: return line;
      }
    });
  }

  // 4. Prefix/Suffix
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

  // 5. Duplication
  if (config.duplicateLines && config.duplicateLines > 1) {
    const duplicated: string[] = [];
    for (const line of processedLines) {
      for (let i = 0; i < config.duplicateLines!; i++) {
        duplicated.push(line);
      }
    }
    processedLines = duplicated;
  }

  // 6. Indentation
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

  // 7. Padding
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
        default: return line;
      }
    });
  }

  // 8. Sorting & Order (after most other transformations)
  if (config.sortLines) {
    switch (config.sortLines) {
      case 'asc': processedLines.sort(); break;
      case 'desc': processedLines.sort().reverse(); break;
      case 'natural': processedLines.sort((a, b) => a.localeCompare(b, undefined, {numeric: true})); break;
      case 'numeric-asc': processedLines.sort((a, b) => parseFloat(a) - parseFloat(b)); break;
      case 'numeric-desc': processedLines.sort((a, b) => parseFloat(b) - parseFloat(a)); break;
      case 'length': processedLines.sort((a, b) => a.length - b.length); break;
    }
  }
  
  if (config.reverseLines) {
    processedLines.reverse();
  }
  
  if (config.removeDuplicates) {
    processedLines = [...new Set(processedLines)];
  }
  
  if (config.shuffleLines) {
    for (let i = processedLines.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [processedLines[i], processedLines[j]] = [processedLines[j], processedLines[i]];
    }
  }

  // 9. Line limits (after sorting/filtering)
  if (config.keepFirstNLines && config.keepFirstNLines > 0) {
    processedLines = processedLines.slice(0, config.keepFirstNLines);
  }
  
  if (config.keepLastNLines && config.keepLastNLines > 0) {
    processedLines = processedLines.slice(-config.keepLastNLines);
  }

  // 10. Join/Split operations
  if (config.splitLines) {
    const allSplit: string[] = [];
    for (const line of processedLines) {
      allSplit.push(...line.split(config.splitLines));
    }
    processedLines = allSplit;
  }
  
  result = processedLines.join('\n');
  
  if (config.joinLines) {
    result = processedLines.join(config.joinLines);
  }

  // 11. Final formatting
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
    const wrappedLines: string[] = [];
    for (const line of result.split('\n')) {
      if (line.length <= config.wrapLines) {
        wrappedLines.push(line);
      } else {
        // Simple word wrapping
        const words = line.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          if ((currentLine + word).length <= config.wrapLines) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) wrappedLines.push(currentLine);
      }
    }
    result = wrappedLines.join('\n');
  }

  return result;
}

// Helper functions
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