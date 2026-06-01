import type {
  CustomHmacConfig,
  ParsedSignature,
  ProviderDetection,
  ProviderId,
  SignatureEncoding,
  SignedPayloadResult,
  TimestampResult,
  VerificationInput,
  WebhookProvider,
} from './types';
import { detectSignatureEncoding } from './verifier';
import { parseHeaders } from './parser';

function header(input: VerificationInput, name: string): string | undefined {
  return parseHeaders(input.headersText).get(name);
}

function hasHeader(input: VerificationInput, name: string): boolean {
  return parseHeaders(input.headersText).has(name);
}

function detection(providerId: ProviderId, confidence: number, reason: string): ProviderDetection {
  return { providerId, confidence, reason };
}

function prefixedHexSignature(raw: string | undefined, expectedPrefix: string): ParsedSignature[] {
  if (!raw) return [];
  return raw.split(',').map((part) => part.trim()).filter(Boolean).flatMap((part) => {
    const [prefix, value] = part.includes('=') ? part.split('=', 2) : ['', part];
    if (expectedPrefix && prefix !== expectedPrefix.replace('=', '')) return [];
    return [{ raw: part, value, encoding: 'hex' as const, prefix: prefix ? `${prefix}=` : undefined }];
  });
}

function splitHeaderSignatures(raw: string | undefined): string[] {
  return raw?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
}

function timestampFromHeader(input: VerificationInput, name: string): TimestampResult {
  const value = header(input, name);
  if (!value) {
    return {
      diagnostics: [{
        severity: 'error',
        title: `Missing ${name}`,
        detail: 'The provider includes this timestamp in the signed payload.',
        fix: 'Paste the timestamp header from the original webhook request.',
      }],
    };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return {
      diagnostics: [{
        severity: 'error',
        title: `Invalid ${name}`,
        detail: 'The timestamp value is not a Unix timestamp in seconds.',
      }],
    };
  }
  return { value: parsed, source: name, diagnostics: [] };
}

function timestampFromStripeSignature(input: VerificationInput): TimestampResult {
  const raw = header(input, 'stripe-signature');
  const value = raw?.split(',').find((part) => part.trim().startsWith('t='))?.trim().slice(2);
  if (!value) {
    return {
      diagnostics: [{
        severity: 'error',
        title: 'Missing Stripe timestamp',
        detail: 'Stripe signs "timestamp.rawBody" and provides the timestamp as t= in Stripe-Signature.',
        fix: 'Paste the complete Stripe-Signature header.',
      }],
    };
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { value: parsed, source: 'Stripe-Signature t=', diagnostics: [] }
    : {
        diagnostics: [{
          severity: 'error',
          title: 'Invalid Stripe timestamp',
          detail: 'The t= value is not a Unix timestamp in seconds.',
        }],
      };
}

function noTimestamp(): TimestampResult {
  return { diagnostics: [] };
}

function rawBodyPayload(input: VerificationInput): SignedPayloadResult {
  return { text: input.bodyText, diagnostics: [] };
}

function urlEncodedParamsForTwilio(body: string): string {
  const params = new URLSearchParams(body);
  return Array.from(params.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => {
      if (keyA !== keyB) return keyA < keyB ? -1 : 1;
      if (valueA === valueB) return 0;
      return valueA < valueB ? -1 : 1;
    })
    .map(([key, value]) => `${key}${value}`)
    .join('');
}

function customPayload(input: VerificationInput): SignedPayloadResult {
  const headers = parseHeaders(input.headersText);
  const template = input.customConfig.signedPayloadTemplate || '{body}';
  const text = template.replace(/\{([^}]+)\}/g, (_match, token: string) => {
    if (token === 'body') return input.bodyText;
    if (token === 'url') return input.url;
    if (token === 'method') return input.method;
    if (token === 'timestamp') {
      return input.customConfig.timestampHeaderName
        ? headers.get(input.customConfig.timestampHeaderName) ?? ''
        : '';
    }
    if (token.startsWith('header:')) return headers.get(token.slice('header:'.length)) ?? '';
    return '';
  });
  return { text, diagnostics: [] };
}

