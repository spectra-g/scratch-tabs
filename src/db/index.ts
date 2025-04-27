import Dexie, { Table } from 'dexie';
import { Tab } from '../types';

// Define interfaces for our database tables
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
}

interface SplitViewRecord {
  id: string; // Always 'default'
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  activeSide: string | null;
  splitRatio: number;
  lastModified: number;
}

// Define the database class
export class ScratchTabsDB extends Dexie {
  tabs!: Table<TabRecord>;
  splitView!: Table<SplitViewRecord>;

  constructor() {
    super('ScratchTabsDB');

    // Define tables and indexes
    this.version(1).stores({
      tabs: 'id, lastModified',
      splitView: 'id, lastModified'
    });
  }
}

// Create and export a singleton instance
export const db = new ScratchTabsDB();

const toTabRecord = (tab: Tab): TabRecord => ({
  ...tab,
  lastModified: tab.lastModified,
  dateCreated: tab.dateCreated
});

const toTab = (record: TabRecord): Tab => {
  const now = Date.now();
  return {
    ...record,
    dateCreated: record.dateCreated || now,
    lastModified: record.lastModified || now,
    cursorPosition: record.cursorPosition || { lineNumber: 1, column: 1 }
  };
};

// Storage interface for abstraction
export interface StorageProvider {
  // Tab operations
  getTabs(): Promise<Tab[]>;
  saveTab(tab: Tab): Promise<void>;
  saveTabs(tabs: Tab[]): Promise<void>;
  deleteTab(id: string): Promise<void>;
  
  // Split view operations
  getSplitView(): Promise<SplitViewRecord | null>;
  saveSplitView(splitView: SplitViewRecord): Promise<void>;
}

// IndexedDB implementation
export class IndexedDBStorage implements StorageProvider {
  private static instance: IndexedDBStorage;
  private lastSaveTabsTime: number = 0;
  private lastSaveSplitViewTime: number = 0;
  private readonly DEBOUNCE_TIME = 2000; // 10 seconds

  private constructor() {}

  static getInstance(): IndexedDBStorage {
    if (!IndexedDBStorage.instance) {
      IndexedDBStorage.instance = new IndexedDBStorage();
    }
    return IndexedDBStorage.instance;
  }

  async getTabs(): Promise<Tab[]> {
    try {
      const records = await db.tabs.toArray();
      return records.map(toTab);
    } catch (error) {
      console.error('Failed to get tabs from IndexedDB:', error);
      return [];
    }
  }

  async saveTab(tab: Tab): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastSaveTabsTime < this.DEBOUNCE_TIME) {
        return;
      }
      this.lastSaveTabsTime = now;
      await db.tabs.put(toTabRecord(tab));
    } catch (error) {
      console.error('Failed to save tab to IndexedDB:', error);
    }
  }

  async saveTabs(tabs: Tab[]): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastSaveTabsTime < this.DEBOUNCE_TIME) {
        return;
      }
      this.lastSaveTabsTime = now;
      const records = tabs.map(toTabRecord);
      await db.tabs.bulkPut(records);
    } catch (error) {
      console.error('Failed to save tabs to IndexedDB:', error);
    }
  }

  async deleteTab(id: string): Promise<void> {
    try {
      await db.tabs.delete(id);
    } catch (error) {
      console.error('Failed to delete tab from IndexedDB:', error);
    }
  }

  async getSplitView(): Promise<SplitViewRecord | null> {
    try {
      return await db.splitView.get('default');
    } catch (error) {
      console.error('Failed to get split view from IndexedDB:', error);
      return null;
    }
  }

  async saveSplitView(splitView: SplitViewRecord): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastSaveSplitViewTime < this.DEBOUNCE_TIME) {
        return;
      }
      this.lastSaveSplitViewTime = now;
      await db.splitView.put(splitView);
    } catch (error) {
      console.error('Failed to save split view to IndexedDB:', error);
    }
  }
}

// Factory for creating storage providers
export class StorageProviderFactory {
  static getProvider(type: 'indexeddb' | 'cloud' = 'indexeddb'): StorageProvider {
    switch (type) {
      case 'indexeddb':
        return IndexedDBStorage.getInstance();
      case 'cloud':
        // Future implementation
        throw new Error('Cloud storage not implemented yet');
      default:
        return IndexedDBStorage.getInstance();
    }
  }
}