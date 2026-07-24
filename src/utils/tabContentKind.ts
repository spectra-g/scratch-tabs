import type { Tab, TabContentKind } from "../types";

/**
 * The compatibility boundary between legacy tab flags and document kinds.
 * New content-type branching should use this helper instead of inspecting
 * isRich/isTablet directly.
 */
export const getTabContentKind = (
  tab: Pick<Tab, "contentKind" | "isRich" | "isTablet">,
): TabContentKind => {
  if (tab.contentKind) return tab.contentKind;
  if (tab.isRich) return "rich-text";
  if (tab.isTablet) return "tablet";
  return "text";
};
