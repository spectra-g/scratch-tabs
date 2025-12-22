import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Calendar, X, RotateCcw } from '../../../components/Icons';
import { intelligentParse, isValidDateValue, ensureDate } from '../utils/dateUtils';

interface TabbedInputProps {
  parsedDate: Date | null;
  onDateChange: (date: Date | null, error: string | null) => void;
}

type TabType = 'natural' | 'iso' | 'unixMs' | 'unixS';

interface TabConfig {
  key: TabType;
  label: string;
  placeholder: string;
  formatDate: (date: Date) => string;
  parseValue: (value: string) => Date | null;
}

export const TabbedInput: React.FC<TabbedInputProps> = ({
  parsedDate,
  onDateChange
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('natural');
  const [inputValues, setInputValues] = useState<Record<TabType, string>>({
    natural: 'now',
    iso: '',
    unixMs: '',
    unixS: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Parse the initial "now" value on mount
  useEffect(() => {
    const initialValue = inputValues.natural;
    if (initialValue && activeTab === 'natural') {
      const activeTabConfig = tabs.find(tab => tab.key === activeTab);
      if (activeTabConfig) {
        const parsed = activeTabConfig.parseValue(initialValue);
        onDateChange(parsed, null);
      }
    }
  }, []); // Only run on mount

  const tabs: TabConfig[] = [
    {
      key: 'natural',
      label: 'Natural Language',
      placeholder: 'now, yesterday, 3 days ago...',
      formatDate: () => '', // Natural language doesn't reverse format cleanly
      parseValue: intelligentParse
    },
    {
      key: 'iso',
      label: 'ISO / Human Readable',
      placeholder: '2023-01-01T12:00:00Z',
      formatDate: (date: Date) => date.toISOString(),
      parseValue: (value: string) => {
        try {
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? null : parsed;
        } catch {
          return null;
        }
      }
    },
    {
      key: 'unixMs',
      label: 'Unix Timestamp (ms)',
      placeholder: '1672574400000',
      formatDate: (date: Date) => date.getTime().toString(),
      parseValue: (value: string) => {
        const timestamp = parseInt(value);
        if (isNaN(timestamp)) return null;
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
    },
    {
      key: 'unixS',
      label: 'Unix Timestamp (s)',
      placeholder: '1672574400',
      formatDate: (date: Date) => Math.floor(date.getTime() / 1000).toString(),
      parseValue: (value: string) => {
        const timestamp = parseInt(value);
        if (isNaN(timestamp)) return null;
        const date = new Date(timestamp * 1000);
        return isNaN(date.getTime()) ? null : date;
      }
    }
  ];

  // Update all input fields when parsedDate changes from external sources
  // Use a ref to track if we're in the middle of handling user input
  const isHandlingUserInput = useRef(false);

  useEffect(() => {
    // Don't override inputs if we're currently handling user input
    if (isHandlingUserInput.current) {
      isHandlingUserInput.current = false;
      return;
    }

    if (isValidDateValue(parsedDate)) {
      const validDate = ensureDate(parsedDate);
      if (validDate) {
        const newInputValues: Record<TabType, string> = { ...inputValues };

        tabs.forEach(tab => {
          if (tab.key !== 'natural') { // Don't override natural language input
            newInputValues[tab.key] = tab.formatDate(validDate);
          }
        });

        setInputValues(newInputValues);
      }
    }
  }, [parsedDate]);

  const handleInputChange = useCallback((value: string) => {
    // Set flag to prevent useEffect from overriding this change
    isHandlingUserInput.current = true;

    // Update the current tab's input value
    setInputValues(prev => ({
      ...prev,
      [activeTab]: value
    }));

    // Clear error immediately when typing
    setError(null);

    // Parse the input and update the date
    const activeTabConfig = tabs.find(tab => tab.key === activeTab);
    if (activeTabConfig) {
      try {
        const parsed = activeTabConfig.parseValue(value);
        onDateChange(parsed, null);
      } catch {
        onDateChange(null, 'Unable to parse date/time');
      }
    }
  }, [activeTab, onDateChange, tabs]);

  const handleClear = useCallback(() => {
    setInputValues(prev => ({
      ...prev,
      [activeTab]: ''
    }));
    onDateChange(null, null);
    setError(null);
  }, [activeTab, onDateChange]);

  const handleReset = useCallback(() => {
    // Reset all tabs to their default values
    setInputValues({
      natural: 'now',
      iso: '',
      unixMs: '',
      unixS: ''
    });

    // Switch to natural language tab
    setActiveTab('natural');

    // Parse "now" and update the date
    const parsed = intelligentParse('now');
    onDateChange(parsed, null);
    setError(null);
  }, [onDateChange]);

  const activeTabConfig = tabs.find(tab => tab.key === activeTab);
  const currentValue = inputValues[activeTab];

  return (
    <div className="space-y-3">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-surface-secondary/50 p-1 rounded-lg border border-base">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-secondary hover:text-main hover:bg-element-hover'
              }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap text-secondary hover:text-main hover:bg-element-hover flex items-center gap-1 ml-1 border-l border-base pl-3"
          title="Reset to 'now'"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Input Field */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-main">
          {activeTabConfig?.label}
        </label>
        <div className="relative flex items-center group">
          <div className="absolute left-3 flex items-center pointer-events-none">
            <Calendar size={20} className="text-secondary group-focus-within:text-primary transition-colors" />
          </div>

          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={activeTabConfig?.placeholder}
            className={`input-themed w-full pl-12 pr-12 py-3 text-base ${error ? 'border-danger bg-danger-subtle/20' : ''
              }`}
            autoComplete="off"
            spellCheck={false}
          />

          {currentValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 p-1 text-secondary hover:text-main transition-colors"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Error or Help Text */}
        <div className="min-h-[1rem] flex items-center">
          {error ? (
            <p className="text-danger text-sm">{error}</p>
          ) : (
            <p className="text-muted text-sm">
              {activeTab === 'natural'
                ? 'Try: now, yesterday, 3 days ago, next Monday, 2023-01-01'
                : `Enter ${activeTabConfig?.label.toLowerCase()}`
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};