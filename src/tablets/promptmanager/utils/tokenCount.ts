/**
 * Utility for estimating token count in text
 * This is a rough approximation based on common tokenization patterns
 */

/**
 * Estimates the token count for a given text
 * Based on OpenAI's rough estimate: 1 token ≈ 4 characters for English text
 * This function provides a more sophisticated estimation by considering:
 * - Words vs punctuation
 * - Special characters
 * - Code patterns
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Split into tokens (words, punctuation, special chars)
  const tokens = normalizedText.split(/(\s+|[.,!?;:(){}[\]"'`~@#$%^&*+=|\\/<>-])/).filter(Boolean);
  
  // Count tokens with different weights
  let tokenCount = 0;
  
  for (const token of tokens) {
    if (token.match(/^\s+$/)) {
      // Whitespace - usually doesn't count as tokens
      continue;
    } else if (token.match(/^[.,!?;:(){}[\]"'`~@#$%^&*+=|\\/<>-]$/)) {
      // Single punctuation marks - typically 1 token each
      tokenCount += 1;
    } else if (token.length <= 3) {
      // Short words - typically 1 token
      tokenCount += 1;
    } else if (token.length <= 6) {
      // Medium words - typically 1-2 tokens
      tokenCount += Math.ceil(token.length / 4);
    } else {
      // Long words or technical terms - may be multiple tokens
      tokenCount += Math.ceil(token.length / 3);
    }
  }
  
  // Add a small buffer for encoding overhead (usually 10-20% more tokens than words)
  return Math.ceil(tokenCount * 1.15);
}

/**
 * Formats token count for display
 */
export function formatTokenCount(tokenCount: number): string {
  if (tokenCount === 0) {
    return "0 tokens";
  } else if (tokenCount === 1) {
    return "1 token";
  } else if (tokenCount < 1000) {
    return `${tokenCount} tokens`;
  } else if (tokenCount < 1000000) {
    return `${(tokenCount / 1000).toFixed(1)}K tokens`;
  } else {
    return `${(tokenCount / 1000000).toFixed(1)}M tokens`;
  }
}

/**
 * Gets a color class based on token count (for visual indicators)
 */
export function getTokenCountColor(tokenCount: number): string {
  if (tokenCount === 0) {
    return "text-gray-500";
  } else if (tokenCount < 100) {
    return "text-green-400";
  } else if (tokenCount < 500) {
    return "text-yellow-400";
  } else if (tokenCount < 1000) {
    return "text-orange-400";
  } else {
    return "text-red-400";
  }
}