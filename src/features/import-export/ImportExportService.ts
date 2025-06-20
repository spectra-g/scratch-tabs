import { db, StorageProviderFactory } from '../../db';
import { Workspace, Tab, SplitViewState } from '../../types';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import {
  ExportFileContent,
  ExportData,
  ImportProcessSummary,
  ImportSummaryItem
} from './types';
import {
  stableStringifyDataBlock,
  generateSha256,
  createZipArchive,
  triggerDownload,
  readZipArchive,
  generateExportFilename,
} from './utils';

const EXPORT_FORMAT_VERSION = "1.1.0";

export class ImportExportService {
  private storage: ReturnType<typeof StorageProviderFactory.getProvider>;

  constructor() {
    this.storage = StorageProviderFactory.getProvider();
  }

  async exportWorkspaces(workspaceIds: string[]): Promise<void> {
    if (workspaceIds.length === 0) {
      alert("No workspaces selected for export.");
      return;
    }

    try {
      const dataToExport: ExportData = {
        workspaces: [],
        tabs: [],
        splitViews: [],
      };

      for (const id of workspaceIds) {
        const workspace = await this.storage.getWorkspace(id);
        if (workspace) {
          dataToExport.workspaces.push(workspace);
          const tabs = await this.storage.getTabsByWorkspace(id);
          dataToExport.tabs.push(...tabs);
          const splitViewRecord = await this.storage.getSplitViewByWorkspace(id);
          if (splitViewRecord) {
            dataToExport.splitViews.push(splitViewRecord as unknown as SplitViewState);
          }
        }
      }

      if (dataToExport.workspaces.length === 0) {
        alert("No data found for selected workspaces.");
        return;
      }
      
      const exportFileContent: ExportFileContent = {
        exportFormatVersion: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        data: dataToExport,
      };

      const jsonDataString = JSON.stringify(exportFileContent, null, 2);
      const dataBlockString = stableStringifyDataBlock(dataToExport);
      const checksum = await generateSha256(dataBlockString);

      const zipBlob = await createZipArchive(jsonDataString, checksum);
      const filename = generateExportFilename();
      triggerDownload(zipBlob, filename);

    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async importWorkspaces(file: File): Promise<ImportProcessSummary> {
    const summary: ImportProcessSummary = {
      importedWorkspaces: [],
      errors: [],
    };

    const { jsonDataString, checksumString, error: unzipError } = await readZipArchive(file);

    if (unzipError) {
      summary.errors.push(unzipError);
      return summary;
    }
    if (!jsonDataString || !checksumString) {
      const missingFileError = "Extracted data or checksum is missing.";
      summary.errors.push(missingFileError);
      return summary;
    }

    let parsedFileContent: ExportFileContent;
    try {
      parsedFileContent = JSON.parse(jsonDataString) as ExportFileContent;
    } catch (e) {
      const parseError = "Failed to parse export-data.json. The file might be corrupted.";
      summary.errors.push(parseError);
      return summary;
    }

    if (parsedFileContent.exportFormatVersion !== EXPORT_FORMAT_VERSION) {
      const versionMismatchError = `Incompatible export format version. Expected ${EXPORT_FORMAT_VERSION}, got ${parsedFileContent.exportFormatVersion}.`;
      summary.errors.push(versionMismatchError);
    }
    
    const dataBlockStringForChecksum = stableStringifyDataBlock(parsedFileContent.data);
    const calculatedChecksum = await generateSha256(dataBlockStringForChecksum);

    if (calculatedChecksum !== checksumString.trim()) {
      const checksumError = "File integrity check failed. The file may be corrupted or modified. Import aborted.";
      summary.errors.push(checksumError);
      return summary;
    }

    const { workspaces: importedWorkspaces, tabs: importedTabs, splitViews: importedSplitViewsUnsafe } = parsedFileContent.data;
    const importedSplitViews: SplitViewState[] = importedSplitViewsUnsafe as SplitViewState[];

    const existingWorkspaces = await this.storage.getWorkspaces();
    const existingWorkspaceIds = new Set(existingWorkspaces.map(ws => ws.id));
    const allDbTabs = await this.storage.getTabs();
    const existingTabIds = new Set(allDbTabs.map(t => t.id));
    
    const existingSplitViewIds = new Set<string>();
    for(const ws of existingWorkspaces){
        const svRecord = await this.storage.getSplitViewByWorkspace(ws.id);
        if(svRecord) existingSplitViewIds.add(svRecord.id);
    }

    const workspacesToSave: Workspace[] = [];
    const tabsToSave: Tab[] = [];
    const splitViewsToSave: SplitViewState[] = [];
    const idRemap: Record<string, string> = {};

    for (let impWs of importedWorkspaces) {
      const originalImportedWorkspaceId = impWs.id;
      let currentDbWorkspaceId = originalImportedWorkspaceId;
      let finalName = impWs.name;
      const summaryItem: ImportSummaryItem = { name: impWs.name, tabCount: 0, status: 'imported' };

      if (existingWorkspaceIds.has(originalImportedWorkspaceId)) {
        const newId = crypto.randomUUID();
        idRemap[originalImportedWorkspaceId] = newId;
        currentDbWorkspaceId = newId;
        finalName = `${impWs.name} (Imported ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
        impWs = { ...impWs, id: currentDbWorkspaceId, name: finalName };
        summaryItem.status = 'merged';
        summaryItem.reason = `Original ID ${originalImportedWorkspaceId.substring(0,8)}... conflicted. Renamed and assigned new ID.`;
      }
      impWs.lastAccessed = Date.now();
      workspacesToSave.push(impWs);
      summaryItem.name = finalName;

      const workspaceTabsFromImportFile = importedTabs.filter(t => t.workspaceId === originalImportedWorkspaceId);

      for (const impTab of workspaceTabsFromImportFile) {
        const originalTabId = impTab.id;
        let finalTabId = impTab.id;
        if (idRemap[originalImportedWorkspaceId] || existingTabIds.has(originalTabId)) { 
            finalTabId = crypto.randomUUID();
            idRemap[originalTabId] = finalTabId;
        }
        tabsToSave.push({ ...impTab, id: finalTabId, workspaceId: currentDbWorkspaceId });
        summaryItem.tabCount++;
      }

      const workspaceSplitViewFromImportFile = importedSplitViews.find(sv => sv.workspaceId === originalImportedWorkspaceId);
      if (workspaceSplitViewFromImportFile) {
        const originalSplitViewId = workspaceSplitViewFromImportFile.id;
        let finalSplitViewId = originalSplitViewId;

        if (idRemap[originalImportedWorkspaceId] || existingSplitViewIds.has(originalSplitViewId)) {
            finalSplitViewId = crypto.randomUUID();
            idRemap[originalSplitViewId] = finalSplitViewId;
        }

        const mapTabId = (tabId: string | null | undefined): string | null => {
            if (!tabId) return null;
            const mapped = idRemap[tabId] || tabId;
            return mapped;
        };
        const mapTabIdArray = (tabIds: string[]): string[] => {
            const mapped = tabIds.map(tid => idRemap[tid] || tid);
            return mapped;
        };
        
        const splitViewToSave: SplitViewState = {
          ...workspaceSplitViewFromImportFile,
          id: finalSplitViewId,
          workspaceId: currentDbWorkspaceId,
          activeLeftTabId: mapTabId(workspaceSplitViewFromImportFile.activeLeftTabId),
          activeRightTabId: mapTabId(workspaceSplitViewFromImportFile.activeRightTabId),
          leftTabs: mapTabIdArray(workspaceSplitViewFromImportFile.leftTabs || []),
          rightTabs: mapTabIdArray(workspaceSplitViewFromImportFile.rightTabs || []),
          leftTabHistory: mapTabIdArray(workspaceSplitViewFromImportFile.leftTabHistory || []),
          rightTabHistory: mapTabIdArray(workspaceSplitViewFromImportFile.rightTabHistory || []),
        };
        splitViewsToSave.push(splitViewToSave);
      }
      summary.importedWorkspaces.push(summaryItem);
    }

    try {
      await db.transaction('rw', db.workspaces, db.tabs, db.splitView, async () => {
        if (workspacesToSave.length > 0) await db.workspaces.bulkPut(workspacesToSave);
        if (tabsToSave.length > 0) await db.tabs.bulkPut(tabsToSave.map(t => ({...t, dateCreated: t.dateCreated || Date.now(), lastModified: t.lastModified || Date.now() })));
        
        const recordsToSaveToDb = splitViewsToSave.map(svs => ({ 
            id: svs.id, 
            isSplit: svs.isSplit,
            leftTabs: svs.leftTabs,
            rightTabs: svs.rightTabs,
            activeLeftTabId: svs.activeLeftTabId,
            activeRightTabId: svs.activeRightTabId,
            activeSide: svs.activeSide,
            splitRatio: svs.splitRatio,
            lastModified: Date.now(),
            workspaceId: svs.workspaceId,
        })); 
        if (recordsToSaveToDb.length > 0) await db.splitView.bulkPut(recordsToSaveToDb);
      });
      await useWorkspaceStore.getState().loadWorkspaces();
    } catch (dbError) {
      summary.errors.push(`Failed to save imported data to the database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
    
    return summary;
  }
}