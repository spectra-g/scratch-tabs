import React from "react";
import { Clock, Trash2, ArrowRightLeft } from "lucide-react";
import { Snapshot } from "../types";

interface SnapshotCardProps {
  snapshot: Snapshot;
  isActive: boolean;
  isCompare: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleCompare: () => void;
  disableCompare?: boolean;
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({
  snapshot,
  isActive,
  isCompare,
  onSelect,
  onDelete,
  onToggleCompare,
  disableCompare = false,
}) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        isActive
          ? "bg-blue-500/20 border-blue-500/30"
          : isCompare
            ? "bg-purple-500/20 border-purple-500/30"
            : "border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="font-medium text-sm truncate cursor-pointer"
          onClick={onSelect}
        >
          {snapshot.name}
        </div>

        {!isActive && !isCompare && (
          <button
            onClick={onDelete}
            className="p-1 text-gray-500 hover:text-red-400 rounded"
            title="Delete snapshot"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Clock size={12} className="mr-1" />
        {formatTimestamp(snapshot.createdAt)}
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {snapshot.metrics.length} metrics
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSelect}
          className={`px-2 py-1 text-xs rounded ${
            isActive
              ? "bg-blue-500/30 text-blue-300"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {isActive ? "Active" : "Select"}
        </button>

        {!disableCompare && !isActive && (
          <button
            onClick={onToggleCompare}
            className={`px-2 py-1 text-xs rounded flex items-center ${
              isCompare
                ? "bg-purple-500/30 text-purple-300"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <ArrowRightLeft size={12} className="mr-1" />
            {isCompare ? "Comparing" : "Compare"}
          </button>
        )}
      </div>
    </div>
  );
};
