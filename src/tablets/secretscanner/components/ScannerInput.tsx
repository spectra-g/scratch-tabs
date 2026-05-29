import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Play, Upload } from "../../../components/Icons";
import { useModalStore } from "../../../stores/modalStore";
import type { SecretFinding, SecretSeverity } from "../types";

const MAX_DROP_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ScannerInputProps {
  value: string;
  redactedContent: string;
  autoScan: boolean;
  isScanning: boolean;
  findings: SecretFinding[];
  selectedFingerprint?: string;
  onChange: (value: string) => void;
  onScan: () => void;
  onAutoScanChange: (enabled: boolean) => void;
}

export interface ScannerInputHandle {
  scrollToFinding(start: number, end: number, line: number): void;
}

// Solid colours for the overview ruler ticks (small, so full saturation reads better).
const RULER_COLOUR: Record<SecretSeverity, string> = {
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#3b82f6",
  low:      "#6b7280",
  info:     "#9ca3af",
};

function scrollElementToLine(el: HTMLElement, targetLine: number): void {
  const text = el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? "");
  const totalLines = (text.match(/\n/g) ?? []).length + 1;
  if (totalLines <= 1 || el.scrollHeight <= 0) return;
  const approxLineHeight = el.scrollHeight / totalLines;
  el.scrollTop = Math.max(0, targetLine * approxLineHeight - el.clientHeight / 2);
}

interface OverviewRulerProps {
  findings: SecretFinding[];
  totalLines: number;
  selectedFingerprint: string | undefined;
  onTickClick: (finding: SecretFinding) => void;
}

const OverviewRuler: React.FC<OverviewRulerProps> = ({ findings, totalLines, selectedFingerprint, onTickClick }) => {
  const active = findings.filter((f) => f.status !== "false-positive");
  if (active.length === 0 || totalLines <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 right-0 top-0 w-2 border-l border-base bg-canvas"
      title="Secret locations — click to navigate"
    >
      {active.map((finding) => {
        const pct = Math.max(0, Math.min(98, ((finding.line - 1) / totalLines) * 100));
        const isSelected = finding.fingerprint === selectedFingerprint;
        return (
          <button
            key={finding.id}
            type="button"
            onClick={() => onTickClick(finding)}
            title={`${finding.type} — line ${finding.line}`}
            className="absolute left-0 right-0 cursor-pointer transition-opacity hover:opacity-100"
            style={{
              top: `${pct}%`,
              height: isSelected ? 4 : 3,
              backgroundColor: RULER_COLOUR[finding.severity],
              opacity: isSelected ? 1 : 0.7,
            }}
          />
        );
      })}
    </div>
  );
};

export const ScannerInput = forwardRef<ScannerInputHandle, ScannerInputProps>(
  function ScannerInput(
    { value, redactedContent, autoScan, isScanning, findings, selectedFingerprint, onChange, onScan, onAutoScanChange },
    ref,
  ) {
    const [activeTab, setActiveTab] = useState<"input" | "redacted">("input");
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    const [isDragOver, setIsDragOver] = useState(false);
    const [dragError, setDragError] = useState<string | null>(null);
    const dragCounterRef = useRef(0);

    const { setGlobalDragDropSuppressed } = useModalStore();

    // Suppress the app-level file-drop overlay while this component is mounted,
    // so dropping a file over the scanner loads it here instead of opening a new tab.
    useEffect(() => {
      setGlobalDragDropSuppressed(true);
      return () => setGlobalDragDropSuppressed(false);
    }, [setGlobalDragDropSuppressed]);

    useEffect(() => {
      if (!dragError) return;
      const t = setTimeout(() => setDragError(null), 4000);
      return () => clearTimeout(t);
    }, [dragError]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        dragCounterRef.current++;
        setIsDragOver(true);
      }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (file.size > MAX_DROP_FILE_SIZE) {
          setDragError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Limit is 5 MB.`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          onChange(text);
          onScan();
        };
        reader.onerror = () => setDragError("Could not read file as text.");
        reader.readAsText(file);
      },
      [onChange, onScan],
    );

    useImperativeHandle(ref, () => ({
      scrollToFinding(start: number, end: number, line: number) {
        if (activeTabRef.current === "input") {
          const textarea = textareaRef.current;
          if (!textarea) return;
          textarea.focus({ preventScroll: true });
          textarea.setSelectionRange(start, end);
          scrollElementToLine(textarea, line - 1);
        } else {
          const pre = preRef.current;
          if (!pre) return;
          scrollElementToLine(pre, line - 1);
        }
      },
    }));

    const handleTickClick = useCallback(
      (finding: SecretFinding) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(finding.start, finding.end);
        scrollElementToLine(textarea, finding.line - 1);
      },
      [],
    );

    const totalLines = value.split("\n").length;

    return (
      <section className="flex min-h-0 flex-1 flex-col border-r border-base bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-base px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("input")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "input" ? "bg-accent text-white" : "text-secondary hover:bg-surface-secondary hover:text-main"
              }`}
            >
              Input
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("redacted")}
              disabled={!redactedContent}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                activeTab === "redacted" ? "bg-accent text-white" : "text-secondary hover:bg-surface-secondary hover:text-main"
              }`}
            >
              Redacted
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "input" && (
              <>
                <label className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={autoScan}
                    onChange={(e) => onAutoScanChange(e.target.checked)}
                    className="h-4 w-4 rounded border-base"
                  />
                  Auto-scan
                </label>
                <button
                  type="button"
                  onClick={onScan}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
                >
                  {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {isScanning ? "Scanning…" : "Scan"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Input tab: textarea + overview ruler + drop zone */}
        <div
          className={`relative min-h-0 flex-1 ${activeTab === "input" ? "" : "hidden"}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            data-testid="secret-scanner-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder="Paste logs, diffs, .env files, JSON, YAML, PEM blocks, or HTTP snippets…"
            className="absolute inset-0 h-full w-full resize-none bg-canvas p-4 pr-4 font-mono text-sm leading-6 text-main outline-none placeholder:text-tertiary custom-scrollbar"
          />
          <OverviewRuler
            findings={findings}
            totalLines={totalLines}
            selectedFingerprint={selectedFingerprint}
            onTickClick={handleTickClick}
          />

          {/* Drag-over overlay */}
          {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-accent bg-canvas/90">
              <Upload size={32} className="text-accent" />
              <p className="text-sm font-semibold text-main">Drop file to scan</p>
              <p className="text-xs text-secondary">Text files up to 5 MB</p>
            </div>
          )}

          {/* Drop error toast */}
          {dragError && (
            <div className="absolute bottom-3 left-3 right-6 z-10 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {dragError}
            </div>
          )}
        </div>

        {/* Redacted preview — always in DOM so data-testid is findable in tests */}
        <pre
          ref={preRef}
          data-testid="secret-scanner-redacted"
          className={`min-h-0 flex-1 overflow-auto custom-scrollbar whitespace-pre-wrap break-words bg-canvas p-4 font-mono text-sm leading-6 text-secondary ${
            activeTab === "redacted" ? "" : "hidden"
          }`}
        >
          {redactedContent || "Run a scan to generate safe redacted output."}
        </pre>
      </section>
    );
  },
);
