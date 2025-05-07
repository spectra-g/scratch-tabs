import { Workspace, Tab, SplitViewState } from '../../types';

export interface ExportData {
  workspaces: Workspace[];
  tabs: Tab[];
  splitViews: SplitViewState[];
}

export interface ExportFileContent {
  exportFormatVersion: string;
  exportedAt: string; // ISO 8601 timestamp
  data: ExportData;
}

export interface ImportSummaryItem {
  name: string;
  tabCount: number;
  status: 'imported' | 'merged' | 'skipped'; // Or more granular status
  reason?: string;
}

export interface ImportProcessSummary {
  importedWorkspaces: ImportSummaryItem[];
  errors: string[];
}