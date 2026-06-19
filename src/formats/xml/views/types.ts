export type XmlNodeKind =
  | "document"
  | "element"
  | "attribute"
  | "text"
  | "cdata"
  | "comment"
  | "processing-instruction"
  | "doctype";

export interface XmlSourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startOffset: number;
  endOffset: number;
}

export interface XmlAttributeInfo {
  id: string;
  kind: "attribute";
  name: string;
  localName: string;
  prefix: string | null;
  namespaceUri: string | null;
  value: string;
  path: string;
  xpath: string;
  clarkName: string;
  range?: XmlSourceRange;
}

export interface XmlNamespaceInfo {
  prefix: string;
  uri: string;
  declaredOnPath: string;
  generatedPrefix?: boolean;
}

export interface XmlNodeInfo {
  id: string;
  kind: XmlNodeKind;
  name: string;
  localName: string;
  prefix: string | null;
  namespaceUri: string | null;
  path: string;
  xpath: string;
  clarkName: string;
  attributes: XmlAttributeInfo[];
  children: XmlNodeInfo[];
  valuePreview: string;
  textLength: number;
  range?: XmlSourceRange;
  hasMixedContent: boolean;
  isEmptyElement: boolean;
  childElementCount: number;
}

export type XmlDiagnosticSeverity = "error" | "warning" | "info";

export interface XmlDiagnostic {
  id: string;
  severity: XmlDiagnosticSeverity;
  message: string;
  line?: number;
  column?: number;
  excerpt?: string;
  hint?: string;
}

export interface XmlSecurityWarning {
  id: string;
  severity: "warning" | "danger";
  title: string;
  message: string;
  path?: string;
}

export interface XmlDocumentStats {
  elementCount: number;
  attributeCount: number;
  textNodeCount: number;
  commentCount: number;
  cdataCount: number;
  processingInstructionCount: number;
  maxDepth: number;
  byteLength: number;
}

export interface XmlParseResult {
  isValid: boolean;
  root: XmlNodeInfo;
  nodesById: Map<string, XmlNodeInfo>;
  namespaces: XmlNamespaceInfo[];
  diagnostics: XmlDiagnostic[];
  securityWarnings: XmlSecurityWarning[];
  stats: XmlDocumentStats;
  document: Document | null;
}

export interface XPathResultRow {
  id: string;
  type: "node" | "attribute" | "text" | "value";
  name: string;
  valuePreview: string;
  path: string;
  line?: number;
  nodeXml?: string;
}

export interface XPathEvaluationResult {
  ok: boolean;
  expression: string;
  resultType: "nodes" | "string" | "number" | "boolean" | "error";
  rows: XPathResultRow[];
  scalarValue?: string;
  error?: string;
}
