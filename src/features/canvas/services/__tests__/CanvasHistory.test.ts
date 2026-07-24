import type { CanvasTextItem } from "../../types";
import {
  createCanvasHistory,
  recordCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
  type CanvasHistorySnapshot,
} from "../CanvasHistory";

const item = (text: string): CanvasTextItem => ({
  id: "item-1",
  type: "text",
  x: 0,
  y: 0,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  text,
});

const snapshot = (text: string): CanvasHistorySnapshot => ({
  items: [item(text)],
  selectedItemIds: ["item-1"],
  focusedItemId: "item-1",
});

describe("CanvasHistory", () => {
  it("undoes and redoes immutable snapshots", () => {
    const original = snapshot("before");
    const recorded = recordCanvasHistory(createCanvasHistory(), original);
    original.items[0].text = "mutated outside history";
    original.selectedItemIds.length = 0;

    const undone = undoCanvasHistory(recorded, snapshot("after"));
    expect(undone.snapshot).toEqual(snapshot("before"));

    undone.snapshot!.items[0].text = "mutated returned snapshot";
    const redone = redoCanvasHistory(undone.state, snapshot("before"));
    expect(redone.snapshot).toEqual(snapshot("after"));
  });

  it("clears redo entries when a new operation is recorded", () => {
    const recorded = recordCanvasHistory(
      createCanvasHistory(),
      snapshot("one"),
    );
    const undone = undoCanvasHistory(recorded, snapshot("two"));

    const branched = recordCanvasHistory(undone.state, snapshot("branch"));

    expect(branched.future).toEqual([]);
    expect(redoCanvasHistory(branched, snapshot("latest")).snapshot).toBeNull();
  });

  it("keeps only the configured number of completed operations", () => {
    let history = createCanvasHistory();
    history = recordCanvasHistory(history, snapshot("one"), 2);
    history = recordCanvasHistory(history, snapshot("two"), 2);
    history = recordCanvasHistory(history, snapshot("three"), 2);

    expect(history.past.map((entry) => entry.items[0].text)).toEqual([
      "two",
      "three",
    ]);
  });
});
