import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Tablet, TabletState } from "../types";
import { HexViewerTabletState, InputFormat } from "./types";
import { Toolbar } from "./components/Toolbar";
import { HexGrid } from "./components/HexGrid";
import { SidebarInspector } from "./components/SidebarInspector";
import { KeyboardShortcutsOverlay } from "./components/KeyboardShortcutsOverlay";
import { Binary, Shield, FileText, Tag } from "../../components/Icons";
import { detectMagicBytes } from "./utils/magicBytes";
import { pushEdit, applyUndo, applyRedo, canUndo, canRedo, createHistory } from "./utils/editHistory";
import { useModalStore } from "../../stores/modalStore";

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
const LARGE_FILE_WARNING = 8 * 1024 * 1024; // Warn at 8 MB

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
  const len = Math.floor(clean.length / 2);
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
      if (dataBytes[i + j] !== queryBytes[j]) { match = false; break; }
    }
    if (match) matches.push(i);
  }
  return matches;
};

// Build a new Uint8Array replacing all occurrences of `search` with `replace`
const replaceAllBytes = (data: Uint8Array, search: Uint8Array, replace: Uint8Array): Uint8Array => {
  if (search.length === 0) return data;
  const matches = findSequenceMatches(data, search);
  if (matches.length === 0) return data;

  const parts: Uint8Array[] = [];
  let cursor = 0;
  for (const pos of matches) {
    if (pos < cursor) continue; // skip matches inside an already-replaced region
    if (pos > cursor) parts.push(data.slice(cursor, pos));
    parts.push(replace);
    cursor = pos + search.length;
  }
  if (cursor < data.length) parts.push(data.slice(cursor));

  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
};

