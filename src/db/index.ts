import Dexie, { Table } from 'dexie';
import { Tab, Workspace, WorkspaceLink } from '../types';

interface TabRecord {
  id: string;
  title: string;
  content: string;
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  lastModified: number;
  dateCreated: number;
  workspaceId: string;
}

interface SplitViewRecord {
  id: string;
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  activeSide: string | null;
  splitRatio: number;
  lastModified: number;
  workspaceId: string;
}

interface WorkspaceRecord {
  id: string;
  name: string;
  notes?: string;
  links: WorkspaceLink[];
  createdAt: number;
  lastAccessed: number;
}

export class ScratchTabsDB extends Dexie {
  tabs!: Table<TabRecord>;
  splitView!: Table<SplitViewRecord>;
  workspaces!: Table<WorkspaceRecord>;

  constructor() {
    super('ScratchTabsDB');

    this.version(1).stores({
      tabs: 'id, lastModified',
      splitView: 'id, lastModified'
    });

    this.version(2).stores({
      tabs: 'id, workspaceId, lastModified',
      splitView: 'id, workspaceId, lastModified',
      workspaces: 'id, lastAccessed'
    }).upgrade(tx => this.upgradeToV2(tx));
  }

  private async upgradeToV2(tx: Dexie.Transaction): Promise<void> {
    // First check if there are any existing tabs that need migration
    const existingTabs = await tx.table('tabs').toArray();

    if (existingTabs.length > 0) {
      // Only create default workspace if there are tabs to migrate
      const defaultWorkspace: WorkspaceRecord = {
        id: crypto.randomUUID(),
        name: 'Default Workspace',
        links: [],
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      await tx.table('workspaces').add(defaultWorkspace);

      // Update existing tabs with the workspace ID
      await Promise.all(existingTabs.map(tab =>
        tx.table('tabs').update(tab.id, { workspaceId: defaultWorkspace.id })
      ));

      // Update split views if they exist
      const splitViews = await tx.table('splitView').toArray();
      await Promise.all(splitViews.map(sv =>
        tx.table('splitView').update(sv.id, { workspaceId: defaultWorkspace.id })
      ));
    }
  }

  async reopenIfClosed(): Promise<void> {
    if (this.isOpen()) return;

    try {
      await this.open();
    } catch (error) {
      console.error('Failed to reopen database:', error);
      throw error;
    }
  }
}

export const db = new ScratchTabsDB();

const toTabRecord = (tab: Tab): TabRecord => ({
  ...tab,
  lastModified: tab.lastModified,
  dateCreated: tab.dateCreated,
  workspaceId: tab.workspaceId
});

const toTab = (record: TabRecord): Tab => {
  const now = Date.now();
  return {
    ...record,
    dateCreated: record.dateCreated || now,
    lastModified: record.lastModified || now,
    cursorPosition: record.cursorPosition || { lineNumber: 1, column: 1 },
    workspaceId: record.workspaceId
  };
};

export interface StorageProvider {
  getTabs(): Promise<Tab[]>;
  saveTabsInterval(tabs: Tab[]): Promise<void>;
  saveTabNow(tab: Tab): Promise<void>;
  saveTabsNow(tabs: Tab[]): Promise<void>;
  deleteTab(id: string): Promise<void>;
  getSplitView(): Promise<SplitViewRecord | null>;
  saveSplitViewInterval(splitView: SplitViewRecord): Promise<void>;
  saveSplitViewNow(splitView: SplitViewRecord): Promise<void>;
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  saveWorkspace(workspace: Workspace): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  getTabsByWorkspace(workspaceId: string): Promise<Tab[]>;
  getSplitViewByWorkspace(workspaceId: string): Promise<SplitViewRecord | null>;
  deleteSplitViewByWorkspace(workspaceId: string): Promise<void>;
}

export class IndexedDBStorage implements StorageProvider {
  private static instance: IndexedDBStorage;
  private lastSaveTabsTime: number = 0;
  private lastSaveSplitViewTime: number = 0;
  private readonly DEBOUNCE_TIME = 2000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private constructor() { }

  static getInstance(): IndexedDBStorage {
    if (!IndexedDBStorage.instance) {
      IndexedDBStorage.instance = new IndexedDBStorage();
    }
    return IndexedDBStorage.instance;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await db.reopenIfClosed();
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof Dexie.DatabaseClosedError) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  async getTabs(): Promise<Tab[]> {
    return this.withRetry(async () => {
      const records = await db.tabs.toArray();
      return records.map(toTab);
    });
  }

