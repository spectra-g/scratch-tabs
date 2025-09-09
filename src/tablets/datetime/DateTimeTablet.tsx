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
import { ChevronDown, ChevronRight } from '../../components/Icons';

interface AccordionSectionProps {
  id: string;
  title: string;
  description: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  id,
  title,
  description,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full bg-gray-750 px-4 py-3 border-b border-gray-600 flex items-center justify-between hover:bg-gray-700 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-medium text-gray-200">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

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

  // Handle accordion toggle
  const handleAccordionToggle = useCallback((sectionId: string) => {
    const expandedSections = state.data.expandedAccordionSections || [];
    const isCurrentlyExpanded = expandedSections.includes(sectionId);
    
    const newExpandedSections = isCurrentlyExpanded
      ? expandedSections.filter(id => id !== sectionId)
      : [...expandedSections, sectionId];
    
    onChange({
      ...state,
      data: {
        ...state.data,
        expandedAccordionSections: newExpandedSections
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

          <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
            {/* Timezone Explorer */}
            <AccordionSection
              id="timezone"
              title="Timezone Explorer"
              description="View your date across different timezones"
              isExpanded={state.data.expandedAccordionSections?.includes('timezone') || false}
              onToggle={handleAccordionToggle}
            >
              <TimezoneExplorer
                parsedDate={state.data.parsedDate}
                selectedTimezones={state.data.selectedTimezones}
                onTimezonesChange={handleTimezonesChange}
              />
            </AccordionSection>

            {/* Date Calculator */}
            <AccordionSection
              id="calculator"
              title="Date Calculator"
              description="Add, subtract time or calculate durations"
              isExpanded={state.data.expandedAccordionSections?.includes('calculator') || false}
              onToggle={handleAccordionToggle}
            >
              <DateCalculator
                parsedDate={state.data.parsedDate}
                calculatorState={state.data.calculatorState}
                onCalculatorStateChange={handleCalculatorStateChange}
                onCalculationComplete={handleCalculationComplete}
              />
            </AccordionSection>

            {/* Parse Inspector */}
            <AccordionSection
              id="parser"
              title="Parse Inspector"
              description="See how different languages would parse this date"
              isExpanded={state.data.expandedAccordionSections?.includes('parser') || false}
              onToggle={handleAccordionToggle}
            >
              <ParseInspector
                inputValue=""
                parsedDate={state.data.parsedDate}
              />
            </AccordionSection>

            {/* History Panel */}
            <AccordionSection
              id="history"
              title="History"
              description="Recently used dates"
              isExpanded={state.data.expandedAccordionSections?.includes('history') || false}
              onToggle={handleAccordionToggle}
            >
              <HistoryPanel
                history={state.data.history}
                onHistoryChange={handleHistoryChange}
                onSelectDate={(date, input) => handleSelectDate(date)}
                currentInput=""
                parsedDate={state.data.parsedDate}
              />
            </AccordionSection>
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
        selectedElementId: null,
        expandedAccordionSections: ['timezone', 'calculator']
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