import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * HTML language detector
 */
export class HtmlLanguageDetector extends BaseLanguageDetector {
  id = 'html';
  name = 'HTML';
  extensions = ['html', 'htm'];
  priority = 4;
  
  /**
   * Check if content matches HTML patterns
   */
  isMatch(content: string): boolean {
    // Normalize content for better detection
    const normalizedContent = content.trim();
    
    // Check for HTML doctype declaration
    if (normalizedContent.toLowerCase().startsWith('<!doctype html>') || 
        normalizedContent.toLowerCase().startsWith('<!DOCTYPE html>')) {
      return true;
    }
    
    // Check for common HTML patterns
    const htmlPatterns = [
      /<html[\s>]/i,                           // HTML tag
      /<head[\s>]/i,                           // HEAD tag
      /<body[\s>]/i,                           // BODY tag
      /<div[\s>]/i,                            // DIV tag
      /<span[\s>]/i,                           // SPAN tag
      /<p[\s>]/i,                              // P tag
      /<a\s+[^>]*href=/i,                      // A tag with href
      /<img\s+[^>]*src=/i,                     // IMG tag with src
      /<script[\s>]/i,                         // SCRIPT tag
      /<style[\s>]/i,                          // STYLE tag
      /<\/[a-z0-9]+>/i,                        // Closing tags
      /<[a-z0-9]+\s+[^>]*>/i,                  // Tags with attributes
      /&[a-z]+;/i                              // HTML entities
    ];
    
    // Count how many HTML patterns match
    const matchCount = htmlPatterns.reduce((count, pattern) => 
      count + (pattern.test(normalizedContent) ? 1 : 0), 0);
    
    // If at least 3 patterns match, consider it HTML
    return matchCount >= 3;
  }
  
  /**
   * Register HTML language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure HTML formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('html', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        
        // Basic HTML formatting
        let formattedHtml = content;
        
        // Format tags with proper indentation
        const indentSize = 2;
        let indentLevel = 0;
        let inPreTag = false;
        
        // Split by tags, preserving the tags
        const parts = formattedHtml.split(/(<[^>]*>)/g);
        
        formattedHtml = parts.map((part: string) => {
          // Skip empty parts
          if (!part.trim()) return part;
          
          // Check if we're entering or exiting a pre tag
          if (part.match(/<pre[\s>]/i)) inPreTag = true;
          if (part.match(/<\/pre[\s>]/i)) inPreTag = false;
          
          // Don't format content inside pre tags
          if (inPreTag) return part;
          
          // Handle self-closing tags
          const isSelfClosing = part.match(/<[^>]*\/>/i);
          
          // Handle closing tags
          if (part.match(/<\/[^>]*>/i)) {
            indentLevel = Math.max(0, indentLevel - 1);
            return '\n' + ' '.repeat(indentLevel * indentSize) + part;
          }
          
          // Handle opening tags
          if (part.match(/<[^/][^>]*>/i)) {
            const result = '\n' + ' '.repeat(indentLevel * indentSize) + part;
            
            // Don't increase indent for self-closing tags or void elements
            if (!isSelfClosing && 
                !part.match(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s>]/i)) {
              indentLevel++;
            }
            
            return result;
          }
          
          // Text content
          return part.trim() ? ('\n' + ' '.repeat(indentLevel * indentSize) + part.trim()) : '';
        }).join('');
        
        // Clean up extra newlines
        formattedHtml = formattedHtml.replace(/\n\s*\n/g, '\n').trim();
        
        return [{
          range: model.getFullModelRange(),
          text: formattedHtml
        }];
      }
    });
  }
}

// Create and register the detector
const htmlDetector = new HtmlLanguageDetector();
languageRegistry.register(htmlDetector);

// Export for backward compatibility
export const registerHtmlProvider = (monaco: any) => {
  htmlDetector.registerProvider(monaco);
}; 