const computeInputText = (hex: string, format: InputFormat, oldText: string): string => {
  if (format === "file") return oldText;
  if (format === "hex") return hex.match(/.{1,2}/g)?.join(" ") || hex;
  if (format === "base64") {
    const bytes = hexStrToBytes(hex);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  if (format === "raw") return new TextDecoder().decode(hexStrToBytes(hex));
  return oldText;
};

interface HexViewerTabletUIProps {
  state: HexViewerTabletState;
  onChange: (newState: HexViewerTabletState) => void;
  tabletId: string;
}

const HexViewerTabletUI: React.FC<HexViewerTabletUIProps> = ({ state, onChange, tabletId }) => {
  const {
    inputFormat, inputText, bytesHex, fileInfo, detectedFileType,
    bytesPerRow, pageSize, currentPage,
    selectedOffset, selectionStart, selectionEnd, hoveredOffset,
    searchQuery, searchType, searchMatches, currentSearchMatchIndex,
    replaceQuery, endianness, activeSidebarTab,
    editHistory, editHistoryIndex,
  } = state.data;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const { setGlobalDragDropSuppressed } = useModalStore();

  // Suppress the app-level file drop overlay while this tablet is mounted,
  // so dropping a binary file lands in the hex viewer instead of opening a new tab.
  useEffect(() => {
    setGlobalDragDropSuppressed(true);
    return () => setGlobalDragDropSuppressed(false);
  }, [setGlobalDragDropSuppressed]);

  const bytes = useMemo(() => hexStrToBytes(bytesHex), [bytesHex]);

  const selectionInfo = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) {
      return { start: selectedOffset, end: selectedOffset, length: selectedOffset !== null ? 1 : 0 };
    }
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return { start, end, length: end - start + 1 };
  }, [selectedOffset, selectionStart, selectionEnd]);

  const updateData = useCallback(
    (updates: Partial<typeof state.data>) => {
      const newState = { ...stateRef.current, data: { ...stateRef.current.data, ...updates } };
      stateRef.current = newState;
      onChange(newState);
    },
    // stateRef is kept in sync each render; onChange is the only real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  // Sync inputText → bytesHex whenever text or format changes
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
        u8 = hexStrToBytes(inputText.replace(/[^0-9a-fA-F]/g, ""));
      } else if (inputFormat === "base64") {
        try {
          const decoded = atob(inputText.replace(/\s/g, ""));
          u8 = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) u8[i] = decoded.charCodeAt(i);
        } catch {
          setParsingError("Invalid Base64 sequence");
          return;
        }
      } else if (inputFormat === "raw") {
        u8 = new TextEncoder().encode(inputText);
      }
      updateData({ bytesHex: bytesToHexStr(u8), detectedFileType: null });
    } catch (err) {
      setParsingError(err instanceof Error ? err.message : "Parsing error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, inputFormat]);

  // Search indexer
  useEffect(() => {
    if (!searchQuery.trim() || bytes.length === 0) {
      updateData({ searchMatches: [], currentSearchMatchIndex: 0 });
      return;
    }
    let searchBytes = new Uint8Array(0);
    if (searchType === "hex") {
      const clean = searchQuery.replace(/[^0-9a-fA-F]/g, "");
      if (clean.length % 2 !== 0 || clean.length === 0) return;
      searchBytes = hexStrToBytes(clean);
    } else {
      searchBytes = new TextEncoder().encode(searchQuery);
    }
    const matches = findSequenceMatches(bytes, searchBytes);
    if (matches.length > 0) {
      const target = matches[0];
      updateData({
        searchMatches: matches,
        currentSearchMatchIndex: 0,
        currentPage: Math.floor(target / pageSize),
        selectedOffset: target,
        selectionStart: target,
        selectionEnd: target + searchBytes.length - 1,
      });
    } else {
      updateData({ searchMatches: matches, currentSearchMatchIndex: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchType, bytesHex, pageSize]);

  const searchBytesLength = useMemo(() => {
    if (!searchQuery) return 1;
    return searchType === "hex"
      ? searchQuery.replace(/[^0-9a-fA-F]/g, "").length / 2
      : new TextEncoder().encode(searchQuery).length;
  }, [searchQuery, searchType]);

  const handleNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const idx = (currentSearchMatchIndex + 1) % searchMatches.length;
    const target = searchMatches[idx];
    updateData({ currentSearchMatchIndex: idx, currentPage: Math.floor(target / pageSize), selectedOffset: target, selectionStart: target, selectionEnd: target + searchBytesLength - 1 });
  }, [searchMatches, currentSearchMatchIndex, pageSize, searchBytesLength, updateData]);

  const handlePrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const idx = (currentSearchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    const target = searchMatches[idx];
    updateData({ currentSearchMatchIndex: idx, currentPage: Math.floor(target / pageSize), selectedOffset: target, selectionStart: target, selectionEnd: target + searchBytesLength - 1 });
  }, [searchMatches, currentSearchMatchIndex, pageSize, searchBytesLength, updateData]);

  const handleReplaceAll = useCallback(() => {
    if (!searchQuery || bytes.length === 0) return;
    let searchBytes: Uint8Array;
    let replaceBytes: Uint8Array;
    if (searchType === "hex") {
      const sClean = searchQuery.replace(/[^0-9a-fA-F]/g, "");
      const rClean = replaceQuery.replace(/[^0-9a-fA-F]/g, "");
      if (sClean.length % 2 !== 0 || rClean.length % 2 !== 0) return;
      searchBytes = hexStrToBytes(sClean);
      replaceBytes = hexStrToBytes(rClean);
    } else {
      searchBytes = new TextEncoder().encode(searchQuery);
      replaceBytes = new TextEncoder().encode(replaceQuery);
    }
    const newBytes = replaceAllBytes(bytes, searchBytes, replaceBytes);
    const newHexStr = bytesToHexStr(newBytes);
    updateData({
      bytesHex: newHexStr,
      inputText: computeInputText(newHexStr, inputFormat, inputText),
      searchMatches: [],
      currentSearchMatchIndex: 0,
      selectedOffset: null,
      selectionStart: null,
      selectionEnd: null,
    });
  }, [bytes, searchQuery, replaceQuery, searchType, inputFormat, inputText, updateData]);

  const handleJumpToOffset = useCallback((offset: number) => {
    if (offset < 0 || offset >= bytes.length) return;
    const page = Math.floor(offset / pageSize);
    updateData({ currentPage: page, selectedOffset: offset, selectionStart: offset, selectionEnd: offset });
  }, [bytes.length, pageSize, updateData]);

  // File upload — handles both input[file] and drag-and-drop
  const processFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setParsingError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max is 16 MB.`);
      return;
    }
    const warning = file.size > LARGE_FILE_WARNING
      ? `Large file (${(file.size / (1024 * 1024)).toFixed(1)} MB) — rendering may be slower.`
      : null;
    if (warning) setParsingError(warning);
    else setParsingError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer;
      if (!buf) return;
      const u8 = new Uint8Array(buf);
      const detected = detectMagicBytes(u8);
      // inputFormat must be set to "file" here so the inputText→bytesHex sync
      // useEffect (which only skips when inputFormat === "file") does not wipe bytesHex.
      updateData({
        inputFormat: "file",
        bytesHex: bytesToHexStr(u8),
        inputText: "",
        fileInfo: { name: file.name, size: file.size, type: file.type || "application/octet-stream" },
        detectedFileType: detected,
        currentPage: 0,
        selectedOffset: null,
        selectionStart: null,
        selectionEnd: null,
        editHistory: [],
        editHistoryIndex: -1,
      });
    };
    reader.onerror = () => setParsingError("Error reading file.");
    reader.readAsArrayBuffer(file);
  }, [updateData]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleSelectByte = useCallback((offset: number, isRange: boolean) => {
    if (isRange && selectionStart !== null) {
      updateData({ selectedOffset: offset, selectionEnd: offset });
    } else {
      updateData({ selectedOffset: offset, selectionStart: offset, selectionEnd: offset });
    }
  }, [selectionStart, updateData]);

  const handleHoverByte = useCallback((offset: number | null) => {
    updateData({ hoveredOffset: offset });
  }, [updateData]);

  const handleEditByte = useCallback((offset: number, val: number) => {
    const pos = offset * 2;
    if (pos < 0 || pos >= bytesHex.length) return;
    const oldValue = parseInt(bytesHex.slice(pos, pos + 2), 16);
    const newHexByte = val.toString(16).padStart(2, "0");
    const newHex = bytesHex.slice(0, pos) + newHexByte + bytesHex.slice(pos + 2);

    const hist = pushEdit({ entries: editHistory, index: editHistoryIndex }, { offset, oldValue, newValue: val });
    updateData({ bytesHex: newHex, inputText: computeInputText(newHex, inputFormat, inputText), editHistory: hist.entries, editHistoryIndex: hist.index });
  }, [bytesHex, inputFormat, inputText, editHistory, editHistoryIndex, updateData]);

  const handleUndo = useCallback(() => {
    const hist = { entries: editHistory, index: editHistoryIndex };
    const result = applyUndo(hist);
    if (!result) return;
    const { history: newHist, entry } = result;
    const pos = entry.offset * 2;
    const oldHex = entry.oldValue.toString(16).padStart(2, "0");
    const newHexStr = bytesHex.slice(0, pos) + oldHex + bytesHex.slice(pos + 2);
    updateData({ bytesHex: newHexStr, inputText: computeInputText(newHexStr, inputFormat, inputText), editHistory: newHist.entries, editHistoryIndex: newHist.index });
  }, [bytesHex, inputFormat, inputText, editHistory, editHistoryIndex, updateData]);

  const handleRedo = useCallback(() => {
    const hist = { entries: editHistory, index: editHistoryIndex };
    const result = applyRedo(hist);
    if (!result) return;
    const { history: newHist, entry } = result;
    const pos = entry.offset * 2;
    const newHexByte = entry.newValue.toString(16).padStart(2, "0");
    const newHexStr = bytesHex.slice(0, pos) + newHexByte + bytesHex.slice(pos + 2);
    updateData({ bytesHex: newHexStr, inputText: computeInputText(newHexStr, inputFormat, inputText), editHistory: newHist.entries, editHistoryIndex: newHist.index });
  }, [bytesHex, inputFormat, inputText, editHistory, editHistoryIndex, updateData]);

  // Keyboard shortcut handler (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / ?)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?") { setShowShortcuts(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const totalPages = Math.ceil(bytes.length / pageSize);
  const pageBytes = useMemo(() => {
    const start = currentPage * pageSize;
    return bytes.slice(start, Math.min(bytes.length, start + pageSize));
  }, [bytes, currentPage, pageSize]);

  const handleExport = useCallback((format: "hex-space" | "hex-raw" | "base64" | "c-array" | "json-array" | "bin" | "python-bytes" | "js-escaped") => {
    if (bytes.length === 0) return;
    let exportBytes = bytes;
    if (selectionStart !== null && selectionEnd !== null) {
      exportBytes = bytes.slice(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd) + 1);
    }

    if (format === "bin") {
      const blob = new Blob([exportBytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo?.name ? `extracted_${fileInfo.name}` : "extracted_binary.bin";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    let content = "";
    const parts = new Array<string>(exportBytes.length);

    if (format === "hex-space") {
      for (let i = 0; i < exportBytes.length; i++) parts[i] = exportBytes[i].toString(16).toUpperCase().padStart(2, "0");
      content = parts.join(" ");
    } else if (format === "hex-raw") {
      content = bytesToHexStr(exportBytes).toUpperCase();
    } else if (format === "base64") {
      let binary = "";
      for (let i = 0; i < exportBytes.length; i++) binary += String.fromCharCode(exportBytes[i]);
      content = btoa(binary);
    } else if (format === "c-array") {
      for (let i = 0; i < exportBytes.length; i++) parts[i] = `0x${exportBytes[i].toString(16).toUpperCase().padStart(2, "0")}`;
      content = `unsigned char rawData[${exportBytes.length}] = {\n  ${parts.join(", ")}\n};`;
    } else if (format === "json-array") {
      content = JSON.stringify(Array.from(exportBytes));
    } else if (format === "python-bytes") {
      for (let i = 0; i < exportBytes.length; i++) parts[i] = `\\x${exportBytes[i].toString(16).padStart(2, "0")}`;
      content = `b'${parts.join("")}'`;
    } else if (format === "js-escaped") {
      for (let i = 0; i < exportBytes.length; i++) parts[i] = `\\x${exportBytes[i].toString(16).padStart(2, "0")}`;
      content = parts.join("");
    }

    navigator.clipboard.writeText(content);
  }, [bytes, selectionStart, selectionEnd, fileInfo]);

  const handleClear = useCallback(() => {
    updateData({
      inputText: "", bytesHex: "", fileInfo: null, detectedFileType: null,
      currentPage: 0, selectedOffset: null, selectionStart: null, selectionEnd: null,
      searchQuery: "", searchMatches: [], editHistory: [], editHistoryIndex: -1,
    });
    setParsingError(null);
  }, [updateData]);

  const editHistoryObj = useMemo(() => ({ entries: editHistory, index: editHistoryIndex }), [editHistory, editHistoryIndex]);

  return (
    <div
      className="h-full flex flex-col bg-canvas text-main font-sans"
      data-tablet-id={tabletId}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {showShortcuts && <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      <Toolbar
        inputFormat={inputFormat}
        onChangeInputFormat={(fmt) => updateData({ inputFormat: fmt })}
        onUploadClick={() => fileInputRef.current?.click()}
        onClear={handleClear}
        bytesPerRow={bytesPerRow}
        onChangeBytesPerRow={(val) => updateData({ bytesPerRow: val })}
        pageSize={pageSize}
        onChangePageSize={(val) => updateData({ pageSize: val, currentPage: 0 })}
        currentPage={currentPage}
        totalPages={totalPages}
        totalBytes={bytes.length}
        onChangePage={(p) => updateData({ currentPage: p })}
        onJumpToOffset={handleJumpToOffset}
        searchQuery={searchQuery}
        onChangeSearchQuery={(q) => updateData({ searchQuery: q })}
        searchType={searchType}
        onChangeSearchType={(t) => updateData({ searchType: t })}
        searchMatchesCount={searchMatches.length}
        currentMatchIndex={currentSearchMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        replaceQuery={replaceQuery}
        onChangeReplaceQuery={(q) => updateData({ replaceQuery: q })}
        onReplaceAll={handleReplaceAll}
        onExport={handleExport}
        hasData={bytes.length > 0}
        canUndo={canUndo(editHistoryObj)}
        canRedo={canRedo(editHistoryObj)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      {/* Error / Warning Banner */}
      {parsingError && (
        <div className="bg-danger-subtle-bg/25 border-b border-danger/30 text-danger-subtle-text text-xs py-2 px-4 flex items-center space-x-2 flex-shrink-0">
          <Shield size={14} className="text-danger" />
          <span>{parsingError}</span>
        </div>
      )}

      {/* Detected file-type banner */}
      {detectedFileType && (
        <div className="bg-primary-subtle-bg/15 border-b border-primary/20 text-xs py-1.5 px-4 flex items-center space-x-2 flex-shrink-0">
          <Tag size={12} className="text-primary" />
          <span className="text-primary font-semibold">{detectedFileType.type}</span>
          <span className="text-secondary">· {detectedFileType.mime} · .{detectedFileType.extension}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Source editor panel (for non-file formats) */}
        {inputFormat !== "file" && (
          <div className="w-[280px] flex-shrink-0 border-r border-base bg-surface flex flex-col select-none">
            <div className="p-3 border-b border-base flex items-center space-x-1.5 flex-shrink-0">
              <FileText size={12} className="text-secondary" />
              <span className="text-xs font-semibold text-secondary uppercase">Source Input Editor</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => updateData({ inputText: e.target.value })}
              placeholder={
                inputFormat === "hex" ? "Paste hex string (e.g. 48 65 6c 6c 6f)"
                  : inputFormat === "base64" ? "Paste Base64 string…"
                  : "Enter raw text…"
              }
              className="flex-1 p-3 font-mono text-xs bg-canvas text-main placeholder-muted resize-none border-none outline-none focus:ring-0 custom-scrollbar"
            />
          </div>
        )}

        {/* Hex grid */}
        <div
          className="flex-1 flex flex-col p-4 overflow-hidden relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {bytes.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between text-xs text-secondary mb-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Binary size={14} className="text-primary animate-pulse" />
                  <span className="font-semibold">
                    {fileInfo ? `${fileInfo.name} (${(fileInfo.size / 1024).toFixed(2)} KB)` : `Buffer (${bytes.length.toLocaleString()} bytes)`}
                  </span>
                </div>
                {selectionInfo.length > 0 && (
                  <span className="bg-primary-subtle-bg/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                    {selectionInfo.length.toLocaleString()} byte{selectionInfo.length !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>
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
            <div
              onClick={inputFormat === "file" ? () => fileInputRef.current?.click() : undefined}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
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
                  ? "Select any binary file up to 16 MB, or drag and drop anywhere. All processing runs offline."
                  : `Select input format '${inputFormat.toUpperCase()}' above and paste content in the left editor.`}
              </p>
            </div>
          )}
        </div>

        <SidebarInspector
          bytes={bytes}
          selectedOffset={selectedOffset}
          selectionInfo={selectionInfo}
          endianness={endianness}
          onChangeEndianness={(e) => updateData({ endianness: e })}
          onEditByte={handleEditByte}
          activeSidebarTab={activeSidebarTab}
          onChangeSidebarTab={(tab) => updateData({ activeSidebarTab: tab })}
          onJumpToOffset={handleJumpToOffset}
        />
      </div>
    </div>
  );
};

let _instanceCounter = 0;

const HexViewerTabletWrapper: React.FC<{ state: HexViewerTabletState; onChange: (s: HexViewerTabletState) => void }> = ({ state, onChange }) => {
  const instanceId = React.useMemo(() => `hexviewer-${++_instanceCounter}`, []);
  return <HexViewerTabletUI state={state} onChange={onChange} tabletId={instanceId} />;
};

export const HexViewerTablet: Tablet = {
  id: "hexviewer",
  label: "Hex Viewer / Binary Inspector",
  keywords: ["hex", "binary", "base64", "inspector", "editor", "bytes", "entropy", "raw", "octal", "viewer"],

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInitialState(payload?: any): HexViewerTabletState {
    const initialContent = payload?.content || "";
    let initialFormat: InputFormat = "raw";
    if (initialContent) {
      if (/^[0-9a-fA-F\s]+$/.test(initialContent) && initialContent.length > 4) initialFormat = "hex";
      else if (/^[A-Za-z0-9+/=\s\n]+$/.test(initialContent) && initialContent.endsWith("=") && initialContent.length > 4) initialFormat = "base64";
    }
    return {
      type: "hexviewer",
      data: {
        inputFormat: initialFormat,
        inputText: initialContent,
        bytesHex: "",
        fileInfo: null,
        detectedFileType: null,
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
        replaceQuery: "",
        endianness: "le",
        activeSidebarTab: "inspector",
        editHistory: [],
        editHistoryIndex: -1,
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
        // Migrate older persisted states that lack new fields
        const hist = createHistory();
        return {
          ...parsed,
          data: {
            detectedFileType: null,
            replaceQuery: "",
            activeSidebarTab: "inspector",
            editHistory: hist.entries,
            editHistoryIndex: hist.index,
            ...parsed.data,
          },
        };
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
