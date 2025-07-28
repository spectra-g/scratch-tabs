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
  
  // Workspace management
  getCurrentWorkspaceId: () => string | null;
}