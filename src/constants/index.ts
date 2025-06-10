// Tab Management Constants
export const SORT_OPTIONS = {
  CURRENT: 'current',
  TITLE_ASC: 'title-asc',
  TITLE_DESC: 'title-desc',
  CREATED_ASC: 'created-asc',
  CREATED_DESC: 'created-desc', 
  MODIFIED_ASC: 'modified-asc',
  MODIFIED_DESC: 'modified-desc',
  LANGUAGE: 'language',
  LINES_MOST: 'lines-most',
  LINES_LEAST: 'lines-least'
} as const;

export const GROUP_OPTIONS = {
  NONE: 'none',
  LANGUAGE: 'language',
  WORKSPACE: 'workspace'
} as const;

// JSON Mapper Constants
export const MAPPING_STATUS = {
  MAPPED: 'mapped',
  UNMAPPED: 'unmapped',
  IGNORED: 'ignored',
  ERROR: 'error'
} as const;

export const MAPPING_DIRECTION = {
  SOURCE_TO_TARGET: 'sourceToTarget',
  TARGET_TO_SOURCE: 'targetToSource'
} as const;

// Vault Constants  
export const VAULT_SORT_ORDER = {
  TITLE: 'title',
  CREATED: 'created',
  MODIFIED: 'modified',
  LAST_USED: 'lastUsed',
  USAGE_COUNT: 'usageCount'
} as const;

// Sort Direction Constants
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc'
} as const;

// Action Types (inspired by the Macro component pattern)
export const TAB_ACTIONS = {
  CLOSE: 'close',
  PIN: 'pin',
  DUPLICATE: 'duplicate',
  RENAME: 'rename',
  MERGE: 'merge'
} as const;

// Context Menu Actions
export const CONTEXT_MENU_ACTIONS = {
  COMPARE: 'compare',
  COMPARE_SIDES: 'compareSides',
  SUMMARY: 'summary',
  COMPARE_CLIPBOARD: 'compareClipboard'
} as const;

// Side Constants
export const TAB_SIDES = {
  LEFT: 'left',
  RIGHT: 'right'
} as const;

// Derived Types for Type Safety
export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];
export type GroupOption = typeof GROUP_OPTIONS[keyof typeof GROUP_OPTIONS];
export type MappingStatus = typeof MAPPING_STATUS[keyof typeof MAPPING_STATUS];
export type MappingDirection = typeof MAPPING_DIRECTION[keyof typeof MAPPING_DIRECTION];
export type VaultSortOrder = typeof VAULT_SORT_ORDER[keyof typeof VAULT_SORT_ORDER];
export type SortDirection = typeof SORT_DIRECTION[keyof typeof SORT_DIRECTION];
export type TabAction = typeof TAB_ACTIONS[keyof typeof TAB_ACTIONS];
export type ContextMenuAction = typeof CONTEXT_MENU_ACTIONS[keyof typeof CONTEXT_MENU_ACTIONS];
export type TabSide = typeof TAB_SIDES[keyof typeof TAB_SIDES]; 