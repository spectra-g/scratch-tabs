import React, { useState } from "react";
import { Copy, Check, ExternalLink, Download, Lock, AlertCircle } from "../../../components/Icons";
import { ArchiveEntry, PreviewResult } from "../types";
import { formatBytes } from "../utils/formatBytes";
import { TextPreview } from "./TextPreview";
import { ImagePreview } from "./ImagePreview";
import { HexPreview } from "./HexPreview";

const LANGUAGE_MAP: Record<string, string> = {
  json: "json",
  xml: "xml",
  html: "html",
  htm: "html",
  css: "css",
  js: "javascript",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  sh: "shell",
  bash: "shell",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
  md: "markdown",
};

function detectLanguage(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

interface PreviewPanelProps {
  entry: ArchiveEntry | null;
  preview: PreviewResult | null;
  isLoading: boolean;
  error: string | null;
  blobMissing: boolean;
  onRequestPreview: (path: string) => void;
  onHexPageChange: (page: number) => void;
  onOpenInNewTab: () => void;
  onExtract: () => void;
  onPasswordNeeded: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  entry,
  preview,
  isLoading,
  error,
  blobMissing,
  onRequestPreview,
  onHexPageChange,
  onOpenInNewTab,
  onExtract,
  onPasswordNeeded,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [openedNewTab, setOpenedNewTab] = useState(false);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleOpenInNewTab = () => {
    onOpenInNewTab();
    setOpenedNewTab(true);
    setTimeout(() => setOpenedNewTab(false), 1500);
  };

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-sm">
        Select a file to preview it.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" aria-label="File preview">
      {/* Header */}
      <div className="flex-none px-4 py-2 border-b border-base bg-surface-secondary">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-main truncate flex-1">{entry.path}</span>
          {entry.encryptionType !== "none" && (
            <span
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                entry.encryptionType === "aes" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"
              }`}
            >
              <Lock size={11} />
              {entry.encryptionType === "aes" ? "AES-256" : "ZipCrypto"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
          <span>{formatBytes(entry.sizeUncompressed)} uncompressed</span>
          <span>{formatBytes(entry.sizeCompressed)} compressed</span>
          <span>CRC32: {entry.crc32}</span>
          {entry.modified && (
            <span>{new Date(entry.modified).toLocaleDateString()}</span>
          )}
          <span className="text-secondary/70">{entry.mimeType}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {blobMissing && (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-secondary bg-surface-raised border-b border-base">
            <AlertCircle size={14} className="text-warning" />
            Re-load the archive file to extract entries.
          </div>
        )}

        {entry.encryptionType === "aes" && (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3 p-4 bg-surface-raised rounded border border-base">
              <Lock size={20} className="text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-main">AES-256 Encrypted</p>
                <p className="text-xs text-secondary mt-1">
                  This entry uses AES-256 encryption, which cannot be decrypted in the browser.
                  Extract the raw encrypted bytes and use a native tool (7-Zip, WinRAR) to decrypt.
                </p>
              </div>
            </div>
            <button
              onClick={onExtract}
              className="self-start flex items-center gap-2 px-3 py-1.5 rounded border border-base text-secondary text-sm hover:bg-element-hover"
            >
              <Download size={14} />
              Extract encrypted bytes
            </button>
          </div>
        )}

        {entry.encryptionType === "zipcrypto" && !preview && !isLoading && (
          <div className="p-4">
            <button
              onClick={onPasswordNeeded}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-primary-content text-sm hover:bg-primary/90"
            >
              <Lock size={14} />
              Enter password to decrypt
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-secondary text-sm">
            <span className="animate-pulse">Loading preview…</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-4 text-sm text-danger bg-danger-subtle border border-danger/30 rounded m-4">
            {error}
          </div>
        )}

        {preview && !isLoading && !error && entry.encryptionType !== "aes" && (
          <>
            {(preview.type === "text" || preview.type === "json" || preview.type === "xml") && (
              <TextPreview
                content={preview.content}
                language={preview.type === "text" ? detectLanguage(entry.name) : preview.type}
                truncated={preview.truncated}
              />
            )}
            {preview.type === "image" && (
              <ImagePreview content={preview.content} fileName={entry.name} />
            )}
            {preview.type === "binary-hex" && (
              <HexPreview
                content={preview.content}
                originalSize={preview.originalSize}
                hexPage={preview.hexPage}
                truncated={preview.truncated}
                onPageChange={onHexPageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      {entry.encryptionType !== "aes" && (
        <div className="flex-none flex items-center gap-2 px-4 py-2 border-t border-base bg-surface-secondary">
          {preview?.type === "image" ? (
            <>
              <ActionButton
                icon={copied === "datauri" ? Check : Copy}
                label={copied === "datauri" ? "Copied!" : "Copy as Data URI"}
                active={copied === "datauri"}
                onClick={() => preview && handleCopy("datauri", preview.content)}
              />
            </>
          ) : preview?.type === "binary-hex" ? (
            <ActionButton
              icon={copied === "hex" ? Check : Copy}
              label={copied === "hex" ? "Copied!" : "Copy hex"}
              active={copied === "hex"}
              onClick={() => preview && handleCopy("hex", preview.content)}
            />
          ) : (
            <ActionButton
              icon={copied === "content" ? Check : Copy}
              label={copied === "content" ? "Copied!" : "Copy"}
              active={copied === "content"}
              onClick={() => preview && handleCopy("content", preview.content)}
            />
          )}

          <ActionButton
            icon={openedNewTab ? Check : ExternalLink}
            label={openedNewTab ? "Opened!" : "Open in New Tab"}
            active={openedNewTab}
            onClick={handleOpenInNewTab}
          />

          <ActionButton
            icon={Download}
            label="Extract"
            active={false}
            onClick={onExtract}
          />
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
      active
        ? "bg-success-subtle text-success"
        : "border border-base text-secondary hover:bg-element-hover hover:text-main"
    }`}
  >
    <Icon size={13} />
    {label}
  </button>
);
