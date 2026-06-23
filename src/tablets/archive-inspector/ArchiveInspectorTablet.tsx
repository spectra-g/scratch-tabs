import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tablet, TabletState } from "../types";
import {
  ArchiveInspectorState,
  ArchiveInspectorData,
  ArchiveEntry,
  FilenameEncoding,
  PreviewResult,
  SearchScope,
  SortBy,
  ViewMode,
} from "./types";
import { Toolbar } from "./components/Toolbar";
import { FileTree } from "./components/FileTree";
import { PreviewPanel } from "./components/PreviewPanel";
import { StatsPanel } from "./components/StatsPanel";
import { DropZone } from "./components/DropZone";
import { PasswordPrompt } from "./components/PasswordPrompt";
import { ZipBombWarning } from "./components/ZipBombWarning";
import { storeArchiveBlob, loadArchiveBlob } from "./utils/blobStore";
import { hasGarbledFilenames } from "./utils/detectGarbledFilenames";
import { isZipBomb } from "./utils/detectZipBomb";
import { getAllParentPaths } from "./utils/sortEntries";
import { buildPreviewFromBytes, PREVIEW_TEXT_LIMIT, HEX_PAGE_SIZE } from "./utils/buildPreview";
import { useTabletContext } from "../bridge/context";
import { useRootStore } from "../../stores";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { Loader2, AlertCircle } from "../../components/Icons";

// Vite worker import — mocked in component tests
import ArchiveWorkerFactory from "../../workers/archiveWorker?worker";

const MAX_FILE_SIZE = 256 * 1024 * 1024;

function createInitialData(): ArchiveInspectorData {
  return {
    inputMethod: "file",
    fileName: null,
    fileSizeBytes: null,
    base64Input: "",
    filenameEncoding: "utf-8",
    entries: [],
    parseError: null,
    isParsing: false,
    expandedPaths: [],
    selectedPath: null,
    searchQuery: "",
    searchScope: "name",
    sortBy: "name",
    sortDir: "asc",
    activePanel: "tree",
    previewContent: null,
    isLoadingPreview: false,
    previewError: null,
    sidebarWidth: 320,
    viewMode: "tree",
    showDotFiles: true,
    filterExtensions: [],
    stats: null,
    showStats: true,
    zipBombDetected: false,
    zipBombOverridden: false,
    garbledFilenamesWarning: false,
    blobMissing: false,
    contentSearchResults: null,
    contentSearchProgress: null,
    contentSearchSkipped: 0,
    contentSearchLimited: false,
    openedEntryPath: null,
  };
}

function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

interface ArchiveInspectorUIProps {
  state: ArchiveInspectorState;
  onChange: (state: ArchiveInspectorState) => void;
}

