import { describe, it, expect, beforeEach } from "@jest/globals";
import { useBatchToolsStore } from "../../../stores/batchToolsStore";

describe("BatchToolsStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useBatchToolsStore.getState().closeModal();
    useBatchToolsStore.getState().resetConfig();
  });

  it("should initialize with default state", () => {
    const state = useBatchToolsStore.getState();

    expect(state.isOpen).toBe(false);
    expect(state.originalContent).toBe("");
    expect(state.selectedText).toBe("");
    expect(state.config).toEqual({});
    expect(state.previewMode).toBe("side-by-side");
  });

  it("should open modal with content", () => {
    const testContent = "Hello\nWorld\nTest";
    const testSelection = "World";

    useBatchToolsStore.getState().openModal(testContent, testSelection);

    const state = useBatchToolsStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.originalContent).toBe(testContent);
    expect(state.selectedText).toBe(testSelection);
  });

  it("should close modal and reset state", () => {
    // Open modal first
    useBatchToolsStore.getState().openModal("test content");

    // Close modal
    useBatchToolsStore.getState().closeModal();

    const state = useBatchToolsStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.originalContent).toBe("");
    expect(state.selectedText).toBe("");
  });

  it("should update configuration", () => {
    const configUpdate = { trim: true, sortLines: "asc" as const };

    useBatchToolsStore.getState().updateConfig(configUpdate);

    const state = useBatchToolsStore.getState();
    expect(state.config.trim).toBe(true);
    expect(state.config.sortLines).toBe("asc");
  });

  it("should toggle preview mode", () => {
    expect(useBatchToolsStore.getState().previewMode).toBe("side-by-side");

    useBatchToolsStore.getState().setPreviewMode("unified");
    expect(useBatchToolsStore.getState().previewMode).toBe("unified");

    useBatchToolsStore.getState().setPreviewMode("side-by-side");
    expect(useBatchToolsStore.getState().previewMode).toBe("side-by-side");
  });

  it("should reset configuration", () => {
    // Set some config
    useBatchToolsStore.getState().updateConfig({
      trim: true,
      sortLines: "desc" as const,
      caseTransform: "upper" as const,
    });

    // Reset
    useBatchToolsStore.getState().resetConfig();

    const state = useBatchToolsStore.getState();
    expect(state.config).toEqual({});
  });
});
