import * as React from "react";
import { X, History, Clock, Trash2 } from "../../../components/Icons";
import { CsvSnapshot } from "../types";

interface CsvSnapshotsPanelProps {
  snapshots: CsvSnapshot[];
  onRestore: (snapshotId: string) => void;
  onDelete: (snapshotId: string) => void;
  onClose: () => void;
}

export const CsvSnapshotsPanel: React.FC<CsvSnapshotsPanelProps> = ({
  snapshots,
  onRestore,
  onDelete,
  onClose,
}) => {
  return (
    <div className="flex-none border-b border-gray-700 bg-gray-800/50 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <History size={16} />
          Snapshots ({snapshots.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400"
          title="Close snapshots panel"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid gap-2 max-h-32 overflow-y-auto custom-scrollbar">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2 hover:bg-gray-700/70 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-200 truncate">
                  {snapshot.name}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(snapshot.timestamp).toLocaleString()} •{" "}
                  {snapshot.data.length} rows × {snapshot.columns.length}{" "}
                  columns
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onRestore(snapshot.id)}
                className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                title="Restore this snapshot"
              >
                Restore
              </button>
              <button
                onClick={() => onDelete(snapshot.id)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                title="Delete snapshot"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
