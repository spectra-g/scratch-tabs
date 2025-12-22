import React from 'react';
import { Calculator, Plus, Minus, Clock } from '../../../components/Icons';
import { DurationResult } from '../types';
import { performDateArithmetic, calculateDuration, intelligentParse, isValidDateValue, ensureDate } from '../utils/dateUtils';

interface DateCalculatorProps {
  parsedDate: Date | null;
  calculatorState: {
    operation: 'add' | 'subtract' | 'duration';
    years: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    secondDate: string;
    durationResult: DurationResult | null;
  };
  onCalculatorStateChange: (newState: any) => void;
  onCalculationComplete?: (newDate: Date) => void;
}

export const DateCalculator: React.FC<DateCalculatorProps> = ({
  parsedDate,
  calculatorState,
  onCalculatorStateChange,
  onCalculationComplete
}) => {
  const updateField = (field: string, value: any) => {
    onCalculatorStateChange({
      ...calculatorState,
      [field]: value
    });
  };

  const performCalculation = () => {
    if (!isValidDateValue(parsedDate)) {
      return;
    }

    const validDate = ensureDate(parsedDate);
    if (!validDate) {
      return;
    }

    if (calculatorState.operation === 'duration') {
      const secondDate = intelligentParse(calculatorState.secondDate);
      if (secondDate) {
        const duration = calculateDuration(validDate, secondDate);
        updateField('durationResult', duration);
      }
    } else {
      const duration = {
        years: calculatorState.years,
        months: calculatorState.months,
        weeks: calculatorState.weeks,
        days: calculatorState.days,
        hours: calculatorState.hours,
        minutes: calculatorState.minutes,
        seconds: calculatorState.seconds
      };

      const result = performDateArithmetic(validDate, calculatorState.operation, duration);
      // Emit the result back to the parent
      if (onCalculationComplete) {
        onCalculationComplete(result);
      }
    }
  };

  const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    unit: string;
  }> = ({ label, value, onChange, unit }) => (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-secondary w-16">{label}:</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="input-themed w-20 px-2 py-1 text-sm focus:ring-1 focus:ring-primary"
        min="0"
      />
      <span className="text-xs text-muted">{unit}</span>
    </div>
  );

  return (
    <div className="bg-surface-secondary rounded-lg overflow-hidden border border-base">
      <div className="bg-surface-highlight/50 px-4 py-3 border-b border-base">
        <h3 className="text-lg font-semibold text-main flex items-center">
          <Calculator size={18} className="mr-2" />
          Date Calculator
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Operation selector */}
        <div className="flex space-x-2">
          {[
            { key: 'add', label: 'Add Time', icon: Plus },
            { key: 'subtract', label: 'Subtract Time', icon: Minus },
            { key: 'duration', label: 'Calculate Duration', icon: Clock }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => updateField('operation', key)}
              className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${calculatorState.operation === key
                  ? 'bg-primary text-white'
                  : 'bg-element text-secondary hover:bg-element-hover'
                }`}
            >
              <Icon size={14} className="mr-1" />
              {label}
            </button>
          ))}
        </div>

        {/* Input fields based on operation */}
        {(calculatorState.operation === 'add' || calculatorState.operation === 'subtract') && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumberInput
                label="Years"
                value={calculatorState.years}
                onChange={(value) => updateField('years', value)}
                unit="yr"
              />
              <NumberInput
                label="Months"
                value={calculatorState.months}
                onChange={(value) => updateField('months', value)}
                unit="mo"
              />
              <NumberInput
                label="Weeks"
                value={calculatorState.weeks}
                onChange={(value) => updateField('weeks', value)}
                unit="wk"
              />
              <NumberInput
                label="Days"
                value={calculatorState.days}
                onChange={(value) => updateField('days', value)}
                unit="d"
              />
              <NumberInput
                label="Hours"
                value={calculatorState.hours}
                onChange={(value) => updateField('hours', value)}
                unit="h"
              />
              <NumberInput
                label="Minutes"
                value={calculatorState.minutes}
                onChange={(value) => updateField('minutes', value)}
                unit="m"
              />
            </div>

            <button
              onClick={performCalculation}
              disabled={!parsedDate}
              className="w-full px-4 py-2 bg-primary hover:opacity-90 disabled:bg-element-disabled disabled:text-muted disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              Calculate {calculatorState.operation === 'add' ? 'Addition' : 'Subtraction'}
            </button>
          </div>
        )}

        {calculatorState.operation === 'duration' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-secondary mb-2">Second Date/Time</label>
              <input
                type="text"
                value={calculatorState.secondDate}
                onChange={(e) => updateField('secondDate', e.target.value)}
                placeholder="Enter second date/time..."
                className="input-themed w-full px-3 py-2 text-main placeholder-secondary"
              />
            </div>

            <button
              onClick={performCalculation}
              disabled={!parsedDate || !calculatorState.secondDate}
              className="w-full px-4 py-2 bg-primary hover:opacity-90 disabled:bg-element-disabled disabled:text-muted disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              Calculate Duration
            </button>

            {/* Duration result */}
            {calculatorState.durationResult && (
              <div className="bg-surface-highlight/30 rounded-md p-3 mt-3 border border-base">
                <h4 className="text-sm font-medium text-main mb-2">Duration</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-secondary">Years: <span className="text-main">{calculatorState.durationResult.years}</span></div>
                  <div className="text-secondary">Months: <span className="text-main">{calculatorState.durationResult.months}</span></div>
                  <div className="text-secondary">Days: <span className="text-main">{calculatorState.durationResult.days}</span></div>
                  <div className="text-secondary">Hours: <span className="text-main">{calculatorState.durationResult.hours}</span></div>
                </div>
                <div className="mt-2 pt-2 border-t border-base text-xs text-muted">
                  Total: {calculatorState.durationResult.totalDays} days, {calculatorState.durationResult.totalHours} hours
                </div>
              </div>
            )}
          </div>
        )}

        {!parsedDate && (
          <div className="text-center py-4">
            <Calculator size={32} className="mx-auto text-muted mb-2" />
            <p className="text-secondary">Enter a valid date to use calculator</p>
          </div>
        )}
      </div>
    </div>
  );
};