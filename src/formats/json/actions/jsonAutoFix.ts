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
 * Attempts to automatically fix common JSON syntax errors
 */
export function autoFixJson(content: string): AutoFixResult {
  if (!content.trim()) {
    return { success: false, error: "No content to fix" };
  }

  try {
    // First check if it's already valid JSON
    JSON.parse(content);
    return { success: true, fixedContent: content };
  } catch (error) {
    // Try to fix common issues
    let fixedContent = content;

    // Fix 1: Replace single quotes with double quotes
    fixedContent = fixedContent.replace(/'/g, '"');
    
    // Fix 2: Add missing commas between object properties
    // Handle quoted strings followed by property names
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1,\n$2$3:');
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(]\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/([0-9]\s*)\n(\s*)"/g, '$1,\n$2"');
    fixedContent = fixedContent.replace(/(true|false|null)(\s*)\n(\s*)"/g, '$1,$2\n$3"');
    
    // Fix 3: Add missing quotes around property names - do this after comma fixing
    // Handle property names after opening braces or commas with any whitespace
    fixedContent = fixedContent.replace(/([{,][\s\n]*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    
    // Fix 4: Add missing commas in arrays
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/([0-9]\s*)\n(\s*)\{/g, '$1,\n$2{');
    fixedContent = fixedContent.replace(/(true|false|null)(\s*)\n(\s*)\{/g, '$1,$2\n$3{');
    
    // Fix 5: Remove trailing commas
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix 6: Add missing closing braces/brackets (simple heuristic)
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
    
    // Fix 7: Basic handling of undefined values (convert to null)
    fixedContent = fixedContent.replace(/:\s*undefined\s*([,}\]])/g, ': null$1');
    
    // Fix 8: Handle missing quotes around string values (basic heuristic)
    fixedContent = fixedContent.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, (match, value, end) => {
      // Don't quote if it looks like a boolean, null, or number
      if (value === 'true' || value === 'false' || value === 'null' || /^\d+(\.\d+)?$/.test(value)) {
        return match;
      }
      return `: "${value}"${end}`;
    });
    
    // Fix 9: Better handling of missing commas in complex structures
    // Fix newlines without commas in nested objects
    fixedContent = fixedContent.replace(/("\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');
    fixedContent = fixedContent.replace(/(}\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');
    fixedContent = fixedContent.replace(/(]\s*)\n(\s*)("[^"]*")/g, '$1,\n$2$3');
    
    try {
      // Test if our fixes worked
      JSON.parse(fixedContent);
      return { success: true, fixedContent };
    } catch (stillError) {
      // If we still can't parse it, try more aggressive fixes
      try {
        // Try to extract what looks like a valid JSON structure
        const jsonMatch = fixedContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          const extracted = jsonMatch[0];
          JSON.parse(extracted);
          return { success: true, fixedContent: extracted };
        }
      } catch {
        // Still failed
      }
      
      return { 
        success: false, 
        fixedContent: fixedContent,
        error: `Could not auto-fix JSON: ${stillError instanceof Error ? stillError.message : 'Unknown error'}`
      };
    }
  }
}

/**
 * Format fixed JSON content
 */
export function formatFixedJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}