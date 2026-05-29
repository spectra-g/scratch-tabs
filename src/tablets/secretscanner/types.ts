import { TabletState } from "../types";

export type SecretSeverity = "critical" | "high" | "medium" | "low" | "info";
export type SecretConfidence = "high" | "medium" | "low";

export type SecretReasonCode =
  | "provider-pattern"
  | "private-key-block"
  | "secret-name-context"
  | "high-entropy"
  | "credential-url"
  | "jwt-structure"
  | "base64-decoded-secret"
  | "likely-placeholder";

export interface SecretRule {
  id: string;
  name: string;
  provider: string;
  severity: SecretSeverity;
  confidence: SecretConfidence;
  reason: SecretReasonCode;
  regex: RegExp;
  secretGroup?: number;
  explanation: string;
  remediation?: string[];
}

export interface SecretFinding {
  id: string;
  ruleId: string;
  provider: string;
  type: string;
  severity: SecretSeverity;
  confidence: SecretConfidence;
  reason: SecretReasonCode;
  explanation: string;
  remediation: string[];
  start: number;
  end: number;
  line: number;
  column: number;
  value: string;
  redactedValue: string;
  fingerprint: string;
  preview: string;
  context: string;
  addedLine: boolean;
  status: "open" | "false-positive";
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface SecretScanSummary {
  total: number;
  criticalHigh: number;
  providers: string[];
  addedLineFindings: number;
  privateKeys: number;
}

export interface SecretScanResult {
  findings: SecretFinding[];
  redactedContent: string;
  summary: SecretScanSummary;
}

export interface SecretScannerData {
  input: string;
  sourceTitle?: string;
  findings: SecretFinding[];
  redactedContent: string;
  selectedFindingId?: string;
  autoScan: boolean;
  hideLowConfidence: boolean;
  statusFilter: "all" | "open" | "false-positive";
  severityFilter: "all" | SecretSeverity;
  providerFilter: "all" | string;
  lastScannedAt?: number;
  scanError?: string;
  /** Fingerprints permanently suppressed across scans. Findings matching these are auto-marked false-positive on every scan. */
  suppressedFingerprints: string[];
}

export type SecretScannerState = TabletState & {
  type: "secretscanner";
  data: SecretScannerData;
};

export interface SecretScannerPayload {
  content?: string;
  title?: string;
}
