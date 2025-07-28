/**
 * Bridge implementation that connects tablets to external dependencies
 * This is the only file in src/tablets that should import from outside the tablets directory
 */

import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { detectLanguage } from '../../languages';
import type { Tab } from '../../types';
import type { 
  TabletBridge, 
  TabCreationOptions, 
  DeviceInfo, 
  LanguageDetectionResult,
  SplitViewOperations 
} from './types';

// Define store interfaces to avoid unknown types
interface RootStoreInterface {
  addBackgroundTab: (tab: Tab, toRightSide?: boolean) => void;
  [key: string]: any;
}

interface WorkspaceStoreInterface {
  activeWorkspaceId: string | null;
  [key: string]: any;
}

interface SplitViewStoreInterface {
  isSplit: boolean;
  [key: string]: any;
}

/**
 * Implementation of the tablet bridge
 * This class encapsulates all external dependencies and provides a clean interface
 */
class TabletBridgeImpl implements TabletBridge {
  private rootStore: RootStoreInterface | null = null;
  private workspaceStore: WorkspaceStoreInterface | null = null;
  private splitViewStore: SplitViewStoreInterface | null = null;
  private deviceInfo: DeviceInfo | null = null;

  /**
   * Initialize the bridge with store instances
   * This should be called from a React component context
   */
  initialize(
    rootStore: RootStoreInterface,
    workspaceStore: WorkspaceStoreInterface,
    splitViewStore: SplitViewStoreInterface,
    isMobile: boolean
  ) {
    this.rootStore = rootStore;
    this.workspaceStore = workspaceStore;
    this.splitViewStore = splitViewStore;
    this.deviceInfo = { isMobile };
  }

  /**
   * Create a background tab without stealing focus
   */
  async createBackgroundTab(options: TabCreationOptions): Promise<void> {
    if (!this.rootStore || !this.workspaceStore) {
      throw new Error('Bridge not initialized. Call initialize() first.');
    }

    const workspaceId = options.workspaceId || this.workspaceStore.activeWorkspaceId;
    if (!workspaceId) {
      throw new Error('No active workspace found');
    }

    const newTab: Tab = {
      id: crypto.randomUUID(),
      title: options.title,
      content: options.content,
      language: options.language || 'markdown',
      languageLocked: options.languageLocked || false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId,
    };

    this.rootStore.addBackgroundTab(newTab);
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      throw new Error('Bridge not initialized. Call initialize() first.');
    }
    return this.deviceInfo;
  }

  /**
   * Detect language from content
   */
  detectLanguage(content: string): LanguageDetectionResult {
    const result = detectLanguage(content);
    return {
      language: result || 'plaintext',
      confidence: 1 // detectLanguage doesn't return confidence, so we default to 1
    };
  }

  /**
   * Split view operations
   */
  get splitView(): SplitViewOperations {
    return {
      openInSplitView: (content: string, language?: string) => {
        if (!this.splitViewStore) {
          throw new Error('Bridge not initialized. Call initialize() first.');
        }
        // Implementation would depend on split view store methods
        // This is a placeholder - actual implementation would need to match the split view API
        console.warn('Split view operations not fully implemented in bridge');
      },
      
      closeCurrentSplit: () => {
        if (!this.splitViewStore) {
          throw new Error('Bridge not initialized. Call initialize() first.');
        }
        // Implementation placeholder
        console.warn('Split view operations not fully implemented in bridge');
      },
      
      isSplitViewActive: () => {
        if (!this.splitViewStore) {
          return false;
        }
        // Implementation placeholder - would check split view state
        return false;
      }
    };
  }

  /**
   * Get current workspace ID
   */
  getCurrentWorkspaceId(): string | null {
    if (!this.workspaceStore) {
      throw new Error('Bridge not initialized. Call initialize() first.');
    }
    return this.workspaceStore.activeWorkspaceId;
  }
}

// Singleton instance
const bridgeInstance = new TabletBridgeImpl();

export { bridgeInstance as tabletBridge };
export type { TabletBridge };