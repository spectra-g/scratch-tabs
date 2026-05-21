import React, { useEffect, useMemo, useRef, useState } from "react";
import { Endianness, SidebarTab } from "../types";
import { Shield, Settings, Info, Copy, Check } from "../../../components/Icons";
import { ByteHistogram } from "./ByteHistogram";
import { StringsPanel } from "./StringsPanel";
import { ChecksumPanel } from "./ChecksumPanel";
import { DecodedTextPanel } from "./DecodedTextPanel";

interface SelectionInfo {
  start: number | null;
  end: number | null;
  length: number;
}

interface SidebarInspectorProps {
  bytes: Uint8Array;
  selectedOffset: number | null;
  selectionInfo: SelectionInfo;
  endianness: Endianness;
  onChangeEndianness: (endianness: Endianness) => void;
  onEditByte: (offset: number, value: number) => void;
  activeSidebarTab: SidebarTab;
  onChangeSidebarTab: (tab: SidebarTab) => void;
  onJumpToOffset: (offset: number) => void;
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "inspector", label: "Inspect" },
  { id: "strings", label: "Strings" },
  { id: "histogram", label: "Histogram" },
  { id: "checksums", label: "Checksums" },
];

export const SidebarInspector: React.FC<SidebarInspectorProps> = ({
  bytes,
  selectedOffset,
  selectionInfo,
  endianness,
  onChangeEndianness,
  onEditByte,
  activeSidebarTab,
  onChangeSidebarTab,
  onJumpToOffset,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  const selectedBytes = useMemo(() => {
    if (selectionInfo.length === 0 || selectionInfo.start === null || selectionInfo.end === null) {
      return new Uint8Array(0);
    }
    return bytes.slice(selectionInfo.start, selectionInfo.end + 1);
  }, [bytes, selectionInfo]);

  const entropyStats = useMemo(() => {
    const target = selectedBytes.length > 0 ? selectedBytes : bytes;
    if (target.length === 0) return { entropy: 0, rating: "No data", color: "text-muted" };

    const freq = new Array(256).fill(0);
    for (let i = 0; i < target.length; i++) freq[target[i]]++;

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / target.length;
        entropy -= p * Math.log2(p);
      }
    }

    let rating = "Low Entropy (Structured)";
    let color = "text-success";
    if (entropy >= 7.5) { rating = "Very High (Encrypted/Compressed)"; color = "text-danger font-bold"; }
    else if (entropy >= 6.5) { rating = "High (Compressed/Media/Binary)"; color = "text-warning"; }
    else if (entropy >= 4.5) { rating = "Medium (Dense Binary/Executable)"; color = "text-primary"; }
    else if (entropy >= 3.0) { rating = "Low-Medium (Text/Source Code)"; color = "text-success"; }

    return { entropy, rating, color };
  }, [bytes, selectedBytes]);

  const decodedValues = useMemo(() => {
    if (selectedOffset === null || selectedOffset >= bytes.length) return null;

    const isLE = endianness === "le";
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    const tmp = new Uint8Array(buffer);
    const avail = Math.min(8, bytes.length - selectedOffset);
    for (let i = 0; i < avail; i++) tmp[i] = bytes[selectedOffset + i];

    const fmt = (label: string, req: number, getter: () => number | bigint | string) => {
      if (avail < req) return { label, value: "Out of Bounds", rawValue: "" };
      try {
        const val = getter();
        return { label, value: val.toString(), rawValue: val.toString() };
      } catch {
        return { label, value: "Error", rawValue: "" };
      }
    };

    const rows = [
      fmt("Binary (8-bit)", 1, () => view.getUint8(0).toString(2).padStart(8, "0")),
      fmt("Int8 (Signed)", 1, () => view.getInt8(0)),
      fmt("Uint8 (Unsigned)", 1, () => view.getUint8(0)),
      fmt("Int16", 2, () => view.getInt16(0, isLE)),
      fmt("Uint16", 2, () => view.getUint16(0, isLE)),
      fmt("Int32", 4, () => view.getInt32(0, isLE)),
      fmt("Uint32", 4, () => view.getUint32(0, isLE)),
      fmt("Int64 (BigInt)", 8, () => view.getBigInt64(0, isLE)),
      fmt("Uint64 (BigInt)", 8, () => view.getBigUint64(0, isLE)),
      fmt("Float32", 4, () => { const f = view.getFloat32(0, isLE); return Number.isInteger(f) ? f : parseFloat(f.toFixed(6)); }),
      fmt("Float64 (Double)", 8, () => { const d = view.getFloat64(0, isLE); return Number.isInteger(d) ? d : parseFloat(d.toFixed(10)); }),
    ];

    const charCode = bytes[selectedOffset];
    const asciiStr = charCode >= 32 && charCode <= 126 ? `'${String.fromCharCode(charCode)}'` : "Non-printable";
    rows.push({ label: "ASCII Char", value: asciiStr, rawValue: charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : "" });

    return rows;
  }, [bytes, selectedOffset, endianness]);

  const handleCopyValue = (key: string, val: string) => {
    if (!val || val === "Out of Bounds") return;
    navigator.clipboard.writeText(val);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedKey(key);
    copiedTimerRef.current = setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleByteEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedOffset === null) return;
    const val = parseInt(e.target.value, 16);
    if (!isNaN(val) && val >= 0 && val <= 255) onEditByte(selectedOffset, val);
  };

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-base bg-surface-secondary flex flex-col overflow-hidden select-none">
      {/* Tabs */}
      <div className="flex border-b border-base flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChangeSidebarTab(tab.id)}
            className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors ${
              activeSidebarTab === tab.id
                ? "text-primary border-b-2 border-primary bg-primary-subtle-bg/10"
                : "text-secondary hover:text-main"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Always-visible summary strip */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0 space-y-2.5">
        {/* Selection summary */}
        <div className="bg-surface-raised border border-base rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center space-x-1.5 text-primary font-semibold text-[10px] uppercase tracking-wider mb-1.5">
            <Info size={11} />
            <span>Selection</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span className="text-secondary block">Start</span>
              <span className="font-mono font-medium text-main">{selectionInfo.start !== null ? `0x${selectionInfo.start.toString(16).toUpperCase()}` : "—"}</span>
            </div>
            <div>
              <span className="text-secondary block">End</span>
              <span className="font-mono font-medium text-main">{selectionInfo.end !== null ? `0x${selectionInfo.end.toString(16).toUpperCase()}` : "—"}</span>
            </div>
            <div>
              <span className="text-secondary block">Size</span>
              <span className="font-medium text-main">{selectionInfo.length.toLocaleString()}b</span>
            </div>
          </div>
        </div>

        {/* Entropy */}
        <div className="bg-surface-raised border border-base rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center space-x-1.5 text-primary font-semibold text-[10px] uppercase tracking-wider mb-1">
            <Shield size={11} />
            <span>Shannon Entropy</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-base font-bold text-main">{entropyStats.entropy.toFixed(4)}</span>
            <span className="text-[9px] text-secondary">bits/byte</span>
          </div>
          <div className={`text-[10px] ${entropyStats.color} leading-tight mt-0.5`}>{entropyStats.rating}</div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-3">
        {/* ── Inspector Tab ── */}
        {activeSidebarTab === "inspector" && (
          <>
            {/* Byte editor */}
            {selectedOffset !== null && selectedOffset < bytes.length && (
              <div className="bg-surface-raised border border-base rounded-lg p-3 shadow-sm space-y-2">
                <div className="text-primary font-semibold text-[10px] uppercase tracking-wider">Edit Selected Byte</div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[9px] text-secondary">Hex (00–FF)</span>
                    <input
                      type="text"
                      maxLength={2}
                      value={bytes[selectedOffset].toString(16).toUpperCase()}
                      onChange={handleByteEdit}
                      className="w-full mt-1 px-2 py-1 font-mono text-center text-sm font-bold bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main uppercase"
                    />
                  </div>
                  <div className="flex flex-col w-14 flex-shrink-0">
                    <span className="text-[9px] text-secondary">ASCII</span>
                    <input
                      type="text"
                      maxLength={1}
                      value={bytes[selectedOffset] >= 32 && bytes[selectedOffset] <= 126 ? String.fromCharCode(bytes[selectedOffset]) : ""}
                      onChange={(e) => { if (e.target.value.length === 1) onEditByte(selectedOffset, e.target.value.charCodeAt(0)); }}
                      placeholder="."
                      className="w-full mt-1 px-2 py-1 font-mono text-center text-sm font-bold bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Data inspector */}
            <div className="bg-surface-raised border border-base rounded-lg p-3 shadow-sm flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between pb-2 border-b border-base flex-shrink-0">
                <div className="flex items-center space-x-1.5 text-primary font-semibold text-[10px] uppercase tracking-wider">
                  <Settings size={11} />
                  <span>Data Inspector</span>
                </div>
                <div className="flex bg-canvas border border-base rounded p-0.5 text-[9px] font-semibold">
                  {(["le", "be"] as const).map((e) => (
                    <button
                      key={e}
                      onClick={() => onChangeEndianness(e)}
                      className={`px-1.5 py-0.5 rounded-sm transition-colors ${endianness === e ? "bg-primary text-white shadow-sm" : "text-secondary hover:text-main"}`}
                    >
                      {e.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar mt-2">
                {decodedValues ? (
                  <div className="divide-y divide-base/50">
                    {decodedValues.map((item) => (
                      <div
                        key={item.label}
                        onClick={() => handleCopyValue(item.label, item.rawValue || item.value)}
                        className="flex items-center justify-between py-2 px-1 hover:bg-element-hover/30 rounded cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col pr-2">
                          <span className="text-[9px] font-medium text-secondary">{item.label}</span>
                          <span className="font-mono text-[10px] font-semibold text-main break-all mt-0.5">{item.value}</span>
                        </div>
                        {item.value !== "Out of Bounds" && (
                          <button className="text-secondary/50 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                            {copiedKey === item.label ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-secondary py-6">
                    <Info size={20} className="text-muted mb-1.5" />
                    <p className="text-[10px] leading-normal">Click a byte in the grid to inspect structured values.</p>
                  </div>
                )}
              </div>
            </div>

            {/* UTF-8 / UTF-16 decoded view */}
            {bytes.length > 0 && (
              <div className="bg-surface-raised border border-base rounded-lg p-3 shadow-sm space-y-2">
                <div className="text-primary font-semibold text-[10px] uppercase tracking-wider">Decoded Text</div>
                <DecodedTextPanel
                  bytes={bytes}
                  selectionStart={selectionInfo.start}
                  selectionEnd={selectionInfo.end}
                />
              </div>
            )}
          </>
        )}

        {/* ── Strings Tab ── */}
        {activeSidebarTab === "strings" && (
          <div className="flex flex-col h-64">
            <StringsPanel bytes={bytes} onJumpToOffset={onJumpToOffset} />
          </div>
        )}

        {/* ── Histogram Tab ── */}
        {activeSidebarTab === "histogram" && (
          <div className="space-y-4">
            <ByteHistogram bytes={bytes} />

            {/* Byte distribution stacked bar (retained for quick summary) */}
            {bytes.length > 0 && <ByteDistributionBar bytes={bytes} />}
          </div>
        )}

        {/* ── Checksums Tab ── */}
        {activeSidebarTab === "checksums" && (
          <ChecksumPanel
            bytes={bytes}
            selectionStart={selectionInfo.start}
            selectionEnd={selectionInfo.end}
          />
        )}
      </div>
    </div>
  );
};

// Small helper — stacked bar chart showing 4 byte categories
const ByteDistributionBar: React.FC<{ bytes: Uint8Array }> = ({ bytes }) => {
  const dist = useMemo(() => {
    let nulls = 0, ascii = 0, control = 0, extended = 0;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0) nulls++;
      else if (b >= 32 && b <= 126) ascii++;
      else if (b < 32 || b === 127) control++;
      else extended++;
    }
    const t = bytes.length;
    return {
      nulls: (nulls / t) * 100,
      ascii: (ascii / t) * 100,
      control: (control / t) * 100,
      extended: (extended / t) * 100,
      counts: { nulls, ascii, control, extended },
    };
  }, [bytes]);

  return (
    <div className="bg-surface-raised border border-base rounded-lg p-3 shadow-sm space-y-2 flex-shrink-0">
      <div className="text-primary font-semibold text-[10px] uppercase tracking-wider">Category Distribution</div>
      <div className="h-3 w-full rounded overflow-hidden flex bg-canvas border border-base">
        <div style={{ width: `${dist.nulls}%` }} title={`Null: ${dist.nulls.toFixed(1)}%`} className="h-full bg-muted/30" />
        <div style={{ width: `${dist.control}%` }} title={`Control: ${dist.control.toFixed(1)}%`} className="h-full bg-warning" />
        <div style={{ width: `${dist.ascii}%` }} title={`ASCII: ${dist.ascii.toFixed(1)}%`} className="h-full bg-success" />
        <div style={{ width: `${dist.extended}%` }} title={`Extended: ${dist.extended.toFixed(1)}%`} className="h-full bg-info" />
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-muted/40 border border-base" /><span className="text-secondary">Null ({dist.counts.nulls})</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning" /><span className="text-secondary">Control ({dist.counts.control})</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success" /><span className="text-secondary">ASCII ({dist.counts.ascii})</span></span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-info" /><span className="text-secondary">Extended ({dist.counts.extended})</span></span>
      </div>
    </div>
  );
};
