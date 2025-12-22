import React, { useState, useEffect, useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { DateTimeTabletState, DateTimeTabletProps, PinnedDate } from './types';
import { LiveHeader } from './components/LiveHeader';
import { SmartInput } from './components/SmartInput';
import { ConversionDashboard } from './components/ConversionDashboard';
import { TimezoneExplorer } from './components/TimezoneExplorer';
import { QuickAdjustPanel } from './components/QuickAdjustPanel';
import { ParseInspector } from './components/ParseInspector';
import { HistorySidebar } from './components/HistorySidebar';
import { formatForAllOutputs, isValidDateValue, ensureDate, performDateArithmetic, intelligentParse } from './utils/dateUtils';
import { formatDistanceToNow, startOfDay } from 'date-fns';
import { Info, Globe, Shield, Braces } from '../../components/Icons';

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

          // Add to history automatically if it's a new valid date
          const dateStr = validDate.toISOString();
          const exists = state.data.history.some(h => ensureDate(h.date)?.toISOString() === dateStr);
          if (!exists) {
            const newItem: PinnedDate = {
              id: Math.random().toString(36).substring(2, 9),
              label: '',
              date: validDate,
              originalInput: state.data.parsedDate instanceof Date ? state.data.parsedDate.toISOString() : String(state.data.parsedDate || ''),
              pinnedAt: Date.now()
            };
            onChange({
              ...state,
              data: {
                ...state.data,
                history: [newItem, ...state.data.history.slice(0, 49)]
              }
            });
          }
        } catch {
          setConversionFormats(null);
        }
      } else {
        setConversionFormats(null);
      }
    } else {
      setConversionFormats(null);
    }
  }, [state.data.parsedDate, state.data.history.length]);

  const handleSmartInputChange = useCallback((inputValue: string, parsedDate: Date | null, error: string | null) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        inputValue,
        parsedDate,
        error
      }
    });
  }, [onChange, state]);

  const handleQuickAdjust = useCallback((type: string, amount: number) => {
    const baseDate = ensureDate(state.data.parsedDate) || new Date();
    let newDate: Date;

    if (type === 'startOfDay') {
      newDate = startOfDay(baseDate);
    } else {
      const unitMap: any = { h: 'hours', d: 'days', w: 'weeks' };
      newDate = performDateArithmetic(baseDate, amount > 0 ? 'add' : 'subtract', { [unitMap[type]]: Math.abs(amount) });
    }

    onChange({
      ...state,
      data: {
        ...state.data,
        parsedDate: newDate,
        error: null
      }
    });
  }, [onChange, state]);

  const handleToggleStar = useCallback((id: string) => {
    const newHistory = state.data.history.map(item =>
      item.id === id ? { ...item, label: item.label === 'star' ? '' : 'star' } : item
    );
    onChange({ ...state, data: { ...state.data, history: newHistory } });
  }, [onChange, state]);

  const handleRemoveHistory = useCallback((id: string) => {
    const newHistory = state.data.history.filter(item => item.id !== id);
    onChange({ ...state, data: { ...state.data, history: newHistory } });
  }, [onChange, state]);

  const handleSelectHistoryDate = useCallback((date: Date) => {
    handleSmartInputChange(date.toISOString(), date, null);
  }, [handleSmartInputChange]);

  return (
    <div className="h-full flex flex-col bg-canvas text-main overflow-hidden">
      <LiveHeader onSetInput={(val) => {
        const result = intelligentParse(val);
        handleSmartInputChange(val, result.date, null);
      }} />

      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Sidebar */}
        <HistorySidebar
          history={state.data.history}
          onSelectDate={handleSelectHistoryDate}
          onToggleStar={handleToggleStar}
          onRemove={handleRemoveHistory}
          currentDate={ensureDate(state.data.parsedDate)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar: Input & Quick Adjust */}
          <div className="p-8 pb-6 border-b border-base bg-surface-secondary/20">
            <div className="max-w-4xl mx-auto w-full">
              <SmartInput
                inputValue={state.data.inputValue}
                parsedDate={state.data.parsedDate}
                onUpdate={handleSmartInputChange}
              />
              <QuickAdjustPanel onAdjust={handleQuickAdjust} />
            </div>
          </div>

          {/* Side-by-Side Dashboard */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Conversions & Formats */}
            <div className="w-7/12 border-r border-base flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-base bg-surface-secondary/10">
                <Braces size={16} className="text-secondary" />
                <h2 className="text-xs font-bold text-secondary uppercase tracking-widest">Transformations & Formats</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <ConversionDashboard formats={conversionFormats} />
              </div>
            </div>

            {/* Right Column: Analysis & Debugging */}
            <div className="w-5/12 flex flex-col overflow-hidden bg-surface-secondary/5">
              <div className="flex items-center gap-2 p-4 border-b border-base bg-surface-secondary/10">
                <Shield size={16} className="text-secondary" />
                <h2 className="text-xs font-bold text-secondary uppercase tracking-widest">Analysis & Debugger</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Humanization */}
                {state.data.parsedDate && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Humanization</span>
                    </div>
                    <p className="text-lg font-medium text-main leading-tight">
                      This is approximately <span className="text-primary font-bold">{formatDistanceToNow(ensureDate(state.data.parsedDate) || new Date(), { addSuffix: true })}</span>.
                    </p>
                  </div>
                )}

                {/* Parse Inspector */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Braces size={14} className="text-secondary" />
                    <h3 className="text-sm font-bold text-main">Parse Inspector</h3>
                  </div>
                  <ParseInspector
                    inputValue={state.data.parsedDate instanceof Date ? state.data.parsedDate.toISOString() : String(state.data.parsedDate || '')}
                    parsedDate={state.data.parsedDate}
                  />
                </div>

                {/* Timezone Comparison */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} className="text-secondary" />
                    <h3 className="text-sm font-bold text-main">Pinned Timezones</h3>
                  </div>
                  <TimezoneExplorer
                    parsedDate={state.data.parsedDate}
                    selectedTimezones={state.data.selectedTimezones}
                    onTimezonesChange={(tzs) => onChange({ ...state, data: { ...state.data, selectedTimezones: tzs } })}
                  />
                </div>
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
  label: "Date & Time",
  keywords: ["date", "time", "timestamp", "timezone", "convert", "parse", "duration", "calculator"],

  createInitialState(): DateTimeTabletState {
    return {
      type: "datetime",
      data: {
        inputValue: 'now',
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
        const data = { ...defaultState.data, ...parsed.data };
        if (data.parsedDate && typeof data.parsedDate === 'string') {
          try {
            data.parsedDate = new Date(data.parsedDate);
            if (isNaN(data.parsedDate.getTime())) data.parsedDate = null;
          } catch {
            data.parsedDate = null;
          }
        }
        if (data.history && Array.isArray(data.history)) {
          data.history = data.history.map((item: any) => ({
            ...item,
            date: item.date && typeof item.date === 'string' ? new Date(item.date) : item.date
          }));
        }
        data.inputValue = data.inputValue || 'now';
        return { type: "datetime", data };
      }
    } catch {
      // Silently handle
    }
    return defaultState;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    return (
      <DateTimeTabletComponent
        state={state as DateTimeTabletState}
        onChange={onChange as (newState: DateTimeTabletState) => void}
      />
    );
  },
};