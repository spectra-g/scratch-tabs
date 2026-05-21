import React, { useEffect } from "react";
import { X } from "../../../components/Icons";

interface KeyboardShortcutsOverlayProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    heading: "Navigation",
    rows: [
      ["←↑↓→", "Move selection by one byte"],
      ["Shift + ←↑↓→", "Extend selection"],
      ["Home / End", "Jump to row start / end"],
      ["Page Up / Down", "Previous / next page"],
    ],
  },
  {
    heading: "Editing",
    rows: [
      ["0–9, a–f", "Type a hex nibble into the selected byte"],
      ["Ctrl + Z", "Undo last byte edit"],
      ["Ctrl + Y", "Redo last undone byte edit"],
    ],
  },
  {
    heading: "General",
    rows: [
      ["Ctrl + F / F3", "Focus the search field"],
      ["Escape", "Clear search / close overlay"],
      ["?", "Open this keyboard shortcut reference"],
    ],
  },
];

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({ onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-raised border border-base rounded-xl shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-main">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-secondary hover:text-main transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h3 className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1.5">
                {section.heading}
              </h3>
              <div className="divide-y divide-base/50">
                {section.rows.map(([keys, desc]) => (
                  <div key={keys} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-secondary">{desc}</span>
                    <kbd className="font-mono text-[10px] bg-canvas border border-base px-1.5 py-0.5 rounded text-main whitespace-nowrap ml-3">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted text-center">Press Esc to close</p>
      </div>
    </div>
  );
};
