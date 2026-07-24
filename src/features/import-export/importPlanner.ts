import type { SplitViewState, Tab, Workspace } from "../../types";
import { getTabContentKind } from "../../utils/tabContentKind";
import type {
  CanvasAssetRecord,
  CanvasDocument,
  CanvasItem,
} from "../canvas/types";
import { collectCanvasAssetIds } from "../canvas/utils/canvasAssetReferences";
import type { ExportData, ImportSummaryItem } from "./types";

export interface ExistingImportIds {
  workspaceIds: ReadonlySet<string>;
  tabIds: ReadonlySet<string>;
  splitViewIds: ReadonlySet<string>;
  canvasDocumentIds: ReadonlySet<string>;
  canvasAssetIds: ReadonlySet<string>;
  maxDisplayOrder: number;
}

export interface WorkspaceImportPlan {
  workspaces: Workspace[];
  tabs: Tab[];
  splitViews: SplitViewState[];
  canvasDocuments: CanvasDocument[];
  canvasAssets: CanvasAssetRecord[];
  summaries: ImportSummaryItem[];
  canvasErrors: string[];
}

interface IdMaps {
  workspaces: Map<string, string>;
  tabs: Map<string, string>;
  splitViews: Map<string, string>;
  documents: Map<string, string>;
  assets: Map<string, string>;
}

const allocateId = (
  originalId: string,
  existingIds: ReadonlySet<string>,
  allocatedIds: Set<string>,
  createId: () => string,
): string => {
  if (!existingIds.has(originalId) && !allocatedIds.has(originalId)) {
    allocatedIds.add(originalId);
    return originalId;
  }
  let nextId = createId();
  while (existingIds.has(nextId) || allocatedIds.has(nextId)) {
    nextId = createId();
  }
  allocatedIds.add(nextId);
  return nextId;
};

const indexUnique = <T extends { id: string }>(
  records: readonly T[],
  label: string,
  errors: string[],
): Map<string, T> => {
  const result = new Map<string, T>();
  const duplicates = new Set<string>();
  records.forEach((record) => {
    if (result.has(record.id)) duplicates.add(record.id);
    else result.set(record.id, record);
  });
  duplicates.forEach((id) => {
    result.delete(id);
    errors.push(
      `Canvas ${label} ${id} was skipped because its ID is duplicated.`,
    );
  });
  return result;
};

const mapTabId = (
  id: string | null | undefined,
  tabIds: ReadonlyMap<string, string>,
): string | null => (id ? (tabIds.get(id) ?? null) : null);

const mapTabIds = (
  ids: readonly string[],
  tabIds: ReadonlyMap<string, string>,
): string[] =>
  ids.flatMap((id) => {
    const mapped = tabIds.get(id);
    return mapped ? [mapped] : [];
  });

const remapImageAssets = (
  items: readonly CanvasItem[],
  assetIds: ReadonlyMap<string, string>,
): CanvasItem[] =>
  items.map((item) => {
    if (item.type !== "image") return { ...item };
    const mappedAssetId = assetIds.get(item.assetId);
    if (!mappedAssetId) {
      throw new Error(`Canvas asset ${item.assetId} was not remapped.`);
    }
    return { ...item, assetId: mappedAssetId };
  });

