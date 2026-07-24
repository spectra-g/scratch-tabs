import type { Tab } from "../../types";
import type {
  TabDocumentAdapter,
  TabDocumentAdapterResolver,
} from "../tabDocumentAdapter";
import { searchTabDocuments, searchTabs } from "../searchService";

const tab: Tab = {
  id: "tab-1",
  title: "Notes",
  content: "first line\nSecond line",
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: "workspace-1",
};

describe("searchService", () => {
  it("preserves normal tab line results", () => {
    expect(
      searchTabs(
        "second",
        { caseSensitive: false, wholeWord: false },
        [tab],
      ),
    ).toEqual([
      expect.objectContaining({
        tabId: "tab-1",
        lineNumber: 2,
        lineText: "Second line",
        resultKind: "tab",
      }),
    ]);
  });

  it("maps adapter entries to Canvas item results", async () => {
    const adapter = {
      getSearchData: jest.fn().mockResolvedValue({
        searchText: "architecture diagram",
        entries: [
          {
            text: "architecture diagram",
            language: "plaintext",
            itemId: "image-1",
            itemType: "image",
            itemLabel: "Image card",
          },
        ],
      }),
    } as unknown as TabDocumentAdapter;
    const resolver = {
      resolve: jest.fn().mockResolvedValue(adapter),
    } as unknown as TabDocumentAdapterResolver;

    const results = await searchTabDocuments(
      "diagram",
      { caseSensitive: false, wholeWord: true },
      [{ ...tab, content: "", contentKind: "canvas" }],
      resolver,
    );

    expect(results).toEqual([
      expect.objectContaining({
        resultKind: "canvas-item",
        canvasItemId: "image-1",
        canvasItemType: "image",
        itemLabel: "Image card",
      }),
    ]);
    expect(adapter.getSearchData).toHaveBeenCalledTimes(1);
  });
});
