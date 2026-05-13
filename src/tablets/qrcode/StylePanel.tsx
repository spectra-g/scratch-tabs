import React from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { QRStyleConfig } from './contentTypes';
import type { DotType, CornerSquareType, ErrorCorrectionLevel } from 'qr-code-styling';

interface Props {
  style: QRStyleConfig;
  hasLogo: boolean;
  onChange: (patch: Partial<QRStyleConfig>) => void;
  open: boolean;
  onToggle: () => void;
}

const DOT_STYLES: { value: DotType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Round' },
  { value: 'extra-rounded', label: 'Extra Round' },
];

const CORNER_STYLES: { value: CornerSquareType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Dot' },
];

const EC_LEVELS: { value: ErrorCorrectionLevel; label: string; pct: string }[] = [
  { value: 'L', label: 'L', pct: '7%' },
  { value: 'M', label: 'M', pct: '15%' },
  { value: 'Q', label: 'Q', pct: '25%' },
  { value: 'H', label: 'H', pct: '30%' },
];

const SIZES = [256, 512, 1024, 2048];

export const StylePanel: React.FC<Props> = ({ style, hasLogo, onChange, open, onToggle }) => {
  return (
    <div className="border-t border-base/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-secondary hover:text-main hover:bg-surface-raised/30 transition-colors"
      >
        <span>Style Options</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Dot Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.dotColor}
                  onChange={(e) => onChange({ dotColor: e.target.value })}
                  className="h-7 w-10 rounded cursor-pointer border border-base/50 bg-transparent"
                />
                <input
                  type="text"
                  value={style.dotColor}
                  onChange={(e) => onChange({ dotColor: e.target.value })}
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-canvas border border-base/50 rounded text-main focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                Background
                <label className="inline-flex items-center gap-1 ml-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.transparent}
                    onChange={(e) => onChange({ transparent: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-muted">transparent</span>
                </label>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.bgColor}
                  onChange={(e) => onChange({ bgColor: e.target.value })}
                  disabled={style.transparent}
                  className="h-7 w-10 rounded cursor-pointer border border-base/50 bg-transparent disabled:opacity-40"
                />
                <input
                  type="text"
                  value={style.transparent ? 'transparent' : style.bgColor}
                  onChange={(e) => onChange({ bgColor: e.target.value })}
                  disabled={style.transparent}
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-canvas border border-base/50 rounded text-main focus:outline-none focus:border-primary/50 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Dot Style */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Dot Style</label>
            <div className="flex flex-wrap gap-1">
              {DOT_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onChange({ dotStyle: s.value })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    style.dotStyle === s.value
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'border-base/50 text-muted hover:text-main hover:border-base'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Corner Style */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Corner Frame</label>
            <div className="flex gap-1">
              {CORNER_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onChange({ cornerStyle: s.value })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    style.cornerStyle === s.value
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'border-base/50 text-muted hover:text-main hover:border-base'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Correction */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <label className="text-xs text-muted">Error Correction</label>
              {hasLogo && style.errorCorrection !== 'H' && (
                <span
                  className="flex items-center gap-0.5 text-xs text-amber-400"
                  title="Logo embedding requires H (30%) for reliable scanning"
                >
                  <Info size={11} /> Recommended: H for logos
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {EC_LEVELS.map((ec) => (
                <button
                  key={ec.value}
                  onClick={() => onChange({ errorCorrection: ec.value })}
                  title={`Restores up to ${ec.pct} of damaged data`}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    style.errorCorrection === ec.value
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'border-base/50 text-muted hover:text-main hover:border-base'
                  }`}
                >
                  {ec.label} <span className="opacity-60">{ec.pct}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size & Margin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Output Size</label>
              <select
                value={style.size}
                onChange={(e) => onChange({ size: Number(e.target.value) })}
                className="w-full px-2 py-1 text-xs bg-canvas border border-base/50 rounded text-main focus:outline-none focus:border-primary/50"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                Margin <span className="text-muted/60">({style.margin} modules)</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={style.margin}
                onChange={(e) => onChange({ margin: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
