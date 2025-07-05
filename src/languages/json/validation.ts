import { JsonLanguageDetector } from '../json';

/**
 * Interface for JSON validation result
 */
export interface JsonValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates JSON content
 */
export function validateJson(content: string): JsonValidationResult {
  if (!content.trim()) {
    return { isValid: true };
  }

  // Safety check: don't parse very large content
  if (content.length > 1_000_000) {
    console.log(`JSON Validation: Content too large (${content.length} bytes), skipping validation`); // <<< ADD THIS
    return { isValid: true }; // Assume valid to avoid blocking
  }

  try {
    JSON.parse(content);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

/**
 * Register JSON validation provider with Monaco
 */
export function registerJsonValidationProvider(monaco: any) {
  const jsonDetector = new JsonLanguageDetector();

  // Add validation markers to the editor
  monaco.languages.registerDocumentFormattingEditProvider('json', {
    provideDocumentFormattingEdits(model: any) {
      console.log(`JSON Formatting Provider: Called for model ${model.uri.toString()}`); // <<< ADD THIS
      const content = model.getValue();
      console.log(`JSON Formatting Provider: Content length: ${content.length}`); // <<< ADD THIS
      
      // CRITICAL FIX: Completely disable JSON features for large content
      if (content.length > 1_000_000) {
        console.log(`JSON Formatting Provider: Content too large (${content.length} bytes), disabling all JSON features`); // <<< ADD THIS
        // Clear any existing markers
        monaco.editor.setModelMarkers(model, 'json-validation', []);
        // Return empty array to disable formatting
        return [];
      }
      
      const validation = validateJson(content);

      // Clear existing markers
      monaco.editor.setModelMarkers(model, 'json-validation', []);

      // If invalid, add error marker
      if (!validation.isValid) {
        monaco.editor.setModelMarkers(model, 'json-validation', [{
          message: validation.error,
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        }]);
      }

      // Return formatted JSON if valid
      if (validation.isValid && content.trim()) {
        // Safety check: don't parse very large content for auto-formatting
        if (content.length > 1_000_000) {
          console.log(`JSON Auto-Format: Content too large (${content.length} bytes), skipping auto-format`); // <<< ADD THIS
          return []; // Don't auto-format large content
        }
        
        try {
          const formatted = JSON.stringify(JSON.parse(content), null, 2);
          return [{
            range: model.getFullModelRange(),
            text: formatted
          }];
        } catch {
          // If formatting fails, return unmodified content
          return [];
        }
      }

      return [];
    }
  });
}