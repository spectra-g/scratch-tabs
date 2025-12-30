import LZString from "lz-string";
import { formatRegistry } from "../formats/registry";
import { ShareStrategy } from "../formats/types";

/**
 * Maximum safe URL length across all browsers
 * Conservative limit that works everywhere including link previews
 */
const MAX_URL_LENGTH = 1800;

/**
 * Estimated base URL length (domain + route structure)
 */
const BASE_URL_LENGTH = 60;

/**
 * Maximum content payload size in URL
 */
const MAX_CONTENT_LENGTH = MAX_URL_LENGTH - BASE_URL_LENGTH;

/**
 * Result of URL size check
 */
export interface UrlSizeCheck {
  fits: boolean;
  size: number;
  maxSize: number;
  percentUsed: number;
}

/**
 * Parsed share URL components
 */
export interface ParsedShareUrl {
  version: string;
  type: string;
  metadata: string;
  compressed: string;
}

/**
 * Share service for generating and parsing shareable URLs
 * Handles compression, encoding, and format-specific trimming
 */
class ShareService {
  /**
   * Compress content using LZ-String
   * Uses URI-safe encoding that works in URLs
   */
  compress(content: string): string {
    return LZString.compressToEncodedURIComponent(content);
  }

  /**
   * Decompress content from LZ-String
   */
  decompress(compressed: string): string {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      return decompressed || "";
    } catch (error) {
      console.error("Decompression error:", error);
      return "";
    }
  }

  /**
   * Check if content fits in URL length limit
   */
  canFitInUrl(content: string, type: string, metadata: string = "full"): UrlSizeCheck {
    const compressed = this.compress(content);
    const estimatedLength = BASE_URL_LENGTH + type.length + metadata.length + compressed.length + 20; // +20 for slashes and version

    return {
      fits: estimatedLength <= MAX_URL_LENGTH,
      size: estimatedLength,
      maxSize: MAX_URL_LENGTH,
      percentUsed: (estimatedLength / MAX_URL_LENGTH) * 100,
    };
  }

  /**
   * Generate a shareable URL for tab content using hash-based routing
   * Hash routing ensures content never reaches server logs (privacy-focused)
   * @param type The format/language ID
   * @param content The content to share
   * @param metadata Optional metadata (e.g., "full", "r500-800", "kmeta,users")
   * @returns The shareable URL hash path
   */
  generateShareUrl(
    type: string,
    content: string,
    metadata: string = "full"
  ): string {
    const compressed = this.compress(content);
    return `#/s/v1/${type}/${metadata}/${compressed}`;
  }

  /**
   * Parse a share URL into its components
   * @param pathname The URL pathname to parse
   * @returns Parsed components or null if invalid
   */
  parseShareUrl(pathname: string): ParsedShareUrl | null {
    // Pattern: /s/v1/{type}/{metadata}/{compressed}
    const match = pathname.match(/^\/s\/(v\d+)\/([^\/]+)\/([^\/]+)\/(.+)$/);

    if (!match) {
      return null;
    }

    return {
      version: match[1],
      type: match[2],
      metadata: match[3],
      compressed: match[4],
    };
  }

  /**
   * Get share strategy for a format (if it exists)
   * @param formatId The format ID
   * @returns The share strategy or null
   */
  getShareStrategy(formatId: string): ShareStrategy | null {
    const format = formatRegistry.getById(formatId);
    return format?.shareStrategy || null;
  }

  /**
   * Calculate compressed size for content
   * Useful for real-time size updates in UI
   */
  getCompressedSize(content: string): number {
    return this.compress(content).length;
  }

  /**
   * Estimate full URL length for given parameters
   */
  estimateUrlLength(type: string, content: string, metadata: string = "full"): number {
    const compressed = this.compress(content);
    return BASE_URL_LENGTH + type.length + metadata.length + compressed.length + 20;
  }

  /**
   * Get maximum content size that can fit in URL
   * This is an approximation since compression ratio varies
   */
  getMaxContentSize(): number {
    return MAX_CONTENT_LENGTH;
  }

  /**
   * Validate that a format ID is valid
   */
  isValidFormat(formatId: string): boolean {
    return formatRegistry.getById(formatId) !== undefined;
  }

  /**
   * Apply format-specific trimming to content
   * @param formatId The format ID
   * @param content The content to trim
   * @param metadata The metadata describing the trim
   * @returns The trimmed content, or original if no strategy exists
   */
  applyFormatTrim(formatId: string, content: string, metadata: string): string {
    if (metadata === "full") {
      return content;
    }

    const strategy = this.getShareStrategy(formatId);
    if (!strategy) {
      return content;
    }

    try {
      const selection = strategy.decodeMetadata(metadata);
      if (!selection) {
        return content;
      }

      return strategy.applyTrim(content, selection);
    } catch (error) {
      console.error(`Error applying format trim for ${formatId}:`, error);
      return content;
    }
  }
}

// Export singleton instance
export const shareService = new ShareService();
