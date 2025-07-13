import React, { useState } from "react";
import { X, Clock, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Prompt } from "../types";

interface HistoryViewerProps {
  prompt: Prompt;
  onClose: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  prompt,
  onClose,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
  };

  const history = prompt.history || [];

  const renderComparison = () => {
    if (selectedVersion === null) return null;

    const versionContent = history[selectedVersion].content;
    const currentContent = prompt.content;

    return (
      <div className="h-full">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Left side - Historical version */}
          <div className="border border-gray-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-gray-800/30 border-b border-gray-700/50">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-gray-400">
                  <Clock size={16} />
                  <span className="text-sm">
                    {formatDate(history[selectedVersion].timestamp)}
                  </span>
                </div>
              </div>
            </div>
            {/* Content */}
            <div
              className="h-full overflow-y-auto custom-scrollbar"
              style={{ maxHeight: "calc(100% - 60px)" }}
            >
              <div className="p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {versionContent}
                </pre>
              </div>
            </div>
          </div>

          {/* Right side - Current version */}
          <div className="border border-gray-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-gray-800/30 border-b border-gray-700/50">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-blue-400">
                  <Clock size={16} />
                  <span className="text-sm">Current</span>
                </div>
              </div>
            </div>
            {/* Content */}
            <div
              className="h-full overflow-y-auto custom-scrollbar"
              style={{ maxHeight: "calc(100% - 60px)" }}
            >
              <div className="p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {currentContent}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {showComparison && (
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center space-x-2">
              <FileText size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-200">
                {showComparison ? "Version Comparison" : "Prompt History"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showComparison ? (
            <div className="h-full p-4">{renderComparison()}</div>
          ) : (
            <div className="h-full flex">
              {/* History List */}
              <div className="w-80 border-r border-gray-700 overflow-y-auto custom-scrollbar">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Version History
                  </h3>
                  {history.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Clock size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No version history available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((version, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedVersion === index
                              ? "bg-blue-500/20 border border-blue-500/50"
                              : "bg-gray-800/50 hover:bg-gray-800"
                          }`}
                          onClick={() => setSelectedVersion(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-300">
                                {formatDateShort(version.timestamp)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVersion(index);
                                setShowComparison(true);
                              }}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Compare
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(version.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Version Preview */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {selectedVersion !== null ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-300">
                        Version from{" "}
                        {formatDate(history[selectedVersion].timestamp)}
                      </h3>
                      <button
                        onClick={() => setShowComparison(true)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md text-sm transition-colors"
                      >
                        <ArrowRight size={14} />
                        <span>Compare with Current</span>
                      </button>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                        {history[selectedVersion].content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Clock size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Select a version to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
