import React from 'react';
import { LoremIpsumSettings, GenerationMode, ThemeType, OutputUnit } from '../types';
import { Type, FileText, Code, Hash, Palette, Settings } from '../../../components/Icons';

interface SettingsPanelProps {
  settings: LoremIpsumSettings;
  onSettingsChange: (settings: Partial<LoremIpsumSettings>) => void;
  isGenerating: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  isGenerating,
}) => {
  const modeOptions: { value: GenerationMode; label: string; icon: React.ReactNode }[] = [
    { value: 'text', label: 'Text', icon: <Type size={16} /> },
    { value: 'html', label: 'HTML', icon: <Code size={16} /> },
    { value: 'markdown', label: 'Markdown', icon: <FileText size={16} /> },
    { value: 'json', label: 'JSON', icon: <Hash size={16} /> },
    { value: 'custom', label: 'Custom Source', icon: <Palette size={16} /> },
  ];

  const themeOptions: { value: ThemeType; label: string; description: string }[] = [
    { value: 'general', label: 'General', description: 'Classic Lorem Ipsum style' },
    { value: 'business', label: 'Business', description: 'Corporate and professional terms' },
    { value: 'tech', label: 'Technology', description: 'Programming and tech vocabulary' },
    { value: 'academic', label: 'Academic', description: 'Research and scholarly language' },
    { value: 'creative', label: 'Creative', description: 'Artistic and expressive words' },
  ];

  const unitOptions: { value: OutputUnit; label: string }[] = [
    { value: 'paragraphs', label: 'Paragraphs' },
    { value: 'sentences', label: 'Sentences' },
    { value: 'words', label: 'Words' },
  ];

  return (
    <div className="space-y-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center space-x-2 text-gray-200">
        <Settings size={18} />
        <h3 className="font-semibold">Generation Settings</h3>
      </div>

      {/* Mode Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Output Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onSettingsChange({ mode: option.value })}
              disabled={isGenerating}
              className={`flex items-center space-x-2 p-3 rounded-md border transition-colors ${
                settings.mode === option.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700/50'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selection - Hidden for HTML/JSON modes */}
      {!['html', 'json'].includes(settings.mode) && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Theme</label>
          <div className="space-y-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSettingsChange({ theme: option.value })}
                disabled={isGenerating}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  settings.theme === option.value
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-medium ${
                      settings.theme === option.value ? 'text-blue-400' : 'text-gray-200'
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Source Text - Only for custom mode */}
      {settings.mode === 'custom' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Source Text
            <span className="text-xs text-gray-400 ml-2">(min. 10 characters)</span>
          </label>
          <textarea
            value={settings.customSourceText}
            onChange={(e) => onSettingsChange({ customSourceText: e.target.value })}
            disabled={isGenerating}
            placeholder="Paste your text here to generate similar content..."
            className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 custom-scrollbar"
          />
          <div className="text-xs text-gray-400">
            Characters: {settings.customSourceText.length}
          </div>
        </div>
      )}

      {/* Count and Unit - Hidden for HTML/JSON modes */}
      {!['html', 'json'].includes(settings.mode) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Count</label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max={settings.outputUnit === 'words' ? '500' : settings.outputUnit === 'sentences' ? '50' : '20'}
                value={settings.count}
                onChange={(e) => onSettingsChange({ count: parseInt(e.target.value) })}
                disabled={isGenerating}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span>
                <span className="font-medium text-gray-200">{settings.count}</span>
                <span>{settings.outputUnit === 'words' ? '500' : settings.outputUnit === 'sentences' ? '50' : '20'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Unit</label>
            <select
              value={settings.outputUnit}
              onChange={(e) => onSettingsChange({ outputUnit: e.target.value as OutputUnit })}
              disabled={isGenerating}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              {unitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Special count inputs for HTML/JSON */}
      {settings.mode === 'html' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Sections</label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={settings.count}
              onChange={(e) => onSettingsChange({ count: parseInt(e.target.value) })}
              disabled={isGenerating}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1</span>
              <span className="font-medium text-gray-200">{settings.count}</span>
              <span>10</span>
            </div>
          </div>
        </div>
      )}

      {settings.mode === 'json' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Complexity</label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="8"
              value={settings.count}
              onChange={(e) => onSettingsChange({ count: parseInt(e.target.value) })}
              disabled={isGenerating}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Simple</span>
              <span className="font-medium text-gray-200">Level {settings.count}</span>
              <span>Complex</span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Options - Only for text mode */}
      {settings.mode === 'text' && settings.theme === 'general' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">Options</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.startWithLorem}
                onChange={(e) => onSettingsChange({ startWithLorem: e.target.checked })}
                disabled={isGenerating}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300">Start with "Lorem"</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};