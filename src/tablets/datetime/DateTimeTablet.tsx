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
import { formatForAllOutputs, isValidDateValue, ensureDate, performDateArithmetic, intelligentParse, calculateDuration } from './utils/dateUtils';
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

  const handleSmartInputChange = useCallback((inputValue: string, parsedDate: Date | null, error: string | null) => {
    let newData = { ...state.data, inputValue, parsedDate, error };

    // Check for Command Result (passed via error field as stringified JSON hack)
    if (error && error.startsWith('{"type":"COMMAND"')) {
      try {
        const commandObj = JSON.parse(error);
        const commandResult = commandObj.result;
        newData.error = null; // Clear the error since it was a command

        if (commandResult.type === 'ADD_TIMEZONE') {
          // Check if timezone already exists
          if (!newData.selectedTimezones.includes(commandResult.payload)) {
            newData.selectedTimezones = [...newData.selectedTimezones, commandResult.payload];
          }
          // Keep the current date visible!
          newData.parsedDate = state.data.parsedDate || new Date();
        } else if (commandResult.type === 'JUMP_DATE') {
          newData.parsedDate = ensureDate(commandResult.payload);
          // We don't change input value for Jump, or do we?
          // Requirement: "overrides the current date without needing to delete the existing math"
          // That implies the input stays as "> 2026-01-01"? 
          // Or we replace the input? 
          // "overrides the current parsed date" -> So parsedDate updates. Input stays as is.
        } else if (commandResult.type === 'SHOW_DIFF') {
          // Determine diff against what?
          // If parsedDate is null (because it's a command), we might want to diff against "Now" OR
          // maybe the user wants to see the diff between parsedDate and "Now"?
          // The requirement is: "calculate the duration between the current parsed date and this new value".
          // Since this replaces the input, "current parsed date" is effectively just the previous state.
          // But the previous state is lost in this callback.
          // However, we can use state.data.parsedDate from the closure! (Wait, closure capture?)
          // Yes, `state` is in dependency array.

          const baseDate = ensureDate(state.data.parsedDate) || new Date();
          const targetDate = ensureDate(commandResult.payload);

          if (targetDate) {
            // We need to display this diff. 
            // Where? "Return this as a specialized result to be displayed in the Analysis column."
            // We can stick it in `calculatorState` or a new field.
            // Let's use `calculatorState.durationResult` and set operation to 'duration'.
            const duration = calculateDuration(baseDate, targetDate);
            newData.calculatorState = {
              ...newData.calculatorState,
              operation: 'duration',
              secondDate: targetDate.toISOString(),
              durationResult: duration
            } as any;
            // Also expand the calculator section so they see it
            if (!newData.expandedAccordionSections?.includes('calculator')) {
              newData.expandedAccordionSections = [...(newData.expandedAccordionSections || []), 'calculator'];
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // History Logic: Add ONLY if valid date and meaningful change
    // We check against the LATEST history item in state.data.history
    if (isValidDateValue(newData.parsedDate) && inputValue !== 'now') { // Don't add simple "now" updates
      const validDate = ensureDate(newData.parsedDate);
      if (validDate) {
        const dateStr = validDate.toISOString();
        const lastItem = state.data.history[0];

        // Add if history is empty OR date is different from last item
        const lastDateStr = lastItem ? ensureDate(lastItem.date)?.toISOString() : null;

        if (!lastItem || lastDateStr !== dateStr) {
          const newItem: PinnedDate = {
            id: Math.random().toString(36).substring(2, 9),
            label: '',
            date: validDate,
            originalInput: inputValue,
            pinnedAt: Date.now()
          };
          newData.history = [newItem, ...state.data.history.slice(0, 49)];
        }
      }
    }

    onChange({
      ...state,
      data: newData
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

                {/* Calculator Results */}
                {state.data.calculatorState?.durationResult && (
                  <div className="bg-accent/5 p-4 rounded-xl border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Braces size={14} className="text-accent" />
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Time Difference</span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-secondary">
                        Compared to: <span className="font-mono text-main">{state.data.calculatorState.secondDate.split('T')[0]}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-surface rounded p-2 border border-base">
                          <div className="text-[9px] uppercase text-muted">Total Days</div>
                          <div className="text-lg font-mono text-main">{Math.abs(state.data.calculatorState.durationResult.totalDays)}d</div>
                        </div>
                        <div className="bg-surface rounded p-2 border border-base">
                          <div className="text-[9px] uppercase text-muted">Total Hours</div>
                          <div className="text-lg font-mono text-main">{Math.abs(state.data.calculatorState.durationResult.totalHours)}h</div>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-main pt-1">
                        {state.data.calculatorState.durationResult.years > 0 && `${state.data.calculatorState.durationResult.years}y `}
                        {state.data.calculatorState.durationResult.months > 0 && `${state.data.calculatorState.durationResult.months}mo `}
                        {state.data.calculatorState.durationResult.days > 0 && `${state.data.calculatorState.durationResult.days}d `}
                        {state.data.calculatorState.durationResult.hours > 0 && `${state.data.calculatorState.durationResult.hours}h `}
                        {state.data.calculatorState.durationResult.minutes > 0 && `${state.data.calculatorState.durationResult.minutes}m `}
                        {state.data.calculatorState.durationResult.seconds > 0 && `${state.data.calculatorState.durationResult.seconds}s`}
                        {state.data.calculatorState.durationResult.totalSeconds === 0 && "No difference"}
                      </div>
                    </div>
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