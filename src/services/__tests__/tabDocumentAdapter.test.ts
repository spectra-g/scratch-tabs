import type { StorageProvider } from "../../db";
import type { Tab } from "../../types";
import {
  LegacyTabDocumentAdapter,
  TabDocumentAdapterResolver,
  type TabDocumentAdapter,
} from "../tabDocumentAdapter";

const tab: Tab = {
  id: "tab-1",
  title: "Scratch",
  content: "hello",
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: "workspace-1",
};

const storage = (): jest.Mocked<StorageProvider> =>
  ({
    saveTabNow: jest.fn().mockResolvedValue(undefined),
    deleteTab: jest.fn().mockResolvedValue(undefined),
  }) as unknown as jest.Mocked<StorageProvider>;

describe("LegacyTabDocumentAdapter", () => {
  it("persists an independent duplicate through the adapter boundary", async () => {
    const provider = storage();
    const adapter = new LegacyTabDocumentAdapter(provider, () => 10);

    const duplicate = await adapter.duplicate(tab, "workspace-1");

    expect(duplicate).toEqual(
      expect.objectContaining({
        title: "Scratch (Copy)",
        workspaceId: "workspace-1",
        dateCreated: 10,
        lastModified: 10,
      }),
    );
    expect(duplicate.id).not.toBe(tab.id);
    expect(provider.saveTabNow).toHaveBeenCalledWith(duplicate);
  });

  it("updates ownership before reporting a legacy move complete", async () => {
    const provider = storage();
    const adapter = new LegacyTabDocumentAdapter(provider, () => 20);

    const moved = await adapter.move(tab, "workspace-2");

    expect(moved.workspaceId).toBe("workspace-2");
    expect(provider.saveTabNow).toHaveBeenCalledWith(moved);
    expect(provider.deleteTab).not.toHaveBeenCalled();
  });

  it("delegates legacy deletion to its storage provider", async () => {
    const provider = storage();
    await new LegacyTabDocumentAdapter(provider).remove(tab);
    expect(provider.deleteTab).toHaveBeenCalledWith(tab.id);
  });
});

describe("TabDocumentAdapterResolver", () => {
  it("keeps legacy kinds on the lightweight adapter", async () => {
    const legacy = {} as TabDocumentAdapter;
    const loadCanvas = jest.fn();
    const resolver = new TabDocumentAdapterResolver(legacy, loadCanvas);

    await expect(resolver.resolve(tab)).resolves.toBe(legacy);
    expect(loadCanvas).not.toHaveBeenCalled();
  });

  it("loads the Canvas adapter only for Canvas documents", async () => {
    const canvas = {} as TabDocumentAdapter;
    const loadCanvas = jest.fn().mockResolvedValue(canvas);
    const resolver = new TabDocumentAdapterResolver(
      {} as TabDocumentAdapter,
      loadCanvas,
    );

    await expect(
      resolver.resolve({
        ...tab,
        contentKind: "canvas",
        documentId: "document-1",
      }),
    ).resolves.toBe(canvas);
    expect(loadCanvas).toHaveBeenCalledTimes(1);
  });
});
