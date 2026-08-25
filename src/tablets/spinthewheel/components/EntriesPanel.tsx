import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlignLeft, ArrowDownAZ, Eraser, List, ListX, Shuffle, X } from "lucide-react";
import type { WheelEntry } from "../types";
import { entriesToText, parseEntriesText } from "../contentModel";
import { dedupeEntries, shuffleEntries, sortEntries } from "../utils/entryOperations";

interface EntriesPanelProps {
  entries: WheelEntry[];
  onChange: (entries: WheelEntry[]) => void;
}

type PanelMode = "text" | "list";

const TOOLBAR_BUTTON_CLASS =
  "p-1.5 rounded transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * Names editor for the wheel. Two modes over the same data:
 * - text: one-name-per-line textarea (bulk paste/edit)
 * - list: one row per entry with enable/disable checkbox and delete
 *
 * Local text state preserves in-progress typing (trailing newlines, partial
 * lines) while still emitting parsed entries on every change. Re-parsing
 * carries each label's id/colour/weight/enabled through untouched edits.
 */
export const EntriesPanel: React.FC<EntriesPanelProps> = ({ entries, onChange }) => {
  const [mode, setMode] = useState<PanelMode>("text");
  const [text, setText] = useState(() => entriesToText(entries));
  // Text that produced the entries the parent currently holds; external
  // updates (payload import, restore, remove-winner, toolbar ops) diverge from it.
  const emittedTextRef = useRef(entriesToText(entries));
  const textRef = useRef(text);

  useEffect(() => {
    const external = entriesToText(entries);
    if (external === emittedTextRef.current) return;
    // Echo of our own emission: parsing normalizes the raw text (trims lines,
    // drops blanks), so the round-tripped labels differ from what the user is
    // typing. Keep the raw text in that case — only adopt genuine external changes.
    if (external === entriesToText(parseEntriesText(textRef.current))) return;
    emittedTextRef.current = external;
    setText(external);
  }, [entries]);

  const emit = useCallback(
    (nextText: string, nextEntries: WheelEntry[]) => {
      emittedTextRef.current = nextText;
      textRef.current = nextText;
      setText(nextText);
      onChange(nextEntries);
    },
    [onChange],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    // Carry-over keeps ids, colours, weights, and enabled flags stable while typing.
    emit(next, parseEntriesText(next, entries));
  };

  const handleShuffle = () => onChange(shuffleEntries(entries));
  const handleSort = () => onChange(sortEntries(entries));
  const handleDedupe = () => onChange(dedupeEntries(entries));

  const handleRemoveBlankLines = () => {
    const cleaned = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
    emit(cleaned, parseEntriesText(cleaned, entries));
  };

  const toggleEntry = (id: string) =>
    onChange(
      entries.map((entry) =>
        entry.id === id ? { ...entry, enabled: !entry.enabled } : entry,
      ),
    );

  const deleteEntry = (id: string) => onChange(entries.filter((entry) => entry.id !== id));

  const activeCount = entries.filter((entry) => entry.enabled).length;

  return (
    <div className="h-full flex flex-col gap-2 p-3 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Entry tools">
          <button
            onClick={handleShuffle}
            aria-label="Shuffle entries"
            title="Shuffle"
            className={`${TOOLBAR_BUTTON_CLASS} text-secondary hover:text-main hover:bg-element-hover`}
          >
            <Shuffle size={14} />
          </button>
          <button
            onClick={handleSort}
            aria-label="Sort entries alphabetically"
            title="Sort A–Z"
            className={`${TOOLBAR_BUTTON_CLASS} text-secondary hover:text-main hover:bg-element-hover`}
          >
            <ArrowDownAZ size={14} />
          </button>
          <button
            onClick={handleDedupe}
            aria-label="Remove duplicate entries"
            title="Remove duplicates"
            className={`${TOOLBAR_BUTTON_CLASS} text-secondary hover:text-main hover:bg-element-hover`}
          >
            <ListX size={14} />
          </button>
          {mode === "text" && (
            <button
              onClick={handleRemoveBlankLines}
              aria-label="Remove blank lines"
              title="Remove blank lines"
              className={`${TOOLBAR_BUTTON_CLASS} text-secondary hover:text-main hover:bg-element-hover`}
            >
              <Eraser size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {activeCount === entries.length
              ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
              : `${activeCount}/${entries.length} entries`}
          </span>
          <button
            onClick={() => setMode(mode === "text" ? "list" : "text")}
            aria-label={mode === "text" ? "Switch to list editor" : "Switch to text editor"}
            title={mode === "text" ? "List view" : "Text view"}
            className={`${TOOLBAR_BUTTON_CLASS} ${
              mode === "list"
                ? "bg-element-hover text-primary"
                : "text-secondary hover:text-main hover:bg-element-hover"
            }`}
          >
            {mode === "text" ? <List size={14} /> : <AlignLeft size={14} />}
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <textarea
          id="spinthewheel-entries"
          value={text}
          onChange={handleChange}
          spellCheck={false}
          placeholder={"One name per line…\n\nAlice\nBob\nCharlie"}
          className="flex-1 w-full resize-none px-3 py-2 text-sm bg-canvas border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50 custom-scrollbar min-h-0"
        />
      ) : (
        <ul className="flex-1 overflow-y-auto custom-scrollbar min-h-0 border border-base/50 rounded divide-y divide-base/20 bg-canvas" aria-label="Entries">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 px-2 py-1.5">
              <input
                type="checkbox"
                checked={entry.enabled}
                onChange={() => toggleEntry(entry.id)}
                aria-label={`Include ${entry.label} on the wheel`}
                className="flex-shrink-0 rounded border-base bg-element text-primary cursor-pointer focus:ring-primary"
              />
              <span
                className={`flex-1 truncate text-sm ${entry.enabled ? "text-main" : "text-muted line-through"}`}
                title={entry.label}
              >
                {entry.label}
              </span>
              <button
                onClick={() => deleteEntry(entry.id)}
                aria-label={`Delete ${entry.label}`}
                title="Delete"
                className="flex-shrink-0 p-1 text-secondary hover:text-danger rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="flex-shrink-0 text-xs text-muted/70">One name per line</p>
    </div>
  );
};
