import type { StorageProvider } from "../db";
import { StorageProviderFactory } from "../db";
import type { Tab } from "../types";
import { duplicateTab as createDuplicateTab } from "../utils/tabUtils";
import { getTabContentKind } from "../utils/tabContentKind";

export interface TabDocumentSearchEntry {
  text: string;
  language: string;
  itemId?: string;
  itemType?: string;
  itemLabel?: string;
}

export interface TabDocumentSearchData {
  searchText: string;
  entries: TabDocumentSearchEntry[];
}

export interface TabDocumentAdapter {
  hasContent(tab: Tab): Promise<boolean>;
  duplicate(tab: Tab, targetWorkspaceId: string): Promise<Tab>;
  remove(tab: Tab): Promise<void>;
  move(tab: Tab, targetWorkspaceId: string): Promise<Tab>;
  getSearchData(tab: Tab): Promise<TabDocumentSearchData>;
}

export class LegacyTabDocumentAdapter implements TabDocumentAdapter {
  constructor(
    private readonly storage: StorageProvider,
    private readonly now: () => number = Date.now,
  ) {}

  async hasContent(tab: Tab): Promise<boolean> {
    return Boolean(
      tab.isTablet ||
      tab.richContent ||
      tab.tabletState ||
      (tab.content && tab.content.trim()),
    );
  }

  async duplicate(tab: Tab, targetWorkspaceId: string): Promise<Tab> {
    const now = this.now();
    const duplicate = {
      ...createDuplicateTab(tab),
      workspaceId: targetWorkspaceId,
      dateCreated: now,
      lastModified: now,
      lastAccessed: now,
    };
    await this.storage.saveTabNow(duplicate);
    return duplicate;
  }

  async remove(tab: Tab): Promise<void> {
    await this.storage.deleteTab(tab.id);
  }

  async move(tab: Tab, targetWorkspaceId: string): Promise<Tab> {
    const moved = {
      ...tab,
      workspaceId: targetWorkspaceId,
      lastModified: this.now(),
    };
    await this.storage.saveTabNow(moved);
    return moved;
  }

  async getSearchData(tab: Tab): Promise<TabDocumentSearchData> {
    if (tab.isTablet || !tab.content) {
      return { searchText: "", entries: [] };
    }
    return {
      searchText: tab.content,
      entries: [{ text: tab.content, language: tab.language }],
    };
  }
}

type CanvasAdapterLoader = () => Promise<TabDocumentAdapter>;

const loadCanvasAdapter: CanvasAdapterLoader = async () => {
  const { canvasTabDocumentAdapter } =
    await import("../features/canvas/services/CanvasTabDocumentAdapter");
  return canvasTabDocumentAdapter;
};

export class TabDocumentAdapterResolver {
  constructor(
    private readonly legacyAdapter: TabDocumentAdapter,
    private readonly canvasLoader: CanvasAdapterLoader = loadCanvasAdapter,
  ) {}

  resolve(tab: Tab): Promise<TabDocumentAdapter> {
    return getTabContentKind(tab) === "canvas"
      ? this.canvasLoader()
      : Promise.resolve(this.legacyAdapter);
  }
}

const legacyTabDocumentAdapter = new LegacyTabDocumentAdapter(
  StorageProviderFactory.getProvider(),
);

export const tabDocumentAdapterResolver = new TabDocumentAdapterResolver(
  legacyTabDocumentAdapter,
);
