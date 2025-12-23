import React from "react";
import { Trash2, Clock, ArrowRight, History as HistoryIcon } from "lucide-react";
import { Button } from "./ui/Button";
import { CopyButton } from "./ui/CopyButton";
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
      <div className="p-6 h-full flex flex-col items-center justify-center text-muted">
        <HistoryIcon size={48} className="mb-4 opacity-50" />
        <p>No history yet.</p>
        <p className="text-sm mt-2">
          Decoded and generated tokens will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-main">History</h3>
        <Button
          onClick={onClearHistory}
          variant="danger"
          size="sm"
          icon={Trash2}
        >
          Clear History
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <div
            key={item.timestamp}
            className="bg-surface-raised border border-base rounded-md p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {item.header?.alg || "Token"}
                </span>
                <span className="text-xs text-muted flex items-center">
                  <Clock size={12} className="mr-1" />
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={item.token} label="Copy Token" size="sm" />
                <Button
                  onClick={() => onLoadItem(item)}
                  variant="secondary"
                  size="sm"
                  icon={ArrowRight}
                  title="Load token"
                >
                  Load
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-medium text-muted block mb-1">
                  Header
                </span>
                <pre className="font-mono text-xs text-main bg-canvas p-2 rounded border border-base overflow-hidden whitespace-nowrap text-ellipsis">
                  {JSON.stringify(item.header)}
                </pre>
              </div>
              <div>
                <span className="text-xs font-medium text-muted block mb-1">
                  Payload
                </span>
                <pre className="font-mono text-xs text-main bg-canvas p-2 rounded border border-base overflow-hidden whitespace-nowrap text-ellipsis">
                  {JSON.stringify(item.payload)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
