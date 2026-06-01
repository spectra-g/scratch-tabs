import type {
  HmacAlgorithm,
  SignatureEncoding,
  VerificationInput,
  VerificationResult,
  WebhookProvider,
} from './types';
import { buildInputDiagnostics } from './diagnostics';

const encoder = new TextEncoder();

export function utf8Bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function signatureToBytes(signature: string, encoding: SignatureEncoding): Uint8Array | null {
  try {
    if (encoding === 'hex') {
      const clean = signature.trim();
      if (!/^[a-f0-9]+$/i.test(clean) || clean.length % 2 !== 0) return null;
      return new Uint8Array(clean.match(/.{2}/g)?.map((pair) => parseInt(pair, 16)) ?? []);
    }

    const normalized = encoding === 'base64url'
      ? signature.replace(/-/g, '+').replace(/_/g, '/')
      : signature;
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let diff = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

export async function hmacBytes(secret: string, payload: string, algorithm: HmacAlgorithm): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto HMAC support is unavailable in this environment.');
  }

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    utf8Bytes(secret),
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, utf8Bytes(payload));
  return new Uint8Array(signature);
}

export async function hmacString(
  secret: string,
  payload: string,
  algorithm: HmacAlgorithm,
  encoding: SignatureEncoding,
): Promise<string> {
  const bytes = await hmacBytes(secret, payload, algorithm);
  if (encoding === 'hex') return bytesToHex(bytes);
  if (encoding === 'base64url') return bytesToBase64Url(bytes);
  return bytesToBase64(bytes);
}

export function detectSignatureEncoding(value: string): SignatureEncoding {
  const clean = value.includes('=') ? value.slice(value.indexOf('=') + 1) : value;
  if (/^[a-f0-9]{20,}$/i.test(clean) && clean.length % 2 === 0) return 'hex';
  if (/^[A-Za-z0-9_-]+$/.test(clean) && !clean.includes('=')) return 'base64url';
  return 'base64';
}

function formatSignedPayloadPreview(text: string): string {
  if (text.length <= 160) return text;
  return `${text.slice(0, 160)}...`;
}

function buildReport(result: Omit<VerificationResult, 'copyableReport'>): string {
  const redactedComputed = result.computedSignature
    ? `${result.computedSignature.slice(0, 8)}...${result.computedSignature.slice(-6)}`
    : '(none)';
  const received = result.receivedSignatures
    .map((signature) => `${signature.raw.slice(0, 8)}...${signature.raw.slice(-6)}`)
    .join(', ') || '(none)';

  return [
    `Webhook HMAC verification: ${result.status}`,
    `Provider: ${result.providerLabel}`,
    `Algorithm: ${result.algorithm}`,
    `Encoding: ${result.signatureEncoding}`,
    `Signed payload bytes: ${result.signedPayloadBytes}`,
    `Computed signature: ${redactedComputed}`,
    `Received signatures: ${received}`,
    `Replay status: ${result.replayStatus}`,
    result.timestampSkewSeconds !== undefined ? `Timestamp skew seconds: ${result.timestampSkewSeconds}` : '',
    `Diagnostics: ${result.diagnostics.map((diagnostic) => diagnostic.title).join('; ') || 'none'}`,
  ].filter(Boolean).join('\n');
}

