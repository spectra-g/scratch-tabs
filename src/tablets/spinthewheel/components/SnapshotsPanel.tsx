import React, { useCallback, useState } from "react";
import { Camera, RotateCw, Trash2 } from "lucide-react";
import type { WheelSnapshot } from "../types";

interface SnapshotsPanelProps {
  snapshots: WheelSnapshot[];
  entryCount: number;
  onSave: (name: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Named snapshots of the full entries list — lets users keep several wheels
 * (classrooms, teams, prizes) and swap between them.
 */
export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({
  snapshots,
  entryCount,
  onSave,
  onRestore,
  onDelete,
}) => {
  const [name, setName] = useState("");

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || entryCount === 0) return;
    onSave(trimmed);
    setName("");
  }, [name, entryCount, onSave]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 flex gap-2 px-3 py-2 border-b border-base/30">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder={`Name this wheel (${entryCount} entries)`}
          aria-label="Snapshot name"
          className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-canvas border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || entryCount === 0}
          aria-label="Save current entries"
          title="Save current entries"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none text-primary-contrast rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Camera size={14} />
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {snapshots.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            No snapshots yet — save the current entries to reuse this wheel later.
          </p>
        ) : (
          <ul className="divide-y divide-base/20">
            {snapshots.map((snapshot) => (
              <li key={snapshot.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-main truncate" title={snapshot.name}>
                    {snapshot.name}
                  </p>
                  <p className="text-xs text-muted/70">
                    {snapshot.entries.length} {snapshot.entries.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onRestore(snapshot.id)}
                    aria-label={`Restore "${snapshot.name}"`}
                    title="Restore"
                    className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(snapshot.id)}
                    aria-label={`Delete "${snapshot.name}"`}
                    title="Delete"
                    className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
