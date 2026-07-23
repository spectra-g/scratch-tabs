import type {
  TabDocumentAdapter,
  TabDocumentSearchData,
} from "../../../services/tabDocumentAdapter";
import type { Tab } from "../../../types";
import {
  canvasDocumentManager,
  type CanvasDocumentManager,
} from "./CanvasDocumentManager";
import {
  canvasDocumentLifecycleRepository,
  type CanvasDocumentLifecycleRepositoryContract,
} from "./CanvasDocumentLifecycleRepository";
import {
  canvasDocumentRepository,
  type CanvasDocumentRepositoryContract,
} from "./CanvasDocumentRepository";
import {
  buildCanvasSearchText,
  getCanvasSearchEntries,
} from "./CanvasSearchIndexer";

type CanvasManagerLifecycle = Pick<
  CanvasDocumentManager,
  "dispose" | "flush" | "hasContent"
>;

export class CanvasTabDocumentAdapter implements TabDocumentAdapter {
  constructor(
    private readonly manager: CanvasManagerLifecycle = canvasDocumentManager,
    private readonly repository: CanvasDocumentLifecycleRepositoryContract = canvasDocumentLifecycleRepository,
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = () => crypto.randomUUID(),
    private readonly reportCleanupError: (error: unknown) => void = (error) =>
      console.error("Canvas asset garbage collection failed:", error),
    private readonly documentRepository: Pick<
      CanvasDocumentRepositoryContract,
      "getByTabId"
    > = canvasDocumentRepository,
  ) {}

  hasContent(tab: Tab): Promise<boolean> {
    return this.manager.hasContent(tab.id);
  }

  async duplicate(tab: Tab, targetWorkspaceId: string): Promise<Tab> {
    if (targetWorkspaceId !== tab.workspaceId) {
      throw new Error("Canvas duplication must stay within one workspace");
    }
    await this.manager.flush(tab.id);

    const now = this.now();
    const duplicate: Tab = {
      ...tab,
      id: this.createId(),
      documentId: this.createId(),
      title: `${tab.title} (Copy)`,
      workspaceId: targetWorkspaceId,
      dateCreated: now,
      lastModified: now,
      lastAccessed: now,
      isPinned: false,
    };
    await this.repository.duplicate(tab, duplicate, now);
    return duplicate;
  }

  async remove(tab: Tab): Promise<void> {
    await this.manager.flush(tab.id);
    const assetIds = await this.repository.remove(tab);
    await this.manager.dispose(tab.id);
    await this.collectOrphans(tab.workspaceId, assetIds);
  }

  async move(tab: Tab, targetWorkspaceId: string): Promise<Tab> {
    if (targetWorkspaceId === tab.workspaceId) return tab;

    await this.manager.flush(tab.id);
    const now = this.now();
    const moved = {
      ...tab,
      workspaceId: targetWorkspaceId,
      lastModified: now,
    };
    const { sourceAssetIds } = await this.repository.move(tab, moved, now);
    await this.manager.dispose(tab.id);
    await this.collectOrphans(tab.workspaceId, sourceAssetIds);
    return moved;
  }

  async getSearchData(tab: Tab): Promise<TabDocumentSearchData> {
    const document = await this.documentRepository.getByTabId(tab.id);
    if (!document) return { searchText: "", entries: [] };
    return {
      searchText: buildCanvasSearchText(document.items),
      entries: getCanvasSearchEntries(document.items),
    };
  }

  private async collectOrphans(
    workspaceId: string,
    assetIds: readonly string[],
  ): Promise<void> {
    try {
      await this.repository.garbageCollect(workspaceId, assetIds);
    } catch (error) {
      this.reportCleanupError(error);
    }
  }
}

export const canvasTabDocumentAdapter = new CanvasTabDocumentAdapter();
