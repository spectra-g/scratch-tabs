import { StorageProviderFactory } from "../../db";
import type { SplitViewState } from "../../types";
import { createWorkspaceArchive, readWorkspaceArchive } from "./archiveCodec";
import {
  canvasExportCollector,
  type CanvasExportCollectorContract,
} from "./canvasExportCollector";
import {
  workspaceExportFlushCoordinator,
  type ExportFlushCoordinator,
} from "./exportFlushCoordinator";
import { buildWorkspaceImportPlan } from "./importPlanner";
import type { ExportData, ImportProcessSummary } from "./types";
import { generateExportFilename, triggerDownload } from "./utils";
import {
  WorkspaceImportRepository,
  type WorkspaceImportRepositoryContract,
} from "./WorkspaceImportRepository";

type Storage = ReturnType<typeof StorageProviderFactory.getProvider>;

export class ImportExportService {
  constructor(
    private readonly storage: Storage = StorageProviderFactory.getProvider(),
    private readonly flushCoordinator: ExportFlushCoordinator = workspaceExportFlushCoordinator,
    private readonly canvasCollector: CanvasExportCollectorContract = canvasExportCollector,
    private readonly importRepository: WorkspaceImportRepositoryContract = new WorkspaceImportRepository(
      storage,
    ),
  ) {}

  async exportWorkspaces(workspaceIds: string[]): Promise<void> {
    if (workspaceIds.length === 0) {
      alert("No workspaces selected for export.");
      return;
    }

    try {
      await this.flushCoordinator.flush();
      const data = await this.collectWorkspaceData(workspaceIds);
      if (data.workspaces.length === 0) {
        alert("No data found for selected workspaces.");
        return;
      }
      const canvas = await this.canvasCollector.collect(data.tabs);
      const zipBlob = await createWorkspaceArchive(
        data,
        canvas.documents,
        canvas.assets,
      );
      triggerDownload(zipBlob, generateExportFilename());
    } catch (error) {
      alert(
        `Export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async collectWorkspaceData(
    workspaceIds: readonly string[],
  ): Promise<ExportData> {
    const data: ExportData = {
      workspaces: [],
      tabs: [],
      splitViews: [],
    };
    const selectedIds = new Set(workspaceIds);

    for (const id of selectedIds) {
      const workspace = await this.storage.getWorkspace(id);
      if (!workspace) continue;
      data.workspaces.push(workspace);
      data.tabs.push(...(await this.storage.getTabsByWorkspace(id)));
      const splitView = await this.storage.getSplitViewByWorkspace(id);
      if (splitView) {
        data.splitViews.push(splitView as unknown as SplitViewState);
      }
    }
    return data;
  }

  async importWorkspaces(file: File): Promise<ImportProcessSummary> {
    const summary: ImportProcessSummary = {
      importedWorkspaces: [],
      errors: [],
      canvasErrors: [],
    };

    let archive;
    try {
      archive = await readWorkspaceArchive(file);
    } catch (error) {
      summary.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      return summary;
    }

    if (archive.data.workspaces.length === 0) {
      summary.errors.push("The archive contains no workspaces.");
      return summary;
    }

    try {
      const existing = await this.importRepository.readExistingIds();
      const plan = buildWorkspaceImportPlan({
        data: archive.data,
        canvasDocuments: archive.canvasDocuments,
        canvasAssets: archive.canvasAssets,
        existing,
        initialCanvasErrors: archive.canvasErrors,
      });

      await this.importRepository.save(plan);

      summary.importedWorkspaces = plan.summaries;
      summary.canvasErrors = plan.canvasErrors;
    } catch (error) {
      summary.errors.push(
        `Failed to import workspace data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return summary;
  }
}
