/**
 * Bridge implementation that connects tablets to external dependencies
 * This is the only file in src/tablets that should import from outside the tablets directory
 */

import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { useModalStore } from '../../stores/modalStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { detectFormat } from '../../formats';
import type { Tab } from '../../types';
import type {
  TabletBridge,
  TabCreationOptions,
  DeviceInfo,
  LanguageDetectionResult,
  SplitViewOperations,
  ModalOperations,
  WorkspaceTab,
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
  splitView: {
    isSplit: boolean;
    activeSide: 'left' | 'right' | null;
    [key: string]: any;
  };
  [key: string]: any;
}

interface ModalStoreInterface {
  isGlobalDragDropSuppressed: boolean;
  setGlobalDragDropSuppressed: (suppressed: boolean) => void;
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
  private modalStore: ModalStoreInterface | null = null;
  private deviceInfo: DeviceInfo | null = null;

  /**
   * Initialize the bridge with store instances
   * This should be called from a React component context
   */
  initialize(
    rootStore: RootStoreInterface,
    workspaceStore: WorkspaceStoreInterface,
    splitViewStore: SplitViewStoreInterface,
    modalStore: ModalStoreInterface,
    isMobile: boolean
  ) {
    this.rootStore = rootStore;
    this.workspaceStore = workspaceStore;
    this.splitViewStore = splitViewStore;
    this.modalStore = modalStore;
    this.deviceInfo = { isMobile };
  }

  /**
   * Create a background tab without stealing focus
   */
  async createBackgroundTab(options: TabCreationOptions): Promise<void> {
    if (!this.rootStore || !this.workspaceStore || !this.splitViewStore) {
      throw new Error('Bridge not initialized. Call initialize() first.');
    }

    const workspaceId = options.workspaceId || useWorkspaceStore.getState().activeWorkspaceId;
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

    // Determine which side to add the tab to
    // If sourceTabId is provided, check which side it's on
    // Otherwise fall back to activeSide for backward compatibility
    const isSplit = this.splitViewStore.splitView.isSplit;
    let toRightSide = false;

    if (isSplit) {
      if (options.sourceTabId) {
        // Check if the source tab is on the right side
        const isOnRight = this.splitViewStore.splitView.rightTabs.includes(options.sourceTabId);
        toRightSide = isOnRight;
      } else {
        // Fall back to activeSide if sourceTabId not provided
        const activeSide = this.splitViewStore.splitView.activeSide;
        toRightSide = activeSide === 'right';
      }
    }

    this.rootStore.addBackgroundTab(newTab, toRightSide);
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
    const result = detectFormat(content);
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
   * Modal operations for managing global interactions
   */
  get modals(): ModalOperations {
    return {
      suppressGlobalDragDrop: (suppress: boolean) => {
        if (!this.modalStore) {
          throw new Error('Bridge not initialized. Call initialize() first.');
        }
        this.modalStore.setGlobalDragDropSuppressed(suppress);
      },

      isGlobalDragDropSuppressed: () => {
        if (!this.modalStore) {
          throw new Error('Bridge not initialized. Call initialize() first.');
        }
        return this.modalStore.isGlobalDragDropSuppressed;
      }
    };
  }

  /**
   * Get current workspace ID
   */
  getCurrentWorkspaceId(): string | null {
    return useWorkspaceStore.getState().activeWorkspaceId;
  }

  /**
   * List non-tablet tabs in the active workspace
   */
  getTabsInWorkspace(): WorkspaceTab[] {
    const { tabs } = useTabsStore.getState();
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    return tabs
      .filter((tab) => tab.workspaceId === workspaceId && !tab.isTablet)
      .map((tab) => ({ id: tab.id, title: tab.title, language: tab.language }));
  }

  /**
   * Return the in-store content for a tab (last-saved state; live enough for import)
   */
  getTabContent(tabId: string): string | null {
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
    return tab?.content ?? null;
  }
}

// Singleton instance
const bridgeInstance = new TabletBridgeImpl();

export { bridgeInstance as tabletBridge };
export type { TabletBridge };