import { X } from "../../../components/Icons";

interface CanvasShortcutHelpProps {
  onClose: () => void;
}

const sections = [
  {
    heading: "Navigation",
    rows: [
      ["Arrow keys", "Move focus to the nearest card"],
      ["Tab / Shift+Tab", "Traverse cards in spatial order"],
      ["Enter", "Edit or open the focused card"],
      ["Escape", "Clear multi-selection or return to the Canvas"],
    ],
  },
  {
    heading: "Manipulation",
    rows: [
      ["Cmd/Ctrl+A", "Select all cards"],
      ["Cmd/Ctrl+C", "Copy selected cards"],
      ["Cmd/Ctrl+X", "Cut selected cards"],
      [
        "Cmd/Ctrl+V",
        "Paste cards or external content (Text, Images, Links, Videos)",
      ],
      ["Cmd/Ctrl+D", "Duplicate selected cards"],
      ["Delete / Backspace", "Delete selected cards"],
      ["Alt+Arrow", "Nudge by one grid unit"],
      ["Alt+Shift+Arrow", "Nudge by ten grid units"],
      ["Cmd/Ctrl+Z", "Undo"],
      ["Cmd/Ctrl+Shift+Z", "Redo"],
    ],
  },
  {
    heading: "Viewport",
    rows: [
      ["Space (hold)", "Temporarily pan"],
      ["F", "Fit the current selection"],
      ["0", "Reset zoom to 100 percent"],
      ["?", "Open this shortcut reference"],
    ],
  },
] as const;

export const CanvasShortcutHelp = ({ onClose }: CanvasShortcutHelpProps) => (
  <div
    className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    data-testid="canvas-shortcut-help-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-base bg-surface-raised p-5 shadow-xl"
      data-testid="canvas-shortcut-help"
      role="dialog"
      aria-modal="true"
      aria-labelledby="canvas-shortcut-help-title"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="canvas-shortcut-help-title" className="font-semibold text-main">
          Canvas keyboard shortcuts
        </h2>
        <button
          type="button"
          className="rounded p-1 text-secondary hover:bg-element-hover hover:text-main focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="canvas-close-shortcut-help"
          aria-label="Close keyboard shortcut help"
          autoFocus
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {section.heading}
            </h3>
            <dl className="mt-1 divide-y divide-base/50">
              {section.rows.map(([keys, description]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-4 py-1.5 text-xs"
                >
                  <dd className="text-secondary">{description}</dd>
                  <dt>
                    <kbd className="whitespace-nowrap rounded border border-base bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-main">
                      {keys}
                    </kbd>
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  </div>
);
