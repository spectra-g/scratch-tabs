import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Editor } from "@monaco-editor/react";
import {
  ShieldCheck,
  Key,
  FileText,
  Lock,
  Copy,
  Check,
  Split,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Hash,
} from "../../../components/Icons";
import { SmartViewProps } from "../../../views/registry";
import { parsePemBlocks, PemBlock, computeFingerprint } from "../utils/x509Parser";
import { CertificateCard } from "./components/CertificateCard";
import { FieldRow } from "./components/FieldRow";
import { useThemeStore } from "../../../stores/themeStore";
import { useRootStore } from "../../../stores/rootStore";
import { createTab } from "../../../utils/tabUtils";

// ─── Fingerprint hook (async SHA-256 via SubtleCrypto) ───────────────────────

function useFingerprints(blocks: PemBlock[]): Map<number, string> {
  const [fps, setFps] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let alive = true;
    const next = new Map<number, string>();
    const tasks = blocks.map(async (block, i) => {
      if (block.type !== "CERTIFICATE") return;
      try {
        const fp = await computeFingerprint(block.der);
        next.set(i, fp);
      } catch {
        // ignore
      }
    });
    Promise.all(tasks).then(() => {
      if (alive) setFps(new Map(next));
    });
    return () => { alive = false; };
  }, [blocks]);

  return fps;
}

// ─── Chain analysis ───────────────────────────────────────────────────────────

interface ChainLink {
  blockIndex: number;
  issuedByIndex: number | null;
}

function analyzeChain(blocks: PemBlock[]): ChainLink[] {
  const certs = blocks
    .map((b, i) => (b.type === "CERTIFICATE" ? { i, cert: b.parsed } : null))
    .filter(Boolean) as Array<{ i: number; cert: NonNullable<(typeof blocks[0] & { type: "CERTIFICATE" })["parsed"]> }>;

  return certs.map(({ i, cert }) => {
    if (cert.isSelfSigned) return { blockIndex: i, issuedByIndex: null };
    const issuer = certs.find(
      ({ i: j, cert: c }) =>
        j !== i &&
        c.subject.CN === cert.issuer.CN &&
        c.subject.O === cert.issuer.O,
    );
    return { blockIndex: i, issuedByIndex: issuer?.i ?? null };
  });
}

// ─── Block panel ─────────────────────────────────────────────────────────────

