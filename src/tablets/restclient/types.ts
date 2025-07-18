export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

export type AuthType = "none" | "basic" | "bearer" | "apikey";

export type BodyType =
  | "none"
  | "form-data"
  | "x-www-form-urlencoded"
  | "raw"
  | "binary";

export type RawBodyFormat = "json" | "xml" | "html" | "text" | "javascript";

export type ExplanationLevel =
  | "simplest"
  | "simple"
  | "medium"
  | "detailed"
  | "most-detailed";

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface AuthParams {
  [key: string]: string;
}

export interface HttpRequestBody {
  type: BodyType;
  content: string;
  format?: RawBodyFormat;
  params: KeyValuePair[];
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  auth: {
    type: AuthType;
    params: AuthParams;
  };
  params: KeyValuePair[];
  body: HttpRequestBody;
  variables: KeyValuePair[];
  curlFlags?: string[]; // Store curl-specific flags that don't affect the HTTP request
}

export interface HttpResponseTiming {
  dns: number;
  connection: number;
  tls: number;
  firstByte: number;
  download: number;
  total: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  timing: HttpResponseTiming;
  contentType?: string;
}

export interface ResponseHistoryItem {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  isPinned: boolean;
  response: HttpResponse;
}

export interface HttpRequestHistoryItem {
  id: string;
  timestamp: number;
  request: HttpRequest;
  isPinned: boolean;
}

export interface ComparisonItem {
  id: string;
  label: string;
  response: HttpResponse;
  timestamp: number;
  method: HttpMethod;
  url: string;
}

export interface ComparisonDiff {
  type: "added" | "removed" | "modified" | "unchanged";
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface ResponseComparison {
  left: ComparisonItem;
  right: ComparisonItem;
  statusDiff: ComparisonDiff | null;
  headersDiff: ComparisonDiff[];
  bodyDiff: ComparisonDiff[];
  timingDiff: ComparisonDiff[];
  sizeDiff: ComparisonDiff | null;
}

export interface RestClientState {
  request: HttpRequest;
  response: HttpResponse | null;
  responseHistory: ResponseHistoryItem[];
  requestHistory: HttpRequestHistoryItem[];
  conversionFormat: string;
  explanationLevel: ExplanationLevel;
  isExecuting: boolean;
  error: string | null;
  comparison: {
    isComparing: boolean;
    selectedItems: ComparisonItem[];
    activeComparison: ResponseComparison | null;
  };
}

export interface RequestConverter {
  id: string;
  name: string;
  convert: (request: HttpRequest) => string;
  parse?: (text: string) => HttpRequest | null;
}
