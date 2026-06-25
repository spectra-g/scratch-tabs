import React from "react";
import { ImageHistogram as HistogramData } from "../utils/histogram";

interface ImageHistogramProps {
  histogram: HistogramData | null;
}

function HistogramBars({ values, max, className }: { values: number[]; max: number; className: string }) {
  return (
    <div className="flex h-10 items-end gap-px overflow-hidden rounded bg-canvas px-1 py-1">
      {values.filter((_, index) => index % 4 === 0).map((value, index) => (
        <div
          key={index}
          className={`w-1 min-w-[2px] ${className}`}
          style={{ height: `${max > 0 ? Math.max(2, (value / max) * 100) : 2}%` }}
        />
      ))}
    </div>
  );
}

export const ImageHistogram: React.FC<ImageHistogramProps> = ({ histogram }) => {
  if (!histogram) {
    return <div className="text-xs text-muted">Histogram unavailable.</div>;
  }

  return (
    <div className="space-y-2" data-testid="image-histogram">
      <HistogramBars values={histogram.red} max={histogram.max} className="bg-red-500" />
      <HistogramBars values={histogram.green} max={histogram.max} className="bg-green-500" />
      <HistogramBars values={histogram.blue} max={histogram.max} className="bg-blue-500" />
      <HistogramBars values={histogram.luminance} max={histogram.max} className="bg-secondary" />
    </div>
  );
};
