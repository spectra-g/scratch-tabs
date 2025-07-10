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
    <div className="w-full max-w-md bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-100 mb-4">
        Timer Settings
      </h2>

      <div className="space-y-4">
        {/* Focus Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Focus Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="60"
              value={focusDuration}
              onChange={(e) => setFocusDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="60"
              value={focusDuration}
              onChange={(e) => setFocusDuration(parseInt(e.target.value) || 1)}
              className="ml-4 w-16 bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Short Break Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Short Break Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="30"
              value={shortBreakDuration}
              onChange={(e) => setShortBreakDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="30"
              value={shortBreakDuration}
              onChange={(e) =>
                setShortBreakDuration(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Long Break Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Long Break Duration (minutes)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="60"
              value={longBreakDuration}
              onChange={(e) => setLongBreakDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="60"
              value={longBreakDuration}
              onChange={(e) =>
                setLongBreakDuration(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Long Break Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Long Break Interval (sessions)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="10"
              value={longBreakInterval}
              onChange={(e) => setLongBreakInterval(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="10"
              value={longBreakInterval}
              onChange={(e) =>
                setLongBreakInterval(parseInt(e.target.value) || 1)
              }
              className="ml-4 w-16 bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
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
            className="h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700"
          />
          <label
            htmlFor="autoStartNextSession"
            className="ml-2 text-sm text-gray-300"
          >
            Auto-start next session
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
        >
          <X size={18} className="inline-block mr-1" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
        >
          <Save size={18} className="inline-block mr-1" />
          Save
        </button>
      </div>
    </div>
  );
};