function BlockPanel({
  block,
  index,
  total,
  fingerprint,
  chainLink,
}: {
  block: PemBlock;
  index: number;
  total: number;
  fingerprint?: string;
  chainLink?: ChainLink;
}) {
  switch (block.type) {
    case "CERTIFICATE":
      return (
        <CertificateCard
          cert={block.parsed}
          index={index}
          total={total}
          fingerprint={fingerprint}
          chainLink={chainLink}
        />
      );

    case "PRIVATE_KEY":
      return (
        <SimpleBlockCard
          icon={<Lock size={16} className="text-warning" />}
          title={`${block.keyType} Private Key`}
          subtitle="Keep this secret — never share or paste into forms"
          accent="warning"
        />
      );

    case "PUBLIC_KEY":
      return (
        <SimpleBlockCard
          icon={<Key size={16} className="text-info" />}
          title={`${block.keyType} Public Key`}
          subtitle="Safe to share publicly"
          accent="info"
        />
      );

    case "CSR": {
      const subject = block.subject;
      return (
        <div className="border border-base rounded-lg overflow-hidden mb-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-surface-secondary">
            <FileText size={16} className="text-secondary flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-main">Certificate Signing Request (CSR)</div>
              {subject?.CN && <div className="text-xs text-secondary">CN: {subject.CN}</div>}
            </div>
          </div>
          {subject && Object.keys(subject).length > 0 && (
            <div className="px-4 py-3">
              {Object.entries(subject).map(([k, v]) =>
                v ? <FieldRow key={k} label={k} value={v} /> : null,
              )}
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <SimpleBlockCard
          icon={<FileText size={16} className="text-secondary" />}
          title={block.label}
          accent="base"
        />
      );
  }
}

function SimpleBlockCard({
  icon,
  title,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: "warning" | "info" | "base";
}) {
  const borderClass = { warning: "border-warning", info: "border-info", base: "border-base" }[accent];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border ${borderClass} rounded-lg mb-2 bg-surface-secondary`}>
      {icon}
      <div>
        <div className="text-sm font-medium text-main">{title}</div>
        {subtitle && <div className="text-xs text-secondary">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export const PemSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
}) => {
  const { isDarkMode } = useThemeStore();
  const { addBackgroundTab } = useRootStore();

  const blocks = useMemo(() => {
    try { return parsePemBlocks(content); } catch { return []; }
  }, [content]);

  const fingerprints = useFingerprints(blocks);
  const chainLinks = useMemo(() => analyzeChain(blocks), [blocks]);
  const chainMap = useMemo(
    () => new Map(chainLinks.map((l) => [l.blockIndex, l])),
    [chainLinks],
  );

  const total = blocks.length;
  const certCount = blocks.filter((b) => b.type === "CERTIFICATE").length;

  const splitCertificates = useCallback(() => {
    blocks.forEach((block, i) => {
      if (block.type !== "CERTIFICATE") return;
      const cn = block.parsed.subject.CN ?? `cert-${i + 1}`;
      addBackgroundTab(createTab({ title: cn, content: block.raw, language: "pem" }));
    });
  }, [blocks, addBackgroundTab]);

  const [copiedPem, setCopiedPem] = useState(false);
  const copyRawPem = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopiedPem(true);
    setTimeout(() => setCopiedPem(false), 1500);
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-surface text-main" data-testid="pem-smart-view">
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left: parsed info panel */}
        <Panel defaultSize={42} minSize={28} maxSize={60}>
          <div className="flex flex-col h-full border-r border-base">
            {/* Toolbar */}
            {total > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-base bg-surface-secondary flex-shrink-0 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <ShieldCheck size={13} className="text-info" />
                  <span className="font-medium text-main">{total} block{total !== 1 ? "s" : ""}</span>
                  {certCount > 0 && <span>· {certCount} cert{certCount !== 1 ? "s" : ""}</span>}
                </div>
                <div className="flex-1" />
                {certCount > 1 && (
                  <button
                    onClick={splitCertificates}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-base bg-element hover:bg-surface text-secondary hover:text-main transition-colors"
                    title="Open each certificate as its own tab"
                  >
                    <Split size={11} />
                    Split
                  </button>
                )}
                <button
                  onClick={copyRawPem}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-base bg-element hover:bg-surface text-secondary hover:text-main transition-colors"
                >
                  {copiedPem ? <Check size={11} /> : <Copy size={11} />}
                  Copy PEM
                </button>
              </div>
            )}

            {/* Block list */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {total === 0 ? (
                <EmptyState />
              ) : (
                <div className="p-4 space-y-1">
                  {blocks.map((block, i) => (
                    <BlockPanel
                      key={i}
                      block={block}
                      index={i}
                      total={total}
                      fingerprint={fingerprints.get(i)}
                      chainLink={chainMap.get(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-element hover:bg-info transition-colors cursor-col-resize" />

        {/* Right: Monaco editor */}
        <Panel minSize={30}>
          <Editor
            height="100%"
            language="pem"
            value={content}
            theme={isDarkMode ? "vs-dark" : "vs"}
            onChange={(val) => onContentChange(val ?? "")}
            options={{
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              fontSize: 13,
              fontFamily: "monospace",
              automaticLayout: true,
            }}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-secondary">
      <ShieldCheck size={32} className="mb-3 opacity-40" />
      <p className="text-sm">No PEM blocks detected</p>
      <p className="text-xs mt-1 text-muted">Paste a certificate, key, or CSR on the right</p>
    </div>
  );
}
