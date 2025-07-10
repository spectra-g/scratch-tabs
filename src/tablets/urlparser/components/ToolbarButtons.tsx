import React, { useState } from "react";
import {
  Code,
  Copy,
  Trash2,
  History,
  AlertTriangle,
  Eye,
  EyeOff,
  BarChart2,
  BarChart2 as BarChart2Off,
  X,
  Check,
} from "lucide-react";
import { toCurl } from "../utils/urlUtils";

interface ToolbarButtonsProps {
  url: string;
  hasWarnings: boolean;
  isEncoded: boolean;
  showComparison: boolean;
  onClearUrl: () => void;
  onToggleEncoding: () => void;
  onToggleComparison: () => void;
  onShowHistory: () => void;
  onLoadSuspiciousExample: () => void;
}

export const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({
  url,
  hasWarnings,
  isEncoded,
  showComparison,
  onClearUrl,
  onToggleEncoding,
  onToggleComparison,
  onShowHistory,
  onLoadSuspiciousExample,
}) => {
  const [showCurlPopup, setShowCurlPopup] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  const handleCopyCurl = () => {
    const curl = toCurl(url);
    navigator.clipboard.writeText(curl);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setShowCurlPopup(!showCurlPopup)}
        className={`p-2 rounded-md ${
          showCurlPopup
            ? "bg-blue-500/20 text-blue-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
        }`}
        title="Generate curl command"
        disabled={!url}
      >
        <Code size={16} className={!url ? "opacity-50" : ""} />
      </button>

      <button
        onClick={onToggleEncoding}
        className={`p-2 rounded-md ${
          isEncoded
            ? "bg-purple-500/20 text-purple-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
        }`}
        title={isEncoded ? "Show decoded values" : "Show encoded values"}
      >
        {isEncoded ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>

      <button
        onClick={onToggleComparison}
        className={`p-2 rounded-md ${
          showComparison
            ? "bg-green-500/20 text-green-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
        }`}
        title={
          showComparison
            ? "Hide comparison view"
            : "Show cross-platform comparison"
        }
      >
        {showComparison ? <BarChart2 size={16} /> : <BarChart2Off size={16} />}
      </button>

      <button
        onClick={onShowHistory}
        className="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700"
        title="Show URL history"
      >
        <History size={16} />
      </button>

      <button
        onClick={onLoadSuspiciousExample}
        className={`p-2 rounded-md ${
          hasWarnings
            ? "text-yellow-400"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
        }`}
        title="Load suspicious URL example"
      >
        <AlertTriangle size={16} />
      </button>

      <button
        onClick={onClearUrl}
        className="p-2 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700"
        title="Clear URL"
        disabled={!url}
      >
        <Trash2 size={16} className={!url ? "opacity-50" : ""} />
      </button>

      {/* Curl popup */}
      {showCurlPopup && url && (
        <div className="absolute top-12 right-0 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3 z-10 w-96">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-200">curl Command</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyCurl}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                title="Copy curl command"
              >
                {curlCopied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <button
                onClick={() => setShowCurlPopup(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {toCurl(url)}
          </pre>
        </div>
      )}
    </div>
  );
};
