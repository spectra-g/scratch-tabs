import React, { useState, useEffect, useCallback } from 'react';
import { DateTimeTabletState, DateTimeTabletProps } from './types';
import { OmniInput } from './components/OmniInput';
import { ConversionDashboard } from './components/ConversionDashboard';
import { TimezoneExplorer } from './components/TimezoneExplorer';
import { DateCalculator } from './components/DateCalculator';
import { ParseInspector } from './components/ParseInspector';
import { HistoryPanel } from './components/HistoryPanel';
import { intelligentParse, formatForAllOutputs, createDebouncedParser } from './utils/dateUtils';

export const DateTimeTablet: React.FC<DateTimeTabletProps> = ({ state, onChange }) => {
  const [activeTab, setActiveTab] = useState<'conversions' | 'timezones' | 'calculator' | 'inspector' | 'history'>('conversions');
  const [conversionFormats, setConversionFormats] = useState<any>(null);

  // Create debounced parser
  const debouncedParser = useCallback(
    createDebouncedParser((result, error) => {
      onChange({
        ...state,
        parsedDate: result,
        error
      });

      // Update conversion formats
      if (result) {
        try {
          const formats = formatForAllOutputs(result);
          setConversionFormats(formats);
        } catch (err) {
          setConversionFormats(null);
        }
      } else {
        setConversionFormats(null);
      }
    }, 300),
    [state, onChange]
  );

  // Parse input when it changes
  useEffect(() => {
    debouncedParser(state.inputValue);
  }, [state.inputValue, debouncedParser]);

  const handleInputChange = (value: string) => {
    onChange({
      ...state,
      inputValue: value,
      error: null // Clear error immediately when typing
    });
  };

  const handleTimezonesChange = (timezones: string[]) => {
    onChange({
      ...state,
      selectedTimezones: timezones
    });
  };

  const handleCalculatorStateChange = (newCalculatorState: any) => {
    onChange({
      ...state,
      calculatorState: newCalculatorState
    });
  };

  const handleHistoryChange = (newHistory: any[]) => {
    onChange({
      ...state,
      history: newHistory
    });
  };

  const handleSelectDate = (date: Date, input: string) => {
    onChange({
      ...state,
      inputValue: input,
      parsedDate: date,
      error: null
    });
    setActiveTab('conversions');
  };

  const tabs = [
    { key: 'conversions', label: 'Conversions', count: conversionFormats ? 5 : 0 },
    { key: 'timezones', label: 'Timezones', count: state.selectedTimezones.length },
    { key: 'calculator', label: 'Calculator', count: 0 },
    { key: 'inspector', label: 'Inspector', count: 0 },
    { key: 'history', label: 'History', count: state.history.length }
  ] as const;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header with Omni-Input */}
      <div className="flex-shrink-0 p-6 bg-gray-850 border-b border-gray-700">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Date & Time Toolkit
            </h1>
            <p className="text-gray-400">
              The ultimate date/time converter and inspector
            </p>
          </div>
          
          <OmniInput
            value={state.inputValue}
            onChange={handleInputChange}
            error={state.error}
            parsedDate={state.parsedDate}
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="flex overflow-x-auto">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-blue-500 text-blue-400 bg-gray-700/50'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="ml-2 px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'conversions' && (
            <ConversionDashboard formats={conversionFormats} />
          )}
          
          {activeTab === 'timezones' && (
            <TimezoneExplorer
              parsedDate={state.parsedDate}
              selectedTimezones={state.selectedTimezones}
              onTimezonesChange={handleTimezonesChange}
            />
          )}
          
          {activeTab === 'calculator' && (
            <DateCalculator
              parsedDate={state.parsedDate}
              calculatorState={state.calculatorState}
              onCalculatorStateChange={handleCalculatorStateChange}
            />
          )}
          
          {activeTab === 'inspector' && (
            <ParseInspector
              inputValue={state.inputValue}
              parsedDate={state.parsedDate}
            />
          )}
          
          {activeTab === 'history' && (
            <HistoryPanel
              history={state.history}
              onHistoryChange={handleHistoryChange}
              onSelectDate={handleSelectDate}
              currentInput={state.inputValue}
              parsedDate={state.parsedDate}
            />
          )}
        </div>
      </div>
    </div>
  );
};