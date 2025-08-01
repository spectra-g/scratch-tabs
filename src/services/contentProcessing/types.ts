/**
 * Core types for the content processing framework
 */

export interface ContentProcessingResult {
  /** Whether any processing was applied */
  processed: boolean;
  /** The processed content (original if not processed) */
  content: string;
  /** The detected/updated language */
  language?: string;
  /** Whether the language should be locked after processing */
  lockLanguage?: boolean;
  /** Additional metadata about the processing */
  metadata?: {
    /** Type of processing applied (e.g., 'unstringify', 'format', 'clean') */
    type?: string;
    /** Original content length */
    originalLength?: number;
    /** Processed content length */
    processedLength?: number;
    /** Processing time in milliseconds */
    processingTime?: number;
    /** Original number of lines */
    originalLines?: number;
    /** Number of successfully processed lines */
    processedLines?: number;
    /** Success ratio as percentage */
    successRatio?: number;
    /** Allow additional properties */
    [key: string]: any;
  };
}

export interface ContentProcessingContext {
  /** Tab ID for context */
  tabId: string;
  /** Current tab language */
  currentLanguage: string;
  /** Whether the language is locked */
  languageLocked: boolean;
  /** Whether this content came from a paste operation */
  isFromPaste: boolean;
  /** Previous content for comparison */
  previousContent: string;
  /** Detected language from content analysis */
  detectedLanguage?: string;
  /** Additional context flags */
  flags?: {
    /** Whether this is likely from clipboard (e.g., "New tab from Paste") */
    isLikelyFromClipboard?: boolean;
    /** Whether this is initial tab content */
    isInitialContent?: boolean;
  };
}

export interface ContentProcessor {
  /** Unique identifier for this processor */
  id: string;
  /** Human-readable name */
  name: string;
  /** Languages this processor can handle */
  supportedLanguages: string[];
  /** Priority for processing order (higher = earlier) */
  priority: number;

  /**
   * Check if this processor can handle the given content and context
   */
  canProcess(content: string, context: ContentProcessingContext): boolean;

  /**
   * Process the content
   */
  process(content: string, context: ContentProcessingContext): Promise<ContentProcessingResult> | ContentProcessingResult;
}

export interface ContentDetector {
  /** Unique identifier for this detector */
  id: string;
  /** Detect language from content */
  detectLanguage(content: string): string;
  /** Check if detection is ambiguous */
  isAmbiguous(content: string): boolean;
}

export interface ContentCleaner {
  /** Unique identifier for this cleaner */
  id: string;
  /** Languages this cleaner supports */
  supportedLanguages: string[];
  /** Clean/normalize content */
  clean(content: string, language: string): string;
}

export interface ContentFormatter {
  /** Unique identifier for this formatter */
  id: string;
  /** Languages this formatter supports */
  supportedLanguages: string[];
  /** Format content */
  format(content: string, language: string): string;
}