import React from "react";
import { StatusItemProps } from "../components/StatusBar/types";
import * as monaco from "monaco-editor";

export interface DetectionResult {
  match: boolean;
  confidence: number; // A value between 0.0 (no confidence) and 1.0 (high confidence)
  matchedDefinitive?: boolean;
}

/**
 * Interface for format detector implementations
 */
export interface FormatDetector {
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
   * Get status item component for this format (optional)
   */
  getStatusItem?: () => React.FC<StatusItemProps>;

  /**
   * Get options menu component for this format (optional)
   */
  getOptionsMenu?: () => React.FC<{
    editor: monaco.editor.IStandaloneCodeEditor;
  }>;

  getFileExtension: () => string;
}

/**
 * Interface for format registry
 */
export interface FormatRegistry {
  /**
   * Register a format detector
   */
  register: (detector: FormatDetector) => void;

  /**
   * Get all registered format detectors
   */
  getAll: () => FormatDetector[];

  /**
   * Get a format detector by ID
   */
  getById: (id: string) => FormatDetector | undefined;

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
