import React, { useEffect, useMemo, useRef, useState } from "react";
import { Endianness } from "../types";
import { Shield, Settings, Info, Copy, Check } from "../../../components/Icons";

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
}

export const SidebarInspector: React.FC<SidebarInspectorProps> = ({
  bytes,
  selectedOffset,
  selectionInfo,
  endianness,
  onChangeEndianness,
  onEditByte,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  // Selected bytes array
  const selectedBytes = useMemo(() => {
    if (selectionInfo.length === 0 || selectionInfo.start === null || selectionInfo.end === null) {
      return new Uint8Array(0);
    }
    return bytes.slice(selectionInfo.start, selectionInfo.end + 1);
  }, [bytes, selectionInfo]);

  // Calculate Shannon Entropy
  const entropyStats = useMemo(() => {
    const targetArray = selectedBytes.length > 0 ? selectedBytes : bytes;
    if (targetArray.length === 0) return { entropy: 0, rating: "No data", color: "text-muted" };

    const frequencies = new Array(256).fill(0);
    for (let i = 0; i < targetArray.length; i++) {
      frequencies[targetArray[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const p = frequencies[i] / targetArray.length;
        entropy -= p * Math.log2(p);
      }
    }

    let rating = "Low Entropy (Structured)";
    let color = "text-success";

    if (entropy >= 7.5) {
      rating = "Very High (Encrypted/Compressed)";
      color = "text-danger font-bold";
    } else if (entropy >= 6.5) {
      rating = "High (Compressed/Media/Binary)";
      color = "text-warning";
    } else if (entropy >= 4.5) {
      rating = "Medium (Dense Binary/Executable)";
      color = "text-primary";
    } else if (entropy >= 3.0) {
      rating = "Low-Medium (Text/Source Code)";
      color = "text-success";
    }

    return {
      entropy,
      rating,
      color,
    };
  }, [bytes, selectedBytes]);

  // Calculate byte distribution for whole binary
  const byteDistribution = useMemo(() => {
    if (bytes.length === 0) return { nulls: 0, ascii: 0, control: 0, extended: 0 };
    let nulls = 0;
    let ascii = 0;
    let control = 0;
    let extended = 0;

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0) nulls++;
      else if (b >= 32 && b <= 126) ascii++;
      else if (b < 32 || b === 127) control++;
      else extended++;
    }

    const total = bytes.length;
    return {
      nulls: (nulls / total) * 100,
      ascii: (ascii / total) * 100,
      control: (control / total) * 100,
      extended: (extended / total) * 100,
      counts: { nulls, ascii, control, extended },
    };
  }, [bytes]);

  // Data Inspector conversions starting at selectedOffset
  const decodedValues = useMemo(() => {
    if (selectedOffset === null || selectedOffset >= bytes.length) return null;

    const isLE = endianness === "le";
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    const tempArray = new Uint8Array(buffer);

    const availableBytes = Math.min(8, bytes.length - selectedOffset);
    for (let i = 0; i < availableBytes; i++) {
      tempArray[i] = bytes[selectedOffset + i];
    }

    const result: Array<{ label: string; value: string; rawValue: string }> = [];

    // Helper to format values safely
    const formatValue = (label: string, reqBytes: number, getter: () => number | bigint | string) => {
      if (availableBytes < reqBytes) {
        return { label, value: "Out of Bounds", rawValue: "" };
      }
      try {
        const val = getter();
        return { label, value: val.toString(), rawValue: val.toString() };
      } catch {
        return { label, value: "Error", rawValue: "" };
      }
    };

    result.push(formatValue("Binary (8-bit)", 1, () => {
      const u8 = view.getUint8(0);
      return u8.toString(2).padStart(8, "0");
    }));

    result.push(formatValue("Int8 (Signed)", 1, () => view.getInt8(0)));
    result.push(formatValue("Uint8 (Unsigned)", 1, () => view.getUint8(0)));

    result.push(formatValue("Int16", 2, () => view.getInt16(0, isLE)));
    result.push(formatValue("Uint16", 2, () => view.getUint16(0, isLE)));

    result.push(formatValue("Int32", 4, () => view.getInt32(0, isLE)));
    result.push(formatValue("Uint32", 4, () => view.getUint32(0, isLE)));

    result.push(formatValue("Int64 (BigInt)", 8, () => view.getBigInt64(0, isLE)));
    result.push(formatValue("Uint64 (BigInt)", 8, () => view.getBigUint64(0, isLE)));

    result.push(formatValue("Float32", 4, () => {
      const f = view.getFloat32(0, isLE);
      return Number.isInteger(f) ? f : parseFloat(f.toFixed(6));
    }));

    result.push(formatValue("Float64 (Double)", 8, () => {
      const d = view.getFloat64(0, isLE);
      return Number.isInteger(d) ? d : parseFloat(d.toFixed(10));
    }));

    // Add ASCII representation
    const charCode = bytes[selectedOffset];
    const asciiStr = charCode >= 32 && charCode <= 126 
      ? `'${String.fromCharCode(charCode)}'` 
      : "Non-printable";
    result.push({ label: "ASCII Char", value: asciiStr, rawValue: charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : "" });

    return result;
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
    if (!isNaN(val) && val >= 0 && val <= 255) {
      onEditByte(selectedOffset, val);
    }
  };

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-base bg-surface-secondary flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-5 select-none">
      {/* 1. Selection Info Panel */}
      <div className="bg-surface-raised border border-base rounded-lg p-3.5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-primary font-semibold text-xs uppercase tracking-wider">
          <Info size={14} />
          <span>Selection Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-secondary block">Start Offset</span>
            <span className="font-mono font-medium text-main">
              {selectionInfo.start !== null ? `0x${selectionInfo.start.toString(16).toUpperCase()}` : "None"}
            </span>
          </div>
          <div>
            <span className="text-secondary block">End Offset</span>
            <span className="font-mono font-medium text-main">
              {selectionInfo.end !== null ? `0x${selectionInfo.end.toString(16).toUpperCase()}` : "None"}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-secondary block">Selection Size</span>
            <span className="font-medium text-main">
              {selectionInfo.length.toLocaleString()} byte{selectionInfo.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Shannon Entropy Panel */}
      <div className="bg-surface-raised border border-base rounded-lg p-3.5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-primary font-semibold text-xs uppercase tracking-wider">
          <Shield size={14} />
          <span>Shannon Entropy</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-lg font-bold text-main">
              {entropyStats.entropy.toFixed(4)}
            </span>
            <span className="text-[10px] text-secondary">bits/byte</span>
          </div>
          <div className={`text-xs ${entropyStats.color} leading-tight`}>
            {entropyStats.rating}
          </div>
          <p className="text-[10px] text-secondary leading-normal mt-1">
            {selectedBytes.length > 0
              ? "Calculated on current selection."
              : "Calculated on entire binary payload."}
          </p>
        </div>
      </div>

      {/* 3. Direct Byte Editor */}
      {selectedOffset !== null && selectedOffset < bytes.length && (
        <div className="bg-surface-raised border border-base rounded-lg p-3.5 shadow-sm space-y-2.5">
          <div className="text-primary font-semibold text-xs uppercase tracking-wider">
            Edit Selected Byte
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] text-secondary">Hex (00-FF)</span>
              <input
                type="text"
                maxLength={2}
                value={bytes[selectedOffset].toString(16).toUpperCase()}
                onChange={handleByteEdit}
                className="w-full mt-1 px-2.5 py-1 font-mono text-center text-sm font-bold bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main uppercase"
              />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] text-secondary">ASCII Value</span>
              <input
                type="text"
                maxLength={1}
                value={
                  bytes[selectedOffset] >= 32 && bytes[selectedOffset] <= 126
                    ? String.fromCharCode(bytes[selectedOffset])
                    : ""
                }
                onChange={(e) => {
                  if (e.target.value.length === 1) {
                    onEditByte(selectedOffset, e.target.value.charCodeAt(0));
                  }
                }}
                placeholder="."
                className="w-full mt-1 px-2.5 py-1 font-mono text-center text-sm font-bold bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Binary Inspector Panel */}
      <div className="flex-1 bg-surface-raised border border-base rounded-lg p-3.5 shadow-sm flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between pb-2.5 border-b border-base flex-shrink-0">
          <div className="flex items-center space-x-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Settings size={14} />
            <span>Data Inspector</span>
          </div>
          <div className="flex bg-canvas border border-base rounded p-0.5 text-[10px] font-semibold">
            <button
              onClick={() => onChangeEndianness("le")}
              className={`px-1.5 py-0.5 rounded-sm transition-colors ${
                endianness === "le" ? "bg-primary text-white shadow-sm" : "text-secondary hover:text-main"
              }`}
            >
              LE
            </button>
            <button
              onClick={() => onChangeEndianness("be")}
              className={`px-1.5 py-0.5 rounded-sm transition-colors ${
                endianness === "be" ? "bg-primary text-white shadow-sm" : "text-secondary hover:text-main"
              }`}
            >
              BE
            </button>
          </div>
        </div>

        {/* Decoder Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-2">
          {decodedValues ? (
            <div className="divide-y divide-base/50 space-y-1">
              {decodedValues.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleCopyValue(item.label, item.rawValue || item.value)}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-element-hover/30 rounded cursor-pointer transition-colors group"
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-[10px] font-medium text-secondary">{item.label}</span>
                    <span className="font-mono text-xs font-semibold text-main break-all mt-0.5">
                      {item.value}
                    </span>
                  </div>
                  {item.value !== "Out of Bounds" && (
                    <button className="text-secondary/50 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                      {copiedKey === item.label ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-secondary py-8">
              <Info size={24} className="text-muted mb-2" />
              <p className="text-xs leading-normal">
                Click a byte in the grid to view structured representations and conversions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Byte Frequency Stacked Histogram */}
      {bytes.length > 0 && (
        <div className="bg-surface-raised border border-base rounded-lg p-3.5 shadow-sm space-y-3 flex-shrink-0">
          <div className="text-primary font-semibold text-xs uppercase tracking-wider">
            Byte Distribution
          </div>
          <div className="space-y-2 text-xs">
            {/* Visual stacked percentage bar */}
            <div className="h-3 w-full rounded overflow-hidden flex bg-canvas border border-base">
              <div
                style={{ width: `${byteDistribution.nulls}%` }}
                title={`Null Bytes: ${byteDistribution.nulls.toFixed(1)}%`}
                className="h-full bg-muted/30"
              />
              <div
                style={{ width: `${byteDistribution.control}%` }}
                title={`Control Bytes: ${byteDistribution.control.toFixed(1)}%`}
                className="h-full bg-warning"
              />
              <div
                style={{ width: `${byteDistribution.ascii}%` }}
                title={`ASCII Characters: ${byteDistribution.ascii.toFixed(1)}%`}
                className="h-full bg-success"
              />
              <div
                style={{ width: `${byteDistribution.extended}%` }}
                title={`Extended Bytes: ${byteDistribution.extended.toFixed(1)}%`}
                className="h-full bg-info"
              />
            </div>

            {/* Labels checklist */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-muted/40 border border-base" />
                <span className="text-secondary">Null ({byteDistribution.counts.nulls})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-warning" />
                <span className="text-secondary">Control ({byteDistribution.counts.control})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-success" />
                <span className="text-secondary">ASCII ({byteDistribution.counts.ascii})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-info" />
                <span className="text-secondary">Extended ({byteDistribution.counts.extended})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
