import React, { RefObject, useEffect, useRef, useState } from "react";
import { getImagePointFromClient, ImageViewport } from "../utils/viewport";
import { PixelProbe } from "../hooks/usePixelProbe";

interface ImageStageProps {
  stageRef: RefObject<HTMLDivElement>;
  canvas: HTMLCanvasElement | null;
  viewport: ImageViewport;
  background: "checkerboard" | "dark" | "light" | "transparent";
  selection: DOMRect | null;
  onPanBy: (dx: number, dy: number) => void;
  onWheelZoom: (factor: number, point: { x: number; y: number }) => void;
  onProbe: (probe: PixelProbe | null) => void;
  onSelectionChange: (selection: DOMRect | null) => void;
  onClickImage?: (probe: PixelProbe | null) => void;
  sampleCanvas: (x: number, y: number) => PixelProbe | null;
  onDoubleClick: () => void;
}

function getStageBackground(background: ImageStageProps["background"]): React.CSSProperties {
  if (background === "dark") return { background: "#111827" };
  if (background === "light") return { background: "#F9FAFB" };
  if (background === "transparent") return { background: "transparent" };
  return {
    backgroundColor: "#F3F4F6",
    backgroundImage:
      "linear-gradient(45deg, #D1D5DB 25%, transparent 25%), linear-gradient(-45deg, #D1D5DB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #D1D5DB 75%), linear-gradient(-45deg, transparent 75%, #D1D5DB 75%)",
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  };
}

export const ImageStage: React.FC<ImageStageProps> = ({
  stageRef,
  canvas,
  viewport,
  background,
  selection,
  onPanBy,
  onWheelZoom,
  onProbe,
  onSelectionChange,
  onClickImage,
  sampleCanvas,
  onDoubleClick,
}) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number; mode: "pan" | "select" } | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<DOMRect | null>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !canvas) return undefined;

    host.replaceChildren(canvas);
    canvas.setAttribute("data-testid", "image-rendered-canvas");
    canvas.style.position = "absolute";
    canvas.style.maxWidth = "none";
    canvas.style.userSelect = "none";
    canvas.style.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
    canvas.style.transformOrigin = "top left";

    return () => {
      if (host.contains(canvas)) {
        host.removeChild(canvas);
      }
    };
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    canvas.style.transform = `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`;
    canvas.style.imageRendering = viewport.zoom >= 8 ? "pixelated" : "auto";
  }, [canvas, viewport.offsetX, viewport.offsetY, viewport.zoom]);

  const getImagePoint = (clientX: number, clientY: number, clamp: boolean) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return getImagePointFromClient(
      rect,
      viewport,
      { width: canvas?.width ?? 0, height: canvas?.height ?? 0 },
      clientX,
      clientY,
      { clamp },
    );
  };

  return (
    <div
      ref={stageRef}
      className="relative flex-1 overflow-hidden outline-none"
      style={getStageBackground(background)}
      data-testid="image-stage"
      tabIndex={0}
      onWheel={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        onWheelZoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, point);
      }}
      onDoubleClick={onDoubleClick}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        lastPointRef.current = point;
        hasDraggedRef.current = false;
        setDragStart({ ...point, mode: event.shiftKey ? "select" : "pan" });
        if (event.shiftKey) onSelectionChange(null);
      }}
      onPointerMove={(event) => {
        const imagePoint = getImagePoint(event.clientX, event.clientY, dragStart?.mode === "select");
        onProbe(imagePoint ? sampleCanvas(imagePoint.x, imagePoint.y) : null);

        if (!dragStart) return;
        if (dragStart.mode === "pan") {
          const dx = event.clientX - dragStart.x;
          const dy = event.clientY - dragStart.y;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDraggedRef.current = true;
          const last = lastPointRef.current ?? { x: event.clientX, y: event.clientY };
          onPanBy(event.clientX - last.x, event.clientY - last.y);
          lastPointRef.current = { x: event.clientX, y: event.clientY };
          return;
        }

        const start = getImagePoint(dragStart.x, dragStart.y, true);
        if (!start || !imagePoint) return;
        const next = new DOMRect(
          Math.min(start.x, imagePoint.x),
          Math.min(start.y, imagePoint.y),
          Math.abs(imagePoint.x - start.x),
          Math.abs(imagePoint.y - start.y),
        );
        setSelectionDraft(next);
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (dragStart?.mode === "pan" && !hasDraggedRef.current) {
          const imagePoint = getImagePoint(event.clientX, event.clientY, false);
          onClickImage?.(imagePoint ? sampleCanvas(imagePoint.x, imagePoint.y) : null);
          onSelectionChange(null);
        } else if (dragStart?.mode === "select" && selectionDraft && selectionDraft.width > 0 && selectionDraft.height > 0) {
          onSelectionChange(selectionDraft);
        }
        setDragStart(null);
        setSelectionDraft(null);
        lastPointRef.current = null;
      }}
      onPointerLeave={() => onProbe(null)}
    >
      {canvas ? (
        <div ref={canvasHostRef} data-testid="image-rendered" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">No image rendered</div>
      )}
      {(selectionDraft ?? selection) && (
        <div
          className="pointer-events-none absolute border border-accent bg-accent/20"
          style={{
            left: viewport.offsetX + (selectionDraft ?? selection)!.x * viewport.zoom,
            top: viewport.offsetY + (selectionDraft ?? selection)!.y * viewport.zoom,
            width: (selectionDraft ?? selection)!.width * viewport.zoom,
            height: (selectionDraft ?? selection)!.height * viewport.zoom,
          }}
        />
      )}
    </div>
  );
};
