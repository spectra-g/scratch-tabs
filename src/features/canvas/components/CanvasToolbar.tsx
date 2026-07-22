interface CanvasToolbarProps {
  onAddText: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const CanvasToolbar = ({
  onAddText,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: CanvasToolbarProps) => (
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
  </div>
);
