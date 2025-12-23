import React, { useState } from "react";
import { Clock, Globe, BookOpen, Code, Calendar, Save } from "lucide-react";
import { CronDialect, TimeZone } from "../types";
import { getDialectInfo } from "../utils/dialectInfo";

interface CronHeaderProps {
  dialect: CronDialect;
  onDialectChange: (dialect: CronDialect) => void;
  timezone: TimeZone;
  onTimezoneChange: (timezone: TimeZone) => void;
  onShowPatternLibrary: () => void;
  onShowCodeExporter: () => void;
  onShowVisualizer: () => void;
}

export const CronHeader: React.FC<CronHeaderProps> = ({
  dialect,
  onDialectChange,
  timezone,
  onTimezoneChange,
  onShowPatternLibrary,
  onShowCodeExporter,
  onShowVisualizer,
}) => {
  const [showDialectInfo, setShowDialectInfo] = useState(false);

  const dialectOptions: { value: CronDialect; label: string }[] = [
    { value: "unix", label: "Unix Cron" },
    { value: "quartz", label: "Quartz Scheduler" },
    { value: "spring", label: "Spring Scheduler" },
    { value: "aws", label: "AWS EventBridge" },
    { value: "crontab", label: "Linux Crontab" },
    { value: "jenkins", label: "Jenkins" },
  ];

  const dialectInfo = getDialectInfo(dialect);

  return (
    <div className="border-b border-base bg-surface-secondary p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <Clock className="text-primary mr-2" size={24} />
          <h2 className="text-xl font-semibold text-main">
            Cron Expression Builder
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dialect Selector */}
          <div className="relative">
            <div className="flex items-center">
              <select
                value={dialect}
                onChange={(e) => onDialectChange(e.target.value as CronDialect)}
                className="input-themed bg-surface text-main text-sm appearance-none pr-8"
              >
                {dialectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <button
              onClick={() => setShowDialectInfo(!showDialectInfo)}
              className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              title="Dialect information"
            >
              ?
            </button>

            {showDialectInfo && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-surface-secondary border border-base rounded-md shadow-lg z-10 p-3">
                <h3 className="text-sm font-medium text-main mb-1">
                  {dialectInfo.name}
                </h3>
                <p className="text-xs text-muted mb-2">
                  {dialectInfo.description}
                </p>
                <div className="text-xs text-secondary">
                  <div className="font-medium mb-1">Fields:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {dialectInfo.fields.map((field) => (
                      <li key={field.name}>
                        <span className="text-primary">{field.name}</span>
                        {field.required ? "" : " (optional)"}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setShowDialectInfo(false)}
                  className="mt-2 w-full text-xs bg-element hover:bg-element-hover text-main py-1 rounded"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Timezone Selector */}
          <div className="relative">
            <div className="flex items-center">
              <Globe size={16} className="text-secondary mr-2" />
              <select
                value={timezone.type}
                onChange={(e) => {
                  const type = e.target.value as "local" | "utc" | "custom";
                  let name = timezone.name;

                  if (type === "local") {
                    name = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  } else if (type === "utc") {
                    name = "UTC";
                  }

                  onTimezoneChange({ type, name });
                }}
                className="input-themed bg-surface text-main text-sm appearance-none pr-8"
              >
                <option value="local">Local Time</option>
                <option value="utc">UTC</option>
                <option value="custom">Custom</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {timezone.type === "custom" && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-surface-secondary border border-base rounded-md shadow-lg z-10 p-3">
                <select
                  value={timezone.name}
                  onChange={(e) =>
                    onTimezoneChange({ ...timezone, name: e.target.value })
                  }
                  className="input-themed w-full bg-surface text-main text-sm"
                >
                  {Intl.supportedValuesOf("timeZone").map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={onShowPatternLibrary}
            className="flex items-center bg-element hover:bg-element-hover text-main px-3 py-2 rounded-md text-sm transition-colors border border-base"
          >
            <BookOpen size={16} className="mr-2" />
            <span>Patterns</span>
          </button>

          <button
            onClick={onShowCodeExporter}
            className="flex items-center bg-element hover:bg-element-hover text-main px-3 py-2 rounded-md text-sm transition-colors border border-base"
          >
            <Code size={16} className="mr-2" />
            <span>Code</span>
          </button>

          <button
            onClick={onShowVisualizer}
            className="flex items-center bg-element hover:bg-element-hover text-main px-3 py-2 rounded-md text-sm transition-colors border border-base"
          >
            <Calendar size={16} className="mr-2" />
            <span>Visualize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
