// ─── HAR spec types (1.2) ─────────────────────────────────────────────────

export interface HarFile {
  log: HarLog;
}

export interface HarLog {
  version: string;
  creator: HarCreator;
  browser?: HarCreator;
  pages?: HarPage[];
  entries: HarEntry[];
  comment?: string;
}

export interface HarCreator {
  name: string;
  version: string;
  comment?: string;
}

export interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: HarPageTimings;
  comment?: string;
}

export interface HarPageTimings {
  onContentLoad?: number;
  onLoad?: number;
  comment?: string;
}

export interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  timings: HarTimings;
  cache?: HarCache;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
  // Chrome DevTools extensions
  _initiator?: unknown;
  _priority?: string;
  _resourceType?: string;
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarNameValue[];
  queryString: HarNameValue[];
  cookies: HarCookie[];
  headersSize: number;
  bodySize: number;
  postData?: HarPostData;
  comment?: string;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarNameValue[];
  cookies: HarCookie[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HarNameValue {
  name: string;
  value: string;
  comment?: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  comment?: string;
}

export interface HarContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
  comment?: string;
}

export interface HarPostData {
  mimeType: string;
  params?: HarNameValue[];
  text?: string;
  comment?: string;
}

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  ssl?: number;
  send: number;
  wait: number;
  receive: number;
  comment?: string;
}

export interface HarCache {
  beforeRequest?: HarCacheState;
  afterRequest?: HarCacheState;
  comment?: string;
}

export interface HarCacheState {
  expires?: string;
  lastAccess: string;
  eTag: string;
  hitCount: number;
  comment?: string;
}

// ─── Viewer types ──────────────────────────────────────────────────────────

export type StatusCategory = "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "unknown";

export type ResourceType =
  | "document"
  | "stylesheet"
  | "script"
  | "image"
  | "font"
  | "xhr"
  | "fetch"
  | "websocket"
  | "media"
  | "other";

export interface TimingSegment {
  label: string;
  duration: number; // ms, -1 means N/A
  color: string;    // CSS color
}

export interface ProcessedEntry {
  id: string;
  index: number;
  entry: HarEntry;
  // Derived
  hostname: string;
  pathname: string;
  method: string;
  status: number;
  statusCategory: StatusCategory;
  mimeType: string;
  resourceType: ResourceType;
  transferSize: number;
  contentSize: number;
  totalTime: number;
  /** ms offset from the very first entry's startedDateTime */
  startOffset: number;
  timingSegments: TimingSegment[];
  /** Whether this entry has sensitive data (auth headers, cookies, etc.) */
  hasSensitiveData: boolean;
}

export interface HarSummary {
  totalRequests: number;
  totalTransferred: number;
  totalContentSize: number;
  totalTime: number;
  startedAt: Date | null;
  statusCounts: Record<StatusCategory, number>;
  methodCounts: Record<string, number>;
  resourceTypeCounts: Record<string, number>;
  hasSensitiveData: boolean;
  sensitiveDataTypes: string[];
}

export interface HarFilter {
  search: string;
  methods: Set<string>;
  statusCategories: Set<StatusCategory>;
  resourceTypes: Set<string>;
  showErrorsOnly: boolean;
  /** undefined = all pages; set to a pageref string to restrict to one page */
  pageref?: string;
}

export type DetailTab = "headers" | "request" | "response" | "cookies" | "timing";
export type MainTab = "waterfall" | "table";
