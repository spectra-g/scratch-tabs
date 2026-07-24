import type { Tab } from "../../types";
import { prepareTabsForBroadcast } from "../broadcastPayload";

const canvasTab: Tab = {
  id: "canvas-1",
  title: "Canvas 1",
  content: "",
  contentKind: "canvas",
  documentId: "document-1",
  language: "plaintext",
  languageLocked: true,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: "workspace-1",
};

describe("prepareTabsForBroadcast", () => {
  it("whitelists Canvas metadata and excludes accidental scene payloads", () => {
    const unsafeCanvasTab = {
      ...canvasTab,
      content: "scene text must not leak",
      items: [{ id: "secret-item", text: "sensitive card" }],
      searchText: "sensitive card",
    } as Tab;

    const [safeTab] = prepareTabsForBroadcast([unsafeCanvasTab]);

    expect(safeTab).toEqual(expect.objectContaining({
      id: canvasTab.id,
      documentId: canvasTab.documentId,
      contentKind: "canvas",
      content: "",
    }));
    expect(JSON.stringify(safeTab)).not.toContain("secret-item");
    expect(JSON.stringify(safeTab)).not.toContain("sensitive card");
  });

  it("does not alter normal text tabs", () => {
    const textTab = { ...canvasTab, contentKind: "text" as const, content: "text" };
    expect(prepareTabsForBroadcast([textTab])[0]).toBe(textTab);
  });
});
