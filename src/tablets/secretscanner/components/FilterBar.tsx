import React from "react";
import { SecretScannerData, SecretSeverity } from "../types";

interface FilterBarProps {
  data: SecretScannerData;
  providers: string[];
  onChange: (updates: Partial<SecretScannerData>) => void;
}

const severities: Array<"all" | SecretSeverity> = ["all", "critical", "high", "medium", "low", "info"];

export const FilterBar: React.FC<FilterBarProps> = ({ data, providers, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-base bg-surface px-3 py-2 text-sm">
      <select
        aria-label="Severity filter"
        value={data.severityFilter ?? "all"}
        onChange={(event) => onChange({ severityFilter: event.target.value as SecretScannerData["severityFilter"] })}
        className="rounded-md border border-base bg-canvas px-2 py-1 text-main"
      >
        {severities.map((severity) => (
          <option key={severity} value={severity}>{severity === "all" ? "All severities" : severity}</option>
        ))}
      </select>
      <select
        aria-label="Provider filter"
        value={data.providerFilter ?? "all"}
        onChange={(event) => onChange({ providerFilter: event.target.value })}
        className="rounded-md border border-base bg-canvas px-2 py-1 text-main"
      >
        <option value="all">All providers</option>
        {providers.map((provider) => (
          <option key={provider} value={provider}>{provider}</option>
        ))}
      </select>
      <select
        aria-label="Status filter"
        value={data.statusFilter ?? "all"}
        onChange={(event) => onChange({ statusFilter: event.target.value as SecretScannerData["statusFilter"] })}
        className="rounded-md border border-base bg-canvas px-2 py-1 text-main"
      >
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="false-positive">False positives</option>
      </select>
      <label className="ml-auto flex items-center gap-2 text-secondary">
        <input
          type="checkbox"
          checked={data.hideLowConfidence ?? false}
          onChange={(event) => onChange({ hideLowConfidence: event.target.checked })}
          className="h-4 w-4 rounded border-base"
        />
        Hide low confidence
      </label>
    </div>
  );
};
