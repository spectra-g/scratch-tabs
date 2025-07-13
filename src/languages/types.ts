import React from "react";
import { StatusItemProps } from "../components/StatusBar/types";
import * as monaco from "monaco-editor";

export interface DetectionResult {
  match: boolean;
  confidence: number; // A value between 0.0 (no confidence) and 1.0 (high confidence)
  matchedDefinitive?: boolean;
}

/**
 * Interface for language detector implementations
 */
export interface LanguageDetector {
  /**
   * The language ID (e.g., 'json', 'yaml', 'markdown')
   */
  id: string;

  /**
   * Display name for the language
   */
  name: string;

  /**
   * File extensions associated with this language (without the dot)
   */
  extensions: string[];

  /**
   * Priority for ambiguity resolution (higher wins in ambiguous cases)
   */
  priority: number;

  /**
   * Check if the content matches this language
   */
  detect(content: string): DetectionResult;

  /**
   * Register language provider with Monaco editor
   */
  registerProvider: (monaco: any) => void;

  /**
   * Get sample content for this language
   */
  sampleContent: () => string;

  /**
   * Get status item component for this language (optional)
   */
  getStatusItem?: () => React.FC<StatusItemProps>;

  /**
   * Get options menu component for this language (optional)
   */
  getOptionsMenu?: () => React.FC<{
    editor: monaco.editor.IStandaloneCodeEditor;
  }>;

  getFileExtension: () => string;
}

/**
 * Interface for language registry
 */
export interface LanguageRegistry {
  /**
   * Register a language detector
   */
  register: (detector: LanguageDetector) => void;

  /**
   * Get all registered language detectors
   */
  getAll: () => LanguageDetector[];

  /**
   * Get a language detector by ID
   */
  getById: (id: string) => LanguageDetector | undefined;

  /**
   * Detect the language of content
   */
  detectLanguage: (content: string) => string;

  /**
   * Check if content is ambiguous (matches multiple languages)
   */
  isAmbiguous: (content: string) => boolean;

  /**
   * Get potential language matches for content
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
   * Initialize all language providers with Monaco
   */
  initializeProviders: (monaco: any) => void;
}
