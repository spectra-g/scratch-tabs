import { ContentDetector } from '../types';
import { detectFormat, isAmbiguousFormat } from '../../../formats';

/**
 * Adapter to integrate the existing language detection system
 * with the new content processing framework
 */
export class LanguageDetectorAdapter implements ContentDetector {
  id = 'legacy-language-detector';

  /**
   * Detect language using the existing language detection system
   */
  detectLanguage(content: string): string {
    return detectFormat(content);
  }

  /**
   * Check if detection is ambiguous using the existing system
   */
  isAmbiguous(content: string): boolean {
    return isAmbiguousFormat(content);
  }
}