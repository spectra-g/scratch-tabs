import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ProcessedEntry } from "../types";
import { compareHarEntries } from "../utils/harEntryOperations";

interface HarCompareModalProps {
  entries: [ProcessedEntry, ProcessedEntry];
  onClose: () => void;
}

export const HarCompareModal: React.FC<HarCompareModalProps> = ({ entries, onClose }) => {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const comparison = useMemo(
    () => compareHarEntries(entries[0].entry, entries[1].entry),
    [entries],
  );
  const rows = differencesOnly
    ? comparison.different
    : [...comparison.different, ...comparison.same];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="flex max-h-[82vh] w-[min(1100px,92vw)] flex-col rounded-lg border border-base bg-surface shadow-2xl">
        <div className="flex items-start gap-3 border-b border-base px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-main">Compare HAR Requests</h2>
            <p className="mt-1 truncate text-xs text-secondary">
              {entries[0].method} {entries[0].pathname} ↔ {entries[1].method} {entries[1].pathname}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-secondary transition-colors hover:bg-element-hover hover:text-main"
            aria-label="Close compare modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-base px-4 py-2 text-xs">
          <div className="flex items-center gap-4 text-secondary">
            <span><strong className="text-main">{comparison.different.length}</strong> different</span>
            <span><strong className="text-main">{comparison.same.length}</strong> same</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-secondary">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(event) => setDifferencesOnly(event.target.checked)}
              className="rounded border-base bg-element"
            />
            Differences only
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
          <table className="w-full table-fixed text-xs">
            <thead className="sticky top-0 z-10 bg-surface-secondary text-secondary">
              <tr className="border-b border-base">
                <th className="w-[26%] px-3 py-2 text-left font-medium">Field</th>
                <th className="w-[33%] px-3 py-2 text-left font-medium">First selected</th>
                <th className="w-[33%] px-3 py-2 text-left font-medium">Second selected</th>
                <th className="w-[8%] px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.path} className="border-b border-base/60 align-top">
                  <td className="break-all px-3 py-2 font-mono text-main">{row.path}</td>
                  <td className="break-all px-3 py-2 font-mono text-secondary">{row.leftValue}</td>
                  <td className="break-all px-3 py-2 font-mono text-secondary">{row.rightValue}</td>
                  <td className={row.isEqual ? "px-3 py-2 text-green-500" : "px-3 py-2 text-orange-500"}>
                    {row.isEqual ? "Same" : "Diff"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
