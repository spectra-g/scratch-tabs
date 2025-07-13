import React from "react";
import { Trash2, Clock, ArrowRight } from "lucide-react";
import { formatTimestamp } from "../utils/jwtUtils";
import { Button } from "./ui/Button";
import { JwtHistoryItem } from "../types";

interface JwtHistoryProps {
  history: JwtHistoryItem[];
  onClearHistory: () => void;
  onLoadItem: (item: JwtHistoryItem) => void;
}

export const JwtHistory: React.FC<JwtHistoryProps> = ({
  history,
  onClearHistory,
  onLoadItem,
}) => {
  if (history.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <p className="text-gray-400 mb-4">No history yet</p>
        <p className="text-sm text-gray-500">
          Tokens you decode or generate will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Token History</h3>
        <Button
          onClick={onClearHistory}
          variant="danger"
          size="sm"
          icon={Trash2}
        >
          Clear History
        </Button>
      </div>

      <div className="space-y-2">
        {history.map((item, index) => (
          <div
            key={index}
            className="bg-gray-800/50 border border-gray-700/50 rounded-md p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-xs text-gray-400 mb-1">
                  <Clock size={12} className="mr-1" />
                  <span>{formatTimestamp(item.timestamp / 1000)}</span>
                </div>
                <p
                  className="text-sm font-mono text-gray-300 truncate"
                  title={item.token}
                >
                  {item.token}
                </p>
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <span className="truncate">
                    {item.header?.alg && `Algorithm: ${item.header.alg}`}
                    {item.payload?.sub && ` • Subject: ${item.payload.sub}`}
                    {item.payload?.iss && ` • Issuer: ${item.payload.iss}`}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => onLoadItem(item)}
                variant="secondary"
                size="sm"
                icon={ArrowRight}
                className="ml-2 flex-shrink-0"
                title="Load token"
              >
                Load
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
