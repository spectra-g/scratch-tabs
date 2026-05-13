import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy,
  Download,
  Check,
  QrCode,
  ScanQrCode,
  Upload,
  X,
  MapPin,
  Info,
} from 'lucide-react';
import type { Tablet, TabletState } from '../types';
import {
  contentTypeConfigs,
  CONTENT_TYPE_ORDER,
  autoDetectContentType,
  hasUserContent,
  DEFAULT_STYLE,
  type ContentTypeId,
  type QRStyleConfig,
  type HistoryItem,
} from './contentTypes';
import { useQRGenerator } from './useQRGenerator';
import { StylePanel } from './StylePanel';
import { HistoryStrip } from './HistoryStrip';
import { DecodePanel } from './DecodePanel';

interface QRCodeData {
  mode: 'generate' | 'decode';
  contentType: ContentTypeId;
  fields: Record<string, string>;
  style: QRStyleConfig;
  logoDataUrl: string | null;
  logoSize: number;
  history: HistoryItem[];
}

interface QRCodeTabletState extends TabletState {
  type: 'qrcode';
  data: QRCodeData;
}

function buildQRContent(contentType: ContentTypeId, fields: Record<string, string>): string {
  return contentTypeConfigs[contentType].format(fields);
}


function createInitialData(): QRCodeData {
  return {
    mode: 'generate',
    contentType: 'url',
    fields: { url: '' },
    style: { ...DEFAULT_STYLE },
    logoDataUrl: null,
    logoSize: 25,
    history: [],
  };
}

async function resizeImageToDataUrl(file: File, maxPx = 200): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/png');
}

// ── Main UI ──────────────────────────────────────────────────────────────────

