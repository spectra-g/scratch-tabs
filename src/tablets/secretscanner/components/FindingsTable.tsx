import React, { useMemo } from "react";
import { SecretFinding } from "../types";

interface FindingsTableProps {
  findings: SecretFinding[];
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

interface FindingGroup {
  representative: SecretFinding;
  count: number;
}

function groupByFingerprint(findings: SecretFinding[]): FindingGroup[] {
  const map = new Map<string, FindingGroup>();
  for (const finding of findings) {
    const existing = map.get(finding.fingerprint);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(finding.fingerprint, { representative: finding, count: 1 });
    }
  }
  return Array.from(map.values());
}

const severityClass: Record<SecretFinding["severity"], string> = {
  critical: "bg-danger-subtle text-danger",
  high: "bg-warning-subtle text-warning",
  medium: "bg-info-subtle text-info",
  low: "bg-surface-secondary text-secondary",
  info: "bg-surface-secondary text-tertiary",
};

export const FindingsTable: React.FC<FindingsTableProps> = ({ findings, selectedId, onSelect, className }) => {
  const groups = useMemo(() => groupByFingerprint(findings), [findings]);

  if (groups.length === 0) {
    return (
      <div className={`flex min-h-36 items-center justify-center border-b border-base px-4 py-8 text-center text-secondary ${className ?? ""}`}>
        No findings match the current scan and filters.
      </div>
    );
  }

  return (
    <div className={`min-h-0 overflow-auto border-b border-base custom-scrollbar ${className ?? ""}`}>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="sticky top-0 bg-surface-secondary text-xs uppercase text-tertiary">
          <tr>
            <th className="w-24 px-3 py-2">Severity</th>
            <th className="w-32 px-3 py-2">Provider</th>
            <th className="px-3 py-2">Preview</th>
            <th className="w-20 px-3 py-2">Location</th>
            <th className="w-20 px-3 py-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ representative: f, count }) => (
            <tr
              key={f.fingerprint}
              onClick={() => onSelect(f.id)}
              className={`cursor-pointer border-t border-base hover:bg-surface-secondary ${selectedId === f.id ? "bg-surface-secondary" : "bg-surface"}`}
            >
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-1 text-xs font-medium ${severityClass[f.severity]}`}>
                  {f.severity}
                </span>
              </td>
              <td className="truncate px-3 py-2 text-main">
                {f.provider}
                {count > 1 && (
                  <span className="ml-1.5 rounded-full bg-surface-secondary px-1.5 py-0.5 text-xs text-tertiary" title={`${count} occurrences`}>
                    ×{count}
                  </span>
                )}
              </td>
              <td className="truncate px-3 py-2 font-mono text-xs text-secondary">{f.preview}</td>
              <td className="px-3 py-2 text-secondary">{f.line}:{f.column}</td>
              <td className="px-3 py-2 text-secondary">{f.confidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