const ArchiveInspectorUI: React.FC<ArchiveInspectorUIProps> = ({ state, onChange }) => {
  const { tabId } = useTabletContext();
  const { addBackgroundTab } = useRootStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { splitView } = useSplitViewStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const resizingRef = useRef(false);
  // Use refs for state accessed in worker handlers to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [passwordTarget, setPasswordTarget] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const [treeHeight, setTreeHeight] = useState(400);

  const blobKey = `archive-blob:${tabId}`;

  const update = useCallback(
    (patch: Partial<ArchiveInspectorData>) => {
      const s = stateRef.current;
      onChangeRef.current({ ...s, data: { ...s.data, ...patch } });
    },
    [],
  );

  // Observe tree container height
  useEffect(() => {
    const el = containerRef.current?.querySelector("[data-tree-container]") as HTMLElement | null;
    if (!el) return;
    const ro = new ResizeObserver(() => setTreeHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleWorkerMessage = useCallback(
    (e: MessageEvent) => {
      const msg = e.data;
      const currentData = stateRef.current.data;

      switch (msg.type) {
        case "parse-progress":
          setParseProgress(msg.percent as number);
          break;
        case "parse-result": {
          const entries: ArchiveEntry[] = msg.entries;
          const garbled = hasGarbledFilenames(entries);
          const bomb = msg.stats
            ? isZipBomb(msg.stats.totalCompressedBytes, msg.stats.totalUncompressedBytes)
            : false;
          update({
            entries,
            stats: msg.stats,
            isParsing: false,
            parseError: null,
            garbledFilenamesWarning: garbled,
            zipBombDetected: bomb,
          });
          break;
        }
        case "parse-error":
          update({ isParsing: false, parseError: msg.message });
          break;
        case "extract-result": {
          const entry = currentData.entries.find((e) => e.path === msg.path) ?? null;
          const hexPage = currentData.previewContent?.hexPage ?? 0;
          const previewResult = buildPreviewFromBytes(msg.path, msg.bytes, msg.truncated, entry, hexPage);
          update({ isLoadingPreview: false, previewContent: previewResult, previewError: null });
          break;
        }
        case "zip-subtree-result":
          downloadBytes(msg.bytes, msg.fileName);
          break;
        case "search-progress":
          update({ contentSearchProgress: (msg.scanned as number) / (msg.total as number) });
          break;
        case "search-result":
          update({
            contentSearchResults: msg.matches,
            contentSearchProgress: null,
          });
          break;
      }
    },
    [update],
  );

  function getWorker(): Worker {
    if (!workerRef.current) {
      workerRef.current = new ArchiveWorkerFactory();
      workerRef.current.addEventListener("message", handleWorkerMessage);
    }
    return workerRef.current;
  }

  function terminateWorker() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  useEffect(() => () => {
    terminateWorker();
    deleteArchiveBlob(blobKey).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach handler when callback reference changes
  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    w.removeEventListener("message", handleWorkerMessage);
    w.addEventListener("message", handleWorkerMessage);
  }, [handleWorkerMessage]);

  const findEntry = (path: string): ArchiveEntry | null =>
    stateRef.current.data.entries.find((e) => e.path === path) ?? null;

  async function dispatchParse(buffer: ArrayBuffer, fileName: string, enc: FilenameEncoding) {
    terminateWorker();
    setParseProgress(0);
    update({
      isParsing: true, parseError: null, entries: [], stats: null,
      selectedPath: null, previewContent: null,
    });
    getWorker().postMessage({ type: "parse", buffer, fileName, filenameEncoding: enc }, [buffer]);
  }

  async function loadBlobBuffer(): Promise<ArrayBuffer | null> {
    const blob = await loadArchiveBlob(blobKey);
    if (!blob) {
      update({ blobMissing: true });
      return null;
    }
    return blob.arrayBuffer();
  }

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) return;
    const buffer = await file.arrayBuffer();
    await storeArchiveBlob(blobKey, new Blob([buffer])).catch(() => {});
    update({ fileName: file.name, fileSizeBytes: file.size, blobMissing: false });
    await dispatchParse(buffer.slice(0), file.name, stateRef.current.data.filenameEncoding);
  }

  async function handleBase64Submit(input: string) {
    const cleaned = input.replace(/\s/g, "");
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const buf = bytes.buffer as ArrayBuffer;
    await storeArchiveBlob(blobKey, new Blob([buf])).catch(() => {});
    update({ fileName: "archive.zip", fileSizeBytes: bytes.length, blobMissing: false });
    await dispatchParse(buf.slice(0), "archive.zip", stateRef.current.data.filenameEncoding);
  }

  async function handleSelectEntry(path: string) {
    const entry = findEntry(path);
    if (!entry || entry.isDirectory) {
      update({ selectedPath: path });
      return;
    }
    if (entry.encryptionType === "aes" || entry.encryptionType === "zipcrypto") {
      update({ selectedPath: path, isLoadingPreview: false, previewContent: null, previewError: null });
      return;
    }
    const buffer = await loadBlobBuffer();
    if (!buffer) return;
    update({ selectedPath: path, isLoadingPreview: true, previewError: null });
    const maxBytes = entry.isImagePreviewable ? undefined : Math.min(entry.sizeUncompressed, PREVIEW_TEXT_LIMIT + 1);
    getWorker().postMessage(
      { type: "extract", buffer, path, offset: 0, maxBytes },
      [buffer],
    );
  }

  async function handleHexPageChange(page: number) {
    const { selectedPath, previewContent } = stateRef.current.data;
    if (!selectedPath || !previewContent) return;
    const buffer = await loadBlobBuffer();
    if (!buffer) return;
    update({ isLoadingPreview: true, previewContent: { ...previewContent, hexPage: page } });
    getWorker().postMessage(
      { type: "extract", buffer, path: selectedPath, offset: page * HEX_PAGE_SIZE, maxBytes: HEX_PAGE_SIZE },
      [buffer],
    );
  }

  async function handleExtractFile(entry: ArchiveEntry) {
    const buffer = await loadBlobBuffer();
    if (!buffer) return;
    const w = getWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === "extract-result" && e.data.path === entry.path) {
        downloadBytes(e.data.bytes, entry.name);
        w.removeEventListener("message", handler);
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "extract", buffer, path: entry.path }, [buffer]);
  }

  async function handleExtractSubtree(entry: ArchiveEntry) {
    const buffer = await loadBlobBuffer();
    if (!buffer) return;
    getWorker().postMessage({ type: "zip-subtree", buffer, folderPath: entry.path }, [buffer]);
  }

  async function handleOpenInNewTab(entry: ArchiveEntry) {
    const currentPreview = stateRef.current.data.previewContent;
    const content = currentPreview?.path === entry.path ? currentPreview.content : "";
    const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = entry.isImagePreviewable && currentPreview?.type === "image";
    const language = isImage ? "image" : ext || "plaintext";
    update({ openedEntryPath: entry.path });
    addBackgroundTab(
      {
        id: crypto.randomUUID(),
        title: `${stateRef.current.data.fileName ?? "archive"}: ${entry.name}`,
        content,
        language,
        languageLocked: isImage || language !== "plaintext",
        activeViewId: isImage ? "image-smart-view" : undefined,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        workspaceId: activeWorkspaceId ?? "",
      },
      splitView.isSplit,
    );
    setTimeout(() => update({ openedEntryPath: null }), 1500);
  }

  async function handleInspectNested(entry: ArchiveEntry) {
    const buffer = await loadBlobBuffer();
    if (!buffer) return;
    const newId = crypto.randomUUID();
    const newBlobKey = `archive-blob:${newId}`;
    const w = getWorker();
    const handler = async (e: MessageEvent) => {
      if (e.data.type === "extract-result" && e.data.path === entry.path) {
        w.removeEventListener("message", handler);
        const bytes: Uint8Array = e.data.bytes;
        await storeArchiveBlob(newBlobKey, new Blob([bytes])).catch(() => {});
        const nestedInitial: ArchiveInspectorState = {
          type: "archive-inspector",
          data: { ...createInitialData(), fileName: entry.name },
        };
        addBackgroundTab(
          {
            id: newId,
            title: entry.name,
            content: "",
            language: "plaintext",
            languageLocked: true,
            cursorPosition: { lineNumber: 1, column: 1 },
            dateCreated: Date.now(),
            lastModified: Date.now(),
            workspaceId: activeWorkspaceId ?? "",
            isTablet: true,
            tabletState: JSON.stringify(nestedInitial),
          },
          splitView.isSplit,
        );
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "extract", buffer, path: entry.path }, [buffer]);
  }

  function handleToggleExpand(path: string) {
    const normalized = path.endsWith("/") ? path : path + "/";
    const set = new Set(stateRef.current.data.expandedPaths);
    if (set.has(normalized)) set.delete(normalized);
    else set.add(normalized);
    update({ expandedPaths: Array.from(set) });
  }

  function handleExpandAll() {
    const dirs = stateRef.current.data.entries.filter((e) => e.isDirectory).map((e) => e.path);
    update({ expandedPaths: dirs });
  }

  function handleCollapseAll() {
    update({ expandedPaths: [] });
  }

  function startResize(e: React.MouseEvent) {
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = stateRef.current.data.sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      update({ sidebarWidth: Math.max(200, Math.min(600, startWidth + ev.clientX - startX)) });
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const data = state.data;
  const expandedPathsSet = useMemo(() => new Set(data.expandedPaths), [data.expandedPaths]);
  const isEmpty = !data.isParsing && data.entries.length === 0 && !data.parseError;
  const selectedEntry = data.selectedPath ? findEntry(data.selectedPath) : null;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-canvas overflow-hidden">
      <Toolbar
        fileName={data.fileName}
        fileSizeBytes={data.fileSizeBytes}
        stats={data.stats}
        inputMethod={data.inputMethod}
        base64Input={data.base64Input}
        filenameEncoding={data.filenameEncoding}
        searchQuery={data.searchQuery}
        searchScope={data.searchScope}
        sortBy={data.sortBy}
        sortDir={data.sortDir}
        viewMode={data.viewMode}
        showDotFiles={data.showDotFiles}
        filterExtensions={data.filterExtensions}
        garbledFilenamesWarning={data.garbledFilenamesWarning}
        onFileSelect={handleFile}
        onBase64Submit={handleBase64Submit}
        onInputMethodChange={(method) => update({ inputMethod: method })}
        onBase64Change={(v) => update({ base64Input: v })}
        onEncodingChange={async (enc) => {
          update({ filenameEncoding: enc });
          if (data.fileName) {
            const buffer = await loadBlobBuffer();
            if (buffer) await dispatchParse(buffer, data.fileName, enc);
          }
        }}
        onSearchQueryChange={(q) => {
          if (q && data.searchScope !== "content") {
            const matching = data.entries.filter((e) =>
              data.searchScope === "name"
                ? e.name.toLowerCase().includes(q.toLowerCase())
                : e.path.toLowerCase().includes(q.toLowerCase()),
            );
            const parentPaths = new Set(matching.flatMap((e) => getAllParentPaths(e.path)));
            const combined = new Set([...data.expandedPaths, ...parentPaths]);
            update({ searchQuery: q, expandedPaths: Array.from(combined) });
          } else {
            update({ searchQuery: q });
          }
        }}
        onSearchScopeChange={(scope) => update({ searchScope: scope as SearchScope })}
        onSortByChange={(sort) => update({ sortBy: sort as SortBy })}
        onSortDirToggle={() => update({ sortDir: data.sortDir === "asc" ? "desc" : "asc" })}
        onViewModeChange={(mode) => update({ viewMode: mode as ViewMode })}
        onShowDotFilesChange={(v) => update({ showDotFiles: v })}
        onRemoveFilterExtension={(ext) =>
          update({ filterExtensions: data.filterExtensions.filter((e) => e !== ext) })
        }
      />

      {data.isParsing && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-base bg-surface-secondary text-sm text-secondary">
          <Loader2 size={14} className="animate-spin text-primary flex-shrink-0" />
          Parsing… {parseProgress}%
          <div className="flex-1 h-1 bg-surface-raised rounded overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${parseProgress}%` }} />
          </div>
        </div>
      )}

      {data.parseError && (
        <div className="flex items-start gap-2 px-4 py-3 text-sm text-danger bg-danger-subtle border-b border-danger/30">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {data.parseError}
        </div>
      )}

      {data.blobMissing && data.entries.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-secondary bg-surface-secondary border-b border-base">
          <AlertCircle size={12} className="text-warning flex-shrink-0" />
          Re-load the archive file to extract entries.
        </div>
      )}

      {data.zipBombDetected && !data.zipBombOverridden && (
        <div className="px-4 py-2">
          <ZipBombWarning
            onContinue={() => update({ zipBombOverridden: true })}
            onDismiss={() => update({ zipBombDetected: false })}
          />
        </div>
      )}

      {isEmpty ? (
        <div className="flex-1 overflow-hidden">
          <DropZone onFile={handleFile} error={data.parseError} />
        </div>
      ) : data.entries.length === 0 && !data.isParsing && !data.parseError ? (
        <div className="flex items-center justify-center flex-1 text-secondary text-sm">
          Archive is empty.
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div
            className="flex flex-col border-r border-base overflow-hidden flex-shrink-0"
            style={{ width: data.sidebarWidth }}
          >
            <div data-tree-container className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <FileTree
                entries={data.entries}
                expandedPaths={expandedPathsSet}
                selectedPath={data.selectedPath}
                searchQuery={data.searchScope !== "content" ? data.searchQuery : ""}
                searchScope={data.searchScope}
                sortBy={data.sortBy}
                sortDir={data.sortDir}
                viewMode={data.viewMode}
                showDotFiles={data.showDotFiles}
                filterExtensions={data.filterExtensions}
                height={treeHeight}
                onSelectEntry={handleSelectEntry}
                onToggleExpand={handleToggleExpand}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                onOpenInNewTab={handleOpenInNewTab}
                onExtractFile={handleExtractFile}
                onExtractSubtree={handleExtractSubtree}
                onInspectNested={handleInspectNested}
                onCopyContent={async (entry) => {
                  const { previewContent } = data;
                  if (previewContent?.path === entry.path && previewContent.content) {
                    await navigator.clipboard.writeText(previewContent.content);
                  }
                }}
              />
            </div>

            {data.stats && (
              <StatsPanel
                stats={data.stats}
                isOpen={data.showStats}
                onToggle={() => update({ showStats: !data.showStats })}
                onSelectFile={handleSelectEntry}
                onAddExtensionFilter={(ext) => {
                  if (!data.filterExtensions.includes(ext)) {
                    update({ filterExtensions: [...data.filterExtensions, ext] });
                  }
                }}
              />
            )}
          </div>

          <div
            className="w-1 cursor-col-resize flex-shrink-0 hover:bg-primary/30 transition-colors"
            onMouseDown={startResize}
          />

          <div className="flex-1 overflow-hidden">
            <PreviewPanel
              entry={selectedEntry}
              preview={data.previewContent}
              isLoading={data.isLoadingPreview}
              error={data.previewError}
              blobMissing={data.blobMissing}
              onRequestPreview={handleSelectEntry}
              onHexPageChange={handleHexPageChange}
              onOpenInNewTab={() => selectedEntry && handleOpenInNewTab(selectedEntry)}
              onExtract={() => selectedEntry && handleExtractFile(selectedEntry)}
              onPasswordNeeded={() => setPasswordTarget(data.selectedPath)}
            />
          </div>
        </div>
      )}

      {passwordTarget && (
        <PasswordPrompt
          entryPath={passwordTarget}
          error={passwordError}
          onSubmit={() => {
            // ZipCrypto password support requires passing to worker — acknowledged limitation
            setPasswordError("Password decryption not yet supported in worker.");
            setTimeout(() => { setPasswordTarget(null); setPasswordError(null); }, 3000);
          }}
          onCancel={() => { setPasswordTarget(null); setPasswordError(null); }}
        />
      )}
    </div>
  );
};

