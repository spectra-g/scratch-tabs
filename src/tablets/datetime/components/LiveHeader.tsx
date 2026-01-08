import React, { useState, useEffect } from 'react';
import { Clock, Copy, Pause, Play, Check, ArrowDown } from '../../../components/Icons';
import { useClipboard } from '../hooks/useClipboard';

interface CounterItemProps {
  label: string;
  value: string | number;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onSetInput: (value: string) => void;
}

const CounterItem: React.FC<CounterItemProps> = ({ label, value, id, copiedId, onCopy, onSetInput }) => (
  <div className="flex flex-col items-start px-4 border-l border-base first:border-l-0">
    <div className="flex items-center gap-2 mb-0.5">
      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">{label}</span>
      <button
        onClick={() => onCopy(value.toString(), id)}
        className="text-muted hover:text-primary transition-colors focus:outline-none"
        title={`Copy ${label}`}
      >
        {copiedId === id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      </button>
      <button
        onClick={() => onSetInput(value.toString())}
        className="text-muted hover:text-primary transition-colors focus:outline-none"
        title={`Set main input to this ${label}`}
      >
        <ArrowDown size={12} />
      </button>
    </div>
    <div className="text-sm font-mono text-main select-all truncate max-w-[150px]">{value}</div>
  </div>
);

interface LiveHeaderProps {
  onSetInput: (value: string) => void;
  isFrozen: boolean;
  onFreezeToggle: () => void;
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({ onSetInput, isFrozen, onFreezeToggle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { copy, copiedId } = useClipboard();

  useEffect(() => {
    if (isFrozen) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 100); // Faster update for "real-time" feel

    return () => clearInterval(interval);
  }, [isFrozen]);

  const epochSeconds = Math.floor(currentTime.getTime() / 1000);
  const epochMs = currentTime.getTime();
  const utcTime = currentTime.toISOString();

  // Get local time with timezone offset
  const offsetMinutes = currentTime.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;

  const localTimeISO = `${new Date(currentTime.getTime() - offsetMinutes * 60000).toISOString().slice(0, -1)}${offsetString}`;

  return (
    <div className="bg-surface-raised border-b border-base px-6 py-2 sticky top-0 z-20 backdrop-blur-md bg-surface-raised/80">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Clock size={18} className={`${isFrozen ? 'text-muted' : 'text-primary animate-pulse'}`} />
            {isFrozen && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full border border-surface" />
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold text-secondary uppercase tracking-tighter leading-none mb-0.5">Live Dashboard</div>
            <div className={`text-xs font-semibold ${isFrozen ? 'text-danger' : 'text-success'}`}>
              {isFrozen ? 'Clock Frozen' : 'Live Tracking'}
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center overflow-x-auto no-scrollbar">
          <div className="flex items-center">
            <CounterItem label="Epoch (s)" value={epochSeconds} id="epoch-s" copiedId={copiedId} onCopy={copy} onSetInput={onSetInput} />
            <CounterItem label="Epoch (ms)" value={epochMs} id="epoch-ms" copiedId={copiedId} onCopy={copy} onSetInput={onSetInput} />
            <CounterItem label="UTC" value={utcTime} id="utc" copiedId={copiedId} onCopy={copy} onSetInput={onSetInput} />
            <CounterItem label="Local" value={localTimeISO} id="local" copiedId={copiedId} onCopy={copy} onSetInput={onSetInput} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onFreezeToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${isFrozen
              ? 'bg-primary text-white border-primary shadow-sm active:scale-95'
              : 'bg-element hover:bg-element-hover text-secondary border-base'
              }`}
          >
            {isFrozen ? (
              <>
                <Play size={14} fill="currentColor" />
                RESUME
              </>
            ) : (
              <>
                <Pause size={14} fill="currentColor" />
                FREEZE
              </>
            )}
          </button>
        </div>
      </div >
    </div >
  );
};