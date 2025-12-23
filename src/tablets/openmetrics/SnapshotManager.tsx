import React, { useState, useMemo } from "react";
import {
  Camera,
  Trash2,
  Clock,
  ArrowRightLeft,
  Plus,
  CheckCircle,
} from "lucide-react";
import { Snapshot, MetricSample } from "./types";
import { diffSnapshots } from "./DiffEngine";

interface SnapshotManagerProps {
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  compareSnapshotId: string | null;
  onTakeSnapshot: (name: string) => void;
  onSelectSnapshot: (snapshotId: string) => void;
  onSelectCompareSnapshot: (snapshotId: string | null) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({
  snapshots,
  activeSnapshotId,
  compareSnapshotId,
  onTakeSnapshot,
  onSelectSnapshot,
  onSelectCompareSnapshot,
  onDeleteSnapshot,
}) => {
  const [newSnapshotName, setNewSnapshotName] = useState("");
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Generate next snapshot name
  const getNextSnapshotName = () => {
    const existingNumbers = snapshots
      .map(s => s.name.match(/^Snapshot (\d+)$/))
      .filter(match => match)
      .map(match => parseInt(match![1], 10));
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `Snapshot ${nextNumber}`;
  };

  const activeSnapshot = useMemo(
    () => snapshots.find((s) => s.id === activeSnapshotId),
    [snapshots, activeSnapshotId],
  );

  const compareSnapshot = useMemo(
    () => snapshots.find((s) => s.id === compareSnapshotId),
    [snapshots, compareSnapshotId],
  );

  const diffResult = useMemo(() => {
    if (!activeSnapshot || !compareSnapshot) return null;
    return diffSnapshots(compareSnapshot, activeSnapshot);
  }, [activeSnapshot, compareSnapshot]);

  const handleCreateSnapshot = () => {
    if (newSnapshotName.trim()) {
      onTakeSnapshot(newSnapshotName.trim());
      setNewSnapshotName("");
      setIsCreatingSnapshot(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderDiffSummary = () => {
    if (!diffResult) return null;

    return (
      <div className="mb-4 p-3 bg-surface-raised rounded-lg">
        <h3 className="text-sm font-medium text-secondary mb-2 flex items-center">
          <ArrowRightLeft size={16} className="mr-2" />
          Diff Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-900/20 p-2 rounded">
            <div className="text-green-400 text-lg font-semibold">
              {diffResult.added.length}
            </div>
            <div className="text-xs text-muted">Added</div>
          </div>
          <div className="bg-yellow-900/20 p-2 rounded">
            <div className="text-yellow-400 text-lg font-semibold">
              {diffResult.changed.length}
            </div>
            <div className="text-xs text-muted">Changed</div>
          </div>
          <div className="bg-red-900/20 p-2 rounded">
            <div className="text-red-400 text-lg font-semibold">
              {diffResult.removed.length}
            </div>
            <div className="text-xs text-muted">Removed</div>
          </div>
        </div>
      </div>
    );
  };

  const renderDiffDetails = () => {
    if (!diffResult) return null;

    return (
      <div className="space-y-4">
        {diffResult.added.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-400">
              Added Metrics
            </h4>
            <div className="space-y-1">
              {diffResult.added.map((metric, index) => (
                <div
                  key={`added-${index}`}
                  className="p-2 bg-green-900/10 border border-green-900/20 rounded text-xs font-mono"
                >
                  {formatMetricLine(metric)}
                </div>
              ))}
            </div>
          </div>
        )}

        {diffResult.changed.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-400">
              Changed Metrics
            </h4>
            <div className="space-y-1">
              {diffResult.changed.map((change, index) => (
                <div
                  key={`changed-${index}`}
                  className="p-2 bg-yellow-900/10 border border-yellow-900/20 rounded text-xs"
                >
                  <div className="font-mono">{formatMetricLine(change.to)}</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-muted mr-2">From:</span>
                    <span className="text-yellow-400">{change.from.value}</span>
                    <span className="text-muted mx-2">To:</span>
                    <span className="text-yellow-400">{change.to.value}</span>
                    <span className="text-muted mx-2">Diff:</span>
                    <span
                      className={`${change.to.value > change.from.value ? "text-green-400" : "text-red-400"}`}
                    >
                      {(change.to.value - change.from.value).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {diffResult.removed.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-400">
              Removed Metrics
            </h4>
            <div className="space-y-1">
              {diffResult.removed.map((metric, index) => (
                <div
                  key={`removed-${index}`}
                  className="p-2 bg-red-900/10 border border-red-900/20 rounded text-xs font-mono"
                >
                  {formatMetricLine(metric)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const formatMetricLine = (metric: MetricSample) => {
    const labels = Object.entries(metric.labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(", ");

    return (
      <div>
        <span className="text-primary">{metric.name}</span>
        {labels && <span className="text-muted">{`{${labels}}`}</span>}
        <span className="text-green-400 ml-2">{metric.value}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Snapshots List */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-base p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-secondary">Snapshots</h3>
          <button
            onClick={() => {
              setIsCreatingSnapshot(true);
              setNewSnapshotName(getNextSnapshotName());
            }}
            className="p-1 rounded hover:bg-surface-secondary text-muted hover:text-main"
            title="Take new snapshot"
          >
            <Plus size={16} />
          </button>
        </div>

        {isCreatingSnapshot ? (
          <div className="mb-4 p-2 bg-surface-raised rounded">
            <input
              type="text"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              placeholder="Snapshot name..."
              className="w-full bg-surface-secondary border border-base rounded px-2 py-1 text-sm text-main mb-2"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingSnapshot(false)}
                className="px-2 py-1 text-xs text-muted hover:text-main"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnapshot}
                disabled={!newSnapshotName.trim()}
                className="px-2 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsCreatingSnapshot(true);
              setNewSnapshotName(getNextSnapshotName());
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-primary/20 text-primary rounded hover:bg-primary/30 mb-4"
          >
            <Camera size={16} />
            <span>Take Snapshot</span>
          </button>
        )}

        <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-200px)]">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`p-2 rounded cursor-pointer ${
                snapshot.id === activeSnapshotId
                  ? "bg-primary/20 border border-primary/30"
                  : "hover:bg-surface-raised border border-transparent"
              }`}
              onClick={() => onSelectSnapshot(snapshot.id)}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate">
                  {snapshot.name}
                </div>
                <div className="flex items-center">
                  {snapshot.id !== activeSnapshotId &&
                    snapshot.id !== compareSnapshotId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSnapshot(snapshot.id);
                        }}
                        className="p-1 text-muted hover:text-red-400 rounded"
                        title="Delete snapshot"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                </div>
              </div>
              <div className="flex items-center text-xs text-muted mt-1">
                <Clock size={12} className="mr-1" />
                {formatTimestamp(snapshot.createdAt)}
              </div>
              <div className="text-xs text-muted mt-1">
                {snapshot.metrics.length} metrics
              </div>

              {/* Compare checkbox */}
              {snapshot.id !== activeSnapshotId && (
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id={`compare-${snapshot.id}`}
                    checked={snapshot.id === compareSnapshotId}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectCompareSnapshot(snapshot.id);
                      } else if (snapshot.id === compareSnapshotId) {
                        onSelectCompareSnapshot(null);
                      }
                    }}
                    className="mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={`compare-${snapshot.id}`}
                    className="text-xs text-muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Compare with active
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Diff View */}
      <div className="flex-1 p-4 overflow-auto custom-scrollbar">
        {!activeSnapshot ? (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Camera size={48} className="mb-4 opacity-50" />
            <p>Select a snapshot to view details</p>
          </div>
        ) : !compareSnapshot ? (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <ArrowRightLeft size={48} className="mb-4 opacity-50" />
            <p>Select another snapshot to compare</p>
            <p className="text-sm mt-2">
              Check the "Compare with active" box on another snapshot
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-main">
                  Comparing Snapshots
                </h3>
                <div className="text-sm text-muted mt-1">
                  From "{compareSnapshot.name}" to "{activeSnapshot.name}"
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center">
                  <Clock size={14} className="mr-1 text-muted" />
                  <span className="text-muted">
                    {formatTimestamp(compareSnapshot.createdAt)}
                  </span>
                </div>
                <ArrowRightLeft size={14} className="text-muted" />
                <div className="flex items-center">
                  <Clock size={14} className="mr-1 text-muted" />
                  <span className="text-muted">
                    {formatTimestamp(activeSnapshot.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {renderDiffSummary()}

            {diffResult &&
            diffResult.added.length === 0 &&
            diffResult.changed.length === 0 &&
            diffResult.removed.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted bg-surface-raised/50 rounded-lg">
                <CheckCircle size={20} className="mr-2 text-green-400" />
                <span>No differences found between snapshots</span>
              </div>
            ) : (
              renderDiffDetails()
            )}
          </div>
        )}
      </div>
    </div>
  );
};
