import { ContentProcessingEngine } from './ContentProcessingEngine';
import { JsonContentProcessor } from './processors/JsonContentProcessor';
import { LanguageDetectorAdapter } from './adapters/LanguageDetectorAdapter';
import { 
  ContentProcessingResult, 
  ContentProcessingContext 
} from './types';

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
    
    // Register content processors
    this.engine.registerProcessor(new JsonContentProcessor());
    
    // Future processors can be added here:
    // this.engine.registerProcessor(new XmlContentProcessor());
    // this.engine.registerProcessor(new CsvContentProcessor());
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
    }
  ): ContentProcessingContext {
    // Determine if this is likely from clipboard based on context
    const isLikelyFromClipboard = !isFromPaste && 
      previousContent.trim() === '' && 
      additionalFlags?.isInitialContent;

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