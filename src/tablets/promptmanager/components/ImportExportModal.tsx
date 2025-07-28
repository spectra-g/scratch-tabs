import React, { useState, useRef } from "react";
import { X, Upload, Download, AlertTriangle, Check } from "../../../components/Icons";
import { PromptManagerData } from "../types";

interface ImportExportModalProps {
  mode: "import" | "export";
  onClose: () => void;
  onImport: (data: Partial<PromptManagerData>) => void;
  onExport: () => Partial<PromptManagerData>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  mode,
  onClose,
  onImport,
  onExport,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        // Validate data structure
        if (!data || typeof data !== "object") {
          throw new Error("Invalid data format");
        }

        // Check for required arrays
        const hasValidArrays =
          (!data.prompts || Array.isArray(data.prompts)) &&
          (!data.templates || Array.isArray(data.templates)) &&
          (!data.snippets || Array.isArray(data.snippets)) &&
          (!data.tags || Array.isArray(data.tags));

        if (!hasValidArrays) {
          throw new Error("Invalid data structure");
        }

        // Import data
        onImport(data);
        setSuccess("Data imported successfully");
        setError(null);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        setError("Failed to import data: Invalid JSON format");
        setSuccess(null);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
      setSuccess(null);
    };

    reader.readAsText(file);
  };

  const handleExport = () => {
    const data = onExport();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-manager-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("Data exported successfully");

    // Close modal after a delay
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-200">
            {mode === "import" ? "Import Data" : "Export Data"}
          </h2>
          <button
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === "import" ? (
            <div>
              <p className="text-gray-300 mb-4">
                Import your prompts, templates, snippets, and tags from a JSON
                file.
              </p>

              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-300 mb-2">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Accepts .json files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors cursor-pointer inline-block"
                >
                  Select File
                </label>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start">
                  <AlertTriangle
                    size={16}
                    className="text-red-400 mt-0.5 mr-2 flex-shrink-0"
                  />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 mr-2 flex-shrink-0"
                  />
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-300 mb-4">
                Export your prompts, templates, snippets, and tags to a JSON
                file.
              </p>

              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                <Download size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-300 mb-4">
                  Click the button below to download your data
                </p>
                <button
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
                  onClick={handleExport}
                >
                  Export Data
                </button>
              </div>

              {success && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 mr-2 flex-shrink-0"
                  />
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
