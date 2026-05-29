import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "../../components/Icons";
import { useTabletContext } from "../bridge/context";
import { useTabletTabCreation } from "../bridge/hook";
import { FilterBar } from "./components/FilterBar";
import { ExportPanel } from "./components/ExportPanel";
import { FindingDetail } from "./components/FindingDetail";
import { FindingsTable } from "./components/FindingsTable";
import { ScannerInput, type ScannerInputHandle } from "./components/ScannerInput";
import { SummaryBar } from "./components/SummaryBar";
import { createCsvReport, createJsonReport, createSafeReport, redactContent } from "./engine/redaction";
import { scanSecrets } from "./engine/scanEngine";
import { SecretFinding, SecretScannerData, SecretScannerState } from "./types";
import type { SecretScanResult } from "./types";

// Vite worker import — mocked in tests
import SecretScannerWorker from "./engine/secretScannerWorker?worker";

interface SecretScannerUIProps {
  state: SecretScannerState;
  onChange: (state: SecretScannerState) => void;
}

function filterFindings(data: SecretScannerData): SecretFinding[] {
  const statusFilter = data.statusFilter ?? "all";
  const severityFilter = data.severityFilter ?? "all";
  const providerFilter = data.providerFilter ?? "all";

  return data.findings.filter((finding) => {
    if (data.hideLowConfidence && finding.confidence === "low") return false;
    if (statusFilter !== "all" && finding.status !== statusFilter) return false;
    if (severityFilter !== "all" && finding.severity !== severityFilter) return false;
    if (providerFilter !== "all" && finding.provider !== providerFilter) return false;
    return true;
  });
}

/** Apply suppression list and recompute redacted content after scan results arrive. */
function applySuppressionAndRedact(
  input: string,
  rawFindings: SecretFinding[],
  suppressedFingerprints: string[],
): Pick<SecretScannerData, "findings" | "redactedContent"> {
  const suppressed = new Set(suppressedFingerprints);
  const findings = rawFindings.map((f) =>
    suppressed.has(f.fingerprint) ? { ...f, status: "false-positive" as const } : f,
  );
  return { findings, redactedContent: redactContent(input, findings) };
}

