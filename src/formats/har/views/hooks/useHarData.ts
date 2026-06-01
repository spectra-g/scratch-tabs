import { useMemo, useState, useCallback } from "react";
import {
  HarFile,
  HarEntry,
  HarTimings,
  ProcessedEntry,
  HarSummary,
  HarFilter,
  StatusCategory,
  ResourceType,
  TimingSegment,
} from "../types";
import { parseHarContent } from "../utils/harEntryOperations";

// ─── Timing colours (DevTools-style) ──────────────────────────────────────

const TIMING_COLORS: Record<string, string> = {
  blocked: "#a0a0a0",
  dns: "#009688",
  connect: "#e67e22",
  ssl: "#9b59b6",
  send: "#3498db",
  wait: "#f39c12",
  receive: "#27ae60",
};

// ─── Sensitive-header detection ────────────────────────────────────────────

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-csrf-token",
  "x-session-id",
]);

function detectSensitiveData(entry: HarEntry): boolean {
  const allHeaders = [
    ...(entry.request.headers ?? []),
    ...(entry.response.headers ?? []),
  ];
  if (allHeaders.some((h) => SENSITIVE_HEADER_NAMES.has(h.name.toLowerCase()))) return true;
  if ((entry.request.cookies?.length ?? 0) > 0) return true;
  if ((entry.response.cookies?.length ?? 0) > 0) return true;
  // Auth tokens in URL
  if (/[?&](token|api_key|apikey|access_token|auth)=/i.test(entry.request.url)) return true;
  return false;
}

// ─── MIME → resource type ──────────────────────────────────────────────────

function mimeToResourceType(mime: string, chromeType?: string): ResourceType {
  if (chromeType) {
    const t = chromeType.toLowerCase();
    if (t === "document" || t === "stylesheet" || t === "script" || t === "image" || t === "font" || t === "media") {
      return t as ResourceType;
    }
    if (t === "xhr" || t === "xmlhttprequest") return "xhr";
    if (t === "fetch") return "fetch";
  }
  const m = mime.toLowerCase().split(";")[0].trim();
  if (m.includes("html") || m.includes("xhtml")) return "document";
  if (m.includes("css")) return "stylesheet";
  if (m.includes("javascript") || m.includes("ecmascript")) return "script";
  if (m.startsWith("image/")) return "image";
  if (m.includes("font")) return "font";
  if (m.includes("json") || m.includes("xml") || m.includes("graphql")) return "fetch";
  if (m.includes("video") || m.includes("audio")) return "media";
  return "other";
}

// ─── Timing segments ───────────────────────────────────────────────────────

function buildTimingSegments(timings: HarTimings): TimingSegment[] {
  const connect = timings.connect ?? -1;
  const ssl = timings.ssl ?? -1;
  // HAR 1.2 spec: ssl is included within connect for backward compat with HAR 1.1.
  // Subtract ssl from connect to avoid double-counting in the visual bar.
  const actualConnect = connect > 0 && ssl > 0 ? Math.max(0, connect - ssl) : connect;

  const phases = [
    { key: "blocked", label: "Queued/Blocked", duration: timings.blocked ?? -1, color: TIMING_COLORS.blocked },
    { key: "dns", label: "DNS Lookup", duration: timings.dns ?? -1, color: TIMING_COLORS.dns },
    { key: "connect", label: "TCP Connect", duration: actualConnect, color: TIMING_COLORS.connect },
    { key: "ssl", label: "SSL/TLS", duration: ssl, color: TIMING_COLORS.ssl },
    { key: "send", label: "Request Sent", duration: timings.send ?? -1, color: TIMING_COLORS.send },
    { key: "wait", label: "Waiting (TTFB)", duration: timings.wait ?? -1, color: TIMING_COLORS.wait },
    { key: "receive", label: "Content Download", duration: timings.receive ?? -1, color: TIMING_COLORS.receive },
  ];

  // >= 0: a 0ms phase (e.g. cached DNS) is valid and should appear in the breakdown.
  return phases.filter((s) => s.duration >= 0);
}

// ─── Status category ───────────────────────────────────────────────────────

function categorizeStatus(status: number): StatusCategory {
  if (status >= 100 && status < 200) return "1xx";
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500) return "5xx";
  return "unknown";
}

// ─── Process entries ───────────────────────────────────────────────────────

