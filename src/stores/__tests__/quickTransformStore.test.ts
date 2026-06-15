import { describe, it, expect, beforeEach } from "@jest/globals";
import { useQuickTransformStore } from "../quickTransformStore";
import { QuickTransformTextContext } from "../quickTransformStore";

const makeContext = (overrides: Partial<QuickTransformTextContext> = {}): QuickTransformTextContext => ({
  text: "hello",
  isSelection: false,
  selectionRange: null,
  activeTabId: "tab-1",
  ...overrides,
});

beforeEach(() => {
  useQuickTransformStore.setState({
    isOpen: false,
    position: { x: 0, y: 0 },
    textContext: null,
  });
});

describe("quickTransformStore", () => {
  describe("initial state", () => {
    it("starts closed with no context", () => {
      const state = useQuickTransformStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.textContext).toBeNull();
      expect(state.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe("openModal", () => {
    it("sets isOpen and stores position and textContext", () => {
      const position = { x: 100, y: 200 };
      const context = makeContext();

      useQuickTransformStore.getState().openModal(position, context);

      const state = useQuickTransformStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.position).toEqual(position);
      expect(state.textContext).toEqual(context);
    });

    it("stores selection context", () => {
      const context = makeContext({
        isSelection: true,
        text: "selected text",
        selectionRange: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 14 },
      });

      useQuickTransformStore.getState().openModal({ x: 50, y: 50 }, context);

      const state = useQuickTransformStore.getState();
      expect(state.textContext?.isSelection).toBe(true);
      expect(state.textContext?.text).toBe("selected text");
    });

    it("stores activeTabId for pane routing", () => {
      const context = makeContext({ activeTabId: "specific-tab-id" });

      useQuickTransformStore.getState().openModal({ x: 0, y: 0 }, context);

      expect(useQuickTransformStore.getState().textContext?.activeTabId).toBe("specific-tab-id");
    });
  });

  describe("closeModal", () => {
    it("sets isOpen to false and clears textContext", () => {
      useQuickTransformStore.getState().openModal({ x: 10, y: 10 }, makeContext());
      expect(useQuickTransformStore.getState().isOpen).toBe(true);

      useQuickTransformStore.getState().closeModal();

      const state = useQuickTransformStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.textContext).toBeNull();
    });
  });
});
