import React, { useState } from 'react';
import { Copy, Check } from '../../../components/Icons';
import { ConversionFormats } from '../types';

interface ConversionDashboardProps {
  formats: ConversionFormats | null;
}

export const ConversionDashboard: React.FC<ConversionDashboardProps> = ({ formats }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Silently handle copy failures
    }
  };

  if (!formats) {
    return (
      <div className="bg-surface-secondary rounded-lg p-6 text-center border border-base">
        <p className="text-secondary">Enter a valid date/time to see conversions</p>
      </div>
    );
  }

  const CopyButton: React.FC<{ fieldName: string; value: string }> = ({ fieldName, value }) => (
    <button
      onClick={() => copyToClipboard(value, fieldName)}
      className="p-1 hover:bg-element-hover rounded transition-colors opacity-0 group-hover:opacity-100"
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? (
        <Check size={14} className="text-success" />
      ) : (
        <Copy size={14} className="text-secondary" />
      )}
    </button>
  );

  const FormatRow: React.FC<{ label: string; value: string; fieldName: string; mono?: boolean }> = ({
    label,
    value,
    fieldName,
    mono = false
  }) => (
    <div className="group flex items-center justify-between py-2 px-3 hover:bg-surface-highlight/30 rounded transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-secondary mb-1">{label}</div>
        <div className={`text-main ${mono ? 'font-mono text-sm' : ''} break-all`}>
          {value}
        </div>
      </div>
      <CopyButton fieldName={fieldName} value={value} />
    </div>
  );

  return (
    <div className="bg-surface-secondary rounded-lg overflow-hidden border border-base">
      <div className="bg-surface-highlight/50 px-4 py-3 border-b border-base">
        <h3 className="text-lg font-semibold text-main">Format Conversions</h3>
      </div>

      <div className="divide-y divide-base">
        <FormatRow
          label="Human Readable"
          value={formats.humanReadable}
          fieldName="humanReadable"
        />

        <FormatRow
          label="Relative Time"
          value={formats.relativeTime}
          fieldName="relativeTime"
        />

        <FormatRow
          label="ISO 8601 (UTC)"
          value={formats.iso8601}
          fieldName="iso8601"
          mono
        />

        <FormatRow
          label="Unix Timestamp (seconds)"
          value={formats.unixSeconds.toString()}
          fieldName="unixSeconds"
          mono
        />

        <FormatRow
          label="Unix Timestamp (milliseconds)"
          value={formats.unixMilliseconds.toString()}
          fieldName="unixMilliseconds"
          mono
        />
      </div>

      {/* Components breakdown */}
      <div className="bg-surface-highlight/30 px-4 py-3 border-t border-base">
        <h4 className="text-sm font-medium text-main mb-3">Date Components</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-secondary">Year:</span>
              <span className="text-main font-mono">{formats.components.year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Month:</span>
              <span className="text-main">{formats.components.monthName} ({formats.components.month})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Day:</span>
              <span className="text-main font-mono">{formats.components.day}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Weekday:</span>
              <span className="text-main">{formats.components.dayOfWeek}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-secondary">Hour:</span>
              <span className="text-main font-mono">{formats.components.hour.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Minute:</span>
              <span className="text-main font-mono">{formats.components.minute.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Second:</span>
              <span className="text-main font-mono">{formats.components.second.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};