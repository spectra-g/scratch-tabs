import React, { useState } from "react";

const BYTES_PER_ROW = 16;
const PAGE_SIZE = 64 * 1024;

interface HexPreviewProps {
  content: string;
  originalSize: number;
  hexPage: number;
  truncated: boolean;
  onPageChange: (page: number) => void;
}

function renderHexView(content: string): React.ReactNode {
  const lines = content.split("\n").filter(Boolean);
  return (
    <div className="font-mono text-xs leading-5">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-4 hover:bg-element-hover px-1">
          <span className="text-muted select-none w-20 flex-shrink-0">{line.slice(0, 10)}</span>
          <span className="text-success tracking-wide">{line.slice(10, 57)}</span>
          <span className="text-secondary border-l border-base pl-4">{line.slice(57)}</span>
        </div>
      ))}
    </div>
  );
}

export function buildHexContent(base64Page: string): string {
  try {
    const binary = atob(base64Page);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const lines: string[] = [];

    for (let row = 0; row < bytes.length; row += BYTES_PER_ROW) {
      const chunk = bytes.slice(row, row + BYTES_PER_ROW);
      const offset = row.toString(16).padStart(8, "0").toUpperCase();
      const hex = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ")
        .padEnd(BYTES_PER_ROW * 3 - 1, " ");
      const ascii = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");
      lines.push(`${offset}  ${hex}  ${ascii}`);
    }

    return lines.join("\n");
  } catch {
    return base64Page;
  }
}

export const HexPreview: React.FC<HexPreviewProps> = ({
  content,
  originalSize,
  hexPage,
  truncated,
  onPageChange,
}) => {
  const [jumpInput, setJumpInput] = useState("");
  const totalPages = Math.ceil(originalSize / PAGE_SIZE);
  const isBase64 = content.startsWith("data:") || !content.includes("\n");
  const displayContent = isBase64 ? buildHexContent(content.replace(/^data:[^;]+;base64,/, "")) : content;

  const handleJump = () => {
    const offset = jumpInput.startsWith("0x")
      ? parseInt(jumpInput, 16)
      : parseInt(jumpInput, 10);
    if (!isNaN(offset)) {
      const page = Math.floor(offset / PAGE_SIZE);
      onPageChange(Math.max(0, Math.min(page, totalPages - 1)));
    }
    setJumpInput("");
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-auto custom-scrollbar p-3 bg-surface-raised">
        {renderHexView(displayContent)}
      </div>

      <div className="flex-none flex items-center gap-2 px-3 py-2 border-t border-base bg-surface-secondary text-xs text-secondary">
        <button
          onClick={() => onPageChange(hexPage - 1)}
          disabled={hexPage === 0}
          className="px-2 py-0.5 rounded border border-base disabled:opacity-40 hover:bg-element-hover"
        >
          ← Prev
        </button>
        <span>
          Page {hexPage + 1} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(hexPage + 1)}
          disabled={hexPage >= totalPages - 1}
          className="px-2 py-0.5 rounded border border-base disabled:opacity-40 hover:bg-element-hover"
        >
          Next →
        </button>
        <div className="flex-1" />
        <span className="text-muted">Jump to offset:</span>
        <input
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJump()}
          placeholder="0x0000"
          className="w-24 px-2 py-0.5 rounded border border-base bg-canvas text-main font-mono focus:outline-none focus:ring-1 focus:ring-focus"
        />
      </div>
    </div>
  );
};
