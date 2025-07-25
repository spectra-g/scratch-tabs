import { 
  ContentProcessor, 
  ContentProcessingResult, 
  ContentProcessingContext 
} from '../types';

/**
 * Content processor for JSON content that handles:
 * - Unstringifying double-escaped JSON
 * - Formatting compact JSON
 * - Cleaning malformed JSON
 */
export class JsonContentProcessor implements ContentProcessor {
  id = 'json-processor';
  name = 'JSON Content Processor';
  supportedLanguages = ['json'];
  priority = 100; // High priority for JSON processing

  /**
   * Check if this processor can handle the content
   */
  canProcess(content: string, context: ContentProcessingContext): boolean {
    const trimmed = content.trim();
    
    // Only process if:
    // 1. Content is from paste or likely from clipboard
    // 2. Language is detected as JSON (trust language detection completely)
    const isFromPasteOrClipboard = context.isFromPaste || (context.flags?.isLikelyFromClipboard === true);
    const isJsonContext = context.currentLanguage === 'json';
    const needsProcessing = this.needsProcessing(trimmed, true);

    return isFromPasteOrClipboard && isJsonContext && needsProcessing;
  }

  /**
   * Process JSON content
   */
  process(content: string, context: ContentProcessingContext): ContentProcessingResult {
    const startTime = Date.now();
    const trimmed = content.trim();
    const originalLength = content.length;

    try {
      // Try to unstringify
      const processed = this.processJsonContent(trimmed);
      
      if (processed !== trimmed) {
        return {
          processed: true,
          content: processed,
          language: 'json',
          lockLanguage: false, // Don't lock, let normal language detection handle it
          metadata: {
            type: 'unstringify',
            originalLength,
            processedLength: processed.length,
            processingTime: Date.now() - startTime
          }
        };
      }
    } catch (error) {
      // If processing fails, return original content
      console.warn('[JsonContentProcessor] Processing failed:', error);
    }

    return {
      processed: false,
      content,
      language: context.currentLanguage
    };
  }

  /**
   * Check if content needs processing
   */
  private needsProcessing(content: string, trustedJson: boolean = false): boolean {
    // Only case: Stringified JSON (wrapped in quotes) that needs unstringifying
    return content.startsWith('"') && content.endsWith('"');
  }

  /**
   * Process JSON content (unstringify only)
   */
  private processJsonContent(content: string): string {
    // Only case: Double-stringified JSON (wrapped in quotes) - unstringify it
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        const parsedOuter = JSON.parse(content);
        
        if (typeof parsedOuter === "string") {
          // Return the unstringified content without formatting
          // Formatting will be handled by the existing formatting system
          return parsedOuter;
        }
      } catch (outerError) {
        // Parse failed, return original content
      }
    }
    
    return content;
  }
}