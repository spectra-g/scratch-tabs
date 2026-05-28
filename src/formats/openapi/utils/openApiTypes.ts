export type OpenApiHttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface OpenApiDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
}

export interface OpenApiParseResult {
  data: Record<string, unknown> | null;
  format: "json" | "yaml" | "unknown";
  diagnostics: OpenApiDiagnostic[];
}

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie" | "body";
  required: boolean;
  type?: string;
  description?: string;
  default?: unknown;
  schema?: unknown;
}

export interface OpenApiMediaContent {
  mediaType: string;
  schema?: unknown;
  example?: unknown;
  schemaRefs: string[];
}

export interface OpenApiResponse {
  status: string;
  description?: string;
  content: OpenApiMediaContent[];
}

export interface OpenApiSecurityRequirement {
  scheme: string;
  scopes: string[];
}

export interface OpenApiOperation {
  id: string;
  method: OpenApiHttpMethod;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  servers: OpenApiServer[];
  auth: OpenApiSecurityRequirement[];
  authInherited: boolean;
  parameters: OpenApiParameter[];
  requestBody: OpenApiMediaContent[];
  responses: OpenApiResponse[];
  referencedSchemas: string[];
}

export interface OpenApiSchemaProperty {
  name: string;
  type?: string;
  itemsType?: string;
  itemsRef?: string;
  required: boolean;
  description?: string;
  deprecated?: boolean;
  enumValues?: unknown[];
  ref?: string;
}

export interface OpenApiSchema {
  name: string;
  type?: string;
  itemsType?: string;
  itemsRef?: string;
  format?: string;
  required: string[];
  properties: OpenApiSchemaProperty[];
  enumValues?: unknown[];
  oneOf: string[];
  anyOf: string[];
  allOf: string[];
  nullable: boolean;
  deprecated: boolean;
  description?: string;
  inboundRefs: string[];
  outboundRefs: string[];
  raw: unknown;
}

export interface OpenApiSecurityScheme {
  name: string;
  type?: string;
  description?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  scopes: string[];
}

export interface OpenApiTag {
  name: string;
  description?: string;
  count: number;
}

export interface OpenApiViewModel {
  sourceFormat: "json" | "yaml" | "unknown";
  specVersion: string;
  title: string;
  description?: string;
  apiVersion?: string;
  license?: string;
  contact?: string;
  servers: OpenApiServer[];
  tags: OpenApiTag[];
  operations: OpenApiOperation[];
  schemas: OpenApiSchema[];
  securitySchemes: OpenApiSecurityScheme[];
  globalSecurity: OpenApiSecurityRequirement[];
  diagnostics: OpenApiDiagnostic[];
}

export const OPENAPI_HTTP_METHODS: OpenApiHttpMethod[] = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
];
