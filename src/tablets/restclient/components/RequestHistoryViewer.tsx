import React from "react";
import { X, Pin, ArrowRight, Trash2, Send } from "lucide-react";
import { HttpRequestHistoryItem } from "../types";

interface RequestHistoryViewerProps {
  history: HttpRequestHistoryItem[];
  onPinItem: (id: string, isPinned: boolean) => void;
  onDeleteItem: (id: string) => void;
  onRestoreItem: (item: HttpRequestHistoryItem) => void;
  onClose: () => void;
}

export const RequestHistoryViewer: React.FC<RequestHistoryViewerProps> = ({
  history,
  onPinItem,
  onDeleteItem,
  onRestoreItem,
  onClose,
}) => {
  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none p-4 border-b border-gray-700/50 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-200">Request History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>No request history yet.</p>
            <p className="text-sm mt-1">Executed requests will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4 border-b border-gray-700/50 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-200">Request History</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="divide-y divide-gray-700/50">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-medium text-gray-200 ${
                        item.request.method === "GET"
                          ? "text-green-400"
                          : item.request.method === "POST"
                            ? "text-blue-400"
                            : item.request.method === "PUT"
                              ? "text-yellow-400"
                              : item.request.method === "DELETE"
                                ? "text-red-400"
                                : "text-purple-400" // For PATCH, HEAD, OPTIONS
                      }`}
                    >
                      {item.request.method}
                    </span>
                    <span
                      className="text-gray-400 truncate max-w-md"
                      title={item.request.url}
                    >
                      {item.request.url}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 mt-1 text-sm">
                    <span className="text-gray-400 flex items-center">
                      <Send size={14} className="mr-1" />
                      Sent: {new Date(item.timestamp).toLocaleTimeString()} (
                      {new Date(item.timestamp).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPinItem(item.id, !item.isPinned)}
                    className={`
                      p-1.5 rounded-md transition-colors
                      ${
                        item.isPinned
                          ? "text-yellow-400 hover:bg-yellow-500/20"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      }
                    `}
                    title={item.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={16} />
                  </button>

                  <button
                    onClick={() => onRestoreItem(item)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded-md transition-colors"
                    title="Restore this request"
                  >
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md transition-colors"
                    title="Delete from history"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