function processEntries(entries: HarEntry[]): ProcessedEntry[] {
  if (entries.length === 0) return [];

  const validStartTimes = entries
    .map((e) => new Date(e.startedDateTime).getTime())
    .filter((t) => !isNaN(t));
  const firstMs = validStartTimes.length > 0 ? Math.min(...validStartTimes) : 0;

  return entries.map((entry, index) => {
    let hostname = "";
    let pathname = entry.request.url;

    if (entry.request.url.startsWith("data:")) {
      hostname = "(data URI)";
      pathname = entry.request.url.substring(0, 60) + "…";
    } else {
      try {
        const u = new URL(entry.request.url);
        hostname = u.hostname;
        pathname = u.pathname + (u.search ? u.search : "");
      } catch {
        // malformed URL — leave as-is
      }
    }

    const status = entry.response.status;
    const mimeType = entry.response.content?.mimeType ?? "";
    const resourceType = mimeToResourceType(mimeType, entry._resourceType as string | undefined);
    const totalTime = entry.time ?? 0;
    const startedMs = new Date(entry.startedDateTime).getTime();

    return {
      id: `entry-${index}`,
      index,
      entry,
      hostname,
      pathname,
      method: entry.request.method.toUpperCase(),
      status,
      statusCategory: categorizeStatus(status),
      mimeType,
      resourceType,
      transferSize:
        (entry.response.headersSize ?? 0) + (entry.response.bodySize ?? 0),
      contentSize: entry.response.content?.size ?? 0,
      totalTime,
      startOffset: isNaN(startedMs) ? 0 : startedMs - firstMs,
      timingSegments: buildTimingSegments(entry.timings),
      hasSensitiveData: detectSensitiveData(entry),
    };
  });
}

// ─── Summary ───────────────────────────────────────────────────────────────

function buildSummary(processed: ProcessedEntry[], file: HarFile): HarSummary {
  const statusCounts: Record<StatusCategory, number> = {
    "1xx": 0,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
    unknown: 0,
  };
  const methodCounts: Record<string, number> = {};
  const resourceTypeCounts: Record<string, number> = {};
  let totalTransferred = 0;
  let totalContentSize = 0;
  let hasSensitiveData = false;
  const sensitiveDataTypes = new Set<string>();

  for (const p of processed) {
    statusCounts[p.statusCategory]++;
    methodCounts[p.method] = (methodCounts[p.method] ?? 0) + 1;
    resourceTypeCounts[p.resourceType] = (resourceTypeCounts[p.resourceType] ?? 0) + 1;
    totalTransferred += p.transferSize;
    totalContentSize += p.contentSize;

    if (p.hasSensitiveData) {
      hasSensitiveData = true;
      // Identify what types of sensitive data
      const headers = [
        ...(p.entry.request.headers ?? []),
        ...(p.entry.response.headers ?? []),
      ];
      for (const h of headers) {
        if (h.name.toLowerCase() === "authorization") sensitiveDataTypes.add("Authorization headers");
        if (h.name.toLowerCase() === "cookie" || h.name.toLowerCase() === "set-cookie") sensitiveDataTypes.add("Cookies");
        if (h.name.toLowerCase().startsWith("x-api-key") || h.name.toLowerCase().startsWith("x-auth")) sensitiveDataTypes.add("API keys");
      }
      if ((p.entry.request.cookies?.length ?? 0) > 0) sensitiveDataTypes.add("Cookies");
    }
  }

  const validTimes = file.log.entries
    .map((e) => new Date(e.startedDateTime).getTime())
    .filter((t) => !isNaN(t));
  const firstMs = validTimes.length > 0 ? Math.min(...validTimes) : 0;
  const startedAt: Date | null = firstMs > 0 ? new Date(firstMs) : null;

  // Total time = start of earliest entry to end of latest entry
  let maxEndMs = 0;
  for (const p of processed) {
    const startMs = new Date(p.entry.startedDateTime).getTime();
    const endMs = isNaN(startMs) ? 0 : startMs - firstMs + p.totalTime;
    if (endMs > maxEndMs) maxEndMs = endMs;
  }

  return {
    totalRequests: processed.length,
    totalTransferred,
    totalContentSize,
    totalTime: maxEndMs,
    startedAt,
    statusCounts,
    methodCounts,
    resourceTypeCounts,
    hasSensitiveData,
    sensitiveDataTypes: [...sensitiveDataTypes],
  };
}

// ─── Default filter ────────────────────────────────────────────────────────

