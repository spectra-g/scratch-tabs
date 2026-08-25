import React, { useEffect, useRef } from "react";
import type { WheelEntry } from "../types";
import { colorForIndex } from "../utils/palette";
import { drawWheel } from "../utils/wheelRenderer";

interface WheelCanvasProps {
  entries: WheelEntry[];
  rotationDeg?: number;
}

/** Canvas-drawn wheel, HiDPI-aware, sized to fill its container. */
export const WheelCanvas: React.FC<WheelCanvasProps> = ({ entries, rotationDeg = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const render = () => {
      const cssSize = Math.floor(
        Math.min(container.clientWidth, container.clientHeight),
      );
      if (cssSize <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssSize * dpr;
      canvas.height = cssSize * dpr;
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, {
        size: cssSize,
        rotationDeg,
        slices: entries.map((entry, index) => ({
          label: entry.label,
          color: colorForIndex(index, entry.color),
        })),
      });
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [entries, rotationDeg]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center min-h-0"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Prize wheel with ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
      />
    </div>
  );
};
