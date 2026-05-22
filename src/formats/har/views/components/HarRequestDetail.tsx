import React, { useState, useMemo, useCallback } from "react";
import { X, Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { ProcessedEntry, HarNameValue, HarCookie, DetailTab, TimingSegment } from "../types";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(3)} s`;
}

function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function decodeBase64IfNeeded(text: string, encoding?: string): string {
  if (encoding === "base64") {
    try {
      return atob(text);
    } catch {
      return text;
    }
  }
  return text;
}

// ─── Small copy button ──────────────────────────────────────────────────────

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-main bg-element hover:bg-element-hover rounded transition-colors"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {label && <span>{label}</span>}
    </button>
  );
};

// ─── Headers table ─────────────────────────────────────────────────────────

const HeadersTable: React.FC<{ headers: HarNameValue[] }> = ({ headers }) => {
  if (headers.length === 0) return <p className="text-secondary text-sm p-2">No headers.</p>;

  return (
    <table className="w-full text-xs">
      <tbody>
        {headers.map((h, i) => (
          <tr key={i} className="border-b border-base/50 hover:bg-element-hover/50">
            <td className="py-1 px-2 font-medium text-main align-top w-48 break-words">{h.name}</td>
            <td className="py-1 px-2 text-secondary break-all font-mono">{h.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Name-value table (query string, form params) ──────────────────────────

const NameValueTable: React.FC<{ items: HarNameValue[]; emptyMsg?: string }> = ({
  items,
  emptyMsg = "None.",
}) => {
  if (items.length === 0) return <p className="text-secondary text-sm p-2">{emptyMsg}</p>;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-base text-secondary">
          <th className="text-left py-1 px-2 font-medium w-48">Name</th>
          <th className="text-left py-1 px-2 font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {items.map((nv, i) => (
          <tr key={i} className="border-b border-base/50 hover:bg-element-hover/50">
            <td className="py-1 px-2 font-mono text-main align-top break-words">{nv.name}</td>
            <td className="py-1 px-2 font-mono text-secondary break-all">{nv.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ─── Cookies table ─────────────────────────────────────────────────────────

const CookiesTable: React.FC<{ cookies: HarCookie[]; label: string }> = ({ cookies, label }) => {
  if (cookies.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1 border-b border-base">
        {label}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-base text-secondary">
            <th className="text-left py-1 px-2 font-medium">Name</th>
            <th className="text-left py-1 px-2 font-medium">Value</th>
            <th className="text-left py-1 px-2 font-medium">Domain</th>
            <th className="text-left py-1 px-2 font-medium">Path</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c, i) => (
            <tr key={i} className="border-b border-base/50 hover:bg-element-hover/50">
              <td className="py-1 px-2 font-mono text-main">{c.name}</td>
              <td className="py-1 px-2 font-mono text-secondary break-all max-w-[200px]">{c.value}</td>
              <td className="py-1 px-2 text-secondary">{c.domain ?? "—"}</td>
              <td className="py-1 px-2 text-secondary">{c.path ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Timing breakdown ──────────────────────────────────────────────────────

const TimingBar: React.FC<{ segments: TimingSegment[]; total: number }> = ({ segments, total }) => {
  if (total <= 0) return null;

  return (
    <div className="space-y-2 px-2 py-2">
      {segments.map((seg, i) => {
        const pct = Math.max(0.5, (seg.duration / total) * 100);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-32 text-secondary text-right flex-shrink-0">{seg.label}</div>
            <div className="flex-1 h-4 bg-element rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${pct}%`, backgroundColor: seg.color }}
              />
            </div>
            <div className="w-20 text-secondary font-mono text-right flex-shrink-0">
              {formatTime(seg.duration)}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-2 text-xs border-t border-base pt-2 mt-2 font-medium">
        <div className="w-32 text-main text-right flex-shrink-0">Total</div>
        <div className="flex-1" />
        <div className="w-20 text-main font-mono text-right flex-shrink-0">{formatTime(total)}</div>
      </div>
    </div>
  );
};

// ─── Body viewer ───────────────────────────────────────────────────────────

const HUGE_PAYLOAD = 500_000; // 500 KB: skip JSON formatting above this threshold

