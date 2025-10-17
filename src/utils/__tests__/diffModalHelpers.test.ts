import { describe, it, expect } from "@jest/globals";
import { getTabsInVisualOrder } from "../diffModalHelpers";

describe("diffModalHelpers", () => {
  describe("getTabsInVisualOrder", () => {
    it("should place previous tab on left when it appears before current tab", () => {
      const tabList = ["tab1", "tab2", "tab3", "tab4"];
      const currentTabId = "tab3";
      const previousTabId = "tab1";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab1",
        rightTabId: "tab3",
      });
    });

    it("should place current tab on left when it appears before previous tab", () => {
      const tabList = ["tab1", "tab2", "tab3", "tab4"];
      const currentTabId = "tab2";
      const previousTabId = "tab4";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab2",
        rightTabId: "tab4",
      });
    });

    it("should handle adjacent tabs (previous before current)", () => {
      const tabList = ["tab1", "tab2", "tab3"];
      const currentTabId = "tab2";
      const previousTabId = "tab1";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab1",
        rightTabId: "tab2",
      });
    });

    it("should handle adjacent tabs (current before previous)", () => {
      const tabList = ["tab1", "tab2", "tab3"];
      const currentTabId = "tab1";
      const previousTabId = "tab2";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab1",
        rightTabId: "tab2",
      });
    });

    it("should handle tabs at the extremes of the list", () => {
      const tabList = ["first", "middle1", "middle2", "last"];
      const currentTabId = "last";
      const previousTabId = "first";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "first",
        rightTabId: "last",
      });
    });

    it("should handle two-tab list", () => {
      const tabList = ["tab1", "tab2"];
      const currentTabId = "tab2";
      const previousTabId = "tab1";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab1",
        rightTabId: "tab2",
      });
    });

    it("should handle tabs with UUID-like IDs", () => {
      const tabList = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
      ];
      const currentTabId = "6ba7b814-9dad-11d1-80b4-00c04fd430c8";
      const previousTabId = "550e8400-e29b-41d4-a716-446655440000";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "550e8400-e29b-41d4-a716-446655440000",
        rightTabId: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
      });
    });

    it("should maintain order when tabs are in reverse visual position", () => {
      const tabList = ["alpha", "beta", "gamma", "delta"];
      const currentTabId = "beta";
      const previousTabId = "delta";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "beta",
        rightTabId: "delta",
      });
    });

    it("should handle large tab lists efficiently", () => {
      const tabList = Array.from({ length: 100 }, (_, i) => `tab${i}`);
      const currentTabId = "tab75";
      const previousTabId = "tab25";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      expect(result).toEqual({
        leftTabId: "tab25",
        rightTabId: "tab75",
      });
    });

    it("should handle when tabs have same position (should not happen in practice)", () => {
      const tabList = ["tab1", "tab2", "tab3"];
      const currentTabId = "tab2";
      const previousTabId = "tab2";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      // When indices are equal, shouldSwap is false, so current goes to left
      expect(result).toEqual({
        leftTabId: "tab2",
        rightTabId: "tab2",
      });
    });

    it("should handle tabs not found in list (edge case)", () => {
      const tabList = ["tab1", "tab2", "tab3"];
      const currentTabId = "nonexistent1";
      const previousTabId = "tab1";

      const result = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

      // indexOf returns -1 for non-existent items
      // -1 < 0 is false, so current goes to left
      expect(result).toEqual({
        leftTabId: "nonexistent1",
        rightTabId: "tab1",
      });
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle scenario: user right-clicks 3rd tab to compare with 1st tab", () => {
      const tabList = ["scratch-1", "scratch-2", "scratch-3", "scratch-4"];
      const rightClickedTab = "scratch-3";
      const previousTab = "scratch-1";

      const result = getTabsInVisualOrder(tabList, rightClickedTab, previousTab);

      expect(result.leftTabId).toBe("scratch-1");
      expect(result.rightTabId).toBe("scratch-3");
    });

    it("should handle scenario: user right-clicks 1st tab to compare with 3rd tab", () => {
      const tabList = ["notes.md", "config.json", "data.csv", "output.txt"];
      const rightClickedTab = "notes.md";
      const previousTab = "data.csv";

      const result = getTabsInVisualOrder(tabList, rightClickedTab, previousTab);

      expect(result.leftTabId).toBe("notes.md");
      expect(result.rightTabId).toBe("data.csv");
    });

    it("should handle scenario: comparing consecutive tabs", () => {
      const tabList = ["api-response", "transformed-data", "final-output"];
      const rightClickedTab = "transformed-data";
      const previousTab = "api-response";

      const result = getTabsInVisualOrder(tabList, rightClickedTab, previousTab);

      expect(result.leftTabId).toBe("api-response");
      expect(result.rightTabId).toBe("transformed-data");
    });
  });
});
