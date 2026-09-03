import {
  isNonEmptyRange,
  hasPipelineSelection,
  resolvePipelineInitialContent,
  resolvePipelineApplyRange,
} from "../pipelineSelection";
import type { EditorRange } from "../../../types";

const range = (
  startLineNumber: number,
  startColumn: number,
  endLineNumber: number,
  endColumn: number,
): EditorRange => ({ startLineNumber, startColumn, endLineNumber, endColumn });

describe("isNonEmptyRange", () => {
  it("returns false for null/undefined", () => {
    expect(isNonEmptyRange(null)).toBe(false);
    expect(isNonEmptyRange(undefined)).toBe(false);
  });

  it("returns false for an empty (collapsed) range", () => {
    expect(isNonEmptyRange(range(1, 5, 1, 5))).toBe(false);
  });

  it("returns true when columns differ on the same line", () => {
    expect(isNonEmptyRange(range(1, 5, 1, 10))).toBe(true);
  });

  it("returns true when lines differ", () => {
    expect(isNonEmptyRange(range(1, 5, 2, 1))).toBe(true);
  });
});

describe("resolvePipelineInitialContent", () => {
  const full = "full content";

  it("returns full content when there is no selection range", () => {
    expect(resolvePipelineInitialContent(full, "", null)).toBe(full);
  });

  it("returns full content for an empty selection object (right-click with no selection)", () => {
    // Regression: an empty Monaco selection is truthy, so a truthiness check
    // on the range alone routed to selectedText ("") and showed an empty modal.
    expect(resolvePipelineInitialContent(full, "", range(1, 1, 1, 1))).toBe(
      full,
    );
  });

  it("returns selected text when a real selection exists", () => {
    expect(
      resolvePipelineInitialContent(full, "selected", range(1, 1, 1, 5)),
    ).toBe("selected");
  });

  it("falls back to full content when range is non-empty but text is empty", () => {
    expect(resolvePipelineInitialContent(full, "", range(1, 1, 1, 5))).toBe(
      full,
    );
  });
});

describe("resolvePipelineApplyRange", () => {
  const selection = range(1, 1, 1, 5);

  it("returns null when there is no range", () => {
    expect(resolvePipelineApplyRange(null, "")).toBeNull();
  });

  it("returns null for an empty range so apply replaces full content", () => {
    expect(
      resolvePipelineApplyRange(range(1, 1, 1, 1), ""),
    ).toBeNull();
  });

  it("returns the range for a real selection", () => {
    expect(resolvePipelineApplyRange(selection, "selected")).toBe(selection);
  });

  it("returns null when range is non-empty but selected text is empty", () => {
    expect(resolvePipelineApplyRange(selection, "")).toBeNull();
  });
});

describe("hasPipelineSelection", () => {
  it("requires both a non-empty range and non-empty text", () => {
    expect(hasPipelineSelection(null, "x")).toBe(false);
    expect(hasPipelineSelection(range(1, 1, 1, 1), "x")).toBe(false);
    expect(hasPipelineSelection(range(1, 1, 1, 5), "")).toBe(false);
    expect(hasPipelineSelection(range(1, 1, 1, 5), "x")).toBe(true);
  });
});
