/**
 * Utilities for format detection
 */

// Maximum content length for format detection sampling
export const MAX_CONTENT_LENGTH_FOR_DETECTION = 1000;

/**
 * Prepares content for format detection by limiting it to the first N characters
 * for performance optimization
 */
export const getContentForLanguageDetection = (content: string): string => {
  if (!content) return "";
  return content.length > MAX_CONTENT_LENGTH_FOR_DETECTION
    ? content.substring(0, MAX_CONTENT_LENGTH_FOR_DETECTION)
    : content;
};

/**
 * Helper to get content for language detection from a Tab object
 */
export const getTabContentForLanguageDetection = (tab: { content?: string }): string => {
  return getContentForLanguageDetection(tab.content || "");
};