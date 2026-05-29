import { looksLikeDocumentationContext } from "./falsePositive";
import { SecretConfidence, SecretFinding, SecretSeverity } from "../types";

const severityOrder: SecretSeverity[] = ["info", "low", "medium", "high", "critical"];
const confidenceOrder: SecretConfidence[] = ["low", "medium", "high"];

export function reduceSeverity(severity: SecretSeverity): SecretSeverity {
  const index = severityOrder.indexOf(severity);
  return severityOrder[Math.max(0, index - 1)];
}

export function reduceConfidence(confidence: SecretConfidence): SecretConfidence {
  const index = confidenceOrder.indexOf(confidence);
  return confidenceOrder[Math.max(0, index - 1)];
}

export function adjustFindingForContext(finding: SecretFinding): SecretFinding {
  if (finding.reason === "likely-placeholder") {
    return {
      ...finding,
      severity: "info",
      confidence: "low",
    };
  }

  if (looksLikeDocumentationContext(finding.context)) {
    return {
      ...finding,
      severity: reduceSeverity(finding.severity),
      confidence: reduceConfidence(finding.confidence),
    };
  }

  if (finding.addedLine && finding.severity !== "critical") {
    return {
      ...finding,
      severity: finding.severity === "medium" ? "high" : finding.severity,
    };
  }

  return finding;
}
