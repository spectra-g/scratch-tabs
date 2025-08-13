export interface IniLine {
  type: 'PAIR' | 'COMMENT';
  id: string;
  key?: string;
  value?: string;
  comment?: string;
  originalCommentStyle?: '#' | ';'; // Track original comment style
}

export interface IniSection {
  type: 'SECTION';
  id: string;
  name: string;
  lines: IniLine[];
  comment?: string; // For comments immediately preceding the section header
}

export interface IniFileNode {
  type: 'SECTION' | 'COMMENT' | 'BLANK';
  id: string;
  name?: string;
  value?: string;
  lines?: IniLine[];
  comment?: string;
  originalCommentStyle?: '#' | ';'; // Track original comment style
}

export type IniState = IniFileNode[];

export interface IniValidationIssue {
  type: 'error' | 'warning';
  message: string;
  sectionId?: string;
  lineId?: string;
  suggestion?: string;
}

export interface IniTreeNode {
  id: string;
  name: string;
  type: 'section' | 'root' | 'key';
  sectionId?: string;
  keyCount: number;
  hasIssues: boolean;
  children: IniTreeNode[];
  lineId?: string; // For key nodes, reference to the actual line
}

export interface UseIniDataOptions {
  enableRealTimeSync?: boolean;
  debounceMs?: number;
}

export interface UseIniDataReturn {
  // Data state
  state: IniState;
  sections: IniSection[];
  loading: boolean;
  error: string | null;

  // Navigation
  selectedSectionId: string | null;
  setSelectedSectionId: (sectionId: string | null) => void;
  treeNodes: IniTreeNode[];

  // Section management
  addSection: (name: string, afterSectionId?: string) => void;
  deleteSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string, newName: string) => void;
  renameSection: (sectionId: string, newName: string) => void;
  reorderSections: (sectionIds: string[]) => void;

  // Key-value management
  addKeyValue: (sectionId: string, key: string, value: string, comment?: string) => void;
  updateKeyValue: (sectionId: string, lineId: string, key: string, value: string, comment?: string) => void;
  deleteKeyValue: (sectionId: string, lineId: string) => void;

  // Transformations
  sortKeysInSection: (sectionId: string) => void;
  sortAllSections: () => void;
  stripAllComments: () => void;
  normalizeSpacing: () => void;
  trimWhitespace: () => void;
  ensureFinalNewline: () => void;
  removeFinalNewline: () => void;

  // Converters
  convertToJson: () => string;
  convertToYaml: () => string;

  // Validation
  validationIssues: IniValidationIssue[];
  isValid: boolean;

  // Export
  toIniString: () => string;
}