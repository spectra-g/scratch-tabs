import React from "react";
import { StatusItemProps } from "../components/StatusBar/types";
import * as monaco from "monaco-editor";
import { SmartView } from "../views/registry";

export interface StatusBarItem {
  id: string; // Unique key for rendering
  component: React.FC<StatusItemProps>;
  priority: number; // For ordering, lower numbers appear first
}

export interface DetectionResult {
  match: boolean;
  confidence: number; // A value between 0.0 (no confidence) and 1.0 (high confidence)
  matchedDefinitive?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface EditorActionContext {
  editor: monaco.editor.IStandaloneCodeEditor;
  content: string;
  language: string;
  tabId: string;
}

/**
 * Interface for format module implementations
 */
export interface FormatModule {
  /**
   * The format ID (e.g., 'json', 'yaml', 'markdown')
   */
  id: string;

  /**
   * Display name for the format
   */
  name: string;

  /**
   * File extensions associated with this format (without the dot)
   */
  extensions: string[];

  /**
   * Priority for ambiguity resolution (higher wins in ambiguous cases)
   */
  priority: number;

  /**
   * Check if the content matches this format
   */
  detect(content: string): DetectionResult;

  /**
   * Register format provider with Monaco editor
   */
  registerProvider: (monaco: any) => void;

  /**
   * Get sample content for this format
   */
  sampleContent: () => string;

  /**
   * Get file extension for this format
   */
  getFileExtension: () => string;

  // --- NEW: Generic Mechanisms ---
  /**
   * Get context menu actions for this format (optional)
   */
  getContextMenuActions?(context: EditorActionContext): MenuItem[];

  /**
   * Get extended views for this format (optional)
   */
  getSmartViews?(): SmartView[];

  /**
   * Get an array of components to render in the status bar for this format.
   * This replaces getStatusItem and is the new way to add UI.
   */
  getStatusBarItems?(): StatusBarItem[];

  // --- LEGACY: For backward compatibility (Phase 1) ---
  /**
   * Get status item component for this format (optional) - LEGACY
   */
  getStatusItem?: () => React.FC<StatusItemProps>;

  /**
   * Get options menu component for this format (optional) - LEGACY
   */
  getOptionsMenu?: () => React.FC<{
    editor: monaco.editor.IStandaloneCodeEditor;
  }>;
}

/**
 * Interface for format registry
 */
export interface FormatRegistry {
  /**
   * Register a format module
   */
  register: (module: FormatModule) => void;

  /**
   * Get all registered format modules
   */
  getAll: () => FormatModule[];

  /**
   * Get a format module by ID
   */
  getById: (id: string) => FormatModule | undefined;

  /**
   * Detect the format of content
   */
  detectFormat: (content: string) => string;

  /**
   * Check if content is ambiguous (matches multiple formats)
   */
  isAmbiguous: (content: string) => boolean;

  /**
   * Get potential format matches for content
   */
  getPotentialMatches: (
    content: string,
    limit?: number,
  ) => Array<{
    id: string;
    name: string;
    score: number;
  }>;

  /**
   * Initialize all format providers with Monaco
   */
  initializeProviders: (monaco: any) => void;
}
