import React from "react";
import { AlertTriangle, CheckCircle2, FileJson, Minimize2, Search, Wand2 } from "lucide-react";
import { XmlParseResult } from "../types";

interface XmlToolbarProps {
  parsed: XmlParseResult;
  search: string;
  onSearchChange: (value: string) => void;
  onFormat: () => void;
  onMinify: () => void;
  onOpenJson: () => void;
}

export const XmlToolbar: React.FC<XmlToolbarProps> = ({
  parsed,
  search,
  onSearchChange,
  onFormat,
  onMinify,
  onOpenJson,
}) => {
  return (
    <div className="flex items-center gap-3 border-b border-base bg-surface-secondary p-3">
      <div className="flex min-w-40 items-center gap-2">
        {parsed.isValid ? (
          <CheckCircle2 size={16} className="text-success" />
        ) : (
          <AlertTriangle size={16} className="text-danger" />
        )}
        <span className="text-sm text-main">{parsed.isValid ? "Valid XML" : "Invalid XML"}</span>
      </div>

      <label className="flex min-w-0 flex-1 items-center gap-2 rounded border border-base bg-element px-2 py-1 focus-within:border-focus">
        <Search size={14} className="text-muted" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search names, attributes, text, paths..."
          className="min-w-0 flex-1 bg-transparent text-sm text-main placeholder:text-muted focus:outline-none"
        />
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onFormat}
          disabled={!parsed.isValid}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:text-muted"
          title="Format XML"
        >
          <Wand2 size={14} />
          <span>Format</span>
        </button>
        <button
          type="button"
          onClick={onMinify}
          disabled={!parsed.isValid}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:text-muted"
          title="Minify XML"
        >
          <Minimize2 size={14} />
          <span>Minify</span>
        </button>
        <button
          type="button"
          onClick={onOpenJson}
          disabled={!parsed.isValid}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:text-muted"
          title="Open JSON conversion in a new background tab"
        >
          <FileJson size={14} />
          <span>JSON</span>
        </button>
      </div>
    </div>
  );
};
