import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Tablet, TabletState } from "../types";
import { HexViewerTabletState, InputFormat } from "./types";
import { Toolbar } from "./components/Toolbar";
import { HexGrid } from "./components/HexGrid";
import { SidebarInspector } from "./components/SidebarInspector";
import { Binary, Shield, FileText } from "../../components/Icons";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB Limit for smooth local processing

// Array+join avoids O(n²) string allocation from repeated immutable string concat
const bytesToHexStr = (bytes: Uint8Array): string => {
  const parts = new Array<string>(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    parts[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return parts.join("");
};

const hexStrToBytes = (hex: string): Uint8Array => {
  if (!hex) return new Uint8Array(0);
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const len = clean.length / 2;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return u8;
};

const findSequenceMatches = (dataBytes: Uint8Array, queryBytes: Uint8Array): number[] => {
  if (queryBytes.length === 0 || dataBytes.length === 0) return [];
  const matches: number[] = [];
  for (let i = 0; i <= dataBytes.length - queryBytes.length; i++) {
    let match = true;
    for (let j = 0; j < queryBytes.length; j++) {
      if (dataBytes[i + j] !== queryBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      matches.push(i);
    }
  }
  return matches;
};

interface HexViewerTabletUIProps {
  state: HexViewerTabletState;
  onChange: (newState: HexViewerTabletState) => void;
  tabletId: string;
}

const HexViewerTabletUI: React.FC<HexViewerTabletUIProps> = ({
  state,
  onChange,
  tabletId,
}) => {
  const {
    inputFormat,
    inputText,
    bytesHex,
    fileInfo,
    bytesPerRow,
    pageSize,
    currentPage,
    selectedOffset,
    selectionStart,
    selectionEnd,
    hoveredOffset,
    searchQuery,
    searchType,
    searchMatches,
    currentSearchMatchIndex,
    endianness,
  } = state.data;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const bytes = useMemo(() => hexStrToBytes(bytesHex), [bytesHex]);

  const selectionInfo = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) {
      return {
        start: selectedOffset,
        end: selectedOffset,
        length: selectedOffset !== null ? 1 : 0,
      };
    }
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return {
      start,
      end,
      length: end - start + 1,
    };
  }, [selectedOffset, selectionStart, selectionEnd]);

  const updateData = useCallback(
    (updates: Partial<typeof state.data>) => {
      const newState = {
        ...stateRef.current,
        data: {
          ...stateRef.current.data,
          ...updates,
        },
      };
      stateRef.current = newState;
      onChange(newState);
    },
    // stateRef.current is kept in sync on every render (line above), so `state` is
    // intentionally excluded — closing over stateRef avoids stale-closure bugs when
    // multiple updateData calls fire before the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  // Sync / Convert InputText into bytesHex whenever inputText or inputFormat changes
  useEffect(() => {
    if (inputFormat === "file") return;

    setParsingError(null);
    if (!inputText.trim()) {
      updateData({ bytesHex: "", searchMatches: [], currentSearchMatchIndex: 0 });
      return;
    }

    try {
      let u8 = new Uint8Array(0);

      if (inputFormat === "hex") {
        const clean = inputText.replace(/[^0-9a-fA-F]/g, "");
        if (clean.length % 2 !== 0 && clean.length > 0) {
          // Keep typing but don't error immediately on odd length
        }
        u8 = hexStrToBytes(clean);
      } else if (inputFormat === "base64") {
        try {
          const cleaned = inputText.replace(/\s/g, "");
          const decoded = atob(cleaned);
          u8 = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            u8[i] = decoded.charCodeAt(i);
          }
        } catch {
          setParsingError("Invalid Base64 sequence");
          return;
        }
      } else if (inputFormat === "raw") {
        u8 = new TextEncoder().encode(inputText);
      }

      updateData({ bytesHex: bytesToHexStr(u8) });
    } catch (err) {
      setParsingError(err instanceof Error ? err.message : "Parsing error");
    }
    // Deliberately excluding updateData from dependencies to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, inputFormat]);

  // Search Match Indexer
  useEffect(() => {
    if (!searchQuery.trim() || bytes.length === 0) {
      updateData({ searchMatches: [], currentSearchMatchIndex: 0 });
      return;
    }

    let searchBytes = new Uint8Array(0);

    if (searchType === "hex") {
      const clean = searchQuery.replace(/[^0-9a-fA-F]/g, "");
      if (clean.length % 2 === 0 && clean.length > 0) {
        searchBytes = hexStrToBytes(clean);
      } else {
        return; // Wait for full hex bytes
      }
    } else {
      searchBytes = new TextEncoder().encode(searchQuery);
    }

    const matches = findSequenceMatches(bytes, searchBytes);
    updateData({ searchMatches: matches, currentSearchMatchIndex: 0 });

    // Auto-jump to the first match if available
    if (matches.length > 0) {
      const targetOffset = matches[0];
      const targetPage = Math.floor(targetOffset / pageSize);
      updateData({
        searchMatches: matches,
        currentSearchMatchIndex: 0,
        currentPage: targetPage,
        selectedOffset: targetOffset,
        selectionStart: targetOffset,
        selectionEnd: targetOffset + searchBytes.length - 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchType, bytesHex, pageSize]);

  // Handle Search Match Navigation
  const handleNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentSearchMatchIndex + 1) % searchMatches.length;
    const targetOffset = searchMatches[nextIdx];
    const targetPage = Math.floor(targetOffset / pageSize);

    let searchLen = 1;
    if (searchQuery) {
      searchLen = searchType === "hex" 
        ? searchQuery.replace(/[^0-9a-fA-F]/g, "").length / 2 
        : new TextEncoder().encode(searchQuery).length;
    }

    updateData({
      currentSearchMatchIndex: nextIdx,
      currentPage: targetPage,
      selectedOffset: targetOffset,
      selectionStart: targetOffset,
      selectionEnd: targetOffset + searchLen - 1,
    });
  }, [searchMatches, currentSearchMatchIndex, pageSize, searchQuery, searchType, updateData]);

  const handlePrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentSearchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    const targetOffset = searchMatches[prevIdx];
    const targetPage = Math.floor(targetOffset / pageSize);

    let searchLen = 1;
    if (searchQuery) {
      searchLen = searchType === "hex" 
        ? searchQuery.replace(/[^0-9a-fA-F]/g, "").length / 2 
        : new TextEncoder().encode(searchQuery).length;
    }

    updateData({
      currentSearchMatchIndex: prevIdx,
      currentPage: targetPage,
      selectedOffset: targetOffset,
      selectionStart: targetOffset,
      selectionEnd: targetOffset + searchLen - 1,
    });
  }, [searchMatches, currentSearchMatchIndex, pageSize, searchQuery, searchType, updateData]);

  // File Upload Handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setParsingError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max supported size is 2MB for smooth browser rendering.`);
      return;
    }

    setParsingError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const u8 = new Uint8Array(arrayBuffer);
        const hex = bytesToHexStr(u8);
        updateData({
          bytesHex: hex,
          inputText: "",
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
          },
          currentPage: 0,
          selectedOffset: null,
          selectionStart: null,
          selectionEnd: null,
        });
      }
    };
    reader.onerror = () => {
      setParsingError("Error reading file.");
    };
    reader.readAsArrayBuffer(file);
  };

  // Selection Handler
  const handleSelectByte = useCallback(
    (offset: number, isRangeSelection: boolean) => {
      if (isRangeSelection && selectionStart !== null) {
        updateData({
          selectedOffset: offset,
          selectionEnd: offset,
        });
      } else {
        updateData({
          selectedOffset: offset,
          selectionStart: offset,
          selectionEnd: offset,
        });
      }
    },
    [selectionStart, updateData]
  );

  const handleHoverByte = useCallback(
    (offset: number | null) => {
      updateData({ hoveredOffset: offset });
    },
    [updateData]
  );

  const handleEditByte = useCallback(
    (offset: number, val: number) => {
      // Splice two hex chars directly — avoids copying the full buffer on every keystroke
      const pos = offset * 2;
      if (pos < 0 || pos >= bytesHex.length) return;
      const newByteHex = val.toString(16).padStart(2, "0");
      const newHex = bytesHex.slice(0, pos) + newByteHex + bytesHex.slice(pos + 2);

      let newText = inputText;
      if (inputFormat === "hex") {
        newText = newHex.match(/.{1,2}/g)?.join(" ") || newHex;
      } else if (inputFormat === "base64") {
        const newBytes = hexStrToBytes(newHex);
        // Loop instead of spread to avoid call-stack overflow on large buffers
        let binary = "";
        for (let i = 0; i < newBytes.length; i++) binary += String.fromCharCode(newBytes[i]);
        newText = btoa(binary);
      } else if (inputFormat === "raw") {
        newText = new TextDecoder().decode(hexStrToBytes(newHex));
      }

      updateData({ bytesHex: newHex, inputText: newText });
    },
    [bytesHex, inputFormat, inputText, updateData]
  );

  // Pagination totals
  const totalPages = Math.ceil(bytes.length / pageSize);
  const pageBytes = useMemo(() => {
    const start = currentPage * pageSize;
    const end = Math.min(bytes.length, start + pageSize);
    return bytes.slice(start, end);
  }, [bytes, currentPage, pageSize]);

  // Format Exports
  const handleExport = useCallback(
    (format: "hex-space" | "hex-raw" | "base64" | "c-array" | "json-array" | "bin") => {
      if (bytes.length === 0) return;

      let exportBytes = bytes;
      // If there's an active selection range, export only the selection!
      if (selectionStart !== null && selectionEnd !== null) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        exportBytes = bytes.slice(start, end + 1);
      }

      if (format === "bin") {
        const blob = new Blob([exportBytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileInfo?.name 
          ? `extracted_${fileInfo.name}` 
          : "extracted_binary.bin";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      let content = "";
      if (format === "hex-space") {
        const temp: string[] = [];
        for (let i = 0; i < exportBytes.length; i++) {
          temp.push(exportBytes[i].toString(16).toUpperCase().padStart(2, "0"));
        }
        content = temp.join(" ");
      } else if (format === "hex-raw") {
        content = bytesToHexStr(exportBytes).toUpperCase();
      } else if (format === "base64") {
        content = btoa(String.fromCharCode(...exportBytes));
      } else if (format === "c-array") {
        const temp: string[] = [];
        for (let i = 0; i < exportBytes.length; i++) {
          temp.push(`0x${exportBytes[i].toString(16).toUpperCase().padStart(2, "0")}`);
        }
        content = `unsigned char rawData[${exportBytes.length}] = {\n  ${temp.join(", ")}\n};`;
      } else if (format === "json-array") {
        const temp: number[] = Array.from(exportBytes);
        content = JSON.stringify(temp);
      }

      navigator.clipboard.writeText(content);
    },
    [bytes, selectionStart, selectionEnd, fileInfo]
  );

  const handleClear = useCallback(() => {
    updateData({
      inputText: "",
      bytesHex: "",
      fileInfo: null,
      currentPage: 0,
      selectedOffset: null,
      selectionStart: null,
      selectionEnd: null,
      searchQuery: "",
      searchMatches: [],
    });
    setParsingError(null);
  }, [updateData]);

  return (
    <div className="h-full flex flex-col bg-canvas text-main font-sans" data-tablet-id={tabletId}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toolbar */}
      <Toolbar
        inputFormat={inputFormat}
        onChangeInputFormat={(fmt) => updateData({ inputFormat: fmt })}
        onUploadClick={handleUploadClick}
        onClear={handleClear}
        bytesPerRow={bytesPerRow}
        onChangeBytesPerRow={(val) => updateData({ bytesPerRow: val })}
        pageSize={pageSize}
        onChangePageSize={(val) => updateData({ pageSize: val, currentPage: 0 })}
        currentPage={currentPage}
        totalPages={totalPages}
        totalBytes={bytes.length}
        onChangePage={(p) => updateData({ currentPage: p })}
        searchQuery={searchQuery}
        onChangeSearchQuery={(q) => updateData({ searchQuery: q })}
        searchType={searchType}
        onChangeSearchType={(t) => updateData({ searchType: t })}
        searchMatchesCount={searchMatches.length}
        currentMatchIndex={currentSearchMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onExport={handleExport}
        hasData={bytes.length > 0}
      />

      {/* Error Banner */}
      {parsingError && (
        <div className="bg-danger-subtle-bg/25 border-b border-danger/30 text-danger-subtle-text text-xs py-2 px-4 flex items-center space-x-2 flex-shrink-0 animate-pulse">
          <Shield size={14} className="text-danger" />
          <span>{parsingError}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Source paste/editor (collapsible) - Only if input format is not 'file' */}
        {inputFormat !== "file" && (
          <div className="w-[280px] flex-shrink-0 border-r border-base bg-surface flex flex-col select-none relative group/editor">
            <div className="p-3 border-b border-base flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-secondary uppercase flex items-center space-x-1.5">
                <FileText size={12} />
                <span>Source Input Editor</span>
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => updateData({ inputText: e.target.value })}
              placeholder={
                inputFormat === "hex"
                  ? "Paste raw hex string here (e.g. 48 65 6c 6c 6f)"
                  : inputFormat === "base64"
                    ? "Paste Base64 encoded string..."
                    : "Enter plain raw text here..."
              }
              className="flex-1 p-3 font-mono text-xs bg-canvas text-main placeholder-muted resize-none border-none outline-none focus:ring-0 custom-scrollbar"
            />
          </div>
        )}

        {/* Binary Byte Grid container */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
          {bytes.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Offset header summary */}
              <div className="flex items-center justify-between text-xs text-secondary mb-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Binary size={14} className="text-primary animate-pulse" />
                  <span className="font-semibold">
                    {fileInfo ? `${fileInfo.name} (${(fileInfo.size / 1024).toFixed(2)} KB)` : `Buffer payload (${bytes.length} bytes)`}
                  </span>
                </div>
                {selectionInfo.length > 0 && (
                  <span className="bg-primary-subtle-bg/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                    Selection: {selectionInfo.length} byte{selectionInfo.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Core interactive grid */}
              <HexGrid
                bytes={pageBytes}
                startIndex={currentPage * pageSize}
                bytesPerRow={bytesPerRow}
                selectedOffset={selectedOffset}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                hoveredOffset={hoveredOffset}
                searchMatches={searchMatches}
                currentSearchMatchIndex={currentSearchMatchIndex}
                onSelectByte={handleSelectByte}
                onHoverByte={handleHoverByte}
                onEditByte={handleEditByte}
              />
            </div>
          ) : (
            // Premium Drag-and-Drop Dropzone Empty State
            <div
              onClick={inputFormat === "file" ? handleUploadClick : undefined}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed border-base rounded-xl m-4 bg-surface-secondary/40 hover:bg-surface-secondary/60 hover:border-primary/50 transition-all ${
                inputFormat === "file" ? "cursor-pointer group" : ""
              }`}
            >
              <div className="p-6 bg-surface-raised border border-base rounded-full shadow-sm mb-4 group-hover:scale-105 transition-all text-primary">
                <Binary size={36} />
              </div>
              <h3 className="text-base font-bold text-main">
                {inputFormat === "file" ? "Upload or drag binary file" : "Ready for binary input"}
              </h3>
              <p className="text-secondary text-xs mt-1 max-w-sm text-center px-4 leading-normal">
                {inputFormat === "file"
                  ? "Select any binary file up to 2MB. All calculations, hex rendering, and data inspectors run entirely offline."
                  : `Select input format '${inputFormat.toUpperCase()}' above and type or paste content in the Left Editor to view visual byte layout.`}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Inspector Drawer */}
        <SidebarInspector
          bytes={bytes}
          selectedOffset={selectedOffset}
          selectionInfo={selectionInfo}
          endianness={endianness}
          onChangeEndianness={(end) => updateData({ endianness: end })}
          onEditByte={handleEditByte}
        />
      </div>
    </div>
  );
};

const HexViewerTabletWrapper: React.FC<{
  state: HexViewerTabletState;
  onChange: (newState: HexViewerTabletState) => void;
}> = ({ state, onChange }) => {
  const instanceId = React.useMemo(() => `hexviewer-${crypto.randomUUID()}`, []);
  return (
    <HexViewerTabletUI
      state={state}
      onChange={onChange}
      tabletId={instanceId}
    />
  );
};

export const HexViewerTablet: Tablet = {
  id: "hexviewer",
  label: "Hex Viewer / Binary Inspector",
  keywords: ["hex", "binary", "base64", "inspector", "editor", "bytes", "entropy", "raw", "octal", "viewer"],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInitialState(payload?: any): HexViewerTabletState {
    const initialContent = payload?.content || "";
    // If it looks like base64 or hex, select the inputFormat accordingly
    let initialFormat: InputFormat = "raw";
    if (initialContent) {
      if (/^[0-9a-fA-F\s]+$/.test(initialContent) && initialContent.length > 4) {
        initialFormat = "hex";
      } else if (/^[A-Za-z0-9+/=\s\n]+$/.test(initialContent) && initialContent.endsWith("=") && initialContent.length > 4) {
        initialFormat = "base64";
      }
    }

    return {
      type: "hexviewer",
      data: {
        inputFormat: initialFormat,
        inputText: initialContent,
        bytesHex: "",
        fileInfo: null,
        bytesPerRow: 16,
        pageSize: 512,
        currentPage: 0,
        selectedOffset: null,
        selectionStart: null,
        selectionEnd: null,
        hoveredOffset: null,
        searchQuery: "",
        searchType: "text",
        searchMatches: [],
        currentSearchMatchIndex: 0,
        endianness: "le",
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json) as HexViewerTabletState;
      if (parsed.type === "hexviewer" && parsed.data) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse Hex Viewer tablet state:", e);
    }
    return this.createInitialState();
  },

  render(state: HexViewerTabletState, onChange) {
    return <HexViewerTabletWrapper state={state} onChange={onChange} />;
  },
};

export default HexViewerTablet;
