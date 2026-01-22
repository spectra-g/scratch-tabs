import { useCallback } from "react";

interface UseFileImportOptions {
  /** Callback when file content is loaded */
  onFileLoaded: (content: string, fileName: string) => void;
  /** File types to accept (default: all) */
  accept?: string;
}

interface UseFileImportReturn {
  /** Opens the native file picker dialog */
  openFileDialog: () => void;
}

/**
 * useFileImport
 *
 * Custom hook for handling file import via native file picker.
 * Follows SRP by encapsulating file reading logic.
 *
 * @example
 * const { openFileDialog } = useFileImport({
 *   onFileLoaded: (content, fileName) => {
 *     console.log('Loaded:', fileName, content);
 *   }
 * });
 */
export const useFileImport = ({
  onFileLoaded,
  accept = "*/*",
}: UseFileImportOptions): UseFileImportReturn => {
  const openFileDialog = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            onFileLoaded(content, file.name);
          }
        };
        reader.onerror = (error) => {
          console.error("Failed to read file:", error);
        };
        reader.readAsText(file);
      }
      // Cleanup
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, [onFileLoaded, accept]);

  return { openFileDialog };
};
