import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Clipboard, Layers, Upload } from "lucide-react";
import type { WorkspaceTab } from "../../bridge/types";

interface DataImportPanelProps {
  isLoading: boolean;
  onFilesSelected: (files: File[]) => void;
  getImportableTabs?: () => WorkspaceTab[];
  onTabImport?: (tabId: string) => Promise<void>;
}

export function DataImportPanel({ isLoading, onFilesSelected, getImportableTabs, onTabImport }: DataImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [isPickingTab, setIsPickingTab] = useState(false);
  const [availableTabs, setAvailableTabs] = useState<WorkspaceTab[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [format, setFormat] = useState<"csv" | "tsv" | "json" | "ndjson">("csv");
  const [tableName, setTableName] = useState("pasted_data");

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onFilesSelected(Array.from(fileList));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isPasting) return;
    handleFiles(event.dataTransfer.files);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;

    const extension = format === "ndjson" ? "ndjson" : format;
    const mimeType = format === "json" || format === "ndjson" ? "application/json" : "text/csv";
    const sanitizedName = tableName.trim().replace(/\.[^.]+$/, "") || "pasted_data";

    const file = new File([pastedText], `${sanitizedName}.${extension}`, {
      type: mimeType,
    });

    onFilesSelected([file]);
    setPastedText("");
    setIsPasting(false);
  };

  const openTabPicker = () => {
    setAvailableTabs(getImportableTabs?.() ?? []);
    setIsPickingTab(true);
  };

  const handleTabSelect = async (tabId: string) => {
    if (!onTabImport) return;
    setIsImporting(true);
    try {
      await onTabImport(tabId);
      setIsPickingTab(false);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="rounded-md border border-dashed border-base bg-surface-secondary p-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      data-testid="sqlsandbox-import-panel"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept=".csv,.tsv,.json,.ndjson,.jsonl,.parquet,.pq"
        onChange={onChange}
        data-testid="sqlsandbox-file-input"
      />

      {!isPasting && !isPickingTab ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-base bg-surface px-3 py-2 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={16} />
              Import File
            </button>
            <button
              type="button"
              onClick={() => setIsPasting(true)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-base bg-surface px-3 py-2 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Clipboard size={16} />
              Paste Data
            </button>
            {onTabImport && (
              <button
                type="button"
                onClick={openTabPicker}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-base bg-surface px-3 py-2 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Layers size={16} />
                From Tab
              </button>
            )}
          </div>
          <div className="text-center text-xs text-muted">
            Files and pasted text are registered locally and never uploaded.
          </div>
        </div>
      ) : isPickingTab ? (
        <div className="flex flex-col gap-2">
          {availableTabs.length === 0 ? (
            <div className="py-2 text-center text-xs text-muted">
              No CSV, TSV, JSON, or NDJSON tabs open in this workspace.
            </div>
          ) : (
            <div className="custom-scrollbar max-h-40 space-y-1 overflow-auto">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => void handleTabSelect(tab.id)}
                  disabled={isImporting}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-element-hover disabled:opacity-60"
                >
                  <span className="min-w-0 truncate text-xs text-main">{tab.title}</span>
                  <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase text-muted">
                    {tab.language}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsPickingTab(false)}
            className="self-end rounded-md border border-base bg-surface px-3 py-1.5 text-xs text-main hover:bg-element-hover"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="rounded-md border border-base bg-surface px-2 py-1 text-xs text-main"
              >
                <option value="csv">CSV</option>
                <option value="tsv">TSV</option>
                <option value="json">JSON</option>
                <option value="ndjson">NDJSON</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
              <label className="text-xs font-semibold text-muted">Table Name</label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="pasted_data"
                className="rounded-md border border-base bg-surface px-2 py-1 text-xs text-main"
              />
            </div>
          </div>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste CSV, TSV, JSON, or NDJSON data here..."
            rows={5}
            className="w-full rounded-md border border-base bg-surface p-2 text-xs font-mono text-main focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPasting(false)}
              className="rounded-md border border-base bg-surface px-3 py-1.5 text-xs text-main hover:bg-element-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={isLoading || !pastedText.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-content hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Register Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
