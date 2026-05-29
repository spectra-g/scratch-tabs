import { SecretFinding } from "../types";

// Import the groupByFingerprint logic indirectly by testing the observable behaviour
// through the scan engine + redaction layer.
import { redactContent } from "../engine/redaction";

function makeFinding(overrides: Partial<SecretFinding> = {}): SecretFinding {
  return {
    id: "f1",
    ruleId: "github-token",
    provider: "GitHub",
    type: "GitHub token",
    severity: "critical",
    confidence: "high",
    reason: "provider-pattern",
    explanation: "...",
    remediation: [],
    start: 0,
    end: 10,
    line: 1,
    column: 1,
    value: "ghp_secret",
    redactedValue: "ghp_...ret",
    fingerprint: "fp1",
    preview: "ghp_...ret",
    context: "ghp_...ret",
    addedLine: false,
    status: "open",
    ...overrides,
  };
}

describe("deduplication — redactContent with duplicate fingerprints", () => {
  it("redacts every occurrence of a duplicated secret", () => {
    const input = "ghp_secret some other text ghp_secret again";
    const f1 = makeFinding({ id: "f1", start: 0, end: 10 });
    const f2 = makeFinding({ id: "f2", start: 27, end: 37, line: 1, column: 28 });
    const result = redactContent(input, [f1, f2]);
    expect(result).not.toContain("ghp_secret");
    expect(result.match(/\[REDACTED_GITHUB_/g)?.length).toBe(2);
  });

  it("restores ALL occurrences of a fingerprint when both are false-positive", () => {
    const input = "ghp_secret some other text ghp_secret again";
    const f1 = makeFinding({ id: "f1", start: 0, end: 10, status: "false-positive" });
    const f2 = makeFinding({ id: "f2", start: 27, end: 37, status: "false-positive" });
    const result = redactContent(input, [f1, f2]);
    expect(result).toBe(input); // nothing redacted
  });

  it("redacts only open occurrences when one duplicate is false-positive", () => {
    const input = "ghp_secret some other text ghp_secret again";
    const f1 = makeFinding({ id: "f1", start: 0, end: 10, status: "open" });
    const f2 = makeFinding({ id: "f2", start: 27, end: 37, status: "false-positive" });
    const result = redactContent(input, [f1, f2]);
    expect(result).toContain("[REDACTED_GITHUB_");
    expect(result).toContain("ghp_secret again"); // second one not redacted
  });
});

describe("deduplication — suppression propagation", () => {
  it("applySuppressionAndRedact marks all findings with suppressed fingerprint as FP", () => {
    // Replicate the logic from SecretScannerUI.applySuppressionAndRedact
    function applySuppressionAndRedact(
      input: string,
      rawFindings: SecretFinding[],
      suppressedFingerprints: string[],
    ) {
      const suppressed = new Set(suppressedFingerprints);
      const findings = rawFindings.map((f) =>
        suppressed.has(f.fingerprint) ? { ...f, status: "false-positive" as const } : f,
      );
      return { findings, redactedContent: redactContent(input, findings) };
    }

    const input = "ghp_secret some text ghp_secret";
    const f1 = makeFinding({ id: "f1", start: 0, end: 10 });
    const f2 = makeFinding({ id: "f2", start: 21, end: 31 });

    const { findings, redactedContent } = applySuppressionAndRedact(input, [f1, f2], ["fp1"]);

    expect(findings.every((f) => f.status === "false-positive")).toBe(true);
    expect(redactedContent).toBe(input); // nothing redacted
  });
});