export async function verifyWithProvider(
  provider: WebhookProvider,
  input: VerificationInput,
): Promise<VerificationResult> {
  const diagnostics = [];

  if (!input.secret) {
    diagnostics.push({
      severity: 'error' as const,
      title: 'Missing signing secret',
      detail: 'A signing secret is required to compute the expected HMAC.',
      fix: 'Paste the webhook endpoint secret for this provider.',
    });
  }

  const signedPayload = provider.buildSignedPayload(input);
  diagnostics.push(...signedPayload.diagnostics);
  const receivedSignatures = provider.parseReceivedSignatures(input);
  diagnostics.push(...buildInputDiagnostics(input, receivedSignatures));
  const timestamp = provider.getTimestamp(input);
  diagnostics.push(...timestamp.diagnostics);

  let replayStatus: VerificationResult['replayStatus'] = 'unavailable';
  let timestampSkewSeconds: number | undefined;
  if (timestamp.value !== undefined) {
    const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
    timestampSkewSeconds = now - timestamp.value;
    if (timestampSkewSeconds < -input.timestampToleranceSeconds) {
      replayStatus = 'future';
      diagnostics.push({
        severity: 'warning',
        title: 'Timestamp is in the future',
        detail: `The timestamp is ${Math.abs(timestampSkewSeconds)} seconds ahead of this browser.`,
        fix: 'Check clock skew or captured sample time.',
      });
    } else if (timestampSkewSeconds > input.timestampToleranceSeconds) {
      replayStatus = 'stale';
      diagnostics.push({
        severity: 'warning',
        title: 'Timestamp outside replay tolerance',
        detail: `The timestamp is ${timestampSkewSeconds} seconds old; tolerance is ${input.timestampToleranceSeconds} seconds.`,
        fix: 'Increase tolerance only for debugging, or use a fresh captured request.',
      });
    } else {
      replayStatus = 'valid';
    }
  }

  if (receivedSignatures.length === 0) {
    diagnostics.push({
      severity: 'error',
      title: 'Missing signature header',
      detail: `No ${provider.headerNames.join(' or ')} header signature was found.`,
      fix: 'Paste the exact signature header from the webhook request.',
    });
  }

  let computedSignature = '';
  let matchedSignature: string | undefined;
  if (input.secret) {
    computedSignature = await hmacString(
      input.secret,
      signedPayload.text,
      provider.defaultAlgorithm,
      provider.signatureEncoding,
    );

    const computedBytes = signatureToBytes(computedSignature, provider.signatureEncoding);
    matchedSignature = receivedSignatures.find((signature) => {
      const receivedBytes = signatureToBytes(signature.value, signature.encoding);
      return Boolean(computedBytes && receivedBytes && constantTimeEqual(computedBytes, receivedBytes));
    })?.raw;
  }

  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  const hasWarning = diagnostics.some((diagnostic) => diagnostic.severity === 'warning');
  const status = !input.secret || receivedSignatures.length === 0
    ? 'not-ready'
    : matchedSignature
      ? hasWarning ? 'warning' : 'pass'
      : 'fail';

  if (status === 'fail' && !hasError) {
    diagnostics.push({
      severity: 'error',
      title: 'Signature mismatch',
      detail: 'The computed HMAC does not match any received signature.',
      fix: 'Verify the endpoint secret, raw body bytes, timestamp, and provider-specific canonical string.',
    });
  }

  const probableCauses = status === 'fail'
    ? [
        'The request body was parsed or pretty-printed before verification.',
        'The wrong endpoint secret was used.',
        'The timestamp or URL used in the signed payload does not match the provider recipe.',
        'The received signature uses a different encoding or provider prefix.',
      ]
    : [];

  const resultWithoutReport = {
    status,
    provider: provider.id,
    providerLabel: provider.label,
    algorithm: provider.defaultAlgorithm,
    signedPayloadPreview: formatSignedPayloadPreview(signedPayload.text),
    signedPayloadBytes: utf8Bytes(signedPayload.text).length,
    computedSignature,
    receivedSignatures,
    matchedSignature,
    signatureEncoding: provider.signatureEncoding,
    timestamp: timestamp.value,
    timestampSkewSeconds,
    timestampToleranceSeconds: timestamp.value === undefined ? undefined : input.timestampToleranceSeconds,
    replayStatus,
    diagnostics,
    probableCauses,
  };

  return {
    ...resultWithoutReport,
    copyableReport: buildReport(resultWithoutReport),
  };
}
