import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Copy, ExternalLink, Check, Loader2, ScanQrCode, ArrowRight } from 'lucide-react';
import { useQRDecoder } from './useQRDecoder';
import type { ContentTypeId } from './contentTypes';

const TYPE_LABELS: Record<ContentTypeId, string> = {
  url: 'URL',
  text: 'Plain Text',
  wifi: 'WiFi',
  email: 'Email',
  phone: 'Phone',
  sms: 'SMS',
  vcard: 'Contact (vCard)',
  geo: 'Location',
};

interface Props {
  onSendToGenerate: (data: string, detectedType: ContentTypeId | null) => void;
}

export const DecodePanel: React.FC<Props> = ({ onSendToGenerate }) => {
  const { result, error, loading, decode, reset } = useQRDecoder();
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the current object URL in a ref so the unmount cleanup can revoke it
  // even if state has already been torn down.
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      await decode(file);
    },
    [decode],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) handleFile(file);
      }
    },
    [handleFile],
  );

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleClear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col h-full">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onPaste={handlePaste}
        tabIndex={0}
        className={`relative m-4 flex-shrink-0 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-base/40 hover:border-base/70 hover:bg-surface-raised/20'
        }`}
        style={{ minHeight: 160 }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {previewUrl ? (
          <div className="flex items-center justify-center p-3 h-40">
            <img src={previewUrl} alt="QR to decode" className="max-h-full max-w-full object-contain rounded" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted">
            <ScanQrCode size={32} strokeWidth={1.5} />
            <div className="text-sm text-center">
              Drop a QR image here, paste (Ctrl+V), or click to select
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 rounded-lg">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Result */}
      {error && (
        <div className="mx-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mx-4 flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted mb-0.5">Decoded</div>
              <pre className="text-sm text-main font-mono break-all whitespace-pre-wrap line-clamp-4">
                {result.data}
              </pre>
            </div>
          </div>

          {result.detectedType && (
            <div className="text-xs text-muted">
              Type: <span className="text-main font-medium">{TYPE_LABELS[result.detectedType]}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-auto">
            {result.detectedType === 'url' && (
              <a
                href={result.data}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-surface-raised/50 border border-base/50 text-main hover:border-primary/50 transition-colors"
              >
                <ExternalLink size={12} /> Open URL
              </a>
            )}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${
                copied
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-surface-raised/50 border-base/50 text-main hover:border-primary/50'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => onSendToGenerate(result.data, result.detectedType)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
            >
              <ArrowRight size={12} /> Send to Generate
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-surface-raised/50 border border-base/50 text-muted hover:text-main transition-colors ml-auto"
            >
              <Upload size={12} /> New Image
            </button>
          </div>
        </div>
      )}

      {!result && !error && !loading && (
        <p className="mx-4 text-xs text-muted">
          Decoded QR codes are analyzed entirely in your browser — no data is sent anywhere.
        </p>
      )}
    </div>
  );
};
