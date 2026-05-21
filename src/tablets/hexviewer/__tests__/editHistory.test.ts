import {
  createHistory,
  pushEdit,
  canUndo,
  canRedo,
  applyUndo,
  applyRedo,
  MAX_HISTORY_SIZE,
} from "../utils/editHistory";

describe("editHistory", () => {
  describe("createHistory", () => {
    it("creates an empty history", () => {
      const h = createHistory();
      expect(h.entries).toHaveLength(0);
      expect(h.index).toBe(-1);
    });
  });

  describe("pushEdit", () => {
    it("adds an entry and advances the index", () => {
      let h = createHistory();
      h = pushEdit(h, { offset: 0, oldValue: 0, newValue: 1 });
      expect(h.entries).toHaveLength(1);
      expect(h.index).toBe(0);
    });

    it("truncates future entries when branching after undo", () => {
      let h = createHistory();
      h = pushEdit(h, { offset: 0, oldValue: 0, newValue: 1 });
      h = pushEdit(h, { offset: 0, oldValue: 1, newValue: 2 });
      // Undo once — index goes to 0
      const undoResult = applyUndo(h);
      h = undoResult!.history;
      // Push a new edit — should truncate the second entry
      h = pushEdit(h, { offset: 0, oldValue: 1, newValue: 99 });
      expect(h.entries).toHaveLength(2);
      expect(h.entries[1].newValue).toBe(99);
    });

    it("caps at MAX_HISTORY_SIZE entries", () => {
      let h = createHistory();
      for (let i = 0; i < MAX_HISTORY_SIZE + 5; i++) {
        h = pushEdit(h, { offset: i, oldValue: 0, newValue: 1 });
      }
      expect(h.entries).toHaveLength(MAX_HISTORY_SIZE);
      expect(h.index).toBe(MAX_HISTORY_SIZE - 1);
    });
  });

  describe("canUndo / canRedo", () => {
    it("cannot undo on an empty history", () => {
      expect(canUndo(createHistory())).toBe(false);
    });

    it("can undo after a push", () => {
      const h = pushEdit(createHistory(), { offset: 0, oldValue: 0, newValue: 1 });
      expect(canUndo(h)).toBe(true);
    });

    it("cannot redo on a fresh history", () => {
      const h = pushEdit(createHistory(), { offset: 0, oldValue: 0, newValue: 1 });
      expect(canRedo(h)).toBe(false);
    });

    it("can redo after undo", () => {
      let h = pushEdit(createHistory(), { offset: 0, oldValue: 0, newValue: 1 });
      h = applyUndo(h)!.history;
      expect(canRedo(h)).toBe(true);
    });
  });

  describe("applyUndo", () => {
    it("returns null on empty history", () => {
      expect(applyUndo(createHistory())).toBeNull();
    });

    it("returns the last entry and decrements index", () => {
      let h = createHistory();
      h = pushEdit(h, { offset: 5, oldValue: 0xAA, newValue: 0xBB });
      const result = applyUndo(h);
      expect(result).not.toBeNull();
      expect(result!.entry).toMatchObject({ offset: 5, oldValue: 0xAA, newValue: 0xBB });
      expect(result!.history.index).toBe(-1);
    });
  });

  describe("applyRedo", () => {
    it("returns null when nothing to redo", () => {
      expect(applyRedo(createHistory())).toBeNull();
    });

    it("re-applies the undone entry", () => {
      let h = pushEdit(createHistory(), { offset: 0, oldValue: 0, newValue: 42 });
      h = applyUndo(h)!.history;
      const result = applyRedo(h);
      expect(result).not.toBeNull();
      expect(result!.entry.newValue).toBe(42);
      expect(result!.history.index).toBe(0);
    });
  });

  describe("undo/redo round-trip", () => {
    it("restores the state after undo then redo", () => {
      let h = createHistory();
      h = pushEdit(h, { offset: 0, oldValue: 0x00, newValue: 0xFF });
      const undone = applyUndo(h)!;
      const redone = applyRedo(undone.history)!;
      expect(redone.entry.newValue).toBe(0xFF);
      expect(redone.history.index).toBe(0);
    });
  });
});
