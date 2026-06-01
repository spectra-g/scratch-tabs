import type { WebhookHmacData, WebhookHmacState } from './types';

type SerializedWebhookHmacData = WebhookHmacData;

export const defaultCustomConfig = {
  algorithm: 'SHA-256' as const,
  encoding: 'hex' as const,
  headerName: 'X-Signature',
  signaturePrefix: '',
  signedPayloadTemplate: '{body}',
  timestampHeaderName: 'X-Timestamp',
  replayToleranceEnabled: false,
};

export function createDefaultData(): WebhookHmacData {
  return {
    providerId: 'github',
    inputMode: 'structured',
    method: 'POST',
    url: '',
    headersText: '',
    bodyText: '',
    contentType: 'application/json',
    secret: '',
    customConfig: defaultCustomConfig,
    autoVerify: true,
    timestampToleranceSeconds: 300,
    activeResultTab: 'summary',
    showSecret: false,
    showInvisibleCharacters: false,
  };
}

export function createInitialState(payload?: Partial<WebhookHmacData>): WebhookHmacState {
  return {
    type: 'webhookhmac',
    data: hydrateWebhookHmacData(payload),
  };
}

export function encodeUtf8Base64(value: string): string {
  if (!value) return '';
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeUtf8Base64(value: string): string {
  if (!value) return '';
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

export function hydrateWebhookHmacData(payload?: Partial<WebhookHmacData>): WebhookHmacData {
  const secret = payload?.secret || (payload?.encodedSecret ? decodeUtf8Base64(payload.encodedSecret) : '');

  return {
    ...createDefaultData(),
    ...payload,
    secret,
    encodedSecret: payload?.encodedSecret,
    customConfig: {
      ...defaultCustomConfig,
      ...payload?.customConfig,
    },
    showSecret: false,
  };
}

function prepareDataForSerialization(data: WebhookHmacData): SerializedWebhookHmacData {
  return {
    ...data,
    secret: '',
    encodedSecret: encodeUtf8Base64(data.secret),
    showSecret: false,
  };
}

export function serializeWebhookHmacState(state: WebhookHmacState): string {
  return JSON.stringify({
    ...state,
    data: prepareDataForSerialization(state.data),
  });
}

export function deserializeWebhookHmacState(json: string): WebhookHmacState {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.type === 'webhookhmac' && parsed.data) {
      const serializedData = parsed.data as Partial<SerializedWebhookHmacData>;
      return createInitialState(serializedData);
    }
  } catch {
    // fall through
  }
  return createInitialState();
}
