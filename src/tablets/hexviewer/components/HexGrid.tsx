import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface HexGridProps {
  bytes: Uint8Array;
  startIndex: number; // Start offset of the current page
  bytesPerRow: number;
  selectedOffset: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  hoveredOffset: number | null;
  searchMatches: number[];
  currentSearchMatchIndex: number;
  onSelectByte: (offset: number, isRangeSelection: boolean) => void;
  onHoverByte: (offset: number | null) => void;
  onEditByte: (offset: number, value: number) => void;
}

export const HexGrid: React.FC<HexGridProps> = ({
  bytes,
  startIndex,
  bytesPerRow,
  selectedOffset,
  selectionStart,
  selectionEnd,
  hoveredOffset,
  searchMatches,
  currentSearchMatchIndex,
  onSelectByte,
  onHoverByte,
  onEditByte,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeNibble, setActiveNibble] = useState<0 | 1 | null>(null); // 0 = high nibble, 1 = low nibble

  const absoluteToRelative = useCallback((absOffset: number) => {
    return absOffset - startIndex;
  }, [startIndex]);

  const isSelected = useCallback((absOffset: number) => {
    if (selectedOffset === absOffset) return true;
    if (selectionStart === null || selectionEnd === null) return false;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return absOffset >= start && absOffset <= end;
  }, [selectedOffset, selectionStart, selectionEnd]);

  // O(1) lookup — searchMatches can be large for short patterns in big files
  const searchMatchSet = useMemo(() => new Set(searchMatches), [searchMatches]);

  const isSearchMatch = useCallback((absOffset: number) => {
    return searchMatchSet.has(absOffset);
  }, [searchMatchSet]);

  const isCurrentSearchMatch = useCallback((absOffset: number) => {
    if (currentSearchMatchIndex < 0 || currentSearchMatchIndex >= searchMatches.length) return false;
    return searchMatches[currentSearchMatchIndex] === absOffset;
  }, [searchMatches, currentSearchMatchIndex]);

  // Color categorizer for bytes
  const getByteCategoryClass = (byte: number) => {
    if (byte === 0) return "text-muted/40 font-normal"; // Null byte
    if (byte >= 32 && byte <= 126) return "text-success font-medium"; // Printable ASCII
    if ((byte > 0 && byte < 32) || byte === 127) return "text-warning font-semibold"; // Control chars
    return "text-info font-medium"; // Extended / other
  };

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedOffset === null) return;

      const pageLength = bytes.length;
      const totalLength = startIndex + pageLength;

      // 1. Navigation
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, selectedOffset - 1);
        onSelectByte(next, e.shiftKey);
        setActiveNibble(null);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(totalLength - 1, selectedOffset + 1);
        onSelectByte(next, e.shiftKey);
        setActiveNibble(null);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, selectedOffset - bytesPerRow);
        onSelectByte(next, e.shiftKey);
        setActiveNibble(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(totalLength - 1, selectedOffset + bytesPerRow);
        onSelectByte(next, e.shiftKey);
        setActiveNibble(null);
      } else if (e.key === "Home") {
        e.preventDefault();
        const rowStart = Math.floor(absoluteToRelative(selectedOffset) / bytesPerRow) * bytesPerRow;
        onSelectByte(startIndex + rowStart, e.shiftKey);
        setActiveNibble(null);
      } else if (e.key === "End") {
        e.preventDefault();
        const rowStart = Math.floor(absoluteToRelative(selectedOffset) / bytesPerRow) * bytesPerRow;
        const rowEnd = Math.min(pageLength - 1, rowStart + bytesPerRow - 1);
        onSelectByte(startIndex + rowEnd, e.shiftKey);
        setActiveNibble(null);
      }

      // 2. Hex Nibble Editing
      const hexChar = e.key.toLowerCase();
      const isHexKey = /^[0-9a-f]$/.test(hexChar);

      if (isHexKey) {
        e.preventDefault();
        const relativeIndex = absoluteToRelative(selectedOffset);
        if (relativeIndex < 0 || relativeIndex >= bytes.length) return;

        const currentByte = bytes[relativeIndex];
        const val = parseInt(hexChar, 16);

        if (activeNibble === null || activeNibble === 0) {
          // Edit high nibble: e.g. if byte is 0x48, hexChar is '3' -> new byte is 0x38
          const newByte = (currentByte & 0x0f) | (val << 4);
          onEditByte(selectedOffset, newByte);
          setActiveNibble(1); // Wait for low nibble
        } else {
          // Edit low nibble: e.g. if byte is 0x38, hexChar is 'a' -> new byte is 0x3a
          const newByte = (currentByte & 0xf0) | val;
          onEditByte(selectedOffset, newByte);
          setActiveNibble(null); // Edit done

          // Auto advance to next byte if available
          if (selectedOffset + 1 < totalLength) {
            onSelectByte(selectedOffset + 1, false);
          }
        }
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [
    bytes,
    startIndex,
    bytesPerRow,
    selectedOffset,
    activeNibble,
    onSelectByte,
    onEditByte,
    absoluteToRelative,
  ]);

  // Reset active nibble when selection changes externally
  useEffect(() => {
    setActiveNibble(null);
  }, [selectedOffset]);

  const formatOffset = (offset: number) => offset.toString(16).toUpperCase().padStart(8, "0");
  const formatByteHex = (byte: number) => byte.toString(16).toUpperCase().padStart(2, "0");
  const renderAsciiChar = (byte: number) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".");

  const rows = useMemo(() => {
    const result: number[][] = [];
    for (let i = 0; i < bytes.length; i += bytesPerRow) {
      const row: number[] = [];
      for (let j = 0; j < bytesPerRow && i + j < bytes.length; j++) {
        row.push(bytes[i + j]);
      }
      result.push(row);
    }
    return result;
  }, [bytes, bytesPerRow]);

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      className="flex-1 font-mono text-sm bg-surface-raised border border-base rounded-lg shadow-inner overflow-auto custom-scrollbar focus:outline-none focus:ring-1 focus:ring-focus select-none p-4"
      aria-label="Hexadecimal Grid"
    >
      <div className="min-w-[640px] flex flex-col space-y-1">
        {/* Grid Header */}
        <div className="flex text-xs font-semibold text-muted border-b border-base pb-1.5 mb-1.5">
          <div className="w-[90px] flex-shrink-0">Offset</div>
          <div className="flex-1 flex justify-between px-4 max-w-[500px]">
            {Array.from({ length: bytesPerRow }).map((_, i) => (
              <span
                key={i}
                className={`w-[24px] text-center ${
                  selectedOffset !== null &&
                  (selectedOffset - startIndex) % bytesPerRow === i
                    ? "text-primary font-bold"
                    : ""
                }`}
              >
                {i.toString(16).toUpperCase().padStart(2, "0")}
              </span>
            ))}
          </div>
          <div className="w-[180px] flex-shrink-0 pl-4 border-l border-base">Decoded ASCII</div>
        </div>

        {/* Grid Rows */}
        {rows.map((row, rowIndex) => {
          const rowStartOffset = startIndex + rowIndex * bytesPerRow;

          return (
            <div key={rowIndex} className="flex items-center hover:bg-element-hover/30 py-0.5 rounded-sm transition-colors">
              {/* Offset Column */}
              <div className="w-[90px] flex-shrink-0 text-muted/80 select-all select-none">
                {formatOffset(rowStartOffset)}
              </div>

              {/* Bytes Hex Grid */}
              <div className="flex-1 flex justify-between px-4 max-w-[500px]">
                {row.map((byte, byteIndex) => {
                  const absoluteOffset = rowStartOffset + byteIndex;
                  const hovered = hoveredOffset === absoluteOffset;
                  const selected = isSelected(absoluteOffset);
                  const isMatch = isSearchMatch(absoluteOffset);
                  const isCurrentMatch = isCurrentSearchMatch(absoluteOffset);

                  let bgClass = "";
                  if (isCurrentMatch) {
                    bgClass = "bg-warning/80 text-warning-subtle-text font-bold scale-105 shadow-sm";
                  } else if (isMatch) {
                    bgClass = "bg-warning-subtle-bg/40 text-warning-subtle-text";
                  } else if (selected) {
                    bgClass = "bg-primary/25 text-primary font-semibold ring-1 ring-primary/40";
                  } else if (hovered) {
                    bgClass = "bg-element-hover text-main ring-1 ring-base";
                  }

                  return (
                    <div
                      key={byteIndex}
                      onClick={(e) => { onSelectByte(absoluteOffset, e.shiftKey); gridRef.current?.focus(); }}
                      onMouseEnter={() => onHoverByte(absoluteOffset)}
                      onMouseLeave={() => onHoverByte(null)}
                      className={`w-[24px] h-[20px] flex items-center justify-center rounded-sm cursor-pointer transition-all duration-75 relative ${bgClass}`}
                      data-testid={`byte-${absoluteOffset}`}
                    >
                      <span className={selected || isMatch ? "" : getByteCategoryClass(byte)}>
                        {formatByteHex(byte)}
                      </span>

                      {/* Cursor indicator on active nibble */}
                      {selectedOffset === absoluteOffset && activeNibble !== null && (
                        <span
                          className={`absolute bottom-0 h-0.5 bg-primary transition-all duration-100 ${
                            activeNibble === 0 ? "left-0.5 w-[8px]" : "right-0.5 w-[8px]"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
                {/* Pad end of last row if incomplete */}
                {row.length < bytesPerRow &&
                  Array.from({ length: bytesPerRow - row.length }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-[24px]" />
                  ))}
              </div>

              {/* ASCII Representation Column */}
              <div className="w-[180px] flex-shrink-0 pl-4 border-l border-base flex items-center select-all select-none">
                {row.map((byte, byteIndex) => {
                  const absoluteOffset = rowStartOffset + byteIndex;
                  const hovered = hoveredOffset === absoluteOffset;
                  const selected = isSelected(absoluteOffset);
                  const isMatch = isSearchMatch(absoluteOffset);
                  const isCurrentMatch = isCurrentSearchMatch(absoluteOffset);

                  let bgClass = "";
                  if (isCurrentMatch) {
                    bgClass = "bg-warning text-warning-subtle-text font-bold";
                  } else if (isMatch) {
                    bgClass = "bg-warning-subtle-bg/40 text-warning-subtle-text";
                  } else if (selected) {
                    bgClass = "bg-primary/20 text-primary font-bold";
                  } else if (hovered) {
                    bgClass = "bg-element-hover text-main";
                  }

                  return (
                    <span
                      key={byteIndex}
                      onClick={(e) => { onSelectByte(absoluteOffset, e.shiftKey); gridRef.current?.focus(); }}
                      onMouseEnter={() => onHoverByte(absoluteOffset)}
                      onMouseLeave={() => onHoverByte(null)}
                      className={`inline-block w-[11px] text-center cursor-pointer transition-all rounded-sm leading-none py-0.5 ${bgClass} ${
                        selected || isMatch ? "" : getByteCategoryClass(byte)
                      }`}
                    >
                      {renderAsciiChar(byte)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {bytes.length === 0 && (
          <div className="text-center py-8 text-secondary">
            No binary data loaded. Paste text or upload a file.
          </div>
        )}
      </div>
    </div>
  );
};
