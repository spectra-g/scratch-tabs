import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { HistoryItem } from "../types";
import { formatFileSize } from "../utils/base64Utils";

interface Base64HistoryProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onRestoreItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export const Base64History: React.FC<Base64HistoryProps> = ({
  history,
  onClearHistory,
  onRestoreItem,
  onDeleteItem,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const filteredHistory = searchQuery
    ? history.filter(
        (item) =>
          item.input.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.output.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : history;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-t border-gray-700/50 bg-gray-800/50 overflow-hidden"
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            History ({history.length})
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClearHistory}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Clear all history"
              disabled={history.length === 0}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md pl-9 pr-9 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <Search
              size={14}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* History List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {filteredHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              {history.length === 0 ? "No history yet" : "No results found"}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-gray-700/30 rounded-lg p-2 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {item.action === "encode" ? (
                      <ArrowUpRight size={14} className="text-green-400" />
                    ) : (
                      <ArrowDownRight size={14} className="text-blue-400" />
                    )}
                    <span className="text-xs text-gray-300 capitalize">
                      {item.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopy(item.output, item.id)}
                      className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                      title="Copy output"
                    >
                      {copiedItemId === item.id ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => onRestoreItem(item)}
                      className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                      title="Restore this item"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete this item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-xs bg-gray-800/50 rounded p-1.5 overflow-hidden">
                    <div className="text-gray-400 mb-1 flex justify-between">
                      <span>
                        Input ({formatFileSize(new Blob([item.input]).size)})
                      </span>
                      <span className="text-gray-500">{item.encoding}</span>
                    </div>
                    <div className="font-mono text-gray-300 truncate">
                      {item.input.length > 50
                        ? `${item.input.substring(0, 50)}...`
                        : item.input}
                    </div>
                  </div>
                  <div className="text-xs bg-gray-800/50 rounded p-1.5 overflow-hidden">
                    <div className="text-gray-400 mb-1 flex justify-between">
                      <span>
                        Output ({formatFileSize(new Blob([item.output]).size)})
                      </span>
                      <span className="text-gray-500">{item.format}</span>
                    </div>
                    <div className="font-mono text-gray-300 truncate">
                      {item.output.length > 50
                        ? `${item.output.substring(0, 50)}...`
                        : item.output}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
