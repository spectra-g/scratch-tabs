import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { RegexError } from "../types";

interface RegexEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: RegexError | null;
}

export function RegexEditor({ value, onChange, error }: RegexEditorProps) {
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleCopy = async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        <div className="flex-shrink-0 text-muted font-mono text-sm pr-2">
          /
        </div>
        <input
          type="text"
          value={value || ""}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 bg-canvas/50 border rounded-md px-3 py-2 font-mono text-sm text-main focus:outline-none transition-colors ${
            error
              ? "border-red-500/50 focus:border-red-500/70"
              : focused
                ? "border-primary/50"
                : "border-base/50 hover:border-base/50"
          }`}
          placeholder="Enter regex pattern..."
          spellCheck={false}
        />
        <div className="flex-shrink-0 text-muted font-mono text-sm pl-2 flex items-center gap-1">
          /
          {value && (
            <button
              onClick={handleCopy}
              className={`p-1 rounded transition-colors ${
                copied
                  ? "text-green-400"
                  : "text-muted hover:text-main hover:bg-surface-secondary/50"
              }`}
              title="Copy regex pattern"
            >
              {copied ? <Check size={14} data-testid="check" /> : <Copy size={14} />}
            </button>
          )}
        </div>
      </div>

      {error && error.position !== undefined && (
        <div
          className="absolute top-full left-0 mt-1 h-1 bg-red-500/70 rounded"
          style={{
            marginLeft: `${(error.position + 1) * 0.6}rem`,
            width: "2px",
          }}
        />
      )}
    </div>
  );
}
