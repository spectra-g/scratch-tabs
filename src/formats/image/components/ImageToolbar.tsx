import React from "react";
import {
  Copy,
  Download,
  FlipHorizontal,
  FlipVertical,
  ImageIcon,
  Palette,
  Redo2,
  RotateCcw,
  RotateCw,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "../../../components/Icons";
import { ImageExportFormat } from "../utils/canvasExport";

interface ImageToolbarProps {
  title: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  isModified: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFill: () => void;
  onActualSize: () => void;
  onRotateCw: () => void;
  onRotateCcw: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetEdits: () => void;
  onExport: (format: ImageExportFormat) => void;
  onCopyImage: () => void;
  onDownloadOriginal: () => void;
  onOpenPalette: () => void;
  onSendPalette: () => void;
  onBackgroundChange: (background: "checkerboard" | "dark" | "light" | "transparent") => void;
}

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded border border-base bg-surface text-secondary hover:text-main disabled:opacity-40";
const textButton =
  "inline-flex h-8 items-center gap-1 rounded border border-base bg-surface px-2 text-xs text-secondary hover:text-main disabled:opacity-40";

export const ImageToolbar: React.FC<ImageToolbarProps> = ({
  title,
  zoom,
  canUndo,
  canRedo,
  isModified,
  onZoomIn,
  onZoomOut,
  onFit,
  onFill,
  onActualSize,
  onRotateCw,
  onRotateCcw,
  onFlipHorizontal,
  onFlipVertical,
  onUndo,
  onRedo,
  onResetEdits,
  onExport,
  onCopyImage,
  onDownloadOriginal,
  onOpenPalette,
  onSendPalette,
  onBackgroundChange,
}) => (
  <div className="flex min-h-12 items-center gap-2 border-b border-base bg-surface px-3">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <ImageIcon size={16} className="shrink-0 text-secondary" />
      <span className="truncate text-sm font-medium text-main" title={title}>
        {title}
      </span>
      {isModified && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">Modified</span>}
    </div>

    <div className="flex items-center gap-1">
      <button className={iconButton} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <ZoomOut size={15} />
      </button>
      <span className="w-14 text-center text-xs text-secondary">{Math.round(zoom * 100)}%</span>
      <button className={iconButton} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <ZoomIn size={15} />
      </button>
      <button className={textButton} onClick={onFit}>Fit</button>
      <button className={textButton} onClick={onFill}>Fill</button>
      <button className={textButton} onClick={onActualSize}>1:1</button>
    </div>

    <div className="hidden items-center gap-1 lg:flex">
      <button className={iconButton} onClick={onRotateCcw} aria-label="Rotate counter-clockwise" title="Rotate counter-clockwise">
        <RotateCcw size={15} />
      </button>
      <button className={iconButton} onClick={onRotateCw} aria-label="Rotate clockwise" title="Rotate clockwise">
        <RotateCw size={15} />
      </button>
      <button className={iconButton} onClick={onFlipHorizontal} aria-label="Flip horizontal" title="Flip horizontal">
        <FlipHorizontal size={15} />
      </button>
      <button className={iconButton} onClick={onFlipVertical} aria-label="Flip vertical" title="Flip vertical">
        <FlipVertical size={15} />
      </button>
      <button className={iconButton} onClick={onUndo} disabled={!canUndo} aria-label="Undo edit" title="Undo edit">
        <Undo2 size={15} />
      </button>
      <button className={iconButton} onClick={onRedo} disabled={!canRedo} aria-label="Redo edit" title="Redo edit">
        <Redo2 size={15} />
      </button>
      <button className={textButton} onClick={onResetEdits} disabled={!isModified}>Reset</button>
    </div>

    <select
      className="h-8 rounded border border-base bg-surface px-2 text-xs text-main"
      aria-label="Preview background"
      onChange={(event) => onBackgroundChange(event.target.value as "checkerboard" | "dark" | "light" | "transparent")}
      defaultValue="checkerboard"
    >
      <option value="checkerboard">Checker</option>
      <option value="dark">Dark</option>
      <option value="light">Light</option>
      <option value="transparent">Clear</option>
    </select>

    <div className="flex items-center gap-1">
      <button className={iconButton} onClick={onOpenPalette} aria-label="Open in Colour Palette" title="Open in Colour Palette">
        <Palette size={15} />
      </button>
      <button className={textButton} onClick={onSendPalette}>Send Palette</button>
      <button className={iconButton} onClick={onCopyImage} aria-label="Copy image" title="Copy image to clipboard">
        <Copy size={15} />
      </button>
      <button className={iconButton} onClick={onDownloadOriginal} aria-label="Download original" title="Download original">
        <Download size={15} />
      </button>
      <select
        className="h-8 rounded border border-base bg-surface px-2 text-xs text-main"
        aria-label="Export edited image"
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) onExport(event.target.value as ImageExportFormat);
          event.currentTarget.value = "";
        }}
      >
        <option value="" disabled>Export</option>
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="webp">WebP</option>
      </select>
    </div>
  </div>
);
