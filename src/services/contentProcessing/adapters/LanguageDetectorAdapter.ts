import { ContentDetector } from '../types';
import { detectLanguage, isAmbiguousLanguage } from '../../../languages';

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
    return detectLanguage(content);
  }

  /**
   * Check if detection is ambiguous using the existing system
   */
  isAmbiguous(content: string): boolean {
    return isAmbiguousLanguage(content);
  }
}