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
      <div className="flex flex-wrap gap-1 bg-gray-800 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        
        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap text-gray-300 hover:text-gray-200 hover:bg-gray-700 flex items-center gap-1 ml-1 border-l border-gray-600 pl-3"
          title="Reset to 'now'"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Input Field */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          {activeTabConfig?.label}
        </label>
        <div className={`relative flex items-center transition-all duration-200 border rounded-lg ${
          error ? 'border-red-500 bg-red-500/5' : 'border-gray-600 bg-gray-800'
        }`}>
          <div className="absolute left-3 flex items-center">
            <Calendar size={20} className="text-gray-400" />
          </div>
          
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={activeTabConfig?.placeholder}
            className="w-full pl-12 pr-12 py-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            autoComplete="off"
            spellCheck={false}
          />
          
          {currentValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-200 transition-colors"
              title="Clear input"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Error or Help Text */}
        <div className="min-h-[1rem] flex items-center">
          {error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <p className="text-gray-500 text-sm">
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