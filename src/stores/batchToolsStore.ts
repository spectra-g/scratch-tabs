import { create } from 'zustand';

export interface TransformationConfig {
  // Condition (applies to all transformations below)
  condition?: {
    type: 'contains' | 'not-contains' | 'starts-with' | 'ends-with' |
    'regex' | 'blank' | 'not-blank' | 'line-number' |
    'line-range' | 'every-nth';
    value?: string; // For text-based conditions
    lineNumber?: number; // For line number conditions
    startLine?: number; // For range conditions
    endLine?: number;
    nthInterval?: number; // For every-nth conditions
  } | false;

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

  // Advanced Transformations
  findReplaceRegex?: { find: string; replace: string; flags?: string } | false;
  javascriptSnippet?: string | false;
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