import React, { useState } from "react";
import { RegexError } from "../types";

interface RegexEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: RegexError | null;
}

export function RegexEditor({ value, onChange, error }: RegexEditorProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        <div className="flex-shrink-0 text-gray-400 font-mono text-sm pr-2">
          /
        </div>
        <input
          type="text"
          value={value || ""}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 bg-gray-900/50 border rounded-md px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none transition-colors ${
            error
              ? "border-red-500/50 focus:border-red-500/70"
              : focused
                ? "border-blue-500/50"
                : "border-gray-700/50 hover:border-gray-600/50"
          }`}
          placeholder="Enter regex pattern..."
          spellCheck={false}
        />
        <div className="flex-shrink-0 text-gray-400 font-mono text-sm pl-2">
          /
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
