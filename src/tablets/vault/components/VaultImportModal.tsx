import React, { useState, useCallback, useMemo } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VaultItem } from "../types";
import {
  ImportSource,
  parseImportData,
  getImportSourceInfo,
} from "../utils/importParsers";
import { detectContentType } from "../utils/contentTypeUtils";

interface VaultImportModalProps {
  onImport: (items: VaultItem[]) => void;
  onClose: () => void;
  existingItems: VaultItem[];
}

export const VaultImportModal: React.FC<VaultImportModalProps> = ({
  onImport,
  onClose,
  existingItems,
}) => {
  const [selectedSource, setSelectedSource] =
    useState<ImportSource>("terminal-history");
  const [rawContent, setRawContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Parse the content and generate preview items
  const parseResult = useMemo(() => {
    if (!rawContent.trim()) {
      return { items: [], errors: [] };
    }
    return parseImportData(selectedSource, rawContent);
  }, [selectedSource, rawContent]);

  // Generate full VaultItem objects from parsed data
  const previewItems = useMemo(() => {
    return parseResult.items.map(
      (partialItem): VaultItem => ({
        id: crypto.randomUUID(),
        title: partialItem.title || "Untitled",
        content: partialItem.content || "",
        contentType:
          partialItem.contentType ||
          detectContentType(partialItem.content || ""),
        labels: partialItem.labels || [],
        createdTimestamp: Date.now(),
        modifiedTimestamp: Date.now(),
        isPinned: false,
        usageCount: 0,
        lastUsedTimestamp: Date.now(),
        order: 0, // Placeholder - will be set properly during import
      }),
    );
  }, [parseResult.items]);

  // Check for duplicates (both against existing items and within preview items)
  const duplicateItems = useMemo(() => {
    const existingContentSet = new Set(
      existingItems.map((item) => item.content.trim()),
    );
    const previewContentSet = new Set<string>();
    const duplicates: VaultItem[] = [];

    previewItems.forEach((item) => {
      const content = item.content.trim();

      // Check if it exists in the vault
      if (existingContentSet.has(content)) {
        duplicates.push(item);
        return;
      }

      // Check if it's a duplicate within the preview items
      if (previewContentSet.has(content)) {
        duplicates.push(item);
        return;
      }

      previewContentSet.add(content);
    });

    return duplicates;
  }, [previewItems, existingItems]);

  const uniqueItems = useMemo(() => {
    const existingContentSet = new Set(
      existingItems.map((item) => item.content.trim()),
    );
    const seenContent = new Set<string>();
    const unique: VaultItem[] = [];

    previewItems.forEach((item) => {
      const content = item.content.trim();

      // Skip if it exists in the vault
      if (existingContentSet.has(content)) {
        return;
      }

      // Skip if we've already seen this content in preview items
      if (seenContent.has(content)) {
        return;
      }

      seenContent.add(content);
      unique.push(item);
    });

    return unique;
  }, [previewItems, existingItems]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRawContent(content);
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleImport = useCallback(() => {
    if (uniqueItems.length === 0) return;

    setIsProcessing(true);
    try {
      onImport(uniqueItems);
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [uniqueItems, onImport, onClose]);

  const sourceInfo = getImportSourceInfo(selectedSource);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-base rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base">
          <div>
            <h2 className="text-xl font-semibold text-main">
              Import Items
            </h2>
            <p className="text-sm text-secondary mt-1">
              Import data from various sources into your vault
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Import Configuration */}
            <div className="space-y-6">
              {/* Source Selection */}
              <div>
                <label className="block text-sm font-medium text-main mb-2">
                  Import Source
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) =>
                    setSelectedSource(e.target.value as ImportSource)
                  }
                  className="w-full bg-element border border-base rounded-md px-3 py-2 text-main focus:outline-none focus:border-blue-500"
                >
                  <option value="terminal-history">Terminal History</option>
                  <option value="vscode-snippets">VS Code Snippets</option>
                  <option value="markdown-notes">Markdown Notes</option>
                </select>
                <p className="text-xs text-secondary mt-1">
                  {sourceInfo.description}
                </p>
              </div>

              {/* File Upload or Text Input */}
              <div>
                <label className="block text-sm font-medium text-main mb-2">
                  {sourceInfo.acceptsFiles
                    ? "Upload File or Paste Content"
                    : "Paste Content"}
                </label>

                {sourceInfo.acceptsFiles && (
                  <div className="mb-3">
                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-base rounded-lg cursor-pointer hover:border-base transition-colors bg-canvas">
                      <div className="flex flex-col items-center">
                        <Upload size={24} className="text-secondary mb-1" />
                        <span className="text-sm text-secondary">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-secondary">
                          {sourceInfo.fileExtensions?.join(", ")}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept={sourceInfo.fileExtensions
                          ?.map((ext) => ext)
                          .join(",")}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder={sourceInfo.placeholder}
                  className="w-full h-64 bg-canvas border border-base rounded-md px-3 py-2 text-main placeholder-secondary focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Errors Display */}
              {parseResult.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <div className="flex items-center mb-2">
                    <AlertCircle size={16} className="text-red-400 mr-2" />
                    <span className="text-sm font-medium text-red-400">
                      Parsing Errors
                    </span>
                  </div>
                  <ul className="text-xs text-red-300 space-y-1">
                    {parseResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-main">Preview</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center text-sm text-secondary hover:text-main"
                >
                  {showPreview ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                  {showPreview ? "Hide" : "Show"} Preview
                </button>
              </div>

              {showPreview && (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-element rounded-md p-3 text-center">
                      <div className="text-lg font-semibold text-blue-400">
                        {previewItems.length}
                      </div>
                      <div className="text-secondary">Total Items</div>
                    </div>
                    <div className="bg-element rounded-md p-3 text-center">
                      <div className="text-lg font-semibold text-green-400">
                        {uniqueItems.length}
                      </div>
                      <div className="text-secondary">New Items</div>
                    </div>
                    <div className="bg-element rounded-md p-3 text-center">
                      <div className="text-lg font-semibold text-yellow-400">
                        {duplicateItems.length}
                      </div>
                      <div className="text-secondary">Duplicates</div>
                    </div>
                  </div>

                  {/* Duplicate Warning */}
                  {duplicateItems.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                      <div className="flex items-center mb-2">
                        <AlertCircle
                          size={16}
                          className="text-yellow-400 mr-2"
                        />
                        <span className="text-sm font-medium text-yellow-400">
                          Duplicate Items Found
                        </span>
                      </div>
                      <p className="text-xs text-yellow-300">
                        {duplicateItems.length} items are duplicates (either
                        existing in vault or repeated in import) and will be
                        skipped.
                      </p>
                    </div>
                  )}

                  {/* Items Preview */}
                  <div className="max-h-96 overflow-auto custom-scrollbar space-y-2">
                    {previewItems.map((item, index) => {
                      const isDuplicate = duplicateItems.some(
                        (dup) => dup.content === item.content,
                      );
                      const duplicateCount = previewItems.filter(
                        (p) => p.content.trim() === item.content.trim(),
                      ).length;
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-md border ${
                            isDuplicate
                              ? "bg-element/50 border-base opacity-50"
                              : "bg-element border-base text-main"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <FileText size={14} className="text-secondary" />
                                <span className="font-medium truncate">
                                  {item.title}
                                </span>
                                {isDuplicate && (
                                  <span className="text-xs bg-warning-subtle text-warning px-1.5 py-0.5 rounded">
                                    {duplicateCount > 1
                                      ? `Duplicate (${duplicateCount})`
                                      : "Duplicate"}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-secondary mb-1">
                                {item.contentType} • {item.labels.join(", ")}
                              </div>
                              <div className="text-xs text-secondary truncate">
                                {item.content.substring(0, 100)}
                                {item.content.length > 100 && "..."}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-base">
          <div className="text-sm text-secondary">
            {uniqueItems.length > 0 ? (
              <span className="flex items-center">
                <CheckCircle size={16} className="text-green-400 mr-2" />
                Ready to import {uniqueItems.length} new items
              </span>
            ) : (
              <span>No items to import</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={uniqueItems.length === 0 || isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-element disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Import {uniqueItems.length} Items</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
