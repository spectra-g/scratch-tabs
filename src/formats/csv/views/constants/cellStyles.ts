/**
 * CSS class constants for cell styling
 */

export const CELL_STYLES = {
  // Base cell styles
  BASE: "h-full min-h-[35px] flex items-center cursor-cell transition-colors relative group",
  INVALID: "bg-red-900/20",
  HOVER: "hover:bg-gray-700/20",
  
  // Selection styles
  SELECTED: "bg-blue-900/30 ring-1 ring-blue-500",
  MULTI_SELECTED: "bg-purple-900/30 ring-1 ring-purple-400",
  
  // Search match styles
  SEARCH_MATCH: "bg-yellow-500/20 ring-1 ring-yellow-400",
  ACTIVE_SEARCH_MATCH: "bg-orange-500/40 ring-2 ring-orange-400",
  SELECTED_AND_ACTIVE_SEARCH: "bg-orange-500/50 ring-2 ring-orange-400 shadow-lg",
  
  // Text styles
  TEXT: "text-sm truncate text-gray-200",
  TEXT_EMPTY: "text-gray-500 italic",
  TEXT_MASKED: "blur-[3px] hover:blur-none",
} as const;

/**
 * Gets the appropriate CSS classes for a cell based on its state
 * @param state - The cell state object
 * @returns Combined CSS class string
 */
export const getCellClasses = (state: {
  isSelected: boolean;
  isMultiSelected: boolean;
  isActiveSearchMatch: boolean;
  isSearchMatch: boolean;
  isValid: boolean;
}): string => {
  const { isSelected, isMultiSelected, isActiveSearchMatch, isSearchMatch, isValid } = state;
  
  let classes = CELL_STYLES.BASE;
  
  // Selection and search state (order matters for priority)
  if (isSelected && isActiveSearchMatch) {
    classes += ` ${CELL_STYLES.SELECTED_AND_ACTIVE_SEARCH}`;
  } else if (isSelected) {
    classes += ` ${CELL_STYLES.SELECTED}`;
  } else if (isMultiSelected) {
    classes += ` ${CELL_STYLES.MULTI_SELECTED}`;
  } else if (isActiveSearchMatch) {
    classes += ` ${CELL_STYLES.ACTIVE_SEARCH_MATCH}`;
  } else if (isSearchMatch) {
    classes += ` ${CELL_STYLES.SEARCH_MATCH}`;
  } else {
    classes += ` ${CELL_STYLES.HOVER}`;
  }
  
  // Invalid state
  if (!isValid) {
    classes += ` ${CELL_STYLES.INVALID}`;
  }
  
  return classes;
};