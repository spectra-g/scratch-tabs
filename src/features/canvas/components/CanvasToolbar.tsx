interface CanvasToolbarProps {
  selectedCount: number;
  onAddText: () => void;
  onDeleteSelection: () => void;
}

export const CanvasToolbar = ({
  selectedCount,
  onAddText,
  onDeleteSelection,
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
    <button
      type="button"
      className="rounded px-3 py-2 text-sm text-secondary hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-40"
      data-testid="canvas-delete-selection"
      aria-label="Delete selected cards"
      disabled={selectedCount === 0}
      onClick={onDeleteSelection}
    >
      Delete
    </button>
  </div>
);