const BodyViewer: React.FC<{
  text?: string;
  encoding?: string;
  mimeType: string;
  sizeBytes: number;
}> = ({ text, encoding, mimeType, sizeBytes }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!text) {
    return (
      <p className="text-secondary text-sm p-2">
        {sizeBytes > 0 ? `Body not captured (${formatBytes(sizeBytes)}).` : "No body."}
      </p>
    );
  }

  // Render image payloads as <img> instead of dumping base64 to a <pre>.
  if (mimeType.startsWith("image/") && encoding === "base64") {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 border-b border-base bg-element/30">
          <span className="text-xs text-secondary">{mimeType} · {formatBytes(sizeBytes)}</span>
          <CopyButton value={text} label="Copy base64" />
        </div>
        <div className="flex items-center justify-center p-4 bg-element/20 overflow-auto">
          <img
            src={`data:${mimeType};base64,${text}`}
            alt="Response Preview"
            className="max-w-full max-h-[300px] object-contain shadow-sm border border-base"
          />
        </div>
      </div>
    );
  }

  const decoded = decodeBase64IfNeeded(text, encoding);
  const isHuge = decoded.length > HUGE_PAYLOAD;
  const isJson = !isHuge && (mimeType.includes("json") || decoded.trimStart()[0] === "{" || decoded.trimStart()[0] === "[");
  const formatted = isJson && !showRaw ? tryPrettyJson(decoded) : decoded;
  const truncated = formatted.length > 50_000;
  const display = truncated ? formatted.slice(0, 50_000) + "\n\n… (truncated)" : formatted;

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1 border-b border-base bg-element/30">
        <span className="text-xs text-secondary">{mimeType} · {formatBytes(sizeBytes)}</span>
        <div className="flex items-center gap-2">
          {isJson && (
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="text-xs text-secondary hover:text-main"
            >
              {showRaw ? "Pretty" : "Raw"}
            </button>
          )}
          <CopyButton value={decoded} label="Copy" />
        </div>
      </div>
      {isHuge && !showRaw && (
        <p className="text-xs text-secondary px-2 py-1 border-b border-base bg-yellow-500/10">
          Payload too large to auto-format ({formatBytes(sizeBytes)}). Showing raw.
        </p>
      )}
      <pre className="text-xs font-mono text-main p-2 overflow-auto max-h-80 bg-surface whitespace-pre-wrap break-words">
        {display}
      </pre>
    </div>
  );
};

// ─── Main detail panel ─────────────────────────────────────────────────────

interface HarRequestDetailProps {
  entry: ProcessedEntry;
  curlCommand: string;
  onClose: () => void;
}

const TABS: { id: DetailTab; label: string }[] = [
  { id: "headers", label: "Headers" },
  { id: "request", label: "Request" },
  { id: "response", label: "Response" },
  { id: "cookies", label: "Cookies" },
  { id: "timing", label: "Timing" },
];