export const buildWorkspaceImportPlan = ({
  data,
  canvasDocuments,
  canvasAssets,
  existing,
  initialCanvasErrors = [],
  createId = () => crypto.randomUUID(),
  now = Date.now(),
}: {
  data: ExportData;
  canvasDocuments: readonly CanvasDocument[];
  canvasAssets: readonly CanvasAssetRecord[];
  existing: ExistingImportIds;
  initialCanvasErrors?: readonly string[];
  createId?: () => string;
  now?: number;
}): WorkspaceImportPlan => {
  const canvasErrors = [...initialCanvasErrors];
  const documentsById = indexUnique(canvasDocuments, "document", canvasErrors);
  const assetsById = indexUnique(canvasAssets, "asset", canvasErrors);
  const validDocuments = new Map<string, CanvasDocument>();
  const validAssetIds = new Set<string>();
  const invalidCanvasTabIds = new Set<string>();

  for (const tab of data.tabs.filter(
    (candidate) => getTabContentKind(candidate) === "canvas",
  )) {
    const document = tab.documentId
      ? documentsById.get(tab.documentId)
      : undefined;
    let reason: string | null = null;
    if (!document) {
      reason = "its document is missing or invalid";
    } else if (
      document.tabId !== tab.id ||
      document.workspaceId !== tab.workspaceId
    ) {
      reason = "its document identity does not match the tab";
    } else {
      const referencedAssetIds = collectCanvasAssetIds(document.items);
      const invalidAssetId = Array.from(referencedAssetIds).find((assetId) => {
        const asset = assetsById.get(assetId);
        return !asset || asset.workspaceId !== document.workspaceId;
      });
      if (invalidAssetId) {
        reason = `asset ${invalidAssetId} is missing, invalid, or belongs to another workspace`;
      } else {
        validDocuments.set(document.id, document);
        referencedAssetIds.forEach((assetId) => validAssetIds.add(assetId));
      }
    }

    if (reason) {
      invalidCanvasTabIds.add(tab.id);
      canvasErrors.push(`Canvas "${tab.title}" was skipped because ${reason}.`);
    }
  }

  const tabsToImport = data.tabs.filter(
    (tab) => !invalidCanvasTabIds.has(tab.id),
  );
  const maps: IdMaps = {
    workspaces: new Map(),
    tabs: new Map(),
    splitViews: new Map(),
    documents: new Map(),
    assets: new Map(),
  };
  const allocated = {
    workspaces: new Set<string>(),
    tabs: new Set<string>(),
    splitViews: new Set<string>(),
    documents: new Set<string>(),
    assets: new Set<string>(),
  };

  data.workspaces.forEach((workspace) =>
    maps.workspaces.set(
      workspace.id,
      allocateId(
        workspace.id,
        existing.workspaceIds,
        allocated.workspaces,
        createId,
      ),
    ),
  );
  tabsToImport.forEach((tab) =>
    maps.tabs.set(
      tab.id,
      allocateId(tab.id, existing.tabIds, allocated.tabs, createId),
    ),
  );
  data.splitViews.forEach((splitView) =>
    maps.splitViews.set(
      splitView.id,
      allocateId(
        splitView.id,
        existing.splitViewIds,
        allocated.splitViews,
        createId,
      ),
    ),
  );
  validDocuments.forEach((document) =>
    maps.documents.set(
      document.id,
      allocateId(
        document.id,
        existing.canvasDocumentIds,
        allocated.documents,
        createId,
      ),
    ),
  );
  validAssetIds.forEach((assetId) =>
    maps.assets.set(
      assetId,
      allocateId(assetId, existing.canvasAssetIds, allocated.assets, createId),
    ),
  );

  const workspaces = data.workspaces.map((workspace, index) => {
    const id = maps.workspaces.get(workspace.id)!;
    const conflicted = id !== workspace.id;
    return {
      ...workspace,
      id,
      name: conflicted
        ? `${workspace.name} (Imported ${new Date(now).toLocaleDateString()} ${new Date(now).toLocaleTimeString()})`
        : workspace.name,
      lastAccessed: now,
      displayOrder:
        workspace.displayOrder ?? existing.maxDisplayOrder + index + 1,
    };
  });

  const tabs = tabsToImport.map(
    (tab): Tab => ({
      ...tab,
      id: maps.tabs.get(tab.id)!,
      workspaceId: maps.workspaces.get(tab.workspaceId)!,
      ...(tab.documentId
        ? { documentId: maps.documents.get(tab.documentId) ?? tab.documentId }
        : {}),
    }),
  );

  const splitViews = data.splitViews.map(
    (splitView): SplitViewState => ({
      ...splitView,
      id: maps.splitViews.get(splitView.id)!,
      workspaceId: maps.workspaces.get(splitView.workspaceId)!,
      leftTabs: mapTabIds(splitView.leftTabs, maps.tabs),
      rightTabs: mapTabIds(splitView.rightTabs, maps.tabs),
      activeLeftTabId: mapTabId(splitView.activeLeftTabId, maps.tabs),
      activeRightTabId: mapTabId(splitView.activeRightTabId, maps.tabs),
      leftTabHistory: mapTabIds(splitView.leftTabHistory, maps.tabs),
      rightTabHistory: mapTabIds(splitView.rightTabHistory, maps.tabs),
    }),
  );

  const remappedDocuments = Array.from(validDocuments.values()).map(
    (document): CanvasDocument => ({
      ...document,
      id: maps.documents.get(document.id)!,
      tabId: maps.tabs.get(document.tabId)!,
      workspaceId: maps.workspaces.get(document.workspaceId)!,
      items: remapImageAssets(document.items, maps.assets),
      edges: document.edges.map((edge) => ({ ...edge })),
      settings: { ...document.settings },
    }),
  );
  const remappedAssets = Array.from(validAssetIds, (assetId) => {
    const asset = assetsById.get(assetId)!;
    return {
      ...asset,
      id: maps.assets.get(asset.id)!,
      workspaceId: maps.workspaces.get(asset.workspaceId)!,
    };
  });

  const summaries = data.workspaces.map((sourceWorkspace) => {
    const importedWorkspace = workspaces.find(
      (workspace) => workspace.id === maps.workspaces.get(sourceWorkspace.id),
    )!;
    const workspaceTabs = tabs.filter(
      (tab) => tab.workspaceId === importedWorkspace.id,
    );
    const skippedCanvasCount = data.tabs.filter(
      (tab) =>
        tab.workspaceId === sourceWorkspace.id &&
        invalidCanvasTabIds.has(tab.id),
    ).length;
    return {
      name: importedWorkspace.name,
      tabCount: workspaceTabs.length,
      status:
        importedWorkspace.id === sourceWorkspace.id
          ? ("imported" as const)
          : ("merged" as const),
      ...(importedWorkspace.id === sourceWorkspace.id
        ? {}
        : {
            reason: `Workspace ID ${sourceWorkspace.id.substring(0, 8)}... conflicted and was remapped.`,
          }),
      canvasCount: workspaceTabs.filter(
        (tab) => getTabContentKind(tab) === "canvas",
      ).length,
      skippedCanvasCount,
    };
  });

  return {
    workspaces,
    tabs,
    splitViews,
    canvasDocuments: remappedDocuments,
    canvasAssets: remappedAssets,
    summaries,
    canvasErrors,
  };
};
