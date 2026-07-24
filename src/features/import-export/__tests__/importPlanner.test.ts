import { buildWorkspaceImportPlan } from "../importPlanner";
import {
  canvasAsset,
  canvasDocument,
  canvasTab,
  exportData,
  textTab,
} from "../testFixtures.fixture";

const emptyExisting = {
  workspaceIds: new Set<string>(),
  tabIds: new Set<string>(),
  splitViewIds: new Set<string>(),
  canvasDocumentIds: new Set<string>(),
  canvasAssetIds: new Set<string>(),
  maxDisplayOrder: 0,
};

describe("buildWorkspaceImportPlan", () => {
  it("preserves Canvas geometry, settings, content, and referenced assets", () => {
    const plan = buildWorkspaceImportPlan({
      data: exportData,
      canvasDocuments: [canvasDocument],
      canvasAssets: [canvasAsset],
      existing: emptyExisting,
      now: 100,
    });

    expect(plan.canvasErrors).toEqual([]);
    expect(plan.tabs).toHaveLength(2);
    expect(plan.canvasDocuments[0]).toEqual(
      expect.objectContaining({
        id: canvasDocument.id,
        tabId: canvasTab.id,
        settings: { background: "grid", snapToGrid: true },
        searchText: canvasDocument.searchText,
        items: [
          expect.objectContaining({
            x: 125,
            y: -40,
            width: 640,
            height: 360,
            assetId: canvasAsset.id,
          }),
        ],
      }),
    );
    expect(plan.canvasAssets[0].blob).toBe(canvasAsset.blob);
  });

  it("remaps colliding workspace, tab, document, asset, and split-view IDs", () => {
    const generatedIds = [
      "workspace-new",
      "tab-text-new",
      "tab-canvas-new",
      "split-new",
      "document-new",
      "asset-new",
    ];
    const plan = buildWorkspaceImportPlan({
      data: exportData,
      canvasDocuments: [canvasDocument],
      canvasAssets: [canvasAsset],
      existing: {
        workspaceIds: new Set(["workspace-1"]),
        tabIds: new Set(["tab-text", "tab-canvas"]),
        splitViewIds: new Set(["split-1"]),
        canvasDocumentIds: new Set(["document-1"]),
        canvasAssetIds: new Set(["asset-1"]),
        maxDisplayOrder: 8,
      },
      createId: () => generatedIds.shift()!,
      now: 100,
    });

    expect(plan.workspaces[0].id).toBe("workspace-new");
    expect(plan.tabs.map((tab) => tab.id)).toEqual([
      "tab-text-new",
      "tab-canvas-new",
    ]);
    expect(
      plan.tabs.find((tab) => tab.contentKind === "canvas")?.documentId,
    ).toBe("document-new");
    expect(plan.canvasDocuments[0]).toEqual(
      expect.objectContaining({
        id: "document-new",
        tabId: "tab-canvas-new",
        workspaceId: "workspace-new",
        items: [expect.objectContaining({ assetId: "asset-new" })],
      }),
    );
    expect(plan.canvasAssets[0]).toEqual(
      expect.objectContaining({
        id: "asset-new",
        workspaceId: "workspace-new",
      }),
    );
    expect(plan.splitViews[0]).toEqual(
      expect.objectContaining({
        id: "split-new",
        workspaceId: "workspace-new",
        leftTabs: ["tab-text-new"],
        rightTabs: ["tab-canvas-new"],
        activeRightTabId: "tab-canvas-new",
      }),
    );
  });

  it("remaps a Canvas tab when a deleted workspace left orphaned Canvas records", () => {
    const generatedIds = [
      "tab-canvas-imported",
      "document-imported",
      "asset-imported",
    ];
    const plan = buildWorkspaceImportPlan({
      data: exportData,
      canvasDocuments: [canvasDocument],
      canvasAssets: [canvasAsset],
      existing: {
        ...emptyExisting,
        // readExistingIds reserves document.tabId even when the parent tab and
        // workspace were deleted by an older build.
        tabIds: new Set([canvasTab.id]),
        canvasDocumentIds: new Set([canvasDocument.id]),
        canvasAssetIds: new Set([canvasAsset.id]),
      },
      createId: () => generatedIds.shift()!,
      now: 100,
    });

    const importedTab = plan.tabs.find(
      (tab) => tab.contentKind === "canvas",
    )!;
    expect(importedTab).toEqual(
      expect.objectContaining({
        id: "tab-canvas-imported",
        documentId: "document-imported",
      }),
    );
    expect(plan.canvasDocuments[0]).toEqual(
      expect.objectContaining({
        id: "document-imported",
        tabId: importedTab.id,
        workspaceId: importedTab.workspaceId,
        items: [expect.objectContaining({ assetId: "asset-imported" })],
      }),
    );
  });

  it("skips a Canvas with a corrupt asset while retaining valid normal tabs", () => {
    const plan = buildWorkspaceImportPlan({
      data: exportData,
      canvasDocuments: [canvasDocument],
      canvasAssets: [],
      existing: emptyExisting,
      initialCanvasErrors: ["Canvas asset asset-1 failed its checksum."],
      now: 100,
    });

    expect(plan.tabs).toEqual([expect.objectContaining({ id: textTab.id })]);
    expect(plan.canvasDocuments).toEqual([]);
    expect(plan.canvasAssets).toEqual([]);
    expect(plan.splitViews[0]).toEqual(
      expect.objectContaining({
        leftTabs: [textTab.id],
        rightTabs: [],
        activeRightTabId: null,
      }),
    );
    expect(plan.canvasErrors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("failed its checksum"),
        expect.stringContaining('Canvas "Architecture" was skipped'),
      ]),
    );
    expect(plan.summaries[0].skippedCanvasCount).toBe(1);
  });
});
