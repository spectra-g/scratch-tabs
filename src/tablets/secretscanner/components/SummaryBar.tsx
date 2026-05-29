import React from "react";
import { SecretFinding } from "../types";

interface SummaryBarProps {
  findings: SecretFinding[];
}

export const SummaryBar: React.FC<SummaryBarProps> = ({ findings }) => {
  const providers = new Set(findings.map((finding) => finding.provider));
  const criticalHigh = findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  const addedLines = findings.filter((finding) => finding.addedLine).length;
  const privateKeys = findings.filter((finding) => finding.reason === "private-key-block").length;

  const cards = [
    ["Findings", findings.length],
    ["Critical/High", criticalHigh],
    ["Providers", providers.size],
    ["Added Lines", addedLines],
    ["Private Keys", privateKeys],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-base bg-surface-secondary p-3 md:grid-cols-5">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md border border-base bg-surface px-3 py-2">
          <div className="text-xs uppercase text-tertiary">{label}</div>
          <div className="mt-1 text-xl font-semibold text-main">{value}</div>
        </div>
      ))}
    </div>
  );
};
