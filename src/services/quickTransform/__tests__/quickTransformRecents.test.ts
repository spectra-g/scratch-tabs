import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { RecentItem } from "../types";

// Mock db module before importing recents
jest.mock("../../../db", () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

import { getSetting, setSetting } from "../../../db";
import { getRecentItems, addRecentItem } from "../quickTransformRecents";

const mockGetSetting = getSetting as jest.MockedFunction<typeof getSetting>;
const mockSetSetting = setSetting as jest.MockedFunction<typeof setSetting>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetSetting.mockResolvedValue(undefined);
});

describe("getRecentItems", () => {
  it("returns empty array when setting is not set", async () => {
    mockGetSetting.mockResolvedValue(undefined);
    expect(await getRecentItems()).toEqual([]);
  });

  it("parses stored JSON array", async () => {
    const items: RecentItem[] = [
      { type: "operation", id: "text.trim" },
      { type: "pipeline", id: "pipe-1" },
    ];
    mockGetSetting.mockResolvedValue(JSON.stringify(items));
    expect(await getRecentItems()).toEqual(items);
  });

  it("returns empty array on invalid JSON", async () => {
    mockGetSetting.mockResolvedValue("not-json{{{");
    expect(await getRecentItems()).toEqual([]);
  });
});

describe("addRecentItem", () => {
  it("prepends a new item to an empty list", async () => {
    mockGetSetting.mockResolvedValue(undefined);
    const item: RecentItem = { type: "operation", id: "text.trim" };

    await addRecentItem(item);

    expect(mockSetSetting).toHaveBeenCalledWith(
      "quickTransform.recent",
      JSON.stringify([item]),
    );
  });

  it("prepends to existing list", async () => {
    const existing: RecentItem[] = [{ type: "operation", id: "text.upper" }];
    mockGetSetting.mockResolvedValue(JSON.stringify(existing));
    const newItem: RecentItem = { type: "operation", id: "text.trim" };

    await addRecentItem(newItem);

    const saved = JSON.parse(
      (mockSetSetting as jest.Mock).mock.calls[0][1] as string,
    ) as RecentItem[];
    expect(saved[0]).toEqual(newItem);
    expect(saved[1]).toEqual(existing[0]);
  });

  it("deduplicates matching type+id", async () => {
    const item: RecentItem = { type: "operation", id: "text.trim" };
    mockGetSetting.mockResolvedValue(
      JSON.stringify([
        { type: "operation", id: "text.upper" },
        item,
        { type: "pipeline", id: "p1" },
      ]),
    );

    await addRecentItem(item);

    const saved = JSON.parse(
      (mockSetSetting as jest.Mock).mock.calls[0][1] as string,
    ) as RecentItem[];
    const trimCount = saved.filter(
      (r) => r.type === "operation" && r.id === "text.trim",
    ).length;
    expect(trimCount).toBe(1);
    expect(saved[0]).toEqual(item);
  });

  it("does not deduplicate same id with different type", async () => {
    const opItem: RecentItem = { type: "operation", id: "shared-id" };
    const pipeItem: RecentItem = { type: "pipeline", id: "shared-id" };
    mockGetSetting.mockResolvedValue(JSON.stringify([opItem]));

    await addRecentItem(pipeItem);

    const saved = JSON.parse(
      (mockSetSetting as jest.Mock).mock.calls[0][1] as string,
    ) as RecentItem[];
    expect(saved).toHaveLength(2);
  });

  it("caps list at 10 items", async () => {
    const existing: RecentItem[] = Array.from({ length: 10 }, (_, i) => ({
      type: "operation" as const,
      id: `op-${i}`,
    }));
    mockGetSetting.mockResolvedValue(JSON.stringify(existing));
    const newItem: RecentItem = { type: "operation", id: "op-new" };

    await addRecentItem(newItem);

    const saved = JSON.parse(
      (mockSetSetting as jest.Mock).mock.calls[0][1] as string,
    ) as RecentItem[];
    expect(saved).toHaveLength(10);
    expect(saved[0]).toEqual(newItem);
  });
});
