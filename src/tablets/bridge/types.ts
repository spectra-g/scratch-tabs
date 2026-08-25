/**
 * Bridge types for tablet external dependencies
 * This defines the interface that tablets can use to interact with external functionality
 */

import type { Tab } from '../../types';

/**
 * Tab creation options for background tab functionality
 */
export interface TabCreationOptions {
  title: string;
  content: string;
  language?: string;
  languageLocked?: boolean;
  workspaceId?: string;
  sourceTabId?: string; // ID of the tab that is creating this new tab (for split view placement)
}

/**
 * Device information interface
 */
export interface DeviceInfo {
  isMobile: boolean;
}

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

/**
 * Split view operations
 */
export interface SplitViewOperations {
  openInSplitView: (content: string, language?: string) => void;
  closeCurrentSplit: () => void;
  isSplitViewActive: () => boolean;
}

/**
 * Modal operations for managing global interactions
 */
export interface ModalOperations {
  suppressGlobalDragDrop: (suppress: boolean) => void;
  isGlobalDragDropSuppressed: () => boolean;
}

/**
 * A tab in the current workspace, exposed to tablets for cross-tab import
 */
export interface WorkspaceTab {
  id: string;
  title: string;
  language: string;
}

/**
 * Result of a shareable-URL size check
 */
export interface UrlSizeCheck {
  fits: boolean;
  size: number;
  maxSize: number;
  percentUsed: number;
}

/**
 * Shareable-URL operations for tablets
 */
export interface SharingOperations {
  /** Returns the shareable hash path (#/s/v1/{type}/{metadata}/{compressed}). */
  generateUrl: (type: string, content: string, metadata?: string) => string;
  /** Estimates whether `content` fits inside the safe URL length limit. */
  canFitInUrl: (
    content: string,
    type?: string,
    metadata?: string,
  ) => UrlSizeCheck;
}

/**
 * Main bridge interface that tablets should use
 * This is the single point of contact for all external dependencies
 */
export interface TabletBridge {
  // Tab management
  createBackgroundTab: (options: TabCreationOptions) => Promise<void>;

  // Device information
  getDeviceInfo: () => DeviceInfo;

  // Language utilities
  detectLanguage: (content: string) => LanguageDetectionResult;

  // Split view operations
  splitView: SplitViewOperations;

  // Modal operations
  modals: ModalOperations;

  // Workspace management
  getCurrentWorkspaceId: () => string | null;

  // Cross-tab data access
  getTabsInWorkspace: () => WorkspaceTab[];
  getTabContent: (tabId: string) => string | null;

  // Shareable URLs
  sharing: SharingOperations;
}