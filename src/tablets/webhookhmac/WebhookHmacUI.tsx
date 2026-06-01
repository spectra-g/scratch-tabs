import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
} from '../../components/Icons';
import { useTabletContext } from '../bridge/context';
import { useTabletTabCreation } from '../bridge/hook';
import type { ProviderId, VerificationInput, VerificationResult, WebhookHmacData } from './types';
import { detectProvider, getProvider, providers } from './providers';
import { parseCurlCommand, parseRawHttpRequest, summarizeBody, makeInvisibleCharactersVisible, parseHeaders } from './parser';
import { verifyWithProvider } from './verifier';
import { samples } from './samples';
import { createDefaultData } from './serialization';
import { redactedSignature } from './diagnostics';

interface WebhookHmacUIProps {
  data: WebhookHmacData;
  onChange: (data: WebhookHmacData) => void;
}

const providerIds: ProviderId[] = ['github', 'stripe', 'slack', 'twilio', 'shopify', 'standard', 'custom'];

function toVerificationInput(data: WebhookHmacData): VerificationInput {
  return {
    providerId: data.providerId,
    method: data.method,
    url: data.url,
    headersText: data.headersText,
    bodyText: data.bodyText,
    secret: data.secret,
    contentType: data.contentType,
    timestampToleranceSeconds: data.timestampToleranceSeconds,
    customConfig: data.customConfig,
  };
}

function statusClasses(status: VerificationResult['status'] | 'idle'): string {
  if (status === 'pass') return 'bg-success-subtle text-success border-success/30';
  if (status === 'warning') return 'bg-warning-subtle text-warning border-warning/30';
  if (status === 'fail') return 'bg-danger-subtle text-danger border-danger/30';
  return 'bg-surface-secondary text-secondary border-base';
}

function statusText(status: VerificationResult['status'] | 'idle'): string {
  if (status === 'pass') return 'Signature verified';
  if (status === 'warning') return 'Verified with warnings';
  if (status === 'fail') return 'Signature mismatch';
  if (status === 'not-ready') return 'Waiting for required fields';
  return 'Not verified';
}

