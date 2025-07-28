import React, { useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Clock, Copy, Check, History, X, ArrowRightLeft } from "lucide-react";
import { HttpResponse } from "../types";
import {
  formatResponseBody,
  getStatusCodeColor,
  formatBytes,
  formatTime,
} from "../utils/responseUtils";

interface ResponseViewerProps {
  response: HttpResponse | null;
  error: string | null;
  isLoading: boolean;
  onShowHistory: () => void;
  historyCount: number;
  onClearError?: () => void;
  onStartComparison?: () => void;
  selectedItemsCount?: number;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  error,
  isLoading,
  onShowHistory,
  historyCount,
  onClearError,
  onStartComparison,
  selectedItemsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState("body");
  const [isCopied, setIsCopied] = useState(false);

  // Format response body for display
  const formattedBody = response
    ? formatResponseBody(response)
    : { formatted: "", language: "plaintext" };

  // Copy response body to clipboard
  const handleCopy = async () => {
    if (!response) return;

    try {
      await navigator.clipboard.writeText(response.body);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Executing request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-full overflow-auto custom-scrollbar">
          <div className="bg-red-500/20 text-red-400 p-4 rounded-md relative">
            {onClearError && (
              <button
                onClick={onClearError}
                className="absolute top-2 right-2 p-1 hover:bg-red-500/30 rounded-md transition-colors"
                title="Clear error"
              >
                <X size={16} />
              </button>
            )}
            <h3 className="text-lg font-medium mb-2 text-center pr-8">Request Error</h3>
            <pre className="text-sm text-left whitespace-pre-wrap overflow-auto max-h-96 bg-red-500/10 p-3 rounded border custom-scrollbar">{error}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-gray-400 mb-4">
            No response yet. Click "Send" to execute the request.
          </p>

          <div className="flex flex-col gap-2 items-center">
            {historyCount > 0 && (
              <button
                onClick={onShowHistory}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-md text-sm text-gray-300 transition-colors"
              >
                <History size={16} />
                <span>View Response History ({historyCount})</span>
              </button>
            )}
            {historyCount > 0 && onStartComparison && (
              <button
                onClick={onStartComparison}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600/50 hover:bg-blue-600/70 rounded-md text-sm text-gray-300 transition-colors"
              >
                <ArrowRightLeft size={16} />
                <span>Compare Responses</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Response Header */}
      <div className="flex-none p-4 border-b border-gray-700/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div>
              <span
                className={`text-lg font-medium ${getStatusCodeColor(response.status)}`}
              >
                {response.status}
              </span>
              <span className="text-gray-400 ml-2">{response.statusText}</span>
            </div>

            <div className="text-sm text-gray-400">
              {formatBytes(response.size)}
            </div>

            <div className="flex items-center text-sm text-gray-400">
              <Clock size={14} className="mr-1" />
              {formatTime(response.timing.total)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`p-2 rounded-md transition-colors ${
                isCopied
                  ? "text-green-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              }`}
              title="Copy response body"
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>

            <button
              onClick={onShowHistory}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors relative"
              title="View response history"
            >
              <History size={14} />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {historyCount}
                </span>
              )}
            </button>
            {onStartComparison && (
              <button
                onClick={onStartComparison}
                className={`p-2 rounded-md transition-colors ${
                  selectedItemsCount >= 2
                    ? "text-green-400 hover:text-green-300 hover:bg-green-500/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                }`}
                title="Compare responses"
              >
                <ArrowRightLeft size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Response Tabs */}
      <div className="flex-none border-b border-gray-700/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("body")}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === "body"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }
            `}
          >
            Body
          </button>

          <button
            onClick={() => setActiveTab("headers")}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === "headers"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }
            `}
          >
            Headers
          </button>

          <button
            onClick={() => setActiveTab("timing")}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === "timing"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }
            `}
          >
            Timing
          </button>
        </div>
      </div>

      {/* Response Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "body" && (
          <Editor
            height="100%"
            language={formattedBody.language}
            value={formattedBody.formatted}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
            }}
          />
        )}

        {activeTab === "headers" && (
          <div className="p-4 overflow-auto h-full custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                <tr>
                  <th scope="col" className="px-4 py-2">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-700/50">
                    <td className="px-4 py-2 font-medium">{key}</td>
                    <td className="px-4 py-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "timing" && (
          <div className="p-4 overflow-auto h-full custom-scrollbar">
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-md p-4">
                <div className="text-sm font-medium text-gray-300 mb-2">
                  Total Time: {formatTime(response.timing.total)}
                </div>

                <div className="space-y-2">
                  {/* DNS Resolution */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>DNS Resolution</span>
                      <span>{formatTime(response.timing.dns)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${(response.timing.dns / response.timing.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Connection */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Connection</span>
                      <span>{formatTime(response.timing.connection)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{
                          width: `${(response.timing.connection / response.timing.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* TLS Setup */}
                  {response.timing.tls > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>TLS Setup</span>
                        <span>{formatTime(response.timing.tls)}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-yellow-500 h-1.5 rounded-full"
                          style={{
                            width: `${(response.timing.tls / response.timing.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Time to First Byte */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Waiting (TTFB)</span>
                      <span>{formatTime(response.timing.firstByte)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{
                          width: `${(response.timing.firstByte / response.timing.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Content Download */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Content Download</span>
                      <span>{formatTime(response.timing.download)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{
                          width: `${(response.timing.download / response.timing.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
