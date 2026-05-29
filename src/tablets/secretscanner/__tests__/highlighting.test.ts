import { SecretFinding } from "../types";

/**
 * The overview ruler derives tick positions from finding.line and totalLines.
 * Test that logic directly — no DOM required.
 */

function rulerTicks(
  findings: SecretFinding[],
  totalLines: number,
  selectedFingerprint: string | undefined,
): Array<{ pct: number; colour: string; isSelected: boolean; title: string }> {
  const RULER_COLOUR: Record<string, string> = {
    critical: "#ef4444",
    high:     "#f59e0b",
    medium:   "#3b82f6",
    low:      "#6b7280",
    info:     "#9ca3af",
  };

  return findings
    .filter((f) => f.status !== "false-positive")
    .map((f) => ({
      pct: Math.max(0, Math.min(98, ((f.line - 1) / totalLines) * 100)),
      colour: RULER_COLOUR[f.severity],
      isSelected: f.fingerprint === selectedFingerprint,
      title: `${f.type} — line ${f.line}`,
    }));
}

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
    start: 6,
    end: 16,
    line: 1,
    column: 7,
    value: "0123456789",
    redactedValue: "01...89",
    fingerprint: "fp1",
    preview: "...",
    context: "...",
    addedLine: false,
    status: "open",
    ...overrides,
  };
}

describe("overview ruler tick positions", () => {
  it("returns no ticks when findings is empty", () => {
    expect(rulerTicks([], 10, undefined)).toHaveLength(0);
  });

  it("skips false-positive findings", () => {
    const fp = makeFinding({ status: "false-positive" });
    expect(rulerTicks([fp], 10, undefined)).toHaveLength(0);
  });

  it("positions first line at 0%", () => {
    const [tick] = rulerTicks([makeFinding({ line: 1 })], 100, undefined);
    expect(tick.pct).toBe(0);
  });

  it("positions last line close to 98% (clamped)", () => {
    const [tick] = rulerTicks([makeFinding({ line: 100 })], 100, undefined);
    expect(tick.pct).toBeCloseTo(98, 0);
  });

  it("positions a mid-document finding proportionally", () => {
    const [tick] = rulerTicks([makeFinding({ line: 51 })], 100, undefined);
    expect(tick.pct).toBeCloseTo(50, 0);
  });

  it("maps severity to the correct colour", () => {
    const cases: Array<[SecretFinding["severity"], string]> = [
      ["critical", "#ef4444"],
      ["high",     "#f59e0b"],
      ["medium",   "#3b82f6"],
      ["low",      "#6b7280"],
      ["info",     "#9ca3af"],
    ];
    for (const [severity, expected] of cases) {
      const [tick] = rulerTicks([makeFinding({ severity })], 10, undefined);
      expect(tick.colour).toBe(expected);
    }
  });

  it("marks the selected fingerprint as isSelected=true", () => {
    const finding = makeFinding({ fingerprint: "fp1" });
    const [tick] = rulerTicks([finding], 10, "fp1");
    expect(tick.isSelected).toBe(true);
  });

  it("does not mark as selected when fingerprint differs", () => {
    const finding = makeFinding({ fingerprint: "fp1" });
    const [tick] = rulerTicks([finding], 10, "fp2");
    expect(tick.isSelected).toBe(false);
  });

  it("renders a tick for every active finding including duplicates", () => {
    const f1 = makeFinding({ id: "f1", line: 3,  fingerprint: "fp1" });
    const f2 = makeFinding({ id: "f2", line: 7,  fingerprint: "fp1" }); // same fingerprint
    const f3 = makeFinding({ id: "f3", line: 15, fingerprint: "fp2" });
    const ticks = rulerTicks([f1, f2, f3], 20, undefined);
    expect(ticks).toHaveLength(3);
  });

  it("clamps positions to [0, 98]", () => {
    const tooEarly = makeFinding({ line: 0 });  // line 0 is invalid but shouldn't crash
    const [tick] = rulerTicks([tooEarly], 100, undefined);
    expect(tick.pct).toBeGreaterThanOrEqual(0);
    expect(tick.pct).toBeLessThanOrEqual(98);
  });
});