export function WebhookHmacUI({ data, onChange }: WebhookHmacUIProps) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [parseInput, setParseInput] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const verificationSequenceRef = useRef(0);
  const { tabId } = useTabletContext();
  const { createBackgroundTab } = useTabletTabCreation();
  const provider = useMemo(() => getProvider(data.providerId, data.customConfig), [data.providerId, data.customConfig]);
  const bodySummary = useMemo(() => summarizeBody(data.bodyText, data.contentType), [data.bodyText, data.contentType]);
  const detection = useMemo(() => detectProvider(toVerificationInput(data)), [data]);

  const update = useCallback((patch: Partial<WebhookHmacData>) => {
    onChange({ ...data, ...patch });
  }, [data, onChange]);

  const runVerification = useCallback(async (snapshot: WebhookHmacData, sequence: number) => {
    setIsVerifying(true);
    try {
      const activeProvider = getProvider(snapshot.providerId, snapshot.customConfig);
      const nextResult = await verifyWithProvider(activeProvider, toVerificationInput(snapshot));
      if (sequence === verificationSequenceRef.current) {
        setResult(nextResult);
      }
    } finally {
      if (sequence === verificationSequenceRef.current) {
        setIsVerifying(false);
      }
    }
  }, []);

  const verify = useCallback(async () => {
    const sequence = verificationSequenceRef.current + 1;
    verificationSequenceRef.current = sequence;
    await runVerification(data, sequence);
  }, [data, runVerification]);

  useEffect(() => {
    if (!data.autoVerify) return undefined;
    const sequence = verificationSequenceRef.current + 1;
    verificationSequenceRef.current = sequence;
    const timeout = window.setTimeout(() => {
      void runVerification(data, sequence);
    }, 250);
    return () => {
      if (verificationSequenceRef.current === sequence) {
        verificationSequenceRef.current += 1;
      }
      window.clearTimeout(timeout);
    };
  }, [data, runVerification]);

  const applyParsedRequest = useCallback(() => {
    const parsed = data.inputMode === 'curl'
      ? parseCurlCommand(parseInput)
      : parseRawHttpRequest(parseInput);
    update({
      method: parsed.method,
      url: parsed.url,
      headersText: parsed.headersText,
      bodyText: parsed.bodyText,
      contentType: parsed.contentType || data.contentType,
    });
    setParseWarnings(parsed.warnings);
  }, [data.contentType, data.inputMode, parseInput, update]);

  const loadSample = useCallback(async (sampleId: string) => {
    const sample = samples.find((item) => item.id === sampleId);
    if (!sample) return;
    setResult(null);
    setParseInput('');
    setParseWarnings([]);
    onChange(await sample.load());
  }, [onChange]);

  const openReport = useCallback(async () => {
    if (!result?.copyableReport) return;
    await createBackgroundTab('Webhook HMAC Report.md', result.copyableReport, 'markdown', tabId);
  }, [createBackgroundTab, result, tabId]);

  const receivedSignatureText = result?.receivedSignatures.map((signature) => redactedSignature(signature.raw)).join(', ') ?? '';
  const headers = parseHeaders(data.headersText);

  return (
    <div data-testid="webhook-hmac-tablet" className="h-full flex flex-col bg-canvas text-main">
      <div className="flex-shrink-0 border-b border-base bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="text-info" size={24} />
            <div>
              <h1 className="text-xl font-semibold leading-tight">Webhook HMAC Verifier</h1>
              <p className="text-sm text-secondary">Private signature inspection for provider webhooks.</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="text-sm text-secondary" htmlFor="webhook-provider-select">Provider</label>
            <select
              id="webhook-provider-select"
              data-testid="webhook-provider-select"
              className="bg-surface-secondary border border-base rounded-md px-3 py-2 text-sm"
              value={data.providerId}
              onChange={(event) => update({ providerId: event.target.value as ProviderId })}
            >
              {providerIds.map((id) => (
                <option key={id} value={id}>{providers[id].label}</option>
              ))}
            </select>
            <button
              type="button"
              data-testid="webhook-verify-button"
              className="inline-flex items-center gap-2 rounded-md bg-accent text-on-accent px-3 py-2 text-sm font-medium"
              onClick={() => void verify()}
            >
              <Play size={16} />
              Verify
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={data.autoVerify}
                onChange={(event) => update({ autoVerify: event.target.checked })}
              />
              Auto
            </label>
            <select
              aria-label="Load sample"
              className="bg-surface-secondary border border-base rounded-md px-3 py-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) void loadSample(event.target.value);
                event.currentTarget.value = '';
              }}
            >
              <option value="" disabled>Load sample</option>
              {samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.label}</option>)}
            </select>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-2 text-sm"
              onClick={() => void openReport()}
              disabled={!result}
            >
              <Clipboard size={16} />
              Open report
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-2 text-sm"
              onClick={() => {
                onChange({ ...createDefaultData(), providerId: data.providerId });
                setResult(null);
                setParseInput('');
                setParseWarnings([]);
              }}
            >
              <RotateCcw size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[minmax(420px,1fr)_minmax(420px,0.95fr)]">
        <section className="min-h-0 overflow-auto custom-scrollbar border-r border-base p-4 space-y-4">
          <div className="flex gap-2">
            {(['structured', 'raw-http', 'curl'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-md border px-3 py-2 text-sm ${data.inputMode === mode ? 'border-accent bg-accent-subtle text-accent' : 'border-base bg-surface'}`}
                onClick={() => update({ inputMode: mode })}
              >
                {mode === 'raw-http' ? 'Raw HTTP' : mode === 'curl' ? 'cURL' : 'Structured'}
              </button>
            ))}
          </div>

          {data.inputMode !== 'structured' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="webhook-parse-input">
                {data.inputMode === 'curl' ? 'Paste cURL command' : 'Paste raw HTTP request'}
              </label>
              <textarea
                id="webhook-parse-input"
                className="h-36 w-full resize-y rounded-md border border-base bg-surface p-3 font-mono text-sm custom-scrollbar"
                value={parseInput}
                onChange={(event) => setParseInput(event.target.value)}
              />
              <button type="button" className="rounded-md border border-base px-3 py-2 text-sm" onClick={applyParsedRequest}>
                Parse into fields
              </button>
              {parseWarnings.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning-subtle p-3 text-sm text-warning">
                  {parseWarnings.join(' ')}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3">
            <label className="text-sm font-medium" htmlFor="webhook-method-input">Method</label>
            <input
              id="webhook-method-input"
              className="rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
              value={data.method}
              onChange={(event) => update({ method: event.target.value.toUpperCase() })}
            />
            <label className="text-sm font-medium" htmlFor="webhook-url-input">URL</label>
            <input
              id="webhook-url-input"
              className="rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
              value={data.url}
              onChange={(event) => update({ url: event.target.value })}
              placeholder="https://example.com/webhooks/provider"
            />
            <label className="text-sm font-medium" htmlFor="webhook-content-type-input">Content type</label>
            <input
              id="webhook-content-type-input"
              className="rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
              value={data.contentType}
              onChange={(event) => update({ contentType: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="webhook-secret-input">Signing secret</label>
              <span className="text-xs text-secondary">locally stored encoded, masked by default</span>
            </div>
            <div className="flex">
              <input
                id="webhook-secret-input"
                data-testid="webhook-secret-input"
                className="min-w-0 flex-1 rounded-l-md border border-base bg-surface px-3 py-2 font-mono text-sm"
                type={data.showSecret ? 'text' : 'password'}
                value={data.secret}
                onChange={(event) => update({ secret: event.target.value })}
              />
              <button
                type="button"
                className="rounded-r-md border border-l-0 border-base px-3"
                aria-label={data.showSecret ? 'Hide secret' : 'Show secret'}
                onClick={() => update({ showSecret: !data.showSecret })}
              >
                {data.showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium" htmlFor="webhook-headers-input">Headers</label>
              <span id="webhook-headers-help" className="text-xs text-secondary">
                One header per line: Name: value
              </span>
            </div>
            <textarea
              id="webhook-headers-input"
              data-testid="webhook-headers-input"
              aria-describedby="webhook-headers-help"
              placeholder="X-Hub-Signature-256: sha256=...\nContent-Type: application/json"
              className="h-40 w-full resize-y rounded-md border border-base bg-surface p-3 font-mono text-sm custom-scrollbar"
              value={data.headersText}
              onChange={(event) => update({ headersText: event.target.value })}
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="webhook-body-input">Raw body</label>
            <textarea
              id="webhook-body-input"
              data-testid="webhook-body-input"
              className="h-56 w-full resize-y rounded-md border border-base bg-surface p-3 font-mono text-sm custom-scrollbar"
              value={data.bodyText}
              onChange={(event) => update({ bodyText: event.target.value })}
              spellCheck={false}
            />
          </div>

          {data.providerId === 'custom' && (
            <div className="rounded-md border border-base bg-surface-secondary p-3 space-y-3">
              <h2 className="text-sm font-semibold">Custom HMAC</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="rounded-md border border-base bg-surface px-3 py-2 text-sm"
                  value={data.customConfig.algorithm}
                  onChange={(event) => update({ customConfig: { ...data.customConfig, algorithm: event.target.value as typeof data.customConfig.algorithm } })}
                >
                  {['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map((algorithm) => <option key={algorithm}>{algorithm}</option>)}
                </select>
                <select
                  className="rounded-md border border-base bg-surface px-3 py-2 text-sm"
                  value={data.customConfig.encoding}
                  onChange={(event) => update({ customConfig: { ...data.customConfig, encoding: event.target.value as typeof data.customConfig.encoding } })}
                >
                  {['hex', 'base64', 'base64url'].map((encoding) => <option key={encoding}>{encoding}</option>)}
                </select>
                <input
                  className="rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
                  value={data.customConfig.headerName}
                  onChange={(event) => update({ customConfig: { ...data.customConfig, headerName: event.target.value } })}
                  placeholder="Signature header"
                />
                <input
                  className="rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
                  value={data.customConfig.signaturePrefix}
                  onChange={(event) => update({ customConfig: { ...data.customConfig, signaturePrefix: event.target.value } })}
                  placeholder="Optional prefix"
                />
              </div>
              <input
                className="w-full rounded-md border border-base bg-surface px-3 py-2 font-mono text-sm"
                value={data.customConfig.signedPayloadTemplate}
                onChange={(event) => update({ customConfig: { ...data.customConfig, signedPayloadTemplate: event.target.value } })}
                placeholder="{body}"
              />
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-auto custom-scrollbar p-4 space-y-4">
          <div
            data-testid="webhook-verification-status"
            role="status"
            className={`rounded-md border p-4 ${statusClasses(result?.status ?? 'idle')}`}
          >
            <div className="flex items-start gap-3">
              {result?.status === 'pass' || result?.status === 'warning'
                ? <CheckCircle2 size={24} />
                : result?.status === 'fail' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
              <div>
                <div className="text-lg font-semibold">{statusText(result?.status ?? 'idle')}</div>
                <div className="text-sm opacity-90">{provider.recipe}</div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-base bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Provider detection</h2>
              <span className="text-sm text-secondary">{Math.round(detection.confidence * 100)}% confidence</span>
            </div>
            <p className="text-sm text-secondary">{detection.reason}</p>
            {detection.providerId !== data.providerId && (
              <button
                type="button"
                className="rounded-md border border-base px-3 py-2 text-sm"
                onClick={() => update({ providerId: detection.providerId })}
              >
                Switch to {providers[detection.providerId].label}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-base bg-surface p-4">
              <div className="text-sm text-secondary">Computed signature</div>
              <div data-testid="webhook-computed-signature" className="mt-2 break-all font-mono text-sm">
                {result?.computedSignature ? redactedSignature(result.computedSignature) : 'No signature computed'}
              </div>
            </div>
            <div className="rounded-md border border-base bg-surface p-4">
              <div className="text-sm text-secondary">Received signature</div>
              <div data-testid="webhook-received-signature" className="mt-2 break-all font-mono text-sm">
                {receivedSignatureText || 'No signature parsed'}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-base bg-surface p-4">
            <h2 className="font-semibold">Replay window</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="text-secondary" htmlFor="webhook-tolerance-input">Tolerance seconds</label>
              <input
                id="webhook-tolerance-input"
                className="rounded-md border border-base bg-surface-secondary px-3 py-2"
                type="number"
                min={0}
                value={data.timestampToleranceSeconds}
                onChange={(event) => update({ timestampToleranceSeconds: Number(event.target.value) || 0 })}
              />
              <span className="text-secondary">Status</span>
              <span>{result?.replayStatus ?? 'unavailable'}</span>
              <span className="text-secondary">Skew</span>
              <span>{result?.timestampSkewSeconds === undefined ? 'n/a' : `${result.timestampSkewSeconds}s`}</span>
            </div>
          </div>

          <div className="rounded-md border border-base bg-surface p-4">
            <h2 className="font-semibold">Body byte inspector</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <span className="text-secondary">Bytes</span><span>{bodySummary.byteLength}</span>
              <span className="text-secondary">Characters</span><span>{bodySummary.charLength}</span>
              <span className="text-secondary">Newlines</span><span>{bodySummary.newlineStyle}</span>
              <span className="text-secondary">Trailing newline</span><span>{bodySummary.hasTrailingNewline ? 'present' : 'absent'}</span>
              <span className="text-secondary">Likely type</span><span>{bodySummary.likelyContentType}</span>
            </div>
          </div>

          <div className="rounded-md border border-base bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Canonical string</h2>
              <label className="inline-flex items-center gap-2 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={data.showInvisibleCharacters}
                  onChange={(event) => update({ showInvisibleCharacters: event.target.checked })}
                />
                Show invisible characters
              </label>
            </div>
            <pre className="max-h-48 overflow-auto custom-scrollbar whitespace-pre-wrap rounded-md bg-surface-secondary p-3 font-mono text-xs">
              {result?.signedPayloadPreview
                ? data.showInvisibleCharacters ? makeInvisibleCharactersVisible(result.signedPayloadPreview) : result.signedPayloadPreview
                : 'Verify to inspect the provider-specific signed payload.'}
            </pre>
          </div>

          <div className="rounded-md border border-base bg-surface p-4">
            <h2 className="font-semibold">Headers table</h2>
            <div className="mt-3 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <tbody>
                  {headers.entries.length === 0 ? (
                    <tr><td className="text-secondary">No headers entered</td></tr>
                  ) : headers.entries.map((entry, index) => (
                    <tr key={`${entry.name}-${index}`} className="border-t border-base">
                      <th className="py-2 pr-3 font-mono text-secondary">{entry.name}</th>
                      <td className="py-2 font-mono break-all">{provider.headerNames.some((name) => name.toLowerCase() === entry.name.toLowerCase()) ? redactedSignature(entry.value) : entry.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-md border border-base bg-surface p-4">
            <h2 className="font-semibold">Diagnostics</h2>
            <div className="mt-3 space-y-2">
              {isVerifying && <div className="text-sm text-secondary">Verifying...</div>}
              {!isVerifying && (!result || result.diagnostics.length === 0) && (
                <div className="text-sm text-secondary">No diagnostics yet.</div>
              )}
              {result?.diagnostics.map((diagnostic, index) => (
                <div key={`${diagnostic.title}-${index}`} className="rounded-md border border-base bg-surface-secondary p-3">
                  <div className="text-sm font-medium">{diagnostic.title}</div>
                  <div className="mt-1 text-sm text-secondary">{diagnostic.detail}</div>
                  {diagnostic.fix && <div className="mt-1 text-sm text-secondary">Fix: {diagnostic.fix}</div>}
                </div>
              ))}
            </div>
          </div>

          {result?.probableCauses.length ? (
            <div className="rounded-md border border-base bg-surface p-4">
              <h2 className="font-semibold">Probable causes</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-secondary">
                {result.probableCauses.map((cause) => <li key={cause}>{cause}</li>)}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="flex-shrink-0 border-t border-base bg-surface px-4 py-2 text-xs text-secondary">
        All processing runs locally in your browser. Secrets are locally stored, encoded and masked by default; webhook request data stays on this device.
      </footer>
    </div>
  );
}