export const SecretScannerUI: React.FC<SecretScannerUIProps> = ({ state, onChange }) => {
  const data = state.data;

  const latestDataRef = useRef(data);
  latestDataRef.current = data;
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { tabId } = useTabletContext();
  const { createBackgroundTab } = useTabletTabCreation();

  const scannerInputRef = useRef<ScannerInputHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const scanIdRef = useRef(0);
  const [isScanning, setIsScanning] = useState(false);

  const [splitRatio, setSplitRatio] = useState(0.5);
  const isDraggingRef = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      setSplitRatio(Math.max(0.2, Math.min(0.8, (ev.clientY - rect.top) / rect.height)));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Stable forever — reads through refs, zero closure deps.
  const updateData = useCallback((updates: Partial<SecretScannerData>) => {
    const nextData = { ...latestDataRef.current, ...updates };
    latestDataRef.current = nextData;
    onChangeRef.current({ ...latestStateRef.current, data: nextData });
  }, []);

  // Apply scan result: suppress, redact, update state.
  const applyScanResult = useCallback(
    (requestId: number, result: SecretScanResult) => {
      if (requestId !== scanIdRef.current) return; // stale result from superseded scan
      setIsScanning(false);
      const { input, suppressedFingerprints } = latestDataRef.current;
      const processed = applySuppressionAndRedact(input, result.findings, suppressedFingerprints ?? []);
      console.debug("[SecretScanner] scan complete", {
        inputLength: input.length,
        findingCount: processed.findings.length,
        redactedLength: processed.redactedContent.length,
      });
      const currentSelectedId = latestDataRef.current.selectedFindingId;
      const selectedFindingId = processed.findings.some((f) => f.id === currentSelectedId)
        ? currentSelectedId
        : processed.findings[0]?.id;
      updateData({
        ...processed,
        selectedFindingId,
        lastScannedAt: Date.now(),
        scanError: undefined,
      });
    },
    [updateData],
  );

  const applyScanError = useCallback(
    (requestId: number, message: string) => {
      if (requestId !== scanIdRef.current) return;
      setIsScanning(false);
      console.error("[SecretScanner] scan failed", { error: message });
      updateData({ findings: [], redactedContent: "", selectedFindingId: undefined, lastScannedAt: Date.now(), scanError: message });
    },
    [updateData],
  );

  // Worker lifecycle — one per component mount.
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new SecretScannerWorker();
      worker.onmessage = (event) => {
        const { id, result, error } = event.data;
        if (error) applyScanError(id, error);
        else if (result) applyScanResult(id, result);
      };
      worker.onerror = (event) => {
        applyScanError(scanIdRef.current, event.message ?? "Worker error");
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null; // fallback to synchronous scan
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [applyScanResult, applyScanError]);

  const runScan = useCallback(() => {
    const input = latestDataRef.current.input;
    const id = ++scanIdRef.current;
    setIsScanning(true);

    if (workerRef.current) {
      workerRef.current.postMessage({ id, input });
    } else {
      // Synchronous fallback (test environment / no Worker support).
      try {
        const result = scanSecrets(input);
        applyScanResult(id, result);
      } catch (err) {
        applyScanError(id, err instanceof Error ? err.message : "Unknown scan error");
      }
    }
  }, [applyScanResult, applyScanError]);

  useEffect(() => {
    if (!data.autoScan) return undefined;
    const timeout = window.setTimeout(runScan, 350);
    return () => window.clearTimeout(timeout);
  }, [data.autoScan, data.input, runScan]);

  const filteredFindings = useMemo(() => filterFindings(data), [data]);
  const providers = useMemo(
    () => Array.from(new Set(data.findings.map((f) => f.provider))).sort(),
    [data.findings],
  );
  const selectedFinding =
    data.findings.find((f) => f.id === data.selectedFindingId) ?? filteredFindings[0];

  // All occurrences of the selected finding's secret (by fingerprint) for the detail panel.
  const occurrenceLines = useMemo(() => {
    if (!selectedFinding) return [];
    return data.findings
      .filter((f) => f.fingerprint === selectedFinding.fingerprint && f.status !== "false-positive")
      .map((f) => f.line)
      .sort((a, b) => a - b);
  }, [data.findings, selectedFinding]);

  const toggleFalsePositive = useCallback((id: string) => {
    const current = latestDataRef.current;
    const target = current.findings.find((f) => f.id === id);
    if (!target) return;

    const { fingerprint } = target;
    const isCurrentlyFP = target.status === "false-positive";
    const newStatus = isCurrentlyFP ? ("open" as const) : ("false-positive" as const);

    const findings = current.findings.map((f) =>
      f.fingerprint === fingerprint ? { ...f, status: newStatus } : f,
    );
    const suppressedFingerprints = isCurrentlyFP
      ? (current.suppressedFingerprints ?? []).filter((fp) => fp !== fingerprint)
      : [...(current.suppressedFingerprints ?? []), fingerprint];

    updateData({ findings, redactedContent: redactContent(current.input, findings), suppressedFingerprints });
  }, [updateData]);

  const handleOpenReport = useCallback(async (format: "markdown" | "json" | "csv") => {
    const findings = latestDataRef.current.findings;
    const content = format === "json" ? createJsonReport(findings)
      : format === "csv" ? createCsvReport(findings)
      : createSafeReport(findings);
    const language = format === "json" ? "json" : format === "csv" ? "csv" : "markdown";
    const title = `Secret Scanner Report.${format === "markdown" ? "md" : format}`;
    try {
      await createBackgroundTab(title, content, language, tabId);
    } catch { /* ignore */ }
  }, [createBackgroundTab, tabId]);

  const handleOpenRedacted = useCallback(async () => {
    const redacted = latestDataRef.current.redactedContent;
    if (!redacted) return;
    try {
      await createBackgroundTab("Redacted Secrets", redacted, undefined, tabId);
    } catch { /* ignore */ }
  }, [createBackgroundTab, tabId]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-main" data-testid="secret-scanner-tablet">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-base bg-surface px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold text-main">Secret Scanner</h1>
          <p className="text-sm text-secondary">Local detection, masked findings, safe reports.</p>
        </div>
        <div className="flex items-center gap-3">
          {data.sourceTitle && (
            <div className="max-w-xs truncate text-sm text-secondary" title={data.sourceTitle}>
              Source: {data.sourceTitle}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <ShieldCheck size={13} />
            Scanned locally — nothing leaves your browser
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,1.15fr)]">
        <ScannerInput
          ref={scannerInputRef}
          value={data.input}
          redactedContent={data.redactedContent}
          autoScan={data.autoScan}
          isScanning={isScanning}
          findings={data.findings}
          selectedFingerprint={selectedFinding?.fingerprint}
          onChange={(input) => updateData({ input })}
          onScan={runScan}
          onAutoScanChange={(autoScan) => updateData({ autoScan })}
        />

        <section ref={splitContainerRef} className="flex min-h-0 flex-col">
          <ExportPanel
            disabled={data.findings.length === 0}
            onOpenReport={handleOpenReport}
            onOpenRedacted={handleOpenRedacted}
          />

          <div
            style={{ flex: `0 0 calc(${(splitRatio * 100).toFixed(1)}% - 2px)` }}
            className="flex min-h-0 flex-col overflow-hidden"
          >
            <SummaryBar findings={data.findings} />
            {data.scanError && (
              <div className="flex-shrink-0 border-b border-danger bg-danger-subtle px-4 py-3 text-sm text-danger">
                Scan failed: {data.scanError}
              </div>
            )}
            <FilterBar data={data} providers={providers} onChange={updateData} />
            <FindingsTable
              findings={filteredFindings}
              selectedId={selectedFinding?.id}
              onSelect={(selectedFindingId) => {
                updateData({ selectedFindingId });
                const finding = latestDataRef.current.findings.find((f) => f.id === selectedFindingId);
                if (finding) scannerInputRef.current?.scrollToFinding(finding.start, finding.end, finding.line);
              }}
              className="flex-1 min-h-0"
            />
          </div>

          <div
            className="flex-shrink-0 cursor-row-resize border-y border-base bg-surface-secondary transition-colors hover:bg-accent/10"
            style={{ height: 4 }}
            onMouseDown={handleDividerMouseDown}
            title="Drag to resize"
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-auto custom-scrollbar">
            <FindingDetail
              finding={selectedFinding}
              occurrenceLines={occurrenceLines}
              onToggleFalsePositive={toggleFalsePositive}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
