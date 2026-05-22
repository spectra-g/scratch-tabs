import React, { useMemo } from "react";

interface ByteHistogramProps {
  bytes: Uint8Array;
}

export const ByteHistogram: React.FC<ByteHistogramProps> = ({ bytes }) => {
  const { counts, maxCount } = useMemo(() => {
    const counts = new Uint32Array(256);
    for (let i = 0; i < bytes.length; i++) {
      counts[bytes[i]]++;
    }
    let maxCount = 0;
    for (let i = 0; i < 256; i++) {
      if (counts[i] > maxCount) maxCount = counts[i];
    }
    return { counts, maxCount };
  }, [bytes]);

  if (bytes.length === 0) {
    return (
      <div className="text-center text-secondary text-xs py-6">
        Load data to see the byte frequency histogram.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-secondary leading-normal">
        256-bucket frequency histogram — each bar is a byte value 0x00–0xFF. Height normalised to the most frequent byte.
      </p>
      <div className="flex items-end gap-[1px] h-24 bg-canvas border border-base rounded p-1 overflow-x-auto custom-scrollbar">
        {Array.from({ length: 256 }, (_, i) => {
          const count = counts[i];
          const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

          // Colour-code by category for visual distinction
          let barClass = "bg-info/60 hover:bg-info";
          if (i === 0) barClass = "bg-muted/40 hover:bg-muted";
          else if (i >= 32 && i <= 126) barClass = "bg-success/70 hover:bg-success";
          else if (i < 32 || i === 127) barClass = "bg-warning/70 hover:bg-warning";

          return (
            <div
              key={i}
              title={`0x${i.toString(16).toUpperCase().padStart(2, "0")} (${i}): ${count.toLocaleString()} occurrences (${bytes.length > 0 ? ((count / bytes.length) * 100).toFixed(2) : "0.00"}%)`}
              className={`flex-shrink-0 w-[2px] rounded-t transition-colors cursor-crosshair ${barClass}`}
              style={{ height: `${heightPct}%`, minHeight: count > 0 ? "1px" : "0" }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-secondary flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-muted/40 border border-base" />Null (0x00)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning/70" />Control (&lt;0x20, 0x7F)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success/70" />Printable ASCII</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-info/60" />Extended (≥0x80)</span>
      </div>
    </div>
  );
};
