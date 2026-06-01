export type ProviderId =
  | 'github'
  | 'stripe'
  | 'slack'
  | 'twilio'
  | 'shopify'
  | 'standard'
  | 'custom';

export type HmacAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type SignatureEncoding = 'hex' | 'base64' | 'base64url';
export type VerificationStatus = 'pass' | 'fail' | 'warning' | 'not-ready';
export type ReplayStatus = 'valid' | 'stale' | 'future' | 'unavailable';
export type InputMode = 'structured' | 'raw-http' | 'curl';

export interface HeaderEntry {
  name: string;
  value: string;
}

export interface HeaderMap {
  entries: HeaderEntry[];
  warnings: string[];
  get(name: string): string | undefined;
  getAll(name: string): string[];
  has(name: string): boolean;
  toText(): string;
}

export interface CustomHmacConfig {
  algorithm: HmacAlgorithm;
  encoding: SignatureEncoding;
  headerName: string;
  signaturePrefix: string;
  signedPayloadTemplate: string;
  timestampHeaderName: string;
  replayToleranceEnabled: boolean;
}

export interface WebhookHmacData {
  providerId: ProviderId;
  inputMode: InputMode;
  method: string;
  url: string;
  headersText: string;
  bodyText: string;
  contentType: string;
  secret: string;
  encodedSecret?: string;
  customConfig: CustomHmacConfig;
  autoVerify: boolean;
  timestampToleranceSeconds: number;
  activeResultTab: 'summary' | 'canonical' | 'body' | 'headers' | 'report';
  showSecret: boolean;
  showInvisibleCharacters: boolean;
}

export interface WebhookHmacState {
  type: 'webhookhmac';
  data: WebhookHmacData;
}

export interface VerificationInput {
  providerId: ProviderId;
  method: string;
  url: string;
  headersText: string;
  bodyText: string;
  secret: string;
  contentType?: string;
  timestampToleranceSeconds: number;
  customConfig: CustomHmacConfig;
  nowSeconds?: number;
}

export interface ParsedSignature {
  raw: string;
  value: string;
  encoding: SignatureEncoding;
  prefix?: string;
  version?: string;
}

export interface TimestampResult {
  value?: number;
  source?: string;
  diagnostics: Diagnostic[];
}

export interface SignedPayloadResult {
  text: string;
  diagnostics: Diagnostic[];
}

export interface ProviderDetection {
  providerId: ProviderId;
  confidence: number;
  reason: string;
}

export interface Diagnostic {
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  fix?: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  provider: ProviderId;
  providerLabel: string;
  algorithm: HmacAlgorithm;
  signedPayloadPreview: string;
  signedPayloadBytes: number;
  computedSignature: string;
  receivedSignatures: ParsedSignature[];
  matchedSignature?: string;
  signatureEncoding: SignatureEncoding;
  timestamp?: number;
  timestampSkewSeconds?: number;
  timestampToleranceSeconds?: number;
  replayStatus: ReplayStatus;
  diagnostics: Diagnostic[];
  probableCauses: string[];
  copyableReport: string;
}

export interface WebhookProvider {
  id: ProviderId;
  label: string;
  headerNames: string[];
  defaultAlgorithm: HmacAlgorithm;
  signatureEncoding: SignatureEncoding;
  recipe: string;
  detect(input: VerificationInput): ProviderDetection | null;
  buildSignedPayload(input: VerificationInput): SignedPayloadResult;
  parseReceivedSignatures(input: VerificationInput): ParsedSignature[];
  getTimestamp(input: VerificationInput): TimestampResult;
}

export interface ParsedRequest {
  method: string;
  url: string;
  headersText: string;
  bodyText: string;
  contentType: string;
  warnings: string[];
}

export interface BodySummary {
  byteLength: number;
  charLength: number;
  newlineStyle: 'LF' | 'CRLF' | 'mixed' | 'none';
  hasTrailingNewline: boolean;
  likelyContentType: string;
}
