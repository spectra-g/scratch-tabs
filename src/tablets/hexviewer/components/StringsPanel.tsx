import React, { useMemo, useState } from "react";
import { extractStrings } from "../utils/stringExtraction";

interface StringsPanelProps {
  bytes: Uint8Array;
  onJumpToOffset: (offset: number) => void;
}

export const StringsPanel: React.FC<StringsPanelProps> = ({ bytes, onJumpToOffset }) => {
  const [minLength, setMinLength] = useState(4);
  const [filter, setFilter] = useState("");

  const strings = useMemo(() => extractStrings(bytes, minLength), [bytes, minLength]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return strings;
    const q = filter.toLowerCase();
    return strings.filter((s) => s.value.toLowerCase().includes(q));
  }, [strings, filter]);

  if (bytes.length === 0) {
    return (
      <div className="text-center text-secondary text-xs py-6">
        Load data to extract printable ASCII strings.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-secondary">
          <span>Min len:</span>
          <select
            value={minLength}
            onChange={(e) => setMinLength(parseInt(e.target.value))}
            className="px-1 py-0.5 text-[10px] bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main"
          >
            {[3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter strings..."
          className="flex-1 px-2 py-0.5 text-[10px] bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main placeholder-muted"
        />
      </div>

      <div className="text-[10px] text-secondary flex-shrink-0">
        {filtered.length} string{filtered.length !== 1 ? "s" : ""} found
        {filter && ` (filtered from ${strings.length})`}
      </div>

      {/* Strings list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 min-h-0">
        {filtered.map((s, i) => (
          <div
            key={i}
            onClick={() => onJumpToOffset(s.offset)}
            className="flex items-baseline gap-2 py-1 px-1.5 rounded hover:bg-element-hover/40 cursor-pointer transition-colors group"
            title={`Click to jump to offset 0x${s.offset.toString(16).toUpperCase()}`}
          >
            <span className="font-mono text-[9px] text-muted flex-shrink-0 group-hover:text-primary transition-colors">
              0x{s.offset.toString(16).toUpperCase().padStart(8, "0")}
            </span>
            <span className="font-mono text-[10px] text-main truncate">{s.value}</span>
            <span className="text-[9px] text-muted flex-shrink-0 ml-auto">{s.length}b</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-secondary text-[10px] py-4">
            No strings match the current criteria.
          </div>
        )}
      </div>
    </div>
  );
};
