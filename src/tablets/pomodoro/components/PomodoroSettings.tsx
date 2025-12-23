import React, { useState } from "react";
import { Save, X } from "lucide-react";
import { PomodoroSettings as Settings } from "../types";

interface PomodoroSettingsProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
}

export const PomodoroSettings: React.FC<PomodoroSettingsProps> = ({
  settings,
  onSave,
  onCancel,
}) => {
  const [focusDuration, setFocusDuration] = useState(settings.focusDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(
    settings.shortBreakDuration,
  );
  const [longBreakDuration, setLongBreakDuration] = useState(
    settings.longBreakDuration,
  );
  const [longBreakInterval, setLongBreakInterval] = useState(
    settings.longBreakInterval,
  );
  const [autoStartNextSession, setAutoStartNextSession] = useState(
    settings.autoStartNextSession,
  );

  const handleSave = () => {
    onSave({
      focusDuration,
      shortBreakDuration,
      longBreakDuration,
      longBreakInterval,
      autoStartNextSession,
    });
  };

  return (
    <div className="w-full max-w-md bg-surface-raised/30 border border-base/50 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-main mb-4">
        Timer Settings
      </h2>

      <div className="space-y-4">
        {/* Focus Duration */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Focus Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="60"
              value={focusDuration}
              onChange={(e) => setFocusDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="60"
              value={focusDuration}
              onChange={(e) => setFocusDuration(parseInt(e.target.value) || 1)}
              className="ml-4 w-16 bg-canvas/50 border border-base/50 rounded-md px-3 py-1.5 text-sm text-main focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Short Break Duration */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Short Break Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="30"
              value={shortBreakDuration}
              onChange={(e) => setShortBreakDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="30"
              value={shortBreakDuration}
              onChange={(e) =>
                setShortBreakDuration(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-canvas/50 border border-base/50 rounded-md px-3 py-1.5 text-sm text-main focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Long Break Duration */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Long Break Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="60"
              value={longBreakDuration}
              onChange={(e) => setLongBreakDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="60"
              value={longBreakDuration}
              onChange={(e) =>
                setLongBreakDuration(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-canvas/50 border border-base/50 rounded-md px-3 py-1.5 text-sm text-main focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Long Break Interval */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-1">
            Long Break Interval (sessions)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="10"
              value={longBreakInterval}
              onChange={(e) => setLongBreakInterval(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="10"
              value={longBreakInterval}
              onChange={(e) =>
                setLongBreakInterval(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-canvas/50 border border-base/50 rounded-md px-3 py-1.5 text-sm text-main focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Auto Start Next Session */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoStartNextSession"
            checked={autoStartNextSession}
            onChange={(e) => setAutoStartNextSession(e.target.checked)}
            className="h-4 w-4 rounded border-base text-primary focus:ring-primary/50 bg-surface-secondary"
          />
          <label
            htmlFor="autoStartNextSession"
            className="ml-2 text-sm text-secondary"
          >
            Auto-start next session
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-secondary hover:text-main transition-colors"
        >
          <X size={18} className="inline-block mr-1" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-md transition-colors"
        >
          <Save size={18} className="inline-block mr-1" />
          Save
        </button>
      </div>
    </div>
  );
};