export const HarRequestDetail: React.FC<HarRequestDetailProps> = ({
  entry,
  curlCommand,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("headers");
  const [showCurl, setShowCurl] = useState(false);
  const { addBackgroundTab } = useRootStore();

  const openCurlInTab = useCallback(() => {
    const tab = createTab({
      title: `curl-${entry.hostname || "request"}.curl`,
      content: curlCommand,
      language: "curl",
      languageLocked: true,
    });
    addBackgroundTab(tab);
  }, [curlCommand, entry.hostname, addBackgroundTab]);

  const req = entry.entry.request;
  const res = entry.entry.response;
  const totalCookies = (req.cookies?.length ?? 0) + (res.cookies?.length ?? 0);

  const responseBody = useMemo(() => {
    const content = res.content;
    return {
      text: content?.text,
      encoding: content?.encoding,
      mimeType: content?.mimeType ?? "",
      sizeBytes: content?.size ?? res.bodySize ?? 0,
    };
  }, [res]);

  const requestBody = useMemo(() => {
    if (!req.postData) return null;
    return {
      text: req.postData.text,
      encoding: undefined,
      mimeType: req.postData.mimeType ?? "",
      sizeBytes: req.bodySize ?? 0,
      params: req.postData.params,
    };
  }, [req]);

  return (
    <div className="flex flex-col h-full border-l border-base bg-surface" data-testid="har-request-detail">
      {/* Header */}
      <div className="flex-none flex items-start gap-2 px-3 py-2 border-b border-base">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold font-mono">{entry.method}</span>
            <span className={`text-xs font-mono ${entry.statusCategory === "2xx" ? "text-green-500" : entry.statusCategory === "4xx" || entry.statusCategory === "5xx" ? "text-red-500" : "text-secondary"}`}>
              {entry.status} {res.statusText}
            </span>
          </div>
          <p className="text-xs text-secondary truncate" title={req.url}>{req.url}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowCurl((v) => !v)}
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
            title="Copy as cURL"
          >
            <Terminal size={13} />
          </button>
          <CopyButton value={req.url} />
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
            aria-label="Close detail"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* cURL panel */}
      {showCurl && (
        <div className="flex-none border-b border-base bg-element/30">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs font-medium text-secondary">cURL command</span>
            <div className="flex items-center gap-1">
              <CopyButton value={curlCommand} label="Copy" />
              <button
                onClick={openCurlInTab}
                className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-main bg-element hover:bg-element-hover rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
          <pre className="text-xs font-mono text-main px-3 pb-2 overflow-auto max-h-40 whitespace-pre-wrap">
            {curlCommand}
          </pre>
        </div>
      )}

      {/* Tabs */}
      <div className="flex-none flex border-b border-base px-2 pt-1 gap-0.5">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-2.5 py-1 text-xs rounded-t transition-colors ${
              activeTab === id
                ? "bg-surface-secondary text-main font-medium border border-b-0 border-base"
                : "text-secondary hover:text-main"
            }`}
          >
            {label}
            {id === "cookies" && totalCookies > 0 && (
              <span className="ml-1 text-yellow-500">({totalCookies})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {activeTab === "headers" && (
          <div>
            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20">
              General
            </div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  ["Request URL", req.url],
                  ["Request Method", req.method],
                  ["Status Code", `${res.status} ${res.statusText}`],
                  ["HTTP Version", req.httpVersion],
                  ["Transfer Size", formatBytes(entry.transferSize)],
                  ["Content Size", formatBytes(entry.contentSize)],
                  ["Total Time", formatTime(entry.totalTime)],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-base/50">
                    <td className="py-1 px-2 font-medium text-secondary w-36">{k}</td>
                    <td className="py-1 px-2 text-main font-mono break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {req.queryString.length > 0 && (
              <>
                <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
                  Query Parameters
                </div>
                <NameValueTable items={req.queryString} />
              </>
            )}

            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
              Response Headers
            </div>
            <HeadersTable headers={res.headers} />

            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
              Request Headers
            </div>
            <HeadersTable headers={req.headers} />
          </div>
        )}

        {activeTab === "request" && (
          <div>
            {req.queryString.length > 0 && (
              <>
                <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20">
                  Query String
                </div>
                <NameValueTable items={req.queryString} />
              </>
            )}

            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
              Request Headers
            </div>
            <HeadersTable headers={req.headers} />

            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
              Request Body
            </div>
            {requestBody ? (
              <>
                {requestBody.params && requestBody.params.length > 0 ? (
                  <NameValueTable items={requestBody.params} emptyMsg="No form params." />
                ) : (
                  <BodyViewer
                    text={requestBody.text}
                    mimeType={requestBody.mimeType}
                    sizeBytes={requestBody.sizeBytes}
                  />
                )}
              </>
            ) : (
              <p className="text-secondary text-sm p-2">No request body.</p>
            )}
          </div>
        )}

        {activeTab === "response" && (
          <div>
            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20">
              Response Headers
            </div>
            <HeadersTable headers={res.headers} />

            <div className="text-xs font-medium text-secondary uppercase tracking-wide px-2 py-1.5 border-b border-base bg-element/20 mt-2">
              Response Body
            </div>
            <BodyViewer {...responseBody} />
          </div>
        )}

        {activeTab === "cookies" && (
          <div>
            {totalCookies === 0 ? (
              <p className="text-secondary text-sm p-3">No cookies in this request.</p>
            ) : (
              <>
                <CookiesTable cookies={req.cookies ?? []} label="Request Cookies" />
                <CookiesTable cookies={res.cookies ?? []} label="Response Cookies (Set-Cookie)" />
              </>
            )}
          </div>
        )}

        {activeTab === "timing" && (
          <div>
            <TimingBar segments={entry.timingSegments} total={entry.totalTime} />
            {entry.entry.serverIPAddress && (
              <p className="text-xs text-secondary px-2 mt-2">
                Server IP: <span className="font-mono text-main">{entry.entry.serverIPAddress}</span>
              </p>
            )}
            {entry.entry.connection && (
              <p className="text-xs text-secondary px-2">
                Connection ID: <span className="font-mono text-main">{entry.entry.connection}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
