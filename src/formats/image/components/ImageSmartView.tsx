import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTabsStore } from "../../../stores/tabsStore";
import { tabletActionService } from "../../../services/tabletActionService";
import { SmartViewProps } from "../../../views/registry";
import { useImageDecode } from "../hooks/useImageDecode";
import { renderImageToCanvas, useImageEdits } from "../hooks/useImageEdits";
import { useImageViewport } from "../hooks/useImageViewport";
import { PixelProbe, useCanvasSampler } from "../hooks/usePixelProbe";
import { getExportOption, ImageExportFormat, makeImageFileName } from "../utils/canvasExport";
import { imageMimeTypeToExtension } from "../utils/dataUri";
import { ImageToolbar } from "./ImageToolbar";
import { ImageStage } from "./ImageStage";
import { ImageInspector } from "./ImageInspector";
import { useCanvasFeatureEnabled } from "../../../features/canvas/hooks/useCanvasFeatureEnabled";
import { SendToCanvasDialog } from "../../../features/canvas/components/SendToCanvasDialog";
import type { CanvasSendSource } from "../../../features/canvas/utils/canvasSendSource";

type PreviewBackground = "checkerboard" | "dark" | "light" | "transparent";

function downloadDataUri(dataUri: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUri;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const ImageSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  side,
}) => {
  const tab = useTabsStore((state) => state.tabs.find((item) => item.id === tabId));
  const title = tab?.title ?? "Image";
  const stageRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const { parsed, image, width, height, isLoading, error } = useImageDecode(content);
  const { edits, canUndo, canRedo, isModified, dispatch, rendered, dimensions, exportDataUri } = useImageEdits(image);
  const { viewport, fit, fill, actualSize, reset, zoomBy, panBy } = useImageViewport(stageRef, dimensions);
  const [background, setBackground] = useState<PreviewBackground>("checkerboard");
  const [probe, setProbe] = useState<PixelProbe | null>(null);
  const [pinnedProbe, setPinnedProbe] = useState<PixelProbe | null>(null);
  const [selection, setSelection] = useState<DOMRect | null>(null);
  const [showEdited, setShowEdited] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [canvasSendSource, setCanvasSendSource] =
    useState<CanvasSendSource | null>(null);
  const canvasEnabled = useCanvasFeatureEnabled();

  const renderedRef = useRef(rendered);
  const isModifiedRef = useRef(isModified);
  const onContentChangeRef = useRef(onContentChange);
  renderedRef.current = rendered;
  isModifiedRef.current = isModified;
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    return () => {
      if (isModifiedRef.current && renderedRef.current.dataUri) {
        onContentChangeRef.current(renderedRef.current.dataUri);
      }
    };
  }, []);

  const sourceTitle = useMemo(() => title.replace(/^.*:\s*/, ""), [title]);
  const originalCanvas = useMemo(() => image ? renderImageToCanvas(image, []) : null, [image]);
  const activeCanvas = showEdited ? rendered.canvas : originalCanvas;
  const sampler = useCanvasSampler(activeCanvas);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
  }, []);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 1800);
  }, []);

  const copyText = useCallback((value: string) => {
    navigator.clipboard?.writeText(value).catch(() => undefined);
  }, []);

  const handleCopyImage = useCallback(() => {
    if (!activeCanvas) return;
    activeCanvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showNotice("Copied");
      } catch {
        showNotice("Copy failed");
      }
    }, "image/png");
  }, [activeCanvas, showNotice]);

  const sendToPalette = useCallback((payload: Record<string, unknown>, titleHint = `${sourceTitle} Palette`) => {
    tabletActionService.handleAction({
      targetTablet: "colourpalette",
      action: "new-tab",
      payload: {
        sourceImageUrl: content.trim(),
        sourceTitle,
        openPanel: "image",
        ...payload,
      },
      source: {
        tabId,
        titleHint,
        side,
        openInBackground: true,
      },
    });
    showNotice("Sent to Colour Palette");
  }, [content, showNotice, side, sourceTitle, tabId]);

  const handleExport = useCallback((format: ImageExportFormat) => {
    const option = getExportOption(format);
    const dataUri = exportDataUri(option.mimeType, option.supportsQuality ? 0.92 : undefined);
    if (!dataUri) return;
    downloadDataUri(dataUri, makeImageFileName(sourceTitle, option.extension));
  }, [exportDataUri, sourceTitle]);

  const handleClickImage = useCallback((clicked: PixelProbe | null) => {
    setPinnedProbe(clicked);
    setSelection(null);
  }, []);

  const statusProbe = probe ? `${probe.x}, ${probe.y} ${probe.hex}` : "No pixel";

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-main" data-testid="image-smart-view">
      <ImageToolbar
        title={title}
        zoom={viewport.zoom}
        canUndo={canUndo}
        canRedo={canRedo}
        isModified={isModified}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onFit={fit}
        onFill={fill}
        onActualSize={actualSize}
        onRotateCw={() => dispatch({ type: "apply", edit: { type: "rotate", degrees: 90 } })}
        onRotateCcw={() => dispatch({ type: "apply", edit: { type: "rotate", degrees: 270 } })}
        onFlipHorizontal={() => dispatch({ type: "apply", edit: { type: "flip", axis: "horizontal" } })}
        onFlipVertical={() => dispatch({ type: "apply", edit: { type: "flip", axis: "vertical" } })}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        onResetEdits={() => dispatch({ type: "reset" })}
        onExport={handleExport}
        onCopyImage={handleCopyImage}
        onDownloadOriginal={() => parsed && downloadDataUri(content.trim(), makeImageFileName(sourceTitle, imageMimeTypeToExtension(parsed.mimeType)))}
        onOpenPalette={() => sendToPalette({ initialColors: rendered.palette })}
        onSendPalette={() => sendToPalette({ initialColors: rendered.palette })}
        onSendCanvas={
          canvasEnabled
            ? () =>
                setCanvasSendSource({
                  kind: "image-data-uri",
                  dataUri:
                    showEdited && rendered.dataUri
                      ? rendered.dataUri
                      : content.trim(),
                  fileName: makeImageFileName(sourceTitle, "png"),
                })
            : undefined
        }
        onBackgroundChange={setBackground}
      />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-base bg-surface px-3 py-2 text-xs">
            <button
              className="rounded border border-base px-2 py-1"
              onClick={() => setShowEdited((value) => !value)}
              disabled={!isModified}
            >
              {showEdited ? "Edited" : "Original"}
            </button>
            <button
              className="rounded border border-base px-2 py-1"
              disabled={!selection}
              title="Shift+drag on the image to create a selection"
              onClick={() => {
                if (!selection) return;
                dispatch({
                  type: "apply",
                  edit: {
                    type: "crop",
                    x: Math.round(selection.x),
                    y: Math.round(selection.y),
                    width: Math.max(1, Math.round(selection.width)),
                    height: Math.max(1, Math.round(selection.height)),
                  },
                });
                setSelection(null);
              }}
            >
              Crop Selection
            </button>
            <button className="rounded border border-base px-2 py-1" onClick={() => dispatch({ type: "apply", edit: { type: "filter", name: "grayscale" } })}>Grayscale</button>
            <button className="rounded border border-base px-2 py-1" onClick={() => dispatch({ type: "apply", edit: { type: "filter", name: "invert" } })}>Invert</button>
            <button className="rounded border border-base px-2 py-1" onClick={() => dispatch({ type: "apply", edit: { type: "filter", name: "sepia" } })}>Sepia</button>
            {notice ? <span className="ml-auto text-accent">{notice}</span> : <span className="ml-auto text-muted">Shift+drag to select · click to pin pixel</span>}
          </div>
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted">{error}</div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted">Decoding image...</div>
          ) : (
            <ImageStage
              stageRef={stageRef}
              canvas={activeCanvas}
              viewport={viewport}
              background={background}
              selection={selection}
              onPanBy={panBy}
              onWheelZoom={(factor, point) => zoomBy(factor, point)}
              onProbe={setProbe}
              onSelectionChange={setSelection}
              onClickImage={handleClickImage}
              sampleCanvas={sampler.sample}
              onDoubleClick={reset}
            />
          )}
        </main>
        <ImageInspector
          parsed={parsed}
          originalSize={{ width, height }}
          editedSize={dimensions}
          probe={probe}
          pinnedProbe={pinnedProbe}
          selection={selection}
          edits={edits}
          palette={rendered.palette}
          histogram={rendered.histogram}
          onCopy={copyText}
          onClearPin={() => setPinnedProbe(null)}
          onSendSample={() => {
            const p = probe ?? pinnedProbe;
            if (p) sendToPalette({ initialColors: [p.hex], samplePoint: { x: p.x, y: p.y } }, `${sourceTitle} Colour`);
          }}
          onSendSelectionPalette={() => selection && sendToPalette({
            initialColors: rendered.palette,
            extractionRegion: {
              x: Math.round(selection.x),
              y: Math.round(selection.y),
              width: Math.round(selection.width),
              height: Math.round(selection.height),
            },
          })}
        />
      </div>

      <footer className="flex min-h-8 items-center gap-4 border-t border-base bg-surface px-3 text-xs text-secondary">
        <span>{dimensions.width} x {dimensions.height}</span>
        <span>{Math.round(viewport.zoom * 100)}%</span>
        <span>{statusProbe}</span>
        <span>{selection ? `${Math.round(selection.width)} x ${Math.round(selection.height)} selected` : "No selection"}</span>
        <span>{isModified ? `${edits.length} edit${edits.length === 1 ? "" : "s"}` : "Original"}</span>
      </footer>
      {canvasSendSource && (
        <SendToCanvasDialog
          source={canvasSendSource}
          side={side}
          onClose={() => setCanvasSendSource(null)}
        />
      )}
    </div>
  );
};