function parseSingleHeaderSignature(
  input: VerificationInput,
  headerName: string,
  encoding: SignatureEncoding,
  prefix = '',
): ParsedSignature[] {
  const raw = header(input, headerName);
  if (!raw) return [];
  const trimmed = raw.trim();
  const value = prefix && trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  return [{ raw: trimmed, value, encoding, prefix: prefix || undefined }];
}

export const providers: Record<ProviderId, WebhookProvider> = {
  github: {
    id: 'github',
    label: 'GitHub',
    headerNames: ['X-Hub-Signature-256', 'X-Hub-Signature'],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'hex',
    recipe: 'HMAC-SHA256 over the raw request body. Header format: sha256=<hex>.',
    detect: (input) => hasHeader(input, 'x-hub-signature-256') || hasHeader(input, 'x-hub-signature')
      ? detection('github', 0.95, 'GitHub signature header found.')
      : null,
    buildSignedPayload: rawBodyPayload,
    parseReceivedSignatures: (input) => {
      const sha256 = prefixedHexSignature(header(input, 'x-hub-signature-256'), 'sha256=');
      if (sha256.length > 0) return sha256;
      return prefixedHexSignature(header(input, 'x-hub-signature'), 'sha1=');
    },
    getTimestamp: noTimestamp,
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    headerNames: ['Stripe-Signature'],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'hex',
    recipe: 'HMAC-SHA256 over "timestamp.rawBody". Header values include t=<unix_seconds> and v1=<hex>.',
    detect: (input) => hasHeader(input, 'stripe-signature')
      ? detection('stripe', 0.95, 'Stripe-Signature header found.')
      : null,
    buildSignedPayload: (input) => {
      const timestamp = timestampFromStripeSignature(input);
      return { text: `${timestamp.value ?? ''}.${input.bodyText}`, diagnostics: [] };
    },
    parseReceivedSignatures: (input) => splitHeaderSignatures(header(input, 'stripe-signature'))
      .filter((part) => part.startsWith('v1='))
      .map((part) => ({ raw: part, value: part.slice(3), encoding: 'hex', version: 'v1' })),
    getTimestamp: timestampFromStripeSignature,
  },
  slack: {
    id: 'slack',
    label: 'Slack',
    headerNames: ['X-Slack-Signature', 'X-Slack-Request-Timestamp'],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'hex',
    recipe: 'HMAC-SHA256 over "v0:timestamp:rawBody". Header format: v0=<hex>.',
    detect: (input) => hasHeader(input, 'x-slack-signature')
      ? detection('slack', 0.95, 'Slack signature header found.')
      : null,
    buildSignedPayload: (input) => {
      const timestamp = header(input, 'x-slack-request-timestamp') ?? '';
      return { text: `v0:${timestamp}:${input.bodyText}`, diagnostics: [] };
    },
    parseReceivedSignatures: (input) => prefixedHexSignature(header(input, 'x-slack-signature'), 'v0='),
    getTimestamp: (input) => timestampFromHeader(input, 'x-slack-request-timestamp'),
  },
  twilio: {
    id: 'twilio',
    label: 'Twilio',
    headerNames: ['X-Twilio-Signature'],
    defaultAlgorithm: 'SHA-1',
    signatureEncoding: 'base64',
    recipe: 'HMAC-SHA1 over the externally visible request URL, plus sorted form params for URL-encoded bodies.',
    detect: (input) => hasHeader(input, 'x-twilio-signature')
      ? detection('twilio', 0.95, 'Twilio signature header found.')
      : null,
    buildSignedPayload: (input) => {
      const diagnostics = [];
      if (!input.url) {
        diagnostics.push({
          severity: 'error' as const,
          title: 'Missing request URL',
          detail: 'Twilio signs the externally visible request URL.',
          fix: 'Paste the exact public URL that Twilio called, including query string.',
        });
      }
      if (/localhost|127\.0\.0\.1/.test(input.url)) {
        diagnostics.push({
          severity: 'warning' as const,
          title: 'Localhost URL warning',
          detail: 'Twilio signs the public callback URL, not an internal localhost URL behind a tunnel or proxy.',
        });
      }
      const isForm = (input.contentType || header(input, 'content-type') || '').includes('x-www-form-urlencoded');
      return {
        text: `${input.url}${isForm ? urlEncodedParamsForTwilio(input.bodyText) : ''}`,
        diagnostics,
      };
    },
    parseReceivedSignatures: (input) => parseSingleHeaderSignature(input, 'x-twilio-signature', 'base64'),
    getTimestamp: noTimestamp,
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    headerNames: ['X-Shopify-Hmac-Sha256'],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'base64',
    recipe: 'HMAC-SHA256 over the raw request body. Header value is base64.',
    detect: (input) => hasHeader(input, 'x-shopify-hmac-sha256')
      ? detection('shopify', 0.95, 'Shopify HMAC header found.')
      : null,
    buildSignedPayload: rawBodyPayload,
    parseReceivedSignatures: (input) => parseSingleHeaderSignature(input, 'x-shopify-hmac-sha256', 'base64'),
    getTimestamp: noTimestamp,
  },
  standard: {
    id: 'standard',
    label: 'Standard Webhooks / Svix',
    headerNames: ['webhook-id', 'webhook-timestamp', 'webhook-signature'],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'base64',
    recipe: 'HMAC-SHA256 over "webhook-id.webhook-timestamp.rawBody". Signature values are versioned, such as v1,<base64>.',
    detect: (input) => hasHeader(input, 'webhook-signature')
      ? detection('standard', 0.9, 'Standard Webhooks signature header found.')
      : null,
    buildSignedPayload: (input) => {
      const headers = parseHeaders(input.headersText);
      return {
        text: `${headers.get('webhook-id') ?? ''}.${headers.get('webhook-timestamp') ?? ''}.${input.bodyText}`,
        diagnostics: [],
      };
    },
    parseReceivedSignatures: (input) => (header(input, 'webhook-signature') ?? '')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [version, value] = part.split(',', 2);
        return { raw: part, value: value ?? part, encoding: 'base64' as const, version };
      }),
    getTimestamp: (input) => timestampFromHeader(input, 'webhook-timestamp'),
  },
  custom: {
    id: 'custom',
    label: 'Custom HMAC',
    headerNames: [],
    defaultAlgorithm: 'SHA-256',
    signatureEncoding: 'hex',
    recipe: 'Template-driven HMAC using body, URL, method, timestamp, and header variables.',
    detect: () => null,
    buildSignedPayload: customPayload,
    parseReceivedSignatures: (input) => {
      const config: CustomHmacConfig = input.customConfig;
      const raw = config.headerName ? header(input, config.headerName) : undefined;
      if (!raw) return [];
      const value = config.signaturePrefix && raw.startsWith(config.signaturePrefix)
        ? raw.slice(config.signaturePrefix.length)
        : raw;
      return [{
        raw,
        value,
        encoding: config.encoding || detectSignatureEncoding(value),
        prefix: config.signaturePrefix || undefined,
      }];
    },
    getTimestamp: (input) => input.customConfig.replayToleranceEnabled && input.customConfig.timestampHeaderName
      ? timestampFromHeader(input, input.customConfig.timestampHeaderName)
      : noTimestamp(),
  },
};

export function getProvider(providerId: ProviderId, customConfig?: CustomHmacConfig): WebhookProvider {
  if (providerId !== 'custom') return providers[providerId];
  return {
    ...providers.custom,
    defaultAlgorithm: customConfig?.algorithm ?? 'SHA-256',
    signatureEncoding: customConfig?.encoding ?? 'hex',
    headerNames: customConfig?.headerName ? [customConfig.headerName] : [],
  };
}

export function detectProvider(input: VerificationInput): ProviderDetection {
  const detections = Object.values(providers)
    .map((provider) => provider.detect(input))
    .filter((item): item is ProviderDetection => Boolean(item))
    .sort((left, right) => right.confidence - left.confidence);

  return detections[0] ?? detection('custom', 0.1, 'No known provider signature headers were found.');
}
