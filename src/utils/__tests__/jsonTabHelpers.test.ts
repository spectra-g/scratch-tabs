import { describe, it, expect } from "@jest/globals";
import { getRecentJsonTabs, isValidJson } from "../jsonTabHelpers";
import { Tab } from "../../types";

describe("jsonTabHelpers", () => {
  describe("getRecentJsonTabs", () => {
    let idCounter = 0;
    const createTab = (overrides: Partial<Tab> = {}): Tab => ({
      id: `tab-${idCounter++}`,
      title: "Test Tab",
      content: "{}",
      language: "json",
      languageLocked: false,
      isTablet: false,
      workspaceId: "workspace-1",
      dateCreated: Date.now(),
      lastModified: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
      ...overrides,
    });

    it("should return recent JSON tabs excluding current tab", () => {
      const currentTabId = "current-tab";
      const tabs: Tab[] = [
        createTab({ id: currentTabId, lastModified: 1000 }),
        createTab({ id: "tab-1", lastModified: 900 }),
        createTab({ id: "tab-2", lastModified: 800 }),
      ];

      const result = getRecentJsonTabs(tabs, currentTabId, "workspace-1");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(["tab-1", "tab-2"]);
    });

    it("should only return tabs from current workspace", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", workspaceId: "workspace-1", lastModified: 1000 }),
        createTab({ id: "tab-2", workspaceId: "workspace-2", lastModified: 900 }),
        createTab({ id: "tab-3", workspaceId: "workspace-1", lastModified: 800 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(["tab-1", "tab-3"]);
    });

    it("should only return JSON tabs", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", language: "json", lastModified: 1000 }),
        createTab({ id: "tab-2", language: "javascript", lastModified: 900 }),
        createTab({ id: "tab-3", language: "json", lastModified: 800 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(["tab-1", "tab-3"]);
    });

    it("should exclude tablet tabs", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", isTablet: false, lastModified: 1000 }),
        createTab({ id: "tab-2", isTablet: true, lastModified: 900 }),
        createTab({ id: "tab-3", isTablet: false, lastModified: 800 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(["tab-1", "tab-3"]);
    });

    it("should sort by lastModified descending (most recent first)", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", lastModified: 500 }),
        createTab({ id: "tab-2", lastModified: 1000 }),
        createTab({ id: "tab-3", lastModified: 800 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result.map((t) => t.id)).toEqual(["tab-2", "tab-3", "tab-1"]);
    });

    it("should limit results to specified limit", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", lastModified: 1000 }),
        createTab({ id: "tab-2", lastModified: 900 }),
        createTab({ id: "tab-3", lastModified: 800 }),
        createTab({ id: "tab-4", lastModified: 700 }),
        createTab({ id: "tab-5", lastModified: 600 }),
        createTab({ id: "tab-6", lastModified: 500 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1", 3);

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual(["tab-1", "tab-2", "tab-3"]);
    });

    it("should return empty array if no matching tabs", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", language: "javascript" }),
        createTab({ id: "tab-2", workspaceId: "other-workspace" }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result).toEqual([]);
    });

    it("should handle tabs with undefined lastModified", () => {
      const tabs: Tab[] = [
        createTab({ id: "tab-1", lastModified: undefined as any }),
        createTab({ id: "tab-2", lastModified: 1000 }),
      ];

      const result = getRecentJsonTabs(tabs, "current", "workspace-1");

      expect(result).toHaveLength(2);
      // Tab with lastModified should come first
      expect(result[0].id).toBe("tab-2");
    });
  });

  describe("isValidJson", () => {
    it("should return true for valid JSON object", () => {
      expect(isValidJson('{"name": "value"}')).toBe(true);
    });

    it("should return true for valid JSON array", () => {
      expect(isValidJson('[1, 2, 3]')).toBe(true);
    });

    it("should return true for valid JSON primitives", () => {
      expect(isValidJson('"string"')).toBe(true);
      expect(isValidJson("123")).toBe(true);
      expect(isValidJson("true")).toBe(true);
      expect(isValidJson("null")).toBe(true);
    });

    it("should return false for invalid JSON", () => {
      expect(isValidJson("{invalid}")).toBe(false);
      expect(isValidJson("undefined")).toBe(false);
      expect(isValidJson("")).toBe(false);
    });

    it("should return false for JSON with trailing commas", () => {
      expect(isValidJson('{"name": "value",}')).toBe(false);
    });

    it("should return false for JSON with comments", () => {
      expect(isValidJson('{"name": "value"} // comment')).toBe(false);
    });

    it("should handle complex nested JSON", () => {
      const complexJson = JSON.stringify({
        users: [
          { id: 1, name: "Alice", tags: ["admin", "user"] },
          { id: 2, name: "Bob", tags: ["user"] },
        ],
        metadata: {
          version: "1.0",
          timestamp: Date.now(),
        },
      });

      expect(isValidJson(complexJson)).toBe(true);
    });

    it("should return false for single unquoted strings", () => {
      expect(isValidJson("hello")).toBe(false);
    });
  });
});
