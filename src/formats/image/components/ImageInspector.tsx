import React from "react";
import { Copy, Send } from "../../../components/Icons";
import { ParsedImageDataUri, formatBytes } from "../utils/dataUri";
import { ImageEdit } from "../utils/imageEdits";
import { PixelProbe } from "../hooks/usePixelProbe";
import { ImageHistogram } from "./ImageHistogram";
import { ImageHistogram as HistogramData } from "../utils/histogram";

interface ImageInspectorProps {
  parsed: ParsedImageDataUri | null;
  originalSize: { width: number; height: number };
  editedSize: { width: number; height: number };
  probe: PixelProbe | null;
  pinnedProbe: PixelProbe | null;
  selection: DOMRect | null;
  edits: ImageEdit[];
  palette: string[];
  histogram: HistogramData | null;
  onCopy: (value: string) => void;
  onSendSample: () => void;
  onSendSelectionPalette: () => void;
  onClearPin: () => void;
}

const rowClass = "flex items-center justify-between gap-3 text-xs";

export const ImageInspector: React.FC<ImageInspectorProps> = ({
  parsed,
  originalSize,
  editedSize,
  probe,
  pinnedProbe,
  selection,
  edits,
  palette,
  histogram,
  onCopy,
  onSendSample,
  onSendSelectionPalette,
  onClearPin,
}) => {
  const displayProbe = probe ?? pinnedProbe;
  const isPinned = !probe && !!pinnedProbe;
  return (
  <aside className="custom-scrollbar hidden w-80 shrink-0 overflow-y-auto border-l border-base bg-surface p-3 xl:block">
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase text-secondary">Metadata</h3>
      <div className="space-y-1">
        <div className={rowClass}><span>MIME</span><span className="font-mono text-main">{parsed?.mimeType ?? "-"}</span></div>
        <div className={rowClass}><span>Original</span><span>{originalSize.width} x {originalSize.height}</span></div>
        <div className={rowClass}><span>Current</span><span>{editedSize.width} x {editedSize.height}</span></div>
        <div className={rowClass}><span>Decoded</span><span>{parsed ? formatBytes(parsed.decodedBytes) : "-"}</span></div>
        <div className={rowClass}><span>Encoded</span><span>{parsed ? formatBytes(parsed.encodedBytes) : "-"}</span></div>
      </div>
    </section>

    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-secondary">Pixel Probe</h3>
        {isPinned && <button className="text-xs text-muted hover:text-main" onClick={onClearPin} title="Clear pinned pixel">Clear pin</button>}
      </div>
      {displayProbe ? (
        <div className="space-y-2 text-xs">
          {isPinned && <p className="text-muted">Pinned - click image to update</p>}
          <div className={rowClass}><span>Point</span><span>{displayProbe.x}, {displayProbe.y}</span></div>
          <div className={rowClass}><span>RGBA</span><span>{displayProbe.rgba.r}, {displayProbe.rgba.g}, {displayProbe.rgba.b}, {displayProbe.rgba.a}</span></div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded border border-base" style={{ backgroundColor: displayProbe.hex }} />
            <button className="flex flex-1 items-center justify-between rounded border border-base px-2 py-1 font-mono" onClick={() => onCopy(displayProbe.hex)}>
              {displayProbe.hex}
              <Copy size={13} />
            </button>
          </div>
          <button className="inline-flex items-center gap-1 rounded border border-base px-2 py-1 text-xs" onClick={onSendSample}>
            <Send size={13} /> Send Sampled Colour
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">Hover the image to sample a pixel. Click to pin.</p>
      )}
    </section>

    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase text-secondary">Selection</h3>
      {selection ? (
        <div className="space-y-2 text-xs">
          <div>{Math.round(selection.x)}, {Math.round(selection.y)} - {Math.round(selection.width)} x {Math.round(selection.height)}</div>
          <button className="inline-flex items-center gap-1 rounded border border-base px-2 py-1 text-xs" onClick={onSendSelectionPalette}>
            <Send size={13} /> Send Selection Palette
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">Drag with Shift held to create a crop selection.</p>
      )}
    </section>

    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase text-secondary">Dominant Colours</h3>
      <div className="grid grid-cols-6 gap-1">
        {palette.map((color) => (
          <button
            key={color}
            className="h-8 rounded border border-base"
            title={color}
            style={{ backgroundColor: color }}
            onClick={() => onCopy(color)}
          />
        ))}
      </div>
    </section>

    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase text-secondary">Histogram</h3>
      <ImageHistogram histogram={histogram} />
    </section>

    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase text-secondary">Edit Pipeline</h3>
      {edits.length > 0 ? (
        <ol className="space-y-1 text-xs">
          {edits.map((edit, index) => (
            <li key={`${edit.type}-${index}`} className="rounded bg-canvas px-2 py-1">
              {index + 1}. {edit.type}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted">No pending edits.</p>
      )}
    </section>
  </aside>
  );
}
