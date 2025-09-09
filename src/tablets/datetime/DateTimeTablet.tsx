import React, { useState, useEffect, useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { DateTimeTabletState, DateTimeTabletProps } from './types';
import { LiveHeader } from './components/LiveHeader';
import { TabbedInput } from './components/TabbedInput';
import { ConversionDashboard } from './components/ConversionDashboard';
import { TimezoneExplorer } from './components/TimezoneExplorer';
import { DateCalculator } from './components/DateCalculator';
import { ParseInspector } from './components/ParseInspector';
import { HistoryPanel } from './components/HistoryPanel';
import { formatForAllOutputs, isValidDateValue, ensureDate } from './utils/dateUtils';

const DateTimeTabletComponent: React.FC<DateTimeTabletProps> = ({ state, onChange }) => {
  const [conversionFormats, setConversionFormats] = useState<any>(null);

  // Update conversion formats when parsedDate changes
  useEffect(() => {
    if (isValidDateValue(state.data.parsedDate)) {
      const validDate = ensureDate(state.data.parsedDate);
      if (validDate) {
        try {
          const formats = formatForAllOutputs(validDate);
          setConversionFormats(formats);
        } catch {
          setConversionFormats(null);
        }
      } else {
        setConversionFormats(null);
      }
    } else {
      setConversionFormats(null);
    }
  }, [state.data.parsedDate]);

  // Handle date changes from TabbedInput
  const handleDateChange = useCallback((date: Date | null, error: string | null) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        parsedDate: date,
        error
      }
    });
  }, [onChange, state]);

  // Handle timezone changes
  const handleTimezonesChange = useCallback((timezones: string[]) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        selectedTimezones: timezones
      }
    });
  }, [onChange, state]);

  // Handle calculator state changes
  const handleCalculatorStateChange = useCallback((newCalculatorState: any) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        calculatorState: newCalculatorState
      }
    });
  }, [onChange, state]);

  // Handle history changes
  const handleHistoryChange = useCallback((newHistory: any[]) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        history: newHistory
      }
    });
  }, [onChange, state]);

  // Handle date selection from history or calculator
  const handleSelectDate = useCallback((date: Date) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        parsedDate: date,
        error: null
      }
    });
  }, [onChange, state]);

  // Handle calculation completion
  const handleCalculationComplete = useCallback((newDate: Date) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        parsedDate: newDate,
        error: null
      }
    });
  }, [onChange, state]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Live Header */}
      <LiveHeader />

      {/* Main Content: Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Input & Conversions */}
        <div className="w-1/2 border-r border-gray-700 flex flex-col">
          <div className="flex-shrink-0 p-6 border-b border-gray-700">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-100 mb-2">
                Date & Time Input
              </h1>
              <p className="text-gray-400">
                Enter a date/time in any format using the tabs below
              </p>
            </div>
            
            <TabbedInput 
              parsedDate={state.data.parsedDate}
              onDateChange={handleDateChange}
            />
          </div>

          <div className="flex-1 overflow-auto p-6 custom-scrollbar">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-200 mb-2">
                Conversions
              </h2>
              <p className="text-sm text-gray-400">
                All possible formats for your date
              </p>
            </div>
            <ConversionDashboard formats={conversionFormats} />
          </div>
        </div>

        {/* Right Column: Tools */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-shrink-0 p-6 border-b border-gray-700">
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Tools & Analysis
            </h1>
            <p className="text-gray-400">
              Advanced tools for working with your date
            </p>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
            {/* Timezone Explorer */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-750 px-4 py-3 border-b border-gray-600">
                <h3 className="font-medium text-gray-200">Timezone Explorer</h3>
                <p className="text-sm text-gray-400 mt-1">
                  View your date across different timezones
                </p>
              </div>
              <div className="p-4">
                <TimezoneExplorer
                  parsedDate={state.data.parsedDate}
                  selectedTimezones={state.data.selectedTimezones}
                  onTimezonesChange={handleTimezonesChange}
                />
              </div>
            </div>

            {/* Date Calculator */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-750 px-4 py-3 border-b border-gray-600">
                <h3 className="font-medium text-gray-200">Date Calculator</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Add, subtract time or calculate durations
                </p>
              </div>
              <div className="p-4">
                <DateCalculator
                  parsedDate={state.data.parsedDate}
                  calculatorState={state.data.calculatorState}
                  onCalculatorStateChange={handleCalculatorStateChange}
                  onCalculationComplete={handleCalculationComplete}
                />
              </div>
            </div>

            {/* Parse Inspector */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-750 px-4 py-3 border-b border-gray-600">
                <h3 className="font-medium text-gray-200">Parse Inspector</h3>
                <p className="text-sm text-gray-400 mt-1">
                  See how different languages would parse this date
                </p>
              </div>
              <div className="p-4">
                <ParseInspector
                  inputValue=""
                  parsedDate={state.data.parsedDate}
                />
              </div>
            </div>

            {/* History Panel */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-750 px-4 py-3 border-b border-gray-600">
                <h3 className="font-medium text-gray-200">History</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Recently used dates
                </p>
              </div>
              <div className="p-4">
                <HistoryPanel
                  history={state.data.history}
                  onHistoryChange={handleHistoryChange}
                  onSelectDate={(date, input) => handleSelectDate(date)}
                  currentInput=""
                  parsedDate={state.data.parsedDate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DateTimeTablet: Tablet = {
  id: "datetime",
  label: "Date & Time Toolkit",
  keywords: ["date", "time", "timestamp", "timezone", "convert", "parse", "duration", "calculator"],

  createInitialState(): DateTimeTabletState {
    return {
      type: "datetime",
      data: {
        parsedDate: null,
        error: null,
        selectedTimezones: [Intl.DateTimeFormat().resolvedOptions().timeZone],
        calculatorState: {
          operation: 'add',
          years: 0,
          months: 0,
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          secondDate: '',
          durationResult: null
        },
        history: [],
        isOptimizing: false,
        selectedElementId: null
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "datetime" && parsed.data) {
        // Merge with defaults to ensure all fields are present
        const data = { ...defaultState.data, ...parsed.data };
        
        // Convert parsedDate string back to Date object if it exists
        if (data.parsedDate && typeof data.parsedDate === 'string') {
          try {
            data.parsedDate = new Date(data.parsedDate);
            // Validate the converted date
            if (isNaN(data.parsedDate.getTime())) {
              data.parsedDate = null;
            }
          } catch {
            data.parsedDate = null;
          }
        }
        
        // Convert history dates back to Date objects
        if (data.history && Array.isArray(data.history)) {
          data.history = data.history.map((item: any) => ({
            ...item,
            date: item.date && typeof item.date === 'string' ? new Date(item.date) : item.date
          }));
        }
        
        return { type: "datetime", data };
      }
    } catch {
      // Silently handle deserialization failures
    }
    return defaultState;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const dateTimeState = state as DateTimeTabletState;
    return (
      <DateTimeTabletComponent
        state={dateTimeState}
        onChange={onChange as (newState: DateTimeTabletState) => void}
      />
    );
  },
};