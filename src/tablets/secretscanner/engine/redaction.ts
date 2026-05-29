import { SecretFinding } from "../types";

export type RedactionStyle = "preserve" | "mask" | "placeholder";

export function fingerprintSecret(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function redactValue(value: string, provider: string, ordinal: number, style: RedactionStyle = "preserve"): string {
  if (style === "placeholder") {
    return `[REDACTED_${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${ordinal}]`;
  }

  if (style === "mask" || value.length <= 8) {
    return "*".repeat(Math.min(Math.max(value.length, 8), 24));
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function redactContent(input: string, findings: SecretFinding[]): string {
  // False positives are confirmed non-secrets — leave them as plain text.
  const active = findings.filter((f) => f.status !== "false-positive");
  const ordered = [...active].sort((a, b) => b.start - a.start);
  return ordered.reduce((content, finding, index) => {
    const replacement = redactValue(finding.value, finding.provider, ordered.length - index, "placeholder");
    return `${content.slice(0, finding.start)}${replacement}${content.slice(finding.end)}`;
  }, input);
}

export function createSafeReport(findings: SecretFinding[]): string {
  const active = findings.filter((f) => f.status !== "false-positive");

  if (active.length === 0) {
    return "Secret Scanner Report\n\nNo findings detected.";
  }

  const lines = [
    "Secret Scanner Report",
    "",
    `Total findings: ${active.length}`,
    "",
    "| Severity | Provider | Type | Location | Confidence | Fingerprint | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const finding of active) {
    lines.push(
      `| ${finding.severity} | ${finding.provider} | ${finding.type} | ${finding.line}:${finding.column} | ${finding.confidence} | ${finding.fingerprint} | ${finding.reason} |`,
    );
  }

  return lines.join("\n");
}

export function createJsonReport(findings: SecretFinding[]): string {
  const active = findings.filter((f) => f.status !== "false-positive");
  const report = {
    version: "1.0",
    scannedAt: new Date().toISOString(),
    totalFindings: active.length,
    findings: active.map((f) => ({
      severity: f.severity,
      confidence: f.confidence,
      provider: f.provider,
      type: f.type,
      reason: f.reason,
      line: f.line,
      column: f.column,
      fingerprint: f.fingerprint,
      explanation: f.explanation,
      remediation: f.remediation,
      ...(f.metadata ? { metadata: f.metadata } : {}),
    })),
  };
  return JSON.stringify(report, null, 2);
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function createCsvReport(findings: SecretFinding[]): string {
  const active = findings.filter((f) => f.status !== "false-positive");
  const headers = ["Severity", "Confidence", "Provider", "Type", "Reason", "Line", "Column", "Fingerprint"];
  const rows = active.map((f) =>
    [f.severity, f.confidence, f.provider, f.type, f.reason, String(f.line), String(f.column), f.fingerprint]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
