import { describe, it, expect, beforeEach } from "@jest/globals";
import { useSplitViewStore } from "../splitViewStore";

beforeEach(() => {
  useSplitViewStore.setState((state) => ({
    splitView: {
      ...state.splitView,
      leftTabs: ["a", "b", "c"],
      rightTabs: ["d", "e"],
      activeLeftTabId: "a",
      activeRightTabId: "d",
    },
  }));
});

describe("addTabToSide – insertion position", () => {
  it("appends to end of left tabs when no insertAfterId given", () => {
    useSplitViewStore.getState().addTabToSide("new", false);
    expect(useSplitViewStore.getState().splitView.leftTabs).toEqual([
      "a", "b", "c", "new",
    ]);
  });

  it("appends to end of right tabs when no insertAfterId given", () => {
    useSplitViewStore.getState().addTabToSide("new", true);
    expect(useSplitViewStore.getState().splitView.rightTabs).toEqual([
      "d", "e", "new",
    ]);
  });

  it("inserts after the specified tab in left tabs", () => {
    useSplitViewStore.getState().addTabToSide("new", false, undefined, "b");
    expect(useSplitViewStore.getState().splitView.leftTabs).toEqual([
      "a", "b", "new", "c",
    ]);
  });

  it("inserts after the specified tab in right tabs", () => {
    useSplitViewStore.getState().addTabToSide("new", true, undefined, "d");
    expect(useSplitViewStore.getState().splitView.rightTabs).toEqual([
      "d", "new", "e",
    ]);
  });

  it("inserts after the last tab when insertAfterId is the last tab", () => {
    useSplitViewStore.getState().addTabToSide("new", false, undefined, "c");
    expect(useSplitViewStore.getState().splitView.leftTabs).toEqual([
      "a", "b", "c", "new",
    ]);
  });

  it("falls back to append when insertAfterId is not found in the list", () => {
    useSplitViewStore.getState().addTabToSide("new", false, undefined, "not-there");
    expect(useSplitViewStore.getState().splitView.leftTabs).toEqual([
      "a", "b", "c", "new",
    ]);
  });

  it("sets the new tab as active when no activeTabId override provided", () => {
    useSplitViewStore.getState().addTabToSide("new", false, undefined, "b");
    expect(useSplitViewStore.getState().splitView.activeLeftTabId).toBe("new");
  });

  it("uses activeTabId override when provided", () => {
    useSplitViewStore.getState().addTabToSide("new", false, "a", "b");
    expect(useSplitViewStore.getState().splitView.activeLeftTabId).toBe("a");
  });

  it("does not mutate the right tabs when inserting into left", () => {
    const before = [...useSplitViewStore.getState().splitView.rightTabs];
    useSplitViewStore.getState().addTabToSide("new", false, undefined, "b");
    expect(useSplitViewStore.getState().splitView.rightTabs).toEqual(before);
  });

  it("does not mutate the left tabs when inserting into right", () => {
    const before = [...useSplitViewStore.getState().splitView.leftTabs];
    useSplitViewStore.getState().addTabToSide("new", true, undefined, "d");
    expect(useSplitViewStore.getState().splitView.leftTabs).toEqual(before);
  });
});
