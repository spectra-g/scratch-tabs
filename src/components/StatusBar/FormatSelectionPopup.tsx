import React, { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { PopupMenuItem } from "./types";

export interface PopupAnchor {
  /** Viewport-space left edge of the trigger label. */
  left: number;
  /** Viewport-space top edge of the trigger label. */
  top: number;
}

interface FormatSelectionPopupProps {
  formats: PopupMenuItem[];
  onSelectFormat: (formatId: string) => void;
  onClose: () => void;
  title?: string;
  /** Trigger label position - used to place the portal above it. */
  anchor: PopupAnchor | null;
  /** Clicks inside the trigger must not count as "outside" so the
   *  label can close the popup without instantly reopening it. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const POPUP_WIDTH = 170;

/**
 * Rendered into document.body so ancestor overflow/scroll containers
 * (e.g. the horizontally scrollable status bar) can never clip it.
 */
export const FormatSelectionPopup: React.FC<FormatSelectionPopupProps> = ({
  formats,
  onSelectFormat,
  onClose,
  title,
  anchor,
  triggerRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter formats based on search term
  const filteredFormats = useMemo(() => {
    if (!searchTerm.trim()) return formats;

    const term = searchTerm.toLowerCase();
    return formats.filter(item =>
      !item.isSeparator && item.name.toLowerCase().includes(term)
    );
  }, [formats, searchTerm]);

  // Handle click outside to close - using a more direct approach that works better with Monaco editor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef?.current?.contains(target)) return;
      if (
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  const handleSelectFormat = (formatId: string) => {
    onSelectFormat(formatId);
    onClose();
  };

  // Open upwards from the trigger, clamped to the viewport.
  const left = Math.min(
    Math.max(anchor?.left ?? 0, 8),
    Math.max((typeof window !== "undefined" ? window.innerWidth : 0) - POPUP_WIDTH - 8, 8),
  );
  const bottom =
    typeof window !== "undefined" && anchor ? window.innerHeight - anchor.top + 4 : 28;

  return createPortal(
    <div
      ref={popupRef}
      data-testid="format-selection-popup"
      className="fixed z-[60] bg-surface border border-base rounded shadow-lg overflow-hidden custom-scrollbar"
      style={{
        bottom: `${bottom}px`,
        left: `${left}px`,
        maxHeight: "300px",
        width: `${POPUP_WIDTH}px`,
        overflowY: "auto",
      }}
    >
      <div className="px-3 py-2 border-b border-base">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search formats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-secondary placeholder-gray-500 border-none outline-none"
        />
      </div>
      <div className="py-1">
        {filteredFormats.map((item) => {
          if (item.isSeparator) {
            return (
              <div
                key={item.id}
                className="border-t border-base my-1 mx-2"
              ></div>
            );
          }
          return (
            <button
              key={item.id}
              className="w-full text-left px-3 py-1.5 hover:bg-element-hover text-xs text-main transition-colors block"
              onClick={() => handleSelectFormat(item.id)}
              title={`Select ${item.name}`}
            >
              <span>{item.name}</span>
            </button>
          );
        })}

        {filteredFormats.length === 0 && searchTerm.trim() && (
          <div className="px-3 py-2 text-xs text-muted italic">
            No formats found
          </div>
        )}

        {formats.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted italic">
            No formats available
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
