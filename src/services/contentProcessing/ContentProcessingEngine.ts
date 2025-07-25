import { 
  ContentProcessor, 
  ContentProcessingResult, 
  ContentProcessingContext,
  ContentDetector,
  ContentCleaner,
  ContentFormatter
} from './types';

/**
 * Main content processing engine that orchestrates detection, cleaning, and formatting
 */
export class ContentProcessingEngine {
  private processors: ContentProcessor[] = [];
  private detectors: ContentDetector[] = [];
  private cleaners: ContentCleaner[] = [];
  private formatters: ContentFormatter[] = [];

  /**
   * Register a content processor
   */
  registerProcessor(processor: ContentProcessor): void {
    this.processors.push(processor);
    // Sort by priority (higher priority first)
    this.processors.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register a content detector
   */
  registerDetector(detector: ContentDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Register a content cleaner
   */
  registerCleaner(cleaner: ContentCleaner): void {
    this.cleaners.push(cleaner);
  }

  /**
   * Register a content formatter
   */
  registerFormatter(formatter: ContentFormatter): void {
    this.formatters.push(formatter);
  }

  /**
   * Process content through all applicable processors
   */
  async processContent(
    content: string, 
    context: ContentProcessingContext
  ): Promise<ContentProcessingResult> {
    const startTime = Date.now();

    // Find applicable processors
    const applicableProcessors = this.processors.filter(processor => 
      processor.canProcess(content, context)
    );

    if (applicableProcessors.length === 0) {
      return {
        processed: false,
        content,
        language: context.currentLanguage
      };
    }

    // Process with the highest priority processor
    const processor = applicableProcessors[0];
    
    try {
      const result = await processor.process(content, context);
      
      // Add timing metadata if not already present
      if (result.metadata && !result.metadata.processingTime) {
        result.metadata.processingTime = Date.now() - startTime;
      }

      return result;
    } catch (error) {
      console.error(`[ContentProcessingEngine] Error processing with ${processor.id}:`, error);
      return {
        processed: false,
        content,
        language: context.currentLanguage
      };
    }
  }

  /**
   * Detect language using registered detectors
   */
  detectLanguage(content: string): string {
    // Use the first available detector
    // In the future, could implement voting or confidence-based selection
    const detector = this.detectors[0];
    return detector ? detector.detectLanguage(content) : 'plaintext';
  }

  /**
   * Check if language detection is ambiguous
   */
  isLanguageAmbiguous(content: string): boolean {
    const detector = this.detectors[0];
    return detector ? detector.isAmbiguous(content) : false;
  }

  /**
   * Clean content using registered cleaners
   */
  cleanContent(content: string, language: string): string {
    const cleaner = this.cleaners.find(c => c.supportedLanguages.includes(language));
    return cleaner ? cleaner.clean(content, language) : content;
  }

  /**
   * Format content using registered formatters
   */
  formatContent(content: string, language: string): string {
    const formatter = this.formatters.find(f => f.supportedLanguages.includes(language));
    return formatter ? formatter.format(content, language) : content;
  }

  /**
   * Get all registered processors
   */
  getProcessors(): ContentProcessor[] {
    return [...this.processors];
  }

  /**
   * Get processor by ID
   */
  getProcessor(id: string): ContentProcessor | undefined {
    return this.processors.find(p => p.id === id);
  }

  /**
   * Remove processor by ID
   */
  removeProcessor(id: string): boolean {
    const index = this.processors.findIndex(p => p.id === id);
    if (index >= 0) {
      this.processors.splice(index, 1);
      return true;
    }
    return false;
  }
}