  async saveTabsInterval(tabs: Tab[]): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveTabsTime < this.DEBOUNCE_TIME) return;

    this.lastSaveTabsTime = now;
    await this.withRetry(async () => {
      const records = tabs.map(toTabRecord);
      await db.tabs.bulkPut(records);
    });
  }

  async saveTabNow(tab: Tab): Promise<void> {
    this.lastSaveTabsTime = Date.now();
    await this.withRetry(async () => {
      await db.tabs.put(toTabRecord(tab));
    });
  }

  async saveTabsNow(tabs: Tab[]): Promise<void> {
    this.lastSaveTabsTime = Date.now();
    await this.withRetry(async () => {
      const records = tabs.map(toTabRecord);
      await db.tabs.bulkPut(records);
    });
  }

  async deleteTab(id: string): Promise<void> {
    await this.withRetry(async () => {
      await db.tabs.delete(id);
    });
  }

  async getSplitView(): Promise<SplitViewRecord | null> {
    return this.withRetry(async () => {
      return await db.splitView.get('default');
    });
  }

  async saveSplitViewInterval(splitView: SplitViewRecord): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveSplitViewTime < this.DEBOUNCE_TIME) return;

    this.lastSaveSplitViewTime = now;
    await this.withRetry(async () => {
      // Generate UUID if not provided
      if (!splitView.id) {
        splitView.id = crypto.randomUUID();
      }
      await db.splitView.put(splitView);
    });
  }

  async saveSplitViewNow(splitView: SplitViewRecord): Promise<void> {
    this.lastSaveSplitViewTime = Date.now();
    await this.withRetry(async () => {
      // Generate UUID if not provided
      if (!splitView.id) {
        splitView.id = crypto.randomUUID();
      }
      await db.splitView.put(splitView);
    });
  }


  async getWorkspaces(): Promise<Workspace[]> {
    return this.withRetry(async () => {
      return await db.workspaces.orderBy('lastAccessed').reverse().toArray();
    });
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.withRetry(async () => {
      return await db.workspaces.get(id);
    });
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    await this.withRetry(async () => {
      await db.workspaces.put(workspace);
    });
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.withRetry(async () => {
      try {
        await db.transaction('rw', db.workspaces, db.tabs, db.splitView, async () => {
          // 1. Delete tabs associated with the workspace
          // This will delete all tab records where the 'workspaceId' property equals the given 'id'.
          await db.tabs.where('workspaceId').equals(id).delete();

          // 2. Delete split views associated with the workspace
          // Changed from fetching then looping, to a direct delete operation.
          // This will delete all splitView records where the 'workspaceId' property equals the given 'id'.
          await db.splitView.where('workspaceId').equals(id).delete();

          // 3. Delete the workspace itself
          // This is done last; if any of the above deletions fail, the transaction
          // will roll back, and the workspace will not be deleted either.
          await db.workspaces.delete(id);
        });
      } catch (error) {
        // Log the error or handle it as appropriate for your application
        console.error(`Error deleting workspace ${id} and its associated data:`, error);
        throw error; // Re-throw the error to be handled by withRetry or the caller
      }
    });
  }


  async getTabsByWorkspace(workspaceId: string): Promise<Tab[]> {
    return this.withRetry(async () => {
      const records = await db.tabs.where('workspaceId').equals(workspaceId).toArray();
      return records.map(toTab);
    });
  }

  async getSplitViewByWorkspace(workspaceId: string): Promise<SplitViewRecord | null> {
    return this.withRetry(async () => {
      return await db.splitView.where('workspaceId').equals(workspaceId).first();
    });
  }

  async deleteSplitViewByWorkspace(workspaceId: string): Promise<void> {
    await this.withRetry(async () => {
      await db.splitView.where('workspaceId').equals(workspaceId).delete();
    });
  }
}

export class StorageProviderFactory {
  static getProvider(type: 'indexeddb' | 'cloud' = 'indexeddb'): StorageProvider {
    switch (type) {
      case 'indexeddb':
        return IndexedDBStorage.getInstance();
      case 'cloud':
        throw new Error('Cloud storage not implemented yet');
      default:
        return IndexedDBStorage.getInstance();
    }
  }
}