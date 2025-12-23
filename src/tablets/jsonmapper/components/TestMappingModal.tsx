import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { X, Play, Upload, Download, Copy, Check } from "lucide-react";
import { MappingConfig, MappingDirection } from "../types";
import { transformJson } from "../utils/mappingUtils";
import { isValidJson, formatJson } from "../utils/jsonUtils";
import { readFileAsText, downloadStringAsFile } from "../utils/fileUtils";

interface TestMappingModalProps {
  mapping: MappingConfig;
  initialInput: string;
  onClose: () => void;
}

export const TestMappingModal: React.FC<TestMappingModalProps> = ({
  mapping,
  initialInput,
  onClose,
}) => {
  const [input, setInput] = useState(initialInput || mapping.sourceJson);
  const [output, setOutput] = useState("");
  const [direction] = useState<MappingDirection>("sourceToTarget"); // Fixed direction
  const [error, setError] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [inputCopied, setInputCopied] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);

  // Transform when the component mounts
  useEffect(() => {
    handleTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (value: string | undefined) => {
    setInput(value || "");
    setError(null);
  };

  const handleTransform = () => {
    if (!input) {
      setError("Please enter input JSON");
      return;
    }

    if (!isValidJson(input)) {
      setError("Invalid JSON input");
      return;
    }

    setIsTransforming(true);
    setError(null);

    try {
      const inputData = JSON.parse(input);
      const result = transformJson(inputData, mapping.rules, direction);
      setOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error transforming JSON:", error);
      setError(
        error instanceof Error ? error.message : "Error transforming JSON",
      );
      setOutput("");
    } finally {
      setIsTransforming(false);
    }
  };

  const handleLoadInputFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      if (isValidJson(content)) {
        setInput(formatJson(content));
        setError(null);
      } else {
        setError("Invalid JSON file");
      }
    } catch (error) {
      setError("Error reading file");
    }

    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleCopyInput = async () => {
    if (!input) return;

    try {
      await navigator.clipboard.writeText(input);
      setInputCopied(true);
      setTimeout(() => setInputCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy input:", error);
    }
  };

  const handleCopyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setOutputCopied(true);
      setTimeout(() => setOutputCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy output:", error);
    }
  };

  const handleDownloadOutput = () => {
    if (!output) return;

    const filename = `${mapping.name.replace(/\s+/g, "_")}_output.json`;
    downloadStringAsFile(output, filename);
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-[95vw] max-w-[1600px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base">
          <h2 className="text-xl font-semibold text-main">
            Test Mapping: {mapping.name}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-main transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Input/Output Editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-secondary">
                    Input JSON
                  </label>
                  <div className="flex space-x-2">
                    <label className="flex items-center space-x-2 px-2 py-1 bg-surface-secondary hover:bg-element-hover rounded-md text-xs text-secondary transition-colors cursor-pointer">
                      <Upload size={14} />
                      <span>Load File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleLoadInputFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleCopyInput}
                      disabled={!input}
                      className="flex items-center space-x-2 px-2 py-1 bg-surface-secondary hover:bg-element-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs text-secondary transition-colors"
                    >
                      {inputCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{inputCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>
                <div
                  className={`border rounded-md overflow-hidden ${error ? "border-danger" : "border-base"}`}
                >
                  <Editor
                    height="400px"
                    language="json"
                    value={input}
                    onChange={handleInputChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: "on",
                      padding: { top: 8, bottom: 8 },
                    }}
                  />
                </div>
                {error && <p className="mt-1 text-xs text-danger">{error}</p>}
              </div>

              {/* Output */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-secondary">
                    Transformed JSON
                  </label>
                  <div className="flex space-x-2">
                    {output && (
                      <>
                        <button
                          onClick={handleDownloadOutput}
                          className="flex items-center space-x-2 px-2 py-1 bg-surface-secondary hover:bg-element-hover rounded-md text-xs text-secondary transition-colors"
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={handleCopyOutput}
                          className="flex items-center space-x-2 px-2 py-1 bg-surface-secondary hover:bg-element-hover rounded-md text-xs text-secondary transition-colors"
                        >
                          {outputCopied ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          <span>{outputCopied ? "Copied!" : "Copy"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="border border-base rounded-md overflow-hidden">
                  <Editor
                    height="400px"
                    language="json"
                    value={output}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: "on",
                      padding: { top: 8, bottom: 8 },
                      readOnly: true,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-base">
          <button
            onClick={handleTransform}
            disabled={!input || isTransforming}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
              ${!input || isTransforming
                ? "bg-action-disabled text-disabled cursor-not-allowed"
                : "bg-surface-secondary text-primary hover:bg-element-hover"
              }
              transition-colors
            `}
          >
            <Play size={14} className={isTransforming ? "animate-spin" : ""} />
            <span>{isTransforming ? "Transforming..." : "Transform"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
