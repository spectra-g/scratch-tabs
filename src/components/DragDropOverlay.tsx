import React, { useState, useEffect, useCallback } from "react";
import { Upload } from "lucide-react";
import { useRootStore } from "../stores";
import { useSplitViewStore } from "../stores/splitViewStore";
import { useModalStore } from "../stores/modalStore";
import { languageRegistry } from "../languages";
import { ImportExportService } from "../features/import-export/ImportExportService";

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: Error) => void,
  ) => void;
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  isDirectory: false;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isFile: false;
  isDirectory: true;
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: Error) => void,
  ) => void;
}

const detectLanguageFromFileName = (fileName: string): string => {
  if (!fileName) return "plaintext";

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return "plaintext";

  // Try to find a matching language detector by its supported extensions
  const detector = languageRegistry
    .getAll()
    .find((detector) => detector.extensions.includes(extension));

  return detector?.id || "plaintext";
};

const handleWorkspaceImport = async (file: File): Promise<void> => {
  try {
    const service = new ImportExportService();
    const importResult = await service.importWorkspaces(file);
    
    if (importResult.errors.length > 0) {
      const errorMessage = importResult.errors.join("\n");
      alert(`Import encountered errors:\n${errorMessage}`);
    }
    
    if (importResult.importedWorkspaces.length > 0) {
      const importedCount = importResult.importedWorkspaces.length;
      alert(`Successfully imported ${importedCount} workspace${importedCount === 1 ? "" : "s"}! Reloading page...`);
      window.location.reload();
    } else if (importResult.errors.length === 0) {
      alert("No workspaces were imported. The file might have been empty or contained no new data.");
    }
  } catch (error) {
    alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const DragDropOverlay: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false); // Renamed from isUploading for clarity
  const { handleNewPopulatedTab } = useRootStore();
  const { splitView } = useSplitViewStore();
  const { isImportModalActive } = useModalStore();

  const readAllDirectoryEntries = async (
    directoryEntry: FileSystemDirectoryEntry,
  ): Promise<File[]> => {
    const directoryReader = directoryEntry.createReader();
    let allEntries: FileSystemEntry[] = [];

    const readBatch = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        directoryReader.readEntries(
          (entries) => {
            if (entries.length) {
              allEntries = allEntries.concat(entries);
              // Recursively call readBatch if more entries might exist (though typically readEntries gets all in one go for smaller dirs)
              // For simplicity here, we assume one call is enough for most cases,
              // but a more robust solution might loop until entries.length is 0.
              // However, the common pattern is to just process what you get.
              // If entries.length is 0, it means no more entries.
              resolve(entries);
            } else {
              resolve([]); // No more entries
            }
          },
          (err) => reject(err),
        );
      });
    };

    // Read all entries in the current directory
    // A more robust loop for readEntries if it returns batches:
    let currentBatch = await readBatch();
    while (currentBatch.length > 0) {
      // allEntries is already populated by the side effect in readBatch
      currentBatch = await readBatch(); // Try to read more
    }

    const files: File[] = [];
    for (const entry of allEntries) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (entry as FileSystemFileEntry).file(resolve, reject);
        });
        files.push(file);
      } else if (entry.isDirectory) {
        // Recursively read subdirectories
        const subFiles = await readAllDirectoryEntries(
          entry as FileSystemDirectoryEntry,
        );
        files.push(...subFiles);
      }
    }
    return files;
  };

  const processDroppedItem = useCallback(async (item: DataTransferItem) => {
    const entry = item.webkitGetAsEntry() as FileSystemEntry | null;
    if (!entry) return [];

    if (entry.isFile) {
      return new Promise<File[]>((resolve, reject) => {
        (entry as FileSystemFileEntry).file((file) => resolve([file]), reject);
      });
    } else if (entry.isDirectory) {
      return readAllDirectoryEntries(entry as FileSystemDirectoryEntry);
    }
    return [];
  }, []); // readAllDirectoryEntries is defined outside, so it's stable

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isImportModalActive && e.dataTransfer) {
        // Check if any item is a file or directory
        let containsFilesOrFolders = false;
        if (e.dataTransfer.items) {
          for (let i = 0; i < e.dataTransfer.items.length; i++) {
            if (e.dataTransfer.items[i].kind === "file") {
              containsFilesOrFolders = true;
              break;
            }
          }
        } else if (e.dataTransfer.files.length > 0) {
          // Fallback for older browsers or different drop types
          containsFilesOrFolders = true;
        }

        if (containsFilesOrFolders) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        e.relatedTarget === null ||
        (e.relatedTarget as Node).nodeName === "HTML"
      ) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isImportModalActive || !e.dataTransfer?.items) {
        return;
      }

      setIsProcessingDrop(true);
      const allFiles: File[] = [];

      try {
        const promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === "file") {
            // Process only file kinds (which include directories via webkitGetAsEntry)
            promises.push(processDroppedItem(e.dataTransfer.items[i]));
          }
        }
        const results = await Promise.all(promises);
        results.forEach((fileList) => allFiles.push(...fileList));

        if (allFiles.length > 0) {
          // Check if any files are .scratch files
          const scratchFiles = allFiles.filter(file => file.name.endsWith('.scratch'));
          const regularFiles = allFiles.filter(file => !file.name.endsWith('.scratch'));

          // Handle .scratch files as workspace imports
          for (const scratchFile of scratchFiles) {
            try {
              await handleWorkspaceImport(scratchFile);
              // Only process one .scratch file at a time, then reload
              return;
            } catch (error) {
              console.error(`Error importing workspace from ${scratchFile.name}:`, error);
            }
          }

          // Handle regular files as tab imports
          if (regularFiles.length > 0) {
            const toRightSide = splitView?.activeSide === "right" || false;
            for (const file of regularFiles) {
              try {
                const fileContent = await readFileAsText(file);
                const fileName = file.name.replace(/\.[^/.]+$/, ""); // Title without extension

                // Detect language from file extension
                const language = detectLanguageFromFileName(file.name);

                handleNewPopulatedTab(
                  {
                    id: crypto.randomUUID(),
                    title: fileName,
                    content: fileContent,
                    language: language,
                    languageLocked: language !== "plaintext", // Only lock if we detected a specific language
                    cursorPosition: { lineNumber: 1, column: 1 },
                    dateCreated: Date.now(),
                    lastModified: Date.now(),
                    workspaceId: "", // Empty string, will be handled by handleNewPopulatedTab
                  },
                  toRightSide,
                );
              } catch (fileReadError) {
                console.error(`Error reading file ${file.name}:`, fileReadError);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing dropped items:", error);
      } finally {
        setIsProcessingDrop(false);
      }
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [
    isImportModalActive,
    handleNewPopulatedTab,
    splitView?.activeSide,
    processDroppedItem,
  ]);

  if (isImportModalActive || (!isDragging && !isProcessingDrop)) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-gray-800 border-2 border-dashed border-blue-500 rounded-lg p-8 max-w-md w-full text-center">
        {isProcessingDrop ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-200 text-lg font-medium">
              Processing dropped items...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload size={48} className="text-blue-400 mb-4" />
            <p className="text-gray-200 text-lg font-medium">
              Drop files or folders to open
            </p>
            <p className="text-gray-400 mt-2">
              Content will be opened in new tabs
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Drop .scratch files to import workspaces
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropOverlay;
