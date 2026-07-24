import { useRef } from "react";
import { CANVAS_IMAGE_MIME_TYPES } from "../constants";

interface CanvasToolbarProps {
  onAddText: () => void;
  onAddCode: () => void;
  onAddImage: (file: File) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowShortcuts: () => void;
}

export const CanvasToolbar = ({
  onAddText,
  onAddCode,
  onAddImage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowShortcuts,
}: CanvasToolbarProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="canvas-toolbar">
      <button
        type="button"
        className="rounded px-3 py-2 text-sm font-medium text-main hover:bg-element-hover focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="canvas-add-text"
        aria-label="Add text card"
        onClick={onAddText}
      >
        Text
      </button>
      <button
        type="button"
        className="rounded px-3 py-2 text-sm font-medium text-main hover:bg-element-hover focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="canvas-add-image"
        aria-label="Add image card"
        onClick={() => imageInputRef.current?.click()}
      >
        Image
      </button>
      <input
        ref={imageInputRef}
        type="file"
        className="sr-only"
        data-testid="canvas-image-input"
        aria-label="Choose an image for the Canvas"
        accept={CANVAS_IMAGE_MIME_TYPES.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onAddImage(file);
        }}
      />
      <button
        type="button"
        className="rounded px-3 py-2 text-sm font-medium text-main hover:bg-element-hover focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="canvas-add-code"
        aria-label="Add code card"
        onClick={onAddCode}
      >
        Code
      </button>
      <div className="mx-1 w-px bg-border-base" aria-hidden="true" />
      <button
        type="button"
        className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="canvas-undo"
        aria-label="Undo Canvas operation"
        disabled={!canUndo}
        onClick={onUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="canvas-redo"
        aria-label="Redo Canvas operation"
        disabled={!canRedo}
        onClick={onRedo}
      >
        Redo
      </button>
      <div className="mx-1 w-px bg-border-base" aria-hidden="true" />
      <button
        type="button"
        className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover focus:outline-none focus:ring-2 focus:ring-primary"
        data-testid="canvas-show-shortcut-help"
        aria-label="Show Canvas keyboard shortcuts"
        onClick={onShowShortcuts}
      >
        ?
      </button>
    </div>
  );
};