const DEFAULT_FILTER: HarFilter = {
  search: "",
  methods: new Set(),
  statusCategories: new Set(),
  resourceTypes: new Set(),
  showErrorsOnly: false,
};

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseHarDataReturn {
  file: HarFile | null;
  entries: ProcessedEntry[];
  filteredEntries: ProcessedEntry[];
  summary: HarSummary | null;
  error: string | null;
  filter: HarFilter;
  setFilter: (patch: Partial<HarFilter>) => void;
  resetFilter: () => void;
  exportFilteredHar: () => string;
  exportAsCsv: () => string;
  buildCurlCommand: (entry: ProcessedEntry) => string;
}

export function useHarData(content: string): UseHarDataReturn {
  const [filter, setFilterState] = useState<HarFilter>(DEFAULT_FILTER);

  const { file, error } = useMemo(() => parseHarContent(content), [content]);

  const entries = useMemo<ProcessedEntry[]>(() => {
    if (!file) return [];
    return processEntries(file.log.entries);
  }, [file]);

  const summary = useMemo<HarSummary | null>(() => {
    if (!file) return null;
    return buildSummary(entries, file);
  }, [file, entries]);

  const filteredEntries = useMemo<ProcessedEntry[]>(() => {
    let result = entries;

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.entry.request.url.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q) ||
          String(e.status).includes(q) ||
          e.mimeType.toLowerCase().includes(q),
      );
    }

    if (filter.methods.size > 0) {
      result = result.filter((e) => filter.methods.has(e.method));
    }

    if (filter.statusCategories.size > 0) {
      result = result.filter((e) => filter.statusCategories.has(e.statusCategory));
    }

    if (filter.resourceTypes.size > 0) {
      result = result.filter((e) => filter.resourceTypes.has(e.resourceType));
    }

    if (filter.showErrorsOnly) {
      result = result.filter(
        (e) => e.statusCategory === "4xx" || e.statusCategory === "5xx",
      );
    }

    if (filter.pageref !== undefined) {
      result = result.filter((e) => e.entry.pageref === filter.pageref);
    }

    return result;
  }, [entries, filter]);

  const setFilter = useCallback((patch: Partial<HarFilter>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilterState(DEFAULT_FILTER);
  }, []);

  const exportFilteredHar = useCallback((): string => {
    if (!file) return "{}";
    const filteredIds = new Set(filteredEntries.map((e) => e.index));
    const filteredRaw = file.log.entries.filter((_, i) => filteredIds.has(i));
    const out: HarFile = {
      log: { ...file.log, entries: filteredRaw },
    };
    return JSON.stringify(out, null, 2);
  }, [file, filteredEntries]);

  const exportAsCsv = useCallback((): string => {
    const headers = [
      "Index",
      "Method",
      "URL",
      "Status",
      "StatusText",
      "MimeType",
      "ResourceType",
      "TransferSize",
      "ContentSize",
      "Time(ms)",
      "StartOffset(ms)",
      "StartedAt",
    ];
    const rows = filteredEntries.map((e) =>
      [
        e.index + 1,
        e.method,
        `"${e.entry.request.url.replace(/"/g, '""')}"`,
        e.status,
        `"${e.entry.response.statusText}"`,
        `"${e.mimeType}"`,
        e.resourceType,
        e.transferSize,
        e.contentSize,
        e.totalTime.toFixed(2),
        e.startOffset.toFixed(2),
        `"${e.entry.startedDateTime}"`,
      ].join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }, [filteredEntries]);

  const buildCurlCommand = useCallback((p: ProcessedEntry): string => {
    const req = p.entry.request;
    const parts: string[] = [`curl -X ${req.method}`];

    for (const h of req.headers) {
      parts.push(`  -H "${h.name}: ${h.value.replace(/"/g, '\\"')}"`);
    }

    if (req.postData?.text) {
      const escaped = req.postData.text.replace(/'/g, "'\\''");
      parts.push(`  --data-raw '${escaped}'`);
    } else if (req.postData?.params?.length) {
      const body = req.postData.params
        .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
        .join("&");
      parts.push(`  --data-raw '${body}'`);
    }

    parts.push(`  --compressed`);
    parts.push(`  "${req.url}"`);
    return parts.join(" \\\n");
  }, []);

  return {
    file,
    entries,
    filteredEntries,
    summary,
    error,
    filter,
    setFilter,
    resetFilter,
    exportFilteredHar,
    exportAsCsv,
    buildCurlCommand,
  };
}
