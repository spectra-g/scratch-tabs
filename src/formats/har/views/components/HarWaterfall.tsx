import React, { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ShieldAlert } from "lucide-react";
import { ProcessedEntry, StatusCategory } from "../types";

// ─── Shared helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

const STATUS_COLOR: Record<StatusCategory, string> = {
  "1xx": "text-blue-500",
  "2xx": "text-green-500",
  "3xx": "text-yellow-500",
  "4xx": "text-orange-500",
  "5xx": "text-red-500",
  unknown: "text-secondary",
};

const METHOD_COLOR: Record<string, string> = {
  GET: "text-blue-400",
  POST: "text-green-400",
  PUT: "text-yellow-400",
  PATCH: "text-yellow-300",
  DELETE: "text-red-400",
  HEAD: "text-purple-400",
  OPTIONS: "text-gray-400",
};

// ─── Waterfall bar ─────────────────────────────────────────────────────────

interface WaterfallBarProps {
  entry: ProcessedEntry;
  totalSpan: number; // total ms across all requests
}

const WaterfallBar: React.FC<WaterfallBarProps> = ({ entry, totalSpan }) => {
  if (totalSpan <= 0) return null;

  const leftPct = (entry.startOffset / totalSpan) * 100;
  const widthPct = Math.max(0.2, (entry.totalTime / totalSpan) * 100);

  let accumulated = 0;

  return (
    <div className="relative w-full h-5" title={`${entry.totalTime.toFixed(1)} ms total`}>
      {/* Track line */}
      <div className="absolute inset-y-[9px] left-0 right-0 bg-element/40 rounded-full" />

      {/* Timing segments */}
      <div
        className="absolute top-1 h-3 flex rounded overflow-hidden"
        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      >
        {entry.timingSegments.map((seg, i) => {
          const segPct = (seg.duration / entry.totalTime) * 100;
          const segOffset = (accumulated / entry.totalTime) * 100;
          accumulated += seg.duration;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 rounded-sm"
              style={{
                left: `${segOffset}%`,
                width: `${segPct}%`,
                backgroundColor: seg.color,
                opacity: 0.85,
              }}
              title={`${seg.label}: ${seg.duration.toFixed(1)} ms`}
            />
          );
        })}
      </div>
    </div>
  );
};

// ─── Time ruler ────────────────────────────────────────────────────────────

interface TimeRulerProps {
  totalSpan: number;
}

const TimeRuler: React.FC<TimeRulerProps> = ({ totalSpan }) => {
  const ticks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => ({
      pct: (i / count) * 100,
      label: formatTime((totalSpan * i) / count),
    }));
  }, [totalSpan]);

  return (
    <div className="relative h-6 border-b border-base bg-surface select-none">
      {ticks.map(({ pct, label }) => (
        <div
          key={pct}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          <div className="flex-1 flex items-end pb-0.5">
            <span className="text-[10px] text-secondary whitespace-nowrap">{label}</span>
          </div>
          <div className="w-px h-2 bg-border-base" />
        </div>
      ))}
    </div>
  );
};

// ─── Row ───────────────────────────────────────────────────────────────────

interface RowProps {
  entry: ProcessedEntry;
  isSelected: boolean;
  isChecked: boolean;
  totalSpan: number;
  onClick: () => void;
  onToggleChecked: () => void;
}

const ROW_HEIGHT = 32;

