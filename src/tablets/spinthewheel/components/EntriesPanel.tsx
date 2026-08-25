import React, { useEffect, useRef, useState } from "react";
import type { WheelEntry } from "../types";
import { entriesToText, parseEntriesText } from "../contentModel";

interface EntriesPanelProps {
  entries: WheelEntry[];
  onChange: (entries: WheelEntry[]) => void;
}

/**
 * One-name-per-line textarea kept in two-way sync with `entries`. Local text
 * state preserves in-progress typing (trailing newlines, partial lines) while
 * still emitting parsed entries on every change.
 */
export const EntriesPanel: React.FC<EntriesPanelProps> = ({ entries, onChange }) => {
  const [text, setText] = useState(() => entriesToText(entries));
  // Text that produced the entries the parent currently holds; external
  // updates (payload import, restore) are detected by diverging from it.
  const emittedTextRef = useRef(entriesToText(entries));

  useEffect(() => {
    const external = entriesToText(entries);
    if (external !== emittedTextRef.current) {
      emittedTextRef.current = external;
      setText(external);
    }
  }, [entries]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    emittedTextRef.current = next;
    setText(next);
    onChange(parseEntriesText(next));
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 min-h-0">
      <div className="flex items-baseline justify-between flex-shrink-0">
        <label
          htmlFor="spinthewheel-entries"
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
          Names
        </label>
        <span className="text-xs text-muted">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      <textarea
        id="spinthewheel-entries"
        value={text}
        onChange={handleChange}
        spellCheck={false}
        placeholder={"One name per line…\n\nAlice\nBob\nCharlie"}
        className="flex-1 w-full resize-none px-3 py-2 text-sm bg-canvas border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50 custom-scrollbar min-h-0"
      />
      <p className="flex-shrink-0 text-xs text-muted/70">One name per line</p>
    </div>
  );
};
