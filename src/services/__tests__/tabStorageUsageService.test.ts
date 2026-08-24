import { estimateTabStorageUsage } from "../tabStorageUsageService";
import { db } from "../../db";

jest.mock("../../db", () => ({
  db: {
    tabs: { each: jest.fn() },
    canvasDocuments: { toArray: jest.fn().mockResolvedValue([]) },
    canvasAssets: { where: jest.fn() },
  },
}));

type TabRecordLike = {
  id: string;
  title: string;
  workspaceId: string;
  content?: string;
  richContent?: string;
  tabletState?: string;
  language?: string;
  isRich?: boolean;
  isTablet?: boolean;
  contentKind?: "text" | "rich-text" | "tablet" | "canvas";
  documentId?: string;
};

const makeRecord = (overrides: Partial<TabRecordLike>): TabRecordLike => ({
  id: "tab-1",
  title: "Tab 1",
  workspaceId: "ws-1",
  content: "",
  language: "plaintext",
  ...overrides,
});

const mockTabsEach = db.tabs.each as jest.Mock;

describe("estimateTabStorageUsage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTabsEach.mockResolvedValue(undefined);
  });

  it("computes UTF-8 byte sizes and line counts for text tabs", async () => {
    // "héllo" is 6 bytes in UTF-8 (é is 2 bytes)
    mockTabsEach.mockImplementation(async (visitor) => {
      visitor(makeRecord({ content: "héllo\nworld" }));
    });

    const usages = await estimateTabStorageUsage();

    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      tabId: "tab-1",
      workspaceId: "ws-1",
      title: "Tab 1",
      kind: "text",
      bytes: 12,
      lineCount: 2,
    });
  });

  it("includes rich text and tablet state sizes", async () => {
    mockTabsEach.mockImplementation(async (visitor) => {
      visitor(makeRecord({ isRich: true, richContent: "{\"a\":1}" }));
      visitor(makeRecord({ id: "tab-2", isTablet: true, tabletState: "state" }));
    });

    const usages = await estimateTabStorageUsage();

    expect(usages.find((u) => u.kind === "rich-text")?.bytes).toBe(7);
    expect(usages.find((u) => u.kind === "tablet")?.bytes).toBe(5);
  });

  it("adds canvas asset byteLength values without decoding blobs", async () => {
    (db.canvasDocuments.toArray as jest.Mock).mockResolvedValue([
      {
        id: "doc-1",
        tabId: "tab-canvas",
        items: [
          { type: "image", assetId: "asset-1" },
          { type: "image", assetId: "asset-2" },
          { type: "text" },
        ],
      },
    ]);
    const anyOf = jest.fn().mockReturnThis();
    const toArray = jest
      .fn()
      .mockResolvedValue([{ id: "asset-1", byteLength: 1000 }]);
    (db.canvasAssets.where as jest.Mock).mockReturnValue({
      anyOf,
      toArray,
    });
    mockTabsEach.mockImplementation(async (visitor) => {
      visitor(
        makeRecord({
          id: "tab-canvas",
          title: "Canvas",
          contentKind: "canvas",
          documentId: "doc-1",
        }),
      );
      visitor(makeRecord({ id: "tab-text", title: "Text", content: "abc" }));
    });

    const usages = await estimateTabStorageUsage();

    expect(db.canvasAssets.where).toHaveBeenCalledWith("id");
    expect(anyOf).toHaveBeenCalledWith(["asset-1", "asset-2"]);
    const canvasEntry = usages.find((u) => u.tabId === "tab-canvas");
    expect(canvasEntry).toMatchObject({
      bytes: 1000,
      cardCount: 3,
      imageCount: 2,
    });
    expect(usages[0].tabId).toBe("tab-canvas");
  });

  it("sorts heaviest tabs first", async () => {
    mockTabsEach.mockImplementation(async (visitor) => {
      visitor(makeRecord({ id: "small", content: "a" }));
      visitor(makeRecord({ id: "big", content: "abcdef" }));
      visitor(makeRecord({ id: "empty", content: "" }));
    });

    const usages = await estimateTabStorageUsage();

    expect(usages.map((u) => u.tabId)).toEqual(["big", "small", "empty"]);
  });
});
