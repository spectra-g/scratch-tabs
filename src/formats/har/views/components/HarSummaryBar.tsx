import React from "react";
import { HarSummary, StatusCategory } from "../types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

interface StatusPillProps {
  category: StatusCategory;
  count: number;
}

const STATUS_STYLES: Record<StatusCategory, string> = {
  "1xx": "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  "2xx": "bg-green-500/20 text-green-600 dark:text-green-400",
  "3xx": "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
  "4xx": "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  "5xx": "bg-red-500/20 text-red-600 dark:text-red-400",
  unknown: "bg-gray-500/20 text-secondary",
};

const StatusPill: React.FC<StatusPillProps> = ({ category, count }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[category]}`}>
    <span>{category}</span>
    <span className="font-bold">{count}</span>
  </span>
);

interface HarSummaryBarProps {
  summary: HarSummary;
  filteredCount: number;
}

export const HarSummaryBar: React.FC<HarSummaryBarProps> = ({ summary, filteredCount }) => {
  const statusEntries = (Object.entries(summary.statusCounts) as [StatusCategory, number][]).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className="flex-none flex items-center gap-6 px-4 py-2 border-b border-base bg-surface text-sm text-secondary overflow-x-auto">
      <span className="font-medium text-main whitespace-nowrap">
        {filteredCount === summary.totalRequests
          ? `${summary.totalRequests} requests`
          : `${filteredCount} / ${summary.totalRequests} requests`}
      </span>

      <span className="text-secondary whitespace-nowrap">
        {formatBytes(summary.totalTransferred)} transferred
      </span>

      <span className="text-secondary whitespace-nowrap">
        {formatBytes(summary.totalContentSize)} resources
      </span>

      <span className="text-secondary whitespace-nowrap">
        {formatTime(summary.totalTime)} load
      </span>

      {summary.startedAt && (
        <span className="text-secondary whitespace-nowrap">
          {summary.startedAt.toLocaleTimeString()}
        </span>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {statusEntries.map(([cat, count]) => (
          <StatusPill key={cat} category={cat} count={count} />
        ))}
      </div>
    </div>
  );
};
