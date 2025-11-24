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

  try {
    JSON.parse(content);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

/**
 * Register JSON validation provider with Monaco
 */
export function registerJsonValidationProvider(monaco: any) {
  // Add validation markers to the editor
  monaco.languages.registerDocumentFormattingEditProvider("json", {
    provideDocumentFormattingEdits(model: any) {
      const content = model.getValue();

      const validation = validateJson(content);

      // Clear existing markers
      monaco.editor.setModelMarkers(model, "json-validation", []);

      // If invalid, add error marker
      if (!validation.isValid) {
        monaco.editor.setModelMarkers(model, "json-validation", [
          {
            message: validation.error,
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: model.getLineCount(),
            endColumn: model.getLineMaxColumn(model.getLineCount()),
          },
        ]);
      }

      // Return formatted JSON if valid
      if (validation.isValid && content.trim()) {
        try {
          const formatted = JSON.stringify(JSON.parse(content), null, 2);
          return [
            {
              range: model.getFullModelRange(),
              text: formatted,
            },
          ];
        } catch {
          // If formatting fails, return unmodified content
          return [];
        }
      }

      return [];
    },
  });
}
