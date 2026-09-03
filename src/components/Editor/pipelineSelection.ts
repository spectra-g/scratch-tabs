import type { EditorRange } from "../../types";

export const isNonEmptyRange = (
  range: EditorRange | null | undefined,
): boolean => {
  if (!range) return false;
  return (
    range.startLineNumber !== range.endLineNumber ||
    range.startColumn !== range.endColumn
  );
};

export const hasPipelineSelection = (
  selectionRange: EditorRange | null | undefined,
  selectedText: string | null | undefined,
): boolean => isNonEmptyRange(selectionRange) && (selectedText ?? "") !== "";

export const resolvePipelineInitialContent = (
  content: string,
  selectedText: string,
  selectionRange: EditorRange | null | undefined,
): string =>
  hasPipelineSelection(selectionRange, selectedText) ? selectedText : content;

export const resolvePipelineApplyRange = (
  selectionRange: EditorRange | null | undefined,
  selectedText?: string,
): EditorRange | null => {
  // When selectedText is provided, require it to be non-empty as well so a
  // stale/empty selection object can never route apply to a range replace.
  if (selectedText !== undefined) {
    return hasPipelineSelection(selectionRange, selectedText)
      ? (selectionRange ?? null)
      : null;
  }
  return isNonEmptyRange(selectionRange) ? (selectionRange ?? null) : null;
};
