import React, { useMemo } from "react";

interface DecodedTextPanelProps {
  bytes: Uint8Array;
  selectionStart: number | null;
  selectionEnd: number | null;
}

function decodeAs(bytes: Uint8Array, encoding: string): string {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return "(decode error)";
  }
}

export const DecodedTextPanel: React.FC<DecodedTextPanelProps> = ({ bytes, selectionStart, selectionEnd }) => {
  const target = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) return bytes.slice(0, Math.min(bytes.length, 256));
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return bytes.slice(start, end + 1);
  }, [bytes, selectionStart, selectionEnd]);

  const isSelection = selectionStart !== null && selectionEnd !== null;

  const rows = useMemo(() => [
    { label: "UTF-8", value: decodeAs(target, "utf-8") },
    { label: "UTF-16 LE", value: decodeAs(target, "utf-16le") },
    { label: "UTF-16 BE", value: decodeAs(target, "utf-16be") },
    { label: "Latin-1", value: decodeAs(target, "latin1") },
  ], [target]);

  if (bytes.length === 0) {
    return (
      <div className="text-center text-secondary text-xs py-4">
        Load data to see decoded text.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-secondary leading-normal">
        {isSelection
          ? `Decoding ${target.length} selected byte${target.length !== 1 ? "s" : ""}.`
          : `Showing first ${target.length} bytes (select a range for a specific slice).`}
      </p>
      {rows.map(({ label, value }) => (
        <div key={label} className="bg-canvas border border-base rounded p-2 space-y-0.5">
          <span className="text-[10px] font-semibold text-secondary uppercase block">{label}</span>
          <span className="font-mono text-[10px] text-main break-all leading-tight block whitespace-pre-wrap max-h-16 overflow-y-auto custom-scrollbar">
            {value || <span className="text-muted italic">(empty)</span>}
          </span>
        </div>
      ))}
    </div>
  );
};
