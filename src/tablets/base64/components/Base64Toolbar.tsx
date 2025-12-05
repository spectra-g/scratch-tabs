import React, { useState } from "react";
import {
  RotateCcw,
  RotateCw,
  ArrowDownUp,
  Download,
  Upload,
  Copy,
  Clipboard,
  Settings,
  X,
  Check,
  Info,
  Layers,
  FlipHorizontal as LayoutHorizontal,
  FlipVertical as LayoutVertical,
} from "lucide-react";
import { motion } from "framer-motion";
import { Base64Format, EncodingOption } from "../types";

interface Base64ToolbarProps {
  mode: "encode" | "decode" | "line-by-line";
  setMode: (mode: "encode" | "decode" | "line-by-line") => void;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  selectedEncoding: string;
  setSelectedEncoding: (encoding: string) => void;
  wrapOutput: boolean;
  setWrapOutput: (wrap: boolean) => void;
  preserveNewlines: boolean;
  setPreserveNewlines: (preserve: boolean) => void;
  onCopyOutput: () => void;
  onCopyInput: () => void;
  onClear: () => void;
  onSwap: () => void;
  onDownload: () => void;
  onUpload: () => void;
  formats: Base64Format[];
  encodings: EncodingOption[];
  hasOutput: boolean;
  hasInput: boolean;
  canProcess: boolean;
  layout: "horizontal" | "vertical";
  setLayout: (layout: "horizontal" | "vertical") => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
}

export const Base64Toolbar: React.FC<Base64ToolbarProps> = ({
  mode,
  setMode,
  selectedFormat,
  setSelectedFormat,
  selectedEncoding,
  setSelectedEncoding,
  wrapOutput,
  setWrapOutput,
  preserveNewlines,
  setPreserveNewlines,
  onCopyOutput,
  onCopyInput,
  onClear,
  onSwap,
  onDownload,
  onUpload,
  formats,
  encodings,
  hasOutput,
  hasInput,
  canProcess,
  layout,
  setLayout,
  showHistory,
  setShowHistory,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);

  const handleCopyOutput = () => {
    onCopyOutput();
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleCopyInput = () => {
    onCopyInput();
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  return (
    <div className="flex flex-col border-b border-base bg-surface-secondary">
      {/* Main Toolbar */}
      <div className="flex items-center justify-between p-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {/* Mode Selector */}
          <div className="bg-surface-secondary rounded-lg p-0.5 flex">
            <button
              onClick={() => setMode("encode")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${mode === "encode"
                ? "bg-primary/20 text-info"
                : "text-secondary hover:text-main"
                }`}
              title="Encode text to Base64"
            >
              Encode
            </button>
            <button
              onClick={() => setMode("decode")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${mode === "decode"
                ? "bg-primary/20 text-info"
                : "text-secondary hover:text-main"
                }`}
              title="Decode Base64 to text"
            >
              Decode
            </button>
            <button
              onClick={() => setMode("line-by-line")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${mode === "line-by-line"
                ? "bg-primary/20 text-info"
                : "text-secondary hover:text-main"
                }`}
              title="Process each line separately"
            >
              Line by Line
            </button>
          </div>

          {/* Layout Toggle */}
          <button
            onClick={() =>
              setLayout(layout === "horizontal" ? "vertical" : "horizontal")
            }
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title={
              layout === "horizontal"
                ? "Switch to vertical layout"
                : "Switch to horizontal layout"
            }
          >
            {layout === "horizontal" ? (
              <LayoutVertical size={16} />
            ) : (
              <LayoutHorizontal size={16} />
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Action Buttons */}
          <button
            onClick={onSwap}
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title="Swap input and output"
            disabled={!hasInput && !hasOutput}
          >
            <ArrowDownUp size={16} />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title="Clear input and output"
            disabled={!hasInput && !hasOutput}
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onUpload}
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title="Upload a file"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={onDownload}
            className="p-2 text-secondary hover:text-main hover:bg-element-hover rounded-md transition-colors"
            title="Download output as file"
            disabled={!hasOutput}
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-md transition-colors ${showHistory
              ? "bg-primary/20 text-info"
              : "text-secondary hover:text-main hover:bg-element-hover"
              }`}
            title="Show history"
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-md transition-colors ${showSettings
              ? "bg-primary/20 text-info"
              : "text-secondary hover:text-main hover:bg-element-hover"
              }`}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-base p-3 bg-element overflow-hidden"
        >
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm text-secondary">Base64 Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="bg-element border border-base rounded-md px-3 py-2 text-sm text-main hover:bg-element-hover focus:outline-none focus:border-focus transition-colors"
              >
                {formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formats.find((f) => f.id === selectedFormat)?.description}
              </p>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm text-secondary">
                Character Encoding
              </label>
              <select
                value={selectedEncoding}
                onChange={(e) => setSelectedEncoding(e.target.value)}
                className="bg-element border border-base rounded-md px-3 py-2 text-sm text-main hover:bg-element-hover focus:outline-none focus:border-focus transition-colors"
              >
                {encodings.map((encoding) => (
                  <option key={encoding.id} value={encoding.id}>
                    {encoding.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {encodings.find((e) => e.id === selectedEncoding)?.description}
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm text-secondary">Options</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="wrapOutput"
                  checked={wrapOutput}
                  onChange={(e) => setWrapOutput(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50"
                />
                <label htmlFor="wrapOutput" className="text-sm text-secondary">
                  Wrap output at 76 characters (RFC 2045)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="preserveNewlines"
                  checked={preserveNewlines}
                  onChange={(e) => setPreserveNewlines(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50"
                />
                <label
                  htmlFor="preserveNewlines"
                  className="text-sm text-secondary"
                >
                  Preserve newlines in line-by-line mode
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-secondary bg-element p-2 rounded-md">
              <Info size={14} className="text-info" />
              <span>
                Keyboard shortcuts:{" "}
                <kbd className="px-1 py-0.5 bg-element-hover rounded">Ctrl+E</kbd> to
                encode,
                <kbd className="px-1 py-0.5 bg-element-hover rounded ml-1">
                  Ctrl+D
                </kbd>{" "}
                to decode,
                <kbd className="px-1 py-0.5 bg-element-hover rounded ml-1">
                  Ctrl+↑/↓
                </kbd>{" "}
                to change mode
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input/Output Controls */}
      <div className="flex border-t border-base">
        <div className="flex-1 flex items-center justify-between p-2 border-r border-base">
          <span className="text-sm font-medium text-secondary">
            {mode === "encode"
              ? "Text Input"
              : mode === "decode"
                ? "Base64 Input"
                : "Input"}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopyInput}
              className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
              title="Copy input"
              disabled={!hasInput}
            >
              {copiedInput ? (
                <Check size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            <button
              onClick={onClear}
              className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
              title="Clear input"
              disabled={!hasInput}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-between p-2">
          <span className="text-sm font-medium text-secondary">
            {mode === "encode"
              ? "Base64 Output"
              : mode === "decode"
                ? "Text Output"
                : "Output"}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopyOutput}
              className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
              title="Copy output"
              disabled={!hasOutput}
            >
              {copiedOutput ? (
                <Check size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            <button
              onClick={onDownload}
              className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
              title="Download output"
              disabled={!hasOutput}
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
