/**
 * Utility functions for variable substitution in templates and prompts
 */

/**
 * Parse text content and extract all unique variable placeholders
 * Variables are in the format {{variable_name}}
 * @param content - The text content to parse
 * @returns Array of unique variable names (without the {{ }} wrapping)
 */
export function parseVariables(content: string): string[] {
  if (!content) {
    return [];
  }

  // Regular expression to match {{variable_name}} patterns
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  // Find all matches and extract the variable names
  while ((match = variableRegex.exec(content)) !== null) {
    // Extract the variable name (group 1) and trim whitespace
    const variableName = match[1].trim();
    if (variableName) {
      variables.add(variableName);
    }
  }

  // Return as array, sorted for consistency
  return Array.from(variables).sort();
}

/**
 * Substitute variables in content with provided values
 * @param content - The text content containing {{variable}} placeholders
 * @param values - Object mapping variable names to their replacement values
 * @param keepUnfilled - If true, keeps unfilled variables as {{variable}}, otherwise removes them
 * @returns The content with variables substituted
 */
export function substituteVariables(
  content: string,
  values: Record<string, string>,
  keepUnfilled: boolean = false
): string {
  if (!content) {
    return content;
  }

  return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const trimmedName = variableName.trim();
    const value = values[trimmedName];
    
    if (value !== undefined && value !== '') {
      return value;
    }
    
    // If keepUnfilled is true, leave the placeholder as is
    // Otherwise, replace with empty string
    return keepUnfilled ? match : '';
  });
}

/**
 * Check if a variable name suggests it should use a textarea input
 * @param variableName - The name of the variable
 * @returns True if the variable should use a textarea
 */
export function shouldUseTextarea(variableName: string): boolean {
  const lowerName = variableName.toLowerCase();
  const textareaKeywords = ['text', 'content', 'summary', 'notes', 'description', 'message', 'body'];
  
  return textareaKeywords.some(keyword => lowerName.includes(keyword));
}