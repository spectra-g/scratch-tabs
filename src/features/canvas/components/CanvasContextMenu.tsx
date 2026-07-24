import { useEffect, useRef } from "react";
import { useClickOutside } from "../../../hooks/useClickOutside";

export interface CanvasContextMenuPosition {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  position: CanvasContextMenuPosition;
  selectedCount: number;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const CanvasContextMenu = ({
  position,
  selectedCount,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onDelete,
  onClose,
}: CanvasContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, onClose);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Canvas selection actions for ${selectedCount} ${selectedCount === 1 ? "card" : "cards"}`}
      data-testid="canvas-context-menu"
      className="fixed z-context-menu min-w-40 rounded border border-base bg-surface py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className="canvas-context-menu-item"
        data-testid="canvas-context-duplicate"
        onClick={() => run(onDuplicate)}
      >
        Duplicate
      </button>
      <button
        type="button"
        role="menuitem"
        className="canvas-context-menu-item"
        data-testid="canvas-context-bring-forward"
        onClick={() => run(onBringForward)}
      >
        Bring forward
      </button>
      <button
        type="button"
        role="menuitem"
        className="canvas-context-menu-item"
        data-testid="canvas-context-send-backward"
        onClick={() => run(onSendBackward)}
      >
        Send backward
      </button>
      <div className="my-1 border-t border-base" aria-hidden="true" />
      <button
        type="button"
        role="menuitem"
        className="canvas-context-menu-item"
        data-testid="canvas-context-delete"
        onClick={() => run(onDelete)}
      >
        Delete
      </button>
    </div>
  );
};
