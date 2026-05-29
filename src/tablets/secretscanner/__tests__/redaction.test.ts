import { createCsvReport, createJsonReport, createSafeReport, fingerprintSecret, redactContent, redactValue } from "../engine/redaction";
import { SecretFinding } from "../types";

const openFinding: SecretFinding = {
  id: "finding-1",
  ruleId: "github-token",
  provider: "GitHub",
  type: "GitHub token",
  severity: "critical",
  confidence: "high",
  reason: "provider-pattern",
  explanation: "Matched GitHub token.",
  remediation: [],
  start: 6,
  end: 46,
  line: 1,
  column: 7,
  value: "ghp_abcdefghijklmnopqrstuvwxyz1234567890",
  redactedValue: "ghp_...7890",
  fingerprint: "abc123",
  preview: "token=ghp_...7890",
  context: "token=ghp_...7890",
  addedLine: false,
  status: "open",
};

const fpFinding: SecretFinding = { ...openFinding, id: "finding-fp", status: "false-positive" };

describe("secret scanner redaction", () => {
  it("creates deterministic fingerprints without exposing the secret", () => {
    expect(fingerprintSecret("secret-value")).toBe(fingerprintSecret("secret-value"));
    expect(fingerprintSecret("secret-value")).not.toContain("secret");
  });

  it("preserves short context for display redaction", () => {
    expect(redactValue("ghp_abcdefghijklmnopqrstuvwxyz1234567890", "GitHub", 1)).toBe("ghp_...7890");
  });

  it("replaces findings with provider-aware placeholders in content", () => {
    const result = redactContent("token=ghp_abcdefghijklmnopqrstuvwxyz1234567890", [openFinding]);
    expect(result).toBe("token=[REDACTED_GITHUB_1]");
  });

  it("does not redact false-positive findings", () => {
    const result = redactContent("token=ghp_abcdefghijklmnopqrstuvwxyz1234567890", [fpFinding]);
    expect(result).toBe("token=ghp_abcdefghijklmnopqrstuvwxyz1234567890");
  });

  // ---- markdown report ----

  it("creates safe markdown reports without full values", () => {
    const report = createSafeReport([openFinding]);
    expect(report).toContain("GitHub");
    expect(report).toContain("abc123");
    expect(report).not.toContain(openFinding.value);
  });

  it("excludes false-positive findings from markdown report", () => {
    const report = createSafeReport([fpFinding]);
    expect(report).toContain("No findings detected");
  });

  it("markdown report shows correct count when mix of open and FP", () => {
    const extra: SecretFinding = { ...openFinding, id: "f2", fingerprint: "def456" };
    const report = createSafeReport([openFinding, fpFinding, extra]);
    expect(report).toContain("Total findings: 2");
  });

  // ---- JSON report ----

  it("createJsonReport produces valid JSON with finding metadata", () => {
    const json = createJsonReport([openFinding]);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.totalFindings).toBe(1);
    expect(parsed.findings[0].provider).toBe("GitHub");
    expect(parsed.findings[0].severity).toBe("critical");
    expect(parsed.findings[0].fingerprint).toBe("abc123");
  });

  it("createJsonReport excludes false-positive findings", () => {
    const json = createJsonReport([fpFinding]);
    const parsed = JSON.parse(json);
    expect(parsed.totalFindings).toBe(0);
    expect(parsed.findings).toHaveLength(0);
  });

  it("createJsonReport does not include raw secret value", () => {
    const json = createJsonReport([openFinding]);
    expect(json).not.toContain(openFinding.value);
  });

  // ---- CSV report ----

  it("createCsvReport produces CSV with header and one data row", () => {
    const csv = createCsvReport([openFinding]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Severity");
    expect(lines[0]).toContain("Provider");
    expect(lines[1]).toContain("critical");
    expect(lines[1]).toContain("GitHub");
    expect(lines[1]).toContain("abc123");
  });

  it("createCsvReport excludes false-positive findings", () => {
    const csv = createCsvReport([fpFinding]);
    const lines = csv.split("\n").filter(Boolean);
    expect(lines).toHaveLength(1); // header only
  });

  it("createCsvReport escapes values containing commas", () => {
    const commaFinding: SecretFinding = { ...openFinding, type: "Key, secret" };
    const csv = createCsvReport([commaFinding]);
    expect(csv).toContain('"Key, secret"');
  });

  it("createCsvReport does not include raw secret value", () => {
    const csv = createCsvReport([openFinding]);
    expect(csv).not.toContain(openFinding.value);
  });
});
