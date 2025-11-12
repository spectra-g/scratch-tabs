import { ContentProcessingEngine } from './ContentProcessingEngine';
import { JsonContentProcessor } from './processors/JsonContentProcessor';
import { LanguageDetectorAdapter } from './adapters/LanguageDetectorAdapter';
import {
  ContentProcessingResult,
  ContentProcessingContext
} from './types';
import { JsonLogContentProcessor } from "./processors/JsonLogContentProcessor";
import { CsvContentProcessor } from './processors/CsvContentProcessor';

/**
 * Main service for content processing that manages the engine and provides
 * a clean interface for the ModelManager
 */
export class ContentProcessingService {
  private engine: ContentProcessingEngine;

  constructor() {
    this.engine = new ContentProcessingEngine();
    this.initializeDefaultComponents();
  }

  /**
   * Initialize default processors, detectors, etc.
   */
  private initializeDefaultComponents(): void {
    // Register language detector
    this.engine.registerDetector(new LanguageDetectorAdapter());
    this.engine.registerProcessor(new JsonLogContentProcessor());

    // Register content processors
    this.engine.registerProcessor(new JsonContentProcessor());
    this.engine.registerProcessor(new CsvContentProcessor());

    // Future processors can be added here:
    // this.engine.registerProcessor(new XmlContentProcessor());
    // this.engine.registerProcessor(new SqlContentProcessor());
  }

  /**
   * Process content for language detection and cleaning/formatting
   */
  async processContent(
    content: string,
    context: ContentProcessingContext
  ): Promise<ContentProcessingResult> {
    return this.engine.processContent(content, context);
  }

  /**
   * Detect language using registered detectors
   */
  detectLanguage(content: string): string {
    return this.engine.detectLanguage(content);
  }

  /**
   * Check if language detection is ambiguous
   */
  isLanguageAmbiguous(content: string): boolean {
    return this.engine.isLanguageAmbiguous(content);
  }

  /**
   * Get the underlying engine for advanced usage
   */
  getEngine(): ContentProcessingEngine {
    return this.engine;
  }

  /**
   * Create a processing context with intelligent defaults
   */
  createContext(
    tabId: string,
    currentLanguage: string,
    languageLocked: boolean,
    isFromPaste: boolean,
    previousContent: string,
    additionalFlags?: {
      isLikelyFromClipboard?: boolean;
      isInitialContent?: boolean;
      isFromClipboardImport?: boolean; // Explicit flag for clipboard/paste scenarios
    }
  ): ContentProcessingContext {
    // Determine if this is likely from clipboard based on context
    const isLikelyFromClipboard = additionalFlags?.isFromClipboardImport || 
      additionalFlags?.isLikelyFromClipboard ||
      (!isFromPaste && 
       previousContent.trim() === '' && 
       additionalFlags?.isInitialContent); // Restore original auto-detection logic

    return {
      tabId,
      currentLanguage,
      languageLocked,
      isFromPaste,
      previousContent,
      flags: {
        isLikelyFromClipboard,
        isInitialContent: additionalFlags?.isInitialContent || false,
        ...additionalFlags
      }
    };
  }
}

// Singleton instance
export const contentProcessingService = new ContentProcessingService();