const WaterfallRow: React.FC<RowProps> = ({
  entry,
  isSelected,
  isChecked,
  totalSpan,
  onClick,
  onToggleChecked,
}) => {
  const methodColor = METHOD_COLOR[entry.method] ?? "text-secondary";
  const statusColor = STATUS_COLOR[entry.statusCategory];

  return (
    <div
      className={`flex items-stretch cursor-pointer border-b border-base transition-colors ${
        isSelected ? "bg-primary/10" : "hover:bg-element-hover"
      }`}
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
      data-testid="har-waterfall-row"
    >
      <div className="flex w-10 flex-shrink-0 items-center justify-center" style={{ minWidth: 40 }}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggleChecked}
          onClick={(event) => event.stopPropagation()}
          className="rounded border-base bg-element"
          aria-label={`Select HAR request ${entry.index + 1}`}
        />
      </div>

      {/* Method */}
      <div className="flex items-center w-14 flex-shrink-0 px-2 font-mono text-xs font-bold" style={{ minWidth: 56 }}>
        <span className={methodColor}>{entry.method}</span>
      </div>

      {/* Status */}
      <div className="flex items-center w-12 flex-shrink-0 px-1 font-mono text-xs" style={{ minWidth: 48 }}>
        <span className={statusColor}>{entry.status || "—"}</span>
      </div>

      {/* URL */}
      <div className="flex items-center flex-1 min-w-0 px-2">
        <span className="text-xs text-secondary truncate">{entry.hostname}</span>
        <span className="text-xs text-main truncate ml-0.5">{entry.pathname}</span>
        {entry.hasSensitiveData && (
          <ShieldAlert size={10} className="ml-1 flex-shrink-0 text-yellow-500" title="Contains sensitive data" />
        )}
      </div>

      {/* Type */}
      <div className="flex items-center w-20 flex-shrink-0 px-2 text-xs text-secondary" style={{ minWidth: 80 }}>
        <span className="truncate">{entry.resourceType}</span>
      </div>

      {/* Size */}
      <div className="flex items-center w-20 flex-shrink-0 px-2 text-xs text-secondary text-right" style={{ minWidth: 80 }}>
        <span className="w-full text-right">{formatBytes(entry.transferSize)}</span>
      </div>

      {/* Time */}
      <div className="flex items-center w-20 flex-shrink-0 px-2 text-xs text-secondary text-right" style={{ minWidth: 80 }}>
        <span className="w-full text-right">{formatTime(entry.totalTime)}</span>
      </div>

      {/* Waterfall */}
      <div className="flex items-center flex-1 min-w-0 px-2" style={{ minWidth: 160 }}>
        <WaterfallBar entry={entry} totalSpan={totalSpan} />
      </div>
    </div>
  );
};

// ─── Column header ─────────────────────────────────────────────────────────

const ColumnHeader: React.FC<{
  allVisibleSelected: boolean;
  onToggleAllVisible: () => void;
}> = ({ allVisibleSelected, onToggleAllVisible }) => (
  <div className="flex items-stretch border-b border-base bg-surface sticky top-0 z-10 text-xs font-medium text-secondary select-none">
    <div className="flex w-10 flex-shrink-0 items-center justify-center py-1.5" style={{ minWidth: 40 }}>
      <input
        type="checkbox"
        checked={allVisibleSelected}
        onChange={onToggleAllVisible}
        className="rounded border-base bg-element"
        aria-label="Select all visible HAR requests"
      />
    </div>
    <div className="flex items-center w-14 flex-shrink-0 px-2 py-1.5" style={{ minWidth: 56 }}>Method</div>
    <div className="flex items-center w-12 flex-shrink-0 px-1 py-1.5" style={{ minWidth: 48 }}>Status</div>
    <div className="flex items-center flex-1 min-w-0 px-2 py-1.5">URL</div>
    <div className="flex items-center w-20 flex-shrink-0 px-2 py-1.5" style={{ minWidth: 80 }}>Type</div>
    <div className="flex items-center w-20 flex-shrink-0 px-2 py-1.5 text-right" style={{ minWidth: 80 }}>Size</div>
    <div className="flex items-center w-20 flex-shrink-0 px-2 py-1.5 text-right" style={{ minWidth: 80 }}>Time</div>
    <div className="flex items-center flex-1 min-w-0 px-2 py-1.5" style={{ minWidth: 160 }}>Waterfall</div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────

interface HarWaterfallProps {
  entries: ProcessedEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: ProcessedEntry | null) => void;
  selectedEntryIndexes: Set<number>;
  onToggleEntrySelection: (index: number) => void;
  onToggleAllVisible: () => void;
  allVisibleSelected: boolean;
}

export const HarWaterfall: React.FC<HarWaterfallProps> = ({
  entries,
  selectedId,
  onSelectEntry,
  selectedEntryIndexes,
  onToggleEntrySelection,
  onToggleAllVisible,
  allVisibleSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSpan = useMemo(() => {
    if (entries.length === 0) return 1;
    let max = 0;
    for (const e of entries) {
      const end = e.startOffset + e.totalTime;
      if (end > max) max = end;
    }
    return max || 1;
  }, [entries]);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleRowClick = useCallback(
    (entry: ProcessedEntry) => {
      onSelectEntry(selectedId === entry.id ? null : entry);
    },
    [selectedId, onSelectEntry],
  );

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary text-sm">
        No requests match the current filter.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ColumnHeader
        allVisibleSelected={allVisibleSelected}
        onToggleAllVisible={onToggleAllVisible}
      />
      <TimeRuler totalSpan={totalSpan} />

      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const entry = entries[vRow.index];
            return (
              <div
                key={vRow.key}
                style={{
                  position: "absolute",
                  top: vRow.start,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                }}
              >
                <WaterfallRow
                  entry={entry}
                  isSelected={entry.id === selectedId}
                  isChecked={selectedEntryIndexes.has(entry.index)}
                  totalSpan={totalSpan}
                  onClick={() => handleRowClick(entry)}
                  onToggleChecked={() => onToggleEntrySelection(entry.index)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
