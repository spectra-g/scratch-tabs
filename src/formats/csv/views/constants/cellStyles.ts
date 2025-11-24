/**
 * CSS class constants for cell styling
 */

export const CELL_STYLES = {
  // Base cell styles
  BASE: "h-full min-h-[35px] flex items-center cursor-cell transition-colors relative group",
  INVALID: "bg-danger-subtle",
  HOVER: "hover:bg-element-hover",

  // Selection styles
  SELECTED: "bg-info/30 ring-1 ring-info border-info",
  MULTI_SELECTED: "bg-primary/20 ring-1 ring-primary",

  // Search match styles
  SEARCH_MATCH: "bg-warning/20 ring-1 ring-warning",
  ACTIVE_SEARCH_MATCH: "bg-warning/40 ring-2 ring-warning",
  SELECTED_AND_ACTIVE_SEARCH: "bg-warning/50 ring-2 ring-warning shadow-lg",

  // Text styles
  TEXT: "text-sm truncate text-main",
  TEXT_EMPTY: "text-muted italic",
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