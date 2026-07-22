interface CanvasSelectionToolbarProps {
  selectedCount: number;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
}

export const CanvasSelectionToolbar = ({
  selectedCount,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
}: CanvasSelectionToolbarProps) => (
  <div
    className="canvas-toolbar"
    data-testid="canvas-selection-toolbar"
    aria-label={`${selectedCount} selected ${selectedCount === 1 ? "card" : "cards"}`}
  >
    <span className="px-2 py-2 text-xs text-muted" aria-hidden="true">
      {selectedCount} selected
    </span>
    <button
      type="button"
      className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover"
      data-testid="canvas-duplicate-selection"
      onClick={onDuplicate}
    >
      Duplicate
    </button>
    <button
      type="button"
      className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover"
      data-testid="canvas-bring-forward"
      onClick={onBringForward}
    >
      Bring forward
    </button>
    <button
      type="button"
      className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover"
      data-testid="canvas-send-backward"
      onClick={onSendBackward}
    >
      Send backward
    </button>
    <button
      type="button"
      className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover"
      data-testid="canvas-delete-selection"
      onClick={onDelete}
    >
      Delete
    </button>
  </div>
);
