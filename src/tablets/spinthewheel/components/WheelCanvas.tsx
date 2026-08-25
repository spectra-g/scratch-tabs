import React, { useEffect, useRef } from "react";
import type { WheelEntry } from "../types";
import { colorForIndex } from "../utils/palette";
import { drawWheel } from "../utils/wheelRenderer";

interface WheelCanvasProps {
  entries: WheelEntry[];
  rotationDeg?: number;
  /** Clicking the wheel triggers a spin. */
  onSpin?: () => void;
  spinning?: boolean;
  /** Optional external ref to the rendered canvas (e.g. for image export). */
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}

/** Canvas-drawn wheel with top pointer, HiDPI-aware, sized to its container. */
export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  entries,
  rotationDeg = 0,
  onSpin,
  spinning = false,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const setCanvasRef = React.useCallback(
    (node: HTMLCanvasElement | null) => {
      (internalCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
      if (canvasRef) canvasRef.current = node;
    },
    [canvasRef],
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = internalCanvasRef.current;
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
      <div
        className={`relative select-none ${onSpin && !spinning ? "cursor-pointer" : "cursor-default"}`}
        onClick={spinning ? undefined : onSpin}
        role={onSpin ? "button" : undefined}
        aria-label={onSpin ? "Spin the wheel" : undefined}
      >
        <canvas
          ref={setCanvasRef}
          role="img"
          aria-label={`Prize wheel with ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        />
        <svg
          viewBox="0 0 24 24"
          className="absolute left-1/2 -translate-x-1/2 -top-1 w-6 h-6 drop-shadow"
          aria-hidden="true"
        >
          <polygon points="4,2 20,2 12,16" className="fill-main" />
          <circle cx="12" cy="5" r="3.5" className="fill-surface stroke-base" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};