const QRCodeUI: React.FC<{
  state: QRCodeTabletState;
  onChange: (state: QRCodeTabletState) => void;
}> = ({ state, onChange }) => {
  const { data } = state;
  const [styleOpen, setStyleOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [autoDetectPill, setAutoDetectPill] = useState<ContentTypeId | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { containerRef, update, downloadPng, downloadSvg, copyPng, getThumbnailDataUrl } =
    useQRGenerator();

  const qrContent = buildQRContent(data.contentType, data.fields);

  const updateData = useCallback(
    (patch: Partial<QRCodeData>) => {
      onChange({ ...state, data: { ...data, ...patch } });
    },
    [state, onChange, data],
  );

  const updateStyle = useCallback(
    (patch: Partial<QRStyleConfig>) => {
      updateData({ style: { ...data.style, ...patch } });
    },
    [updateData, data.style],
  );

  const setField = useCallback(
    (key: string, value: string) => {
      updateData({ fields: { ...data.fields, [key]: value } });
    },
    [updateData, data.fields],
  );

  // Sync QR preview whenever content or style changes
  useEffect(() => {
    update(qrContent, data.style, data.logoDataUrl, data.logoSize);
  }, [qrContent, data.style, data.logoDataUrl, data.logoSize, update]);

  // Ref so the timeout callback always captures the latest state without being
  // listed as a dependency (avoids resetting the debounce on every keypress).
  const saveHistoryCallbackRef = useRef<() => void>(() => {});
  saveHistoryCallbackRef.current = async () => {
    // Guard runs at fire-time so a field cleared within the 1.5s window is caught.
    if (!hasUserContent(data.contentType, data.fields)) return;
    const thumbDataUrl = await getThumbnailDataUrl();
    if (!thumbDataUrl) return;
    const item: HistoryItem = {
      id: Date.now().toString(),
      thumbDataUrl,
      contentType: data.contentType,
      fields: { ...data.fields },
      style: { ...data.style },
      logoDataUrl: data.logoDataUrl,
      logoSize: data.logoSize,
      timestamp: Date.now(),
    };
    // Deduplicate: replace any existing entry that produces the same QR payload.
    const deduped = data.history.filter(
      (h) => buildQRContent(h.contentType, h.fields) !== qrContent,
    );
    updateData({ history: [item, ...deduped].slice(0, 8) });
  };

  // Debounce: save to history 1.5s after content/style/logo changes.
  useEffect(() => {
    if (!qrContent.trim()) return;
    const id = setTimeout(() => saveHistoryCallbackRef.current(), 1500);
    return () => clearTimeout(id);
  }, [qrContent, data.style, data.logoDataUrl]);

  const handleContentTypeSwitch = (ct: ContentTypeId) => {
    const defaults = contentTypeConfigs[ct].defaultFields ?? {};
    updateData({ contentType: ct, fields: { ...defaults } });
    setAutoDetectPill(null);
  };

  const handleUrlFieldChange = (value: string) => {
    setField('url', value);
    const detected = autoDetectContentType(value);
    if (detected && detected !== data.contentType) {
      setAutoDetectPill(detected);
    } else {
      setAutoDetectPill(null);
    }
  };

  const handleAcceptAutoDetect = () => {
    if (!autoDetectPill) return;
    const field = data.fields.url || data.fields.text || '';
    const defaults = contentTypeConfigs[autoDetectPill].defaultFields ?? {};
    updateData({ contentType: autoDetectPill, fields: { ...defaults, text: field, url: field } });
    setAutoDetectPill(null);
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return;
    const dataUrl = await resizeImageToDataUrl(file);
    updateData({
      logoDataUrl: dataUrl,
      style: { ...data.style, errorCorrection: 'H' },
    });
  };

  const handleCopyPng = async () => {
    const ok = await copyPng();
    if (ok) {
      setCopiedAction('png');
      setTimeout(() => setCopiedAction(null), 2000);
    }
  };

  const handleRestoreHistory = (item: HistoryItem) => {
    updateData({
      contentType: item.contentType,
      fields: item.fields,
      style: item.style,
      logoDataUrl: item.logoDataUrl,
      logoSize: item.logoSize,
    });
  };

  const handleGeoLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      updateData({
        fields: {
          ...data.fields,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        },
      });
    });
  };

  const handleSendToGenerate = (rawData: string, detectedType: ContentTypeId | null) => {
    const ct = detectedType ?? 'text';
    const defaults = contentTypeConfigs[ct].defaultFields ?? {};
    const key = ct === 'url' ? 'url' : 'text';
    updateData({ mode: 'generate', contentType: ct, fields: { ...defaults, [key]: rawData } });
  };

  const cfg = contentTypeConfigs[data.contentType];

  // ── Generate mode layout ────────────────────────────────────────────────

  const generateView = (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left: form */}
      <div className="w-[46%] min-w-0 flex flex-col border-r border-base/30 overflow-y-auto custom-scrollbar">
        {/* Content type tabs */}
        <div className="flex-shrink-0 flex flex-wrap gap-1 p-3 border-b border-base/30">
          {CONTENT_TYPE_ORDER.map((ct) => (
            <button
              key={ct}
              onClick={() => handleContentTypeSwitch(ct)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                data.contentType === ct
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'border-base/40 text-muted hover:text-main hover:border-base/60'
              }`}
            >
              {contentTypeConfigs[ct].label}
            </button>
          ))}
        </div>

        {/* Auto-detect pill */}
        {autoDetectPill && (
          <div className="flex-shrink-0 mx-3 mt-2 flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded text-xs">
            <Info size={12} className="text-primary flex-shrink-0" />
            <span className="text-main">
              Detected: <strong>{contentTypeConfigs[autoDetectPill].label}</strong>
            </span>
            <button
              onClick={handleAcceptAutoDetect}
              className="ml-auto text-primary hover:underline"
            >
              Switch
            </button>
            <button onClick={() => setAutoDetectPill(null)} className="text-muted hover:text-main">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Fields */}
        <div className="flex-1 p-3 space-y-3">
          {cfg.fields.map((field) => {
            if (field.toggle) {
              return (
                <label key={field.key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-secondary">{field.label}</span>
                  <input
                    type="checkbox"
                    checked={data.fields[field.key] === 'true'}
                    onChange={(e) => setField(field.key, String(e.target.checked))}
                    className="rounded"
                  />
                </label>
              );
            }

            if (field.options) {
              return (
                <div key={field.key}>
                  <label className="block text-xs text-muted mb-1">{field.label}</label>
                  <select
                    value={data.fields[field.key] ?? field.options[0].value}
                    onChange={(e) => setField(field.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm bg-canvas border border-base/50 rounded text-main focus:outline-none focus:border-primary/50"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.multiline) {
              return (
                <div key={field.key}>
                  <label className="block text-xs text-muted mb-1">{field.label}</label>
                  <textarea
                    value={data.fields[field.key] ?? ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full px-2.5 py-1.5 text-sm bg-canvas border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50 resize-none font-mono"
                  />
                </div>
              );
            }

            const isUrlField = cfg.id === 'url' && field.key === 'url';
            return (
              <div key={field.key}>
                <label className="block text-xs text-muted mb-1">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.inputType ?? 'text'}
                    value={data.fields[field.key] ?? ''}
                    onChange={(e) =>
                      isUrlField ? handleUrlFieldChange(e.target.value) : setField(field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full px-2.5 py-1.5 text-sm bg-canvas border border-base/50 rounded text-main placeholder-muted/50 focus:outline-none focus:border-primary/50"
                  />
                  {cfg.id === 'geo' && field.key === 'lat' && (
                    <button
                      onClick={handleGeoLocation}
                      title="Use my location"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    >
                      <MapPin size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Logo upload */}
        <div className="flex-shrink-0 border-t border-base/30 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted">Logo (optional)</span>
            {data.logoDataUrl && (
              <button
                onClick={() => updateData({ logoDataUrl: null })}
                className="text-xs text-muted hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {data.logoDataUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={data.logoDataUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded border border-base/40 bg-white"
              />
              <div className="flex-1">
                <label className="block text-xs text-muted mb-0.5">
                  Size {data.logoSize}%
                  {data.logoSize > 30 && data.style.errorCorrection !== 'H' && (
                    <span className="text-amber-400 ml-1">(scanability risk)</span>
                  )}
                </label>
                <input
                  type="range"
                  min={15}
                  max={40}
                  value={data.logoSize}
                  onChange={(e) => updateData({ logoSize: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-base/40 rounded text-xs text-muted hover:text-main hover:border-base/60 transition-colors"
            >
              <Upload size={12} /> Upload PNG, SVG, or JPEG (max 2MB)
            </button>
          )}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Style panel */}
        <StylePanel
          style={data.style}
          hasLogo={!!data.logoDataUrl}
          onChange={updateStyle}
          open={styleOpen}
          onToggle={() => setStyleOpen((v) => !v)}
        />
      </div>

      {/* Right: preview */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* QR preview — show checkerboard when transparent so black dots are visible on dark theme */}
        <div
          className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden"
          style={
            data.style.transparent
              ? {
                  backgroundImage:
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#fff',
                }
              : {}
          }
        >
          {/*
            aspect-square + w-full + max-h-full: the wrapper becomes a square whose
            side is min(container_width, container_height). The SVG is then told to
            fill that square — so it scales correctly on both axes as the viewport
            shrinks in either direction.
          */}
          <div
            ref={containerRef}
            className="aspect-square w-full max-h-full [&>svg]:block [&>svg]:w-full [&>svg]:h-full rounded-lg overflow-hidden shadow-sm"
          />
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 border-t border-base/30 p-3 flex flex-wrap gap-2">
          <button
            onClick={handleCopyPng}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${
              copiedAction === 'png'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-surface-raised/50 border-base/50 text-main hover:border-primary/50'
            }`}
          >
            {copiedAction === 'png' ? <Check size={12} /> : <Copy size={12} />}
            Copy PNG
          </button>
          <button
            onClick={() => downloadPng('qrcode')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-base/50 bg-surface-raised/50 text-main hover:border-primary/50 transition-colors"
          >
            <Download size={12} /> PNG
          </button>
          <button
            onClick={() => downloadSvg('qrcode')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-base/50 bg-surface-raised/50 text-main hover:border-primary/50 transition-colors"
          >
            <Download size={12} /> SVG
          </button>
        </div>

        {/* History strip */}
        <HistoryStrip history={data.history} onRestore={handleRestoreHistory} />

        {/* Privacy footer */}
        <div className="flex-shrink-0 px-3 py-2 border-t border-base/20 text-center text-xs text-muted/60">
          Generated in your browser — no data leaves your device
        </div>
      </div>
    </div>
  );

  // ── Decode mode layout ──────────────────────────────────────────────────

  const decodeView = (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <DecodePanel onSendToGenerate={handleSendToGenerate} />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-canvas text-main">
      {/* Mode tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 border-b border-base/30 px-3 pt-2">
        <button
          onClick={() => updateData({ mode: 'generate' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
            data.mode === 'generate'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          <QrCode size={14} /> Generate
        </button>
        <button
          onClick={() => updateData({ mode: 'decode' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
            data.mode === 'decode'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-main'
          }`}
        >
          <ScanQrCode size={14} /> Decode
        </button>
      </div>

      {data.mode === 'generate' ? generateView : decodeView}
    </div>
  );
};

// ── Tablet definition ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createInitialState(payload?: any): QRCodeTabletState {
  const base = createInitialData();
  if (payload?.url) {
    base.contentType = 'url';
    base.fields = { url: payload.url };
  }
  return { type: 'qrcode', data: base };
}

export default {
  id: 'qrcode',
  label: 'QR Code Generator',
  keywords: ['qr', 'qrcode', 'generator', 'barcode', 'wifi', 'url', 'vcard', 'offline', 'decode', 'scan'],

  createInitialState,

  serializeState: (state: QRCodeTabletState) => JSON.stringify(state),

  deserializeState: (json: string): QRCodeTabletState => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'qrcode' && parsed.data) {
        return {
          ...parsed,
          data: {
            ...createInitialData(),
            ...parsed.data,
            style: { ...DEFAULT_STYLE, ...(parsed.data.style ?? {}) },
            history: parsed.data.history ?? [],
          },
        };
      }
    } catch {
      // fall through to default
    }
    return createInitialState();
  },

  render: (state: QRCodeTabletState, onChange: (s: QRCodeTabletState) => void) =>
    React.createElement(QRCodeUI, { state, onChange }),
} satisfies Tablet;
