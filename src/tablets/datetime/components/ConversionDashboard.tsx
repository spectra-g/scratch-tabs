import React from 'react';
import { Copy, Check, Terminal, Database, Globe, Hash, Zap } from '../../../components/Icons';
import { ConversionFormats } from '../types';
import { useClipboard } from '../hooks/useClipboard';

interface ConversionDashboardProps {
  formats: ConversionFormats | null;
}

interface FormatItem {
  label: string;
  value: string;
  id: string;
}

interface FormatSectionProps {
  title: string;
  icon: any;
  items: FormatItem[];
  copiedField: string | null;
  onCopy: (text: string, id: string) => void;
}

const FormatSection: React.FC<FormatSectionProps> = ({ title, icon: Icon, items, copiedField, onCopy }) => (
  <div className="mb-6 last:mb-0">
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon size={14} className="text-primary" />
      <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest">{title}</h4>
    </div>
    <div className="bg-surface border border-base rounded-lg overflow-hidden divide-y divide-base/50">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center justify-between p-3 hover:bg-element-hover/50 transition-colors">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-[10px] text-muted font-bold uppercase tracking-tight mb-1">{item.label}</div>
            <div className="text-sm font-mono text-main truncate select-all">{item.value}</div>
          </div>
          <button
            onClick={() => onCopy(item.value, item.id)}
            className="flex-shrink-0 p-1.5 hover:bg-element-hover rounded-md transition-all active:scale-90"
            title="Copy"
          >
            {copiedField === item.id ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} className="text-muted group-hover:text-primary transition-colors" />
            )}
          </button>
        </div>
      ))}
    </div>
  </div>
);

export const ConversionDashboard: React.FC<ConversionDashboardProps> = ({ formats }) => {
  const { copy, copiedId: copiedField } = useClipboard();

  if (!formats) {
    return (
      <div className="bg-surface-secondary/50 rounded-lg p-12 text-center border-2 border-dashed border-base">
        <Zap size={32} className="text-muted mx-auto mb-4 opacity-20" />
        <p className="text-secondary font-medium">No Date Selected</p>
        <p className="text-xs text-muted mt-1 text-balance">
          Enter a timestamp or natural language above to begin transformation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-raised/40 p-4 rounded-xl border border-base">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1 flex justify-between">
            Human Readable
            <button onClick={() => copy(formats.humanReadable, 'human')} className="hover:text-primary transition-colors">
              {copiedField === 'human' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="text-base font-semibold text-main mb-3">{formats.humanReadable}</div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-element rounded text-[10px] font-medium text-secondary">{formats.relativeTime}</div>
          </div>
        </div>
        <div className="bg-surface-raised/40 p-4 rounded-xl border border-base">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 flex justify-between">
            ISO 8601 (UTC)
            <button onClick={() => copy(formats.iso8601, 'iso')} className="hover:text-primary transition-colors">
              {copiedField === 'iso' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="text-sm font-mono text-main break-all leading-relaxed select-all">{formats.iso8601}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <FormatSection
            title="Programming"
            icon={Terminal}
            items={[
              { label: 'JavaScript', value: formats.programming.javascript, id: 'js' },
              { label: 'Python', value: formats.programming.python, id: 'py' },
              { label: 'Go (RFC3339)', value: formats.programming.go, id: 'go' },
            ]}
            copiedField={copiedField}
            onCopy={copy}
          />
          <FormatSection
            title="Database"
            icon={Database}
            items={[
              { label: 'SQL Timestamp', value: formats.database.sql, id: 'sql' },
              { label: 'Mongo ObjectID', value: formats.database.mongo, id: 'mongo' },
            ]}
            copiedField={copiedField}
            onCopy={copy}
          />
        </div>

        <div className="space-y-6">
          {/* Components Table */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Hash size={14} className="text-primary" />
              <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Components</h4>
            </div>
            <div className="bg-surface border border-base rounded-lg p-4">
              <div className="grid grid-cols-3 gap-y-4 gap-x-6">
                {[
                  { label: 'Year', value: formats.components.year },
                  { label: 'Month', value: formats.components.month },
                  { label: 'Day', value: formats.components.day },
                  { label: 'Week', value: formats.components.weekNumber },
                  { label: 'Day of Y', value: formats.components.dayOfYear },
                  { label: 'Hour', value: formats.components.hour },
                  { label: 'Minute', value: formats.components.minute },
                  { label: 'Second', value: formats.components.second },
                ].map((comp, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-tighter mb-0.5">{comp.label}</span>
                    <span className="text-sm font-mono text-main font-semibold">{comp.value.toString().padStart(2, '0')}</span>
                  </div>
                ))}
                <div className="col-span-3 pt-2 mt-2 border-t border-base/50 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">Weekday</span>
                  <span className="text-xs font-semibold text-primary">{formats.components.dayOfWeek}</span>
                </div>
              </div>
            </div>
          </div>

          <FormatSection
            title="Web & Network"
            icon={Globe}
            items={[
              { label: 'Cookie Format', value: formats.web.cookie, id: 'cookie' },
              { label: 'RSS / Atom', value: formats.web.rss, id: 'rss' },
            ]}
            copiedField={copiedField}
            onCopy={copy}
          />
        </div>
      </div>
    </div>
  );
};