export const archiveInspectorTablet: Tablet = {
  id: "archive-inspector",
  label: "Archive Inspector",
  keywords: ["zip", "jar", "apk", "docx", "epub", "archive", "unzip", "inspect"],
  description: "Inspect ZIP, JAR, APK, DOCX, EPUB and all ZIP-format archives offline.",

  createInitialState(): ArchiveInspectorState {
    return { type: "archive-inspector", data: createInitialData() };
  },

  serializeState(state: TabletState): string {
    const s = state as ArchiveInspectorState;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isParsing, isLoadingPreview, previewError, ...persistable } = s.data;
    // Clear base64Input rather than omit it — TabletView passes raw JSON directly to
    // render(), so any omitted key arrives as undefined and breaks string methods.
    return JSON.stringify({ type: s.type, data: { ...persistable, base64Input: "" } });
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json) as ArchiveInspectorState;
      if (parsed.type === "archive-inspector" && parsed.data) {
        return {
          type: "archive-inspector",
          data: {
            ...createInitialData(),
            ...parsed.data,
            isParsing: false,
            isLoadingPreview: false,
            previewError: null,
          },
        };
      }
    } catch {
      // fall through
    }
    return this.createInitialState();
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    return (
      <ArchiveInspectorUI
        state={state as ArchiveInspectorState}
        onChange={onChange as (state: ArchiveInspectorState) => void}
      />
    );
  },
};
