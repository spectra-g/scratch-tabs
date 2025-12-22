import React, { useState } from "react";
import { Calendar, Download, Copy, Check, Clock } from "lucide-react";
import { CronExecution, TimeZone } from "../types";
import { format } from "date-fns";

interface ExecutionPreviewProps {
  executions: CronExecution[];
  timezone: TimeZone;
  onExportToICS: () => boolean | null;
  onExportToCSV: () => boolean | null;
  onExportToJSON: () => boolean | null;
  onCopyAllTimes: () => boolean;
}

export const ExecutionPreview: React.FC<ExecutionPreviewProps> = ({
  executions,
  timezone,
  onExportToICS,
  onExportToCSV,
  onExportToJSON,
  onCopyAllTimes,
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAllTimes = () => {
    const success = onCopyAllTimes();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-surface-secondary rounded-lg border border-base overflow-hidden">
      <div className="p-4 border-b border-base flex items-center justify-between">
        <div className="flex items-center">
          <Calendar size={16} className="text-primary mr-2" />
          <h3 className="text-sm font-medium text-main">
            Execution Preview
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted flex items-center">
            <Clock size={12} className="mr-1" />
            <span>{timezone.name}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="p-1.5 rounded hover:bg-element-hover text-secondary hover:text-main"
              title="Export executions"
            >
              <Download size={16} />
            </button>

            {showExportOptions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportOptions(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-surface-secondary border border-base rounded-md shadow-lg z-20 w-48">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onExportToICS();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-element-hover text-main"
                    >
                      <Calendar size={14} className="mr-2 text-primary" />
                      <span>Export to Calendar (ICS)</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportToCSV();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-element-hover text-main"
                    >
                      <Download size={14} className="mr-2 text-success" />
                      <span>Export to CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportToJSON();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-element-hover text-main"
                    >
                      <Download size={14} className="mr-2 text-warning" />
                      <span>Export to JSON</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleCopyAllTimes}
            className="p-1.5 rounded hover:bg-element-hover text-secondary hover:text-main"
            title="Copy all times"
          >
            {copied ? (
              <Check size={16} className="text-success" />
            ) : (
              <Copy size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {executions.length === 0 ? (
          <div className="p-4 text-center text-muted">
            <p>No executions to display.</p>
            <p className="text-xs mt-1">
              Check your cron expression for errors.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-surface-highlight/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Day
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {executions.map((execution, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-surface" : "bg-surface-secondary"}
                >
                  <td className="px-4 py-2 text-sm text-muted">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-main">
                    {format(execution.date, "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-2 text-sm text-main">
                    {format(execution.date, "HH:mm:ss")}
                  </td>
                  <td className="px-4 py-2 text-sm text-main">
                    {format(execution.date, "EEEE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
