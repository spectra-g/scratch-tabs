import React, { useEffect, useState } from "react";
import { computeChecksums, ChecksumResult } from "../utils/checksums";
import { Copy, Check } from "../../../components/Icons";

interface ChecksumPanelProps {
  bytes: Uint8Array;
  selectionStart: number | null;
  selectionEnd: number | null;
}

interface CopiedState {
  key: string;
  timer: ReturnType<typeof setTimeout>;
}

export const ChecksumPanel: React.FC<ChecksumPanelProps> = ({ bytes, selectionStart, selectionEnd }) => {
  const [result, setResult] = useState<ChecksumResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<CopiedState | null>(null);

  const target =
    selectionStart !== null && selectionEnd !== null
      ? bytes.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd) + 1)
      : bytes;

  useEffect(() => {
    if (target.length === 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    computeChecksums(target).then((r) => {
      if (!cancelled) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [target]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    if (copied) clearTimeout(copied.timer);
    const timer = setTimeout(() => setCopied(null), 1500);
    setCopied({ key, timer });
  };

  useEffect(() => {
    return () => { if (copied) clearTimeout(copied.timer); };
  }, [copied]);

  if (bytes.length === 0) {
    return (
      <div className="text-center text-secondary text-xs py-6">
        Load data to compute checksums.
      </div>
    );
  }

  const isSelection = selectionStart !== null && selectionEnd !== null;
  const rows: Array<{ label: string; value: string }> = result
    ? [
        { label: "CRC32", value: result.crc32 },
        { label: "SHA-1", value: result.sha1 },
        { label: "SHA-256", value: result.sha256 },
      ]
    : [];

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-secondary leading-normal">
        {isSelection
          ? `Computed on current selection (${Math.abs((selectionEnd ?? 0) - (selectionStart ?? 0)) + 1} bytes).`
          : `Computed on entire buffer (${bytes.length.toLocaleString()} bytes).`}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-secondary text-xs py-2">
          <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
          <span>Computing…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="bg-canvas border border-base rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-secondary uppercase">{label}</span>
                <button
                  onClick={() => handleCopy(label, value)}
                  className="text-muted hover:text-primary transition-colors p-0.5"
                  title={`Copy ${label}`}
                >
                  {copied?.key === label ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                </button>
              </div>
              <span className="font-mono text-[10px] text-main break-all leading-tight block">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
