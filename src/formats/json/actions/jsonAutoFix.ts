/**
 * JSON auto-fix utilities
 */

/**
 * Result of attempting to auto-fix JSON
 */
export interface AutoFixResult {
  success: boolean;
  fixedContent?: string;
  error?: string;
}

/**
 * Sanitizes JSON content by escaping control characters.
 * This is a preliminary step for the auto-fixer.
 */
function sanitizeControlCharacters(content: string): string {
  // Replace control characters (0x00-0x1F except whitespace) with Unicode escapes
  // Preserve: tab (0x09), line feed (0x0A), carriage return (0x0D)
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) => {
    const code = char.charCodeAt(0);
    return `\\u${code.toString(16).padStart(4, '0')}`;
  });
}

/**
 * Replaces single quotes used as string delimiters with double quotes,
 * while preserving single quotes that appear inside valid double-quoted strings.
 *
 * For example:
 * - {'key': 'value'} -> {"key": "value"} (replaces delimiter single quotes)
 * - {"name": "John's car"} -> {"name": "John's car"} (preserves single quote in value)
 */
function replaceSingleQuoteDelimiters(content: string): string {
  let result = '';
  let inDoubleQuotedString = false;
  let inSingleQuotedString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // Handle escape sequences
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      result += char;
      continue;
    }

    // Handle double quotes (always valid in JSON)
    if (char === '"' && !inSingleQuotedString) {
      inDoubleQuotedString = !inDoubleQuotedString;
      result += char;
      continue;
    }

    // Handle single quotes (only valid inside double-quoted strings)
    if (char === "'" && !inDoubleQuotedString) {
      // Single quote used as string delimiter - convert to double quote
      inSingleQuotedString = !inSingleQuotedString;
      result += '"';
      continue;
    }

    // All other characters
    result += char;
  }

  return result;
}

/**
 * Attempts to automatically fix common JSON syntax errors.
 * This is the primary function to be called for comprehensive JSON fixing.
 * It combines control character sanitization with structural fixes.
 */
export function autoFixJson(content: string): AutoFixResult {
  if (!content.trim()) {
    return { success: false, error: "No content to fix" };
  }

  try {
    // First check if it's already valid JSON
    JSON.parse(content);
    return { success: true, fixedContent: content, error: "JSON is already valid" };
  } catch (initialError) {
    // Try to fix common issues
    let fixedContent = content;

    // --- Start Fixing ---

    // Preliminary Fix: Sanitize problematic control characters first
    fixedContent = sanitizeControlCharacters(fixedContent);

    // Fix 1: Replace single quotes with double quotes (only for string delimiters, not inside strings)
    // More careful approach: only replace single quotes that are used as string delimiters,
    // not single quotes that appear inside already double-quoted strings
    fixedContent = replaceSingleQuoteDelimiters(fixedContent);

    // Fix 2: Add missing commas between object properties
    // IMPORTANT: Do this BEFORE quoting property names, as the regex expects unquoted names
    // Handle quoted strings followed by property names
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1,\n$2$3:');
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(]\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/([0-9]\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(true|false|null)(\s*)\n(\s*)"/g, '$1,$2\n$3"');

    // Fix 3: Add missing quotes around property names
    // Handle property names after opening braces or commas with any whitespace
    fixedContent = fixedContent.replace(/([{,][\s\n]*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

    // Fix 4: Add missing commas in arrays
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/([0-9]\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/(true|false|null)(\s*)\n(\s*)\{/g, '$1,$2\n$3{');

    // Fix 5: Remove trailing commas from objects and arrays
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

    // Fix 6: Better handling of missing commas in complex structures
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');
    fixedContent = fixedContent.replace(/(]\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');

    // Fix 7: Add missing closing braces/brackets (simple heuristic)
    const openBraces = (fixedContent.match(/\{/g) || []).length;
    const closeBraces = (fixedContent.match(/\}/g) || []).length;
    const openBrackets = (fixedContent.match(/\[/g) || []).length;
    const closeBrackets = (fixedContent.match(/\]/g) || []).length;

    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixedContent += '\n}';
    }

    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixedContent += '\n]';
    }

    // Fix 8: Basic handling of undefined values (convert to null)
    fixedContent = fixedContent.replace(/:\s*undefined\s*([,}\]])/g, ': null$1');

    // Fix 9: Handle missing quotes around string values (basic heuristic)
    fixedContent = fixedContent.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, (match, value, end) => {
      // Don't quote if it looks like a boolean, null, or number
      if (value === 'true' || value === 'false' || value === 'null' || /^\d+(\.\d+)?$/.test(value)) {
        return match;
      }
      return `: "${value}"${end}`;
    });

    // --- Verification ---
    try {
      // Test if our fixes worked
      JSON.parse(fixedContent);
      return { success: true, fixedContent };
    } catch (stillError) {
      // If we still can't parse it, try one last aggressive extraction
      try {
        const jsonMatch = fixedContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          const extracted = jsonMatch[0];
          JSON.parse(extracted);
          return { success: true, fixedContent: extracted };
        }
      } catch {
        // Still failed
      }

      const errorMessage = stillError instanceof Error ? stillError.message : String(stillError);
      return {
        success: false,
        fixedContent: fixedContent, // Return the partially fixed content for inspection
        error: `Could not auto-fix JSON. Last error: ${errorMessage}`
      };
    }
  }
}

/**
 * Format fixed JSON content
 */
export function formatFixedJson(content: string, indentation: number = 2): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, indentation);
  } catch {
    return content;
  }
}

/**
 * Result of attempting to sanitize JSON
 */
export interface SanitizeResult {
  success: boolean;
  sanitizedContent?: string;
  changesMade: boolean;
  error?: string;
}

/**
 * Sanitizes JSON content by escaping control characters and invalid bytes.
 * Useful for content copied from tools like Postman that may include literal null bytes
 * or other control characters that are invalid in JSON strings.
 */
export function sanitizeJson(content: string): SanitizeResult {
  if (!content.trim()) {
    return {
      success: false,
      changesMade: false,
      error: "No content to sanitize"
    };
  }

  try {
    // First, try to parse as-is to check if it's already valid
    JSON.parse(content);
    // If it parses successfully, no sanitization needed
    return {
      success: true,
      sanitizedContent: content,
      changesMade: false
    };
  } catch (error) {
    // Content has issues, let's sanitize it
    let changesMade = false;

    // Replace control characters (0x00-0x1F except whitespace) with Unicode escapes
    // Preserve: tab (0x09), line feed (0x0A), carriage return (0x0D)
    let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) => {
      changesMade = true;
      const code = char.charCodeAt(0);
      return `\\u${code.toString(16).padStart(4, '0')}`;
    });

    // Try parsing the sanitized content
    try {
      const parsed = JSON.parse(sanitized);
      // Format it nicely
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        success: true,
        sanitizedContent: formatted,
        changesMade
      };
    } catch (parseError) {
      // Still invalid after sanitization
      return {
        success: false,
        sanitizedContent: sanitized,
        changesMade,
        error: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      };
    }
  }
}

/**
 * Format sanitized JSON content
 */
export function formatSanitizedJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}