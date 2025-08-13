export interface PropertyLine {
  type: 'PAIR' | 'COMMENT' | 'BLANK';
  id: string;
}

export interface PropertyPair extends PropertyLine {
  type: 'PAIR';
  key: string;
  value: string;
  comment?: string;
}

export interface PropertyComment extends PropertyLine {
  type: 'COMMENT';
  value: string;
}

export interface PropertyBlank extends PropertyLine {
  type: 'BLANK';
}

export type PropertiesState = PropertyLine[];

export interface PropertyTreeNode {
  id: string;
  name: string;
  fullKey?: string; // For leaf nodes, the complete key
  children: PropertyTreeNode[];
  isLeaf: boolean;
  value?: string; // For leaf nodes
  comment?: string; // For leaf nodes
  pairId?: string; // For leaf nodes, reference to the PropertyPair
}

export interface PropertiesValidation {
  duplicateKeys: string[];
  emptyValues: string[];
  invalidKeys: string[];
}

export interface UsePropertiesDataOptions {
  enableRealTimeSync?: boolean;
  debounceMs?: number;
}

export interface UsePropertiesDataReturn {
  // Core state
  state: PropertiesState;
  treeData: PropertyTreeNode[];
  validation: PropertiesValidation;
  loading: boolean;
  error: string | null;

  // Tree navigation
  selectedNodeId: string | null;
  filteredPairs: PropertyPair[];
  setSelectedNode: (nodeId: string | null) => void;

  // Data manipulation
  updatePair: (pairId: string, key: string, value: string, comment?: string) => void;
  addPair: (key: string, value: string, comment?: string, afterPairId?: string) => void;
  deletePair: (pairId: string) => void;
  addComment: (comment: string, afterPairId?: string) => void;
  deleteComment: (commentId: string) => void;

  // Transformations
  sortKeysAlphabetically: () => void;
  groupByPrefix: () => void;
  stripAllComments: () => void;
  normalizeSpacing: () => void;
  ensureFinalNewline: () => void;
  removeFinalNewline: () => void;

  // Converters
  convertToNestedJson: () => string;
  convertToYaml: () => string;

  // Export
  toPropertiesString: () => string;
}