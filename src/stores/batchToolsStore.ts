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