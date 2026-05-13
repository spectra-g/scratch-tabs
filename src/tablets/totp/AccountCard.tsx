import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { TotpAccount } from './totpTypes';
import { generateCode, getTimeRemaining, getProgress } from './useTotpEngine';

interface AccountCardProps {
  account: TotpAccount;
  tick: number;
  onEdit: (account: TotpAccount) => void;
  onDelete: (id: string) => void;
}

const RING_RADIUS = 11;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const AccountCard: React.FC<AccountCardProps> = ({ account, tick, onEdit, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevTickRef = useRef(tick);

  const timeRemaining = getTimeRemaining(account.period);
  const progress = getProgress(account.period);
  const code = generateCode(account);

  // Flash animation when window rolls over
  useEffect(() => {
    if (prevTickRef.current !== tick && timeRemaining === account.period) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    prevTickRef.current = tick;
  }, [tick, timeRemaining, account.period]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const formattedCode = code.length === 6
    ? `${code.slice(0, 3)} ${code.slice(3)}`
    : code.length === 8
    ? `${code.slice(0, 4)} ${code.slice(4)}`
    : code;

  const isLow = timeRemaining <= 5;
  const ringColor = isLow ? '#f59e0b' : account.color;
  const fillFraction = 1 - progress;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fillFraction);

  return (
    <div className="group bg-surface border border-base rounded-lg p-3 flex items-center gap-3 hover:border-base/60 transition-colors">
      {/* Color dot */}
      <div
        className="flex-shrink-0 w-3 h-3 rounded-full"
        style={{ backgroundColor: account.color }}
      />

      {/* Label + issuer */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-main text-sm truncate">{account.label}</span>
          {account.issuer && (
            <span className="text-muted text-xs truncate">{account.issuer}</span>
          )}
        </div>
        <div
          className={`font-mono text-xl font-semibold tracking-widest text-main mt-0.5 transition-opacity ${
            flash ? 'opacity-0' : 'opacity-100'
          }`}
          data-testid="totp-code"
        >
          {formattedCode}
        </div>
      </div>

      {/* Countdown ring + timer */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <svg width="28" height="28" className="rotate-[-90deg]">
          <circle
            cx="14"
            cy="14"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-base/20"
          />
          <circle
            cx="14"
            cy="14"
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="2"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
          />
        </svg>
        <span
          className={`text-xs font-mono w-5 text-right ${isLow ? 'text-amber-500' : 'text-muted'}`}
        >
          {timeRemaining}s
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <button
          onClick={handleCopy}
          title="Copy code"
          className="p-1.5 rounded text-muted hover:text-main hover:bg-element-hover transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            title="More options"
            className="p-1.5 rounded text-muted hover:text-main hover:bg-element-hover transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 bg-surface border border-base rounded-md shadow-lg py-1 min-w-[110px]">
              <button
                onClick={() => { setMenuOpen(false); onEdit(account); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-main hover:bg-element-hover transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(account.id); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-element-hover transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
