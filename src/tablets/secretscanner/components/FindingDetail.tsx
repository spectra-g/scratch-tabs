import React from "react";
import { EyeOff, ShieldAlert } from "../../../components/Icons";
import { SecretFinding } from "../types";

interface FindingDetailProps {
  finding?: SecretFinding;
  /** All line numbers where this fingerprint was found (sorted). */
  occurrenceLines?: number[];
  onToggleFalsePositive: (id: string) => void;
}

export const FindingDetail: React.FC<FindingDetailProps> = ({ finding, occurrenceLines, onToggleFalsePositive }) => {
  if (!finding) {
    return (
      <aside className="min-h-56 border-b border-base bg-surface p-4 text-sm text-secondary">
        Select a finding to inspect risk, context, and remediation.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 border-b border-base bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-main">
            <ShieldAlert size={18} className="text-warning" />
            <h2 className="text-base font-semibold">{finding.type}</h2>
          </div>
          <p className="mt-1 text-sm text-secondary">{finding.explanation}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFalsePositive(finding.id)}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-2 text-sm text-main hover:bg-surface-secondary"
        >
          <EyeOff size={16} />
          {finding.status === "false-positive" ? "Reopen" : "False Positive"}
        </button>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div><span className="text-tertiary">Fingerprint</span><div className="font-mono text-main">{finding.fingerprint}</div></div>
        <div><span className="text-tertiary">Reason</span><div className="text-main">{finding.reason}</div></div>
        <div>
          <span className="text-tertiary">
            {occurrenceLines && occurrenceLines.length > 1 ? `${occurrenceLines.length} occurrences` : "Location"}
          </span>
          <div className="text-main">
            {occurrenceLines && occurrenceLines.length > 1
              ? `Lines ${occurrenceLines.join(", ")}`
              : `Line ${finding.line}, col ${finding.column}`}
          </div>
        </div>
      </div>

      {finding.metadata && (
        <div className="rounded-md border border-base bg-canvas p-3 text-sm">
          <div className="mb-2 font-medium text-main">Decoded metadata</div>
          <dl className="grid gap-2 md:grid-cols-2">
            {Object.entries(finding.metadata).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs uppercase text-tertiary">{key}</dt>
                <dd className="break-all text-secondary">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div>
        <div className="mb-2 text-sm font-medium text-main">Masked context</div>
        <pre className="max-h-36 overflow-auto custom-scrollbar rounded-md border border-base bg-canvas p-3 text-xs text-secondary">{finding.context}</pre>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-main">Rotation checklist</div>
        <ul className="space-y-1 text-sm text-secondary">
          {finding.remediation.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
