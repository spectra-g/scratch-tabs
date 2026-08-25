import React from "react";
import type { WheelSettings } from "../types";
import { SPIN_DURATION_PRESETS } from "../contentModel";

interface SettingsPanelProps {
  settings: WheelSettings;
  onChange: (patch: Partial<WheelSettings>) => void;
}

const ToggleRow: React.FC<{
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ label, hint, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
    <div className="min-w-0">
      <p className="text-sm text-main">{label}</p>
      {hint && <p className="text-xs text-muted/70">{hint}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? "bg-primary" : "bg-base"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  </div>
);

/** Spin behaviour preferences: duration, auto-remove winners, sound, reveal mode. */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const activePreset = SPIN_DURATION_PRESETS.reduce(
    (best, preset) =>
      Math.abs(preset.ms - settings.spinDurationMs) < Math.abs(best.ms - settings.spinDurationMs)
        ? preset
        : best,
    SPIN_DURATION_PRESETS[0],
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar divide-y divide-base/20">
      <div className="px-3 py-2.5">
        <p className="text-sm text-main mb-1.5">Spin duration</p>
        <div
          role="radiogroup"
          aria-label="Spin duration"
          className="flex rounded-lg border border-base/50 overflow-hidden"
        >
          {SPIN_DURATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              role="radio"
              aria-checked={preset.id === activePreset.id}
              onClick={() => onChange({ spinDurationMs: preset.ms })}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                preset.id === activePreset.id
                  ? "bg-primary text-primary-contrast"
                  : "text-secondary hover:text-main hover:bg-element-hover"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        label="Remove winner after spin"
        hint="Take the winning entry off the wheel automatically"
        checked={settings.removeWinnerAfterSpin}
        onToggle={() => onChange({ removeWinnerAfterSpin: !settings.removeWinnerAfterSpin })}
      />

      <ToggleRow
        label="Hide winner until click"
        hint="Reveal the winner only when you click Reveal"
        checked={settings.hideWinnerUntilClick}
        onToggle={() => onChange({ hideWinnerUntilClick: !settings.hideWinnerUntilClick })}
      />

      <ToggleRow
        label="Sound"
        hint="Tick sounds while the wheel spins"
        checked={settings.soundEnabled}
        onToggle={() => onChange({ soundEnabled: !settings.soundEnabled })}
      />
    </div>
  );
};
