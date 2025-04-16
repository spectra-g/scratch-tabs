import React, { useState } from 'react';
import { ConversionPanel } from '../components/ConversionPanel';
import { ConversionInput } from '../components/ConversionInput';

interface Props {
  searchQuery: string;
}

// Helper function for readable date formatting using Intl
const formatDateReadable = (date: Date, timeZone?: string): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  try {
    // Options to get a detailed, human-readable format similar to 'PPpp'
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: 'full', // e.g., Tuesday, March 15, 2024
      timeStyle: 'long', // e.g., 1:45:30 PM PST
      ...(timeZone && { timeZone }), // Add timezone if provided
    };
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    // Fallback to simpler format if Intl fails (e.g., invalid timezone)
    return date.toLocaleString();
  }
};

export const DateTimeConversion: React.FC<Props> = ({ searchQuery }) => {
  const [timestamp, setTimestamp] = useState('');
  const [dateString, setDateString] = useState('');
  const [calculatorDate, setCalculatorDate] = useState('');
  const [calculatorAmount, setCalculatorAmount] = useState('');
  const [calculatorUnit, setCalculatorUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [timezone, setTimezone] = useState('');
  const [targetTimezone, setTargetTimezone] = useState('');

  // Get list of available timezones - remains the same
  const timezones = Intl.supportedValuesOf('timeZone');

  const handleTimestampConversion = () => {
    try {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) throw new Error('Invalid number');

      // Handle both seconds and milliseconds
      // If timestamp is likely seconds (less than 10 billion), multiply by 1000
      const date = new Date(ts * (ts < 10000000000 ? 1000 : 1));
      if (isNaN(date.getTime())) throw new Error('Invalid timestamp resulted in invalid date');

      return {
        'Date': formatDateReadable(date), // Use helper
        'ISO 8601 (UTC)': date.toISOString(), // Native method
        'Unix Timestamp (s)': Math.floor(date.getTime() / 1000).toString(), // Native method
        'Unix Timestamp (ms)': date.getTime().toString() // Native method
      };
    } catch (e: any) {
      return { 'Error': e.message || 'Invalid timestamp' };
    }
  };

  const handleDateStringConversion = () => {
    try {
      // Attempt to parse the date string
      const date = new Date(dateString);
      // Check if the parsing resulted in a valid date
      if (isNaN(date.getTime())) throw new Error('Invalid date string format');

      return {
        'Unix Timestamp (s)': Math.floor(date.getTime() / 1000).toString(),
        'Unix Timestamp (ms)': date.getTime().toString(),
        'ISO 8601 (UTC)': date.toISOString(),
        'Formatted (Local)': formatDateReadable(date) // Use helper
      };
    } catch (e: any) {
      return { 'Error': e.message || 'Invalid date string' };
    }
  };

  const handleDateCalculation = () => {
    try {
      // Use the input value directly, which should be in 'YYYY-MM-DDTHH:mm' format
      const date = new Date(calculatorDate);
      if (isNaN(date.getTime())) throw new Error('Invalid start date');

      const amount = parseInt(calculatorAmount);
      if (isNaN(amount)) throw new Error('Invalid amount');

      // Create a *new* date object to avoid modifying the original one used by setDate/Month/FullYear
      const resultDate = new Date(date);

      switch (calculatorUnit) {
        case 'days':
          resultDate.setDate(resultDate.getDate() + amount);
          break;
        case 'weeks':
          resultDate.setDate(resultDate.getDate() + amount * 7);
          break;
        case 'months':
          resultDate.setMonth(resultDate.getMonth() + amount);
          break;
        case 'years':
          resultDate.setFullYear(resultDate.getFullYear() + amount);
          break;
        default:
          throw new Error('Invalid unit');
      }

       if (isNaN(resultDate.getTime())) throw new Error('Calculation resulted in invalid date');

      return {
        'Result': formatDateReadable(resultDate), // Use helper
        'ISO 8601 (UTC)': resultDate.toISOString(),
        'Unix Timestamp (s)': Math.floor(resultDate.getTime() / 1000).toString()
      };
    } catch (e: any) {
      return { 'Error': e.message || 'Invalid input for calculation' };
    }
  };

  const handleTimezoneConversion = () => {
    try {
      if (!timezone || !targetTimezone) return { 'Error': 'Please select both timezones' };

      // Get the current instant in time
      const now = new Date();

      // Use Intl.DateTimeFormat to format the *same instant* according to each timezone
      const formattedSource = formatDateReadable(now, timezone);
      const formattedTarget = formatDateReadable(now, targetTimezone);

      // Check if formatting failed (e.g., invalid timezone string passed somehow)
      if (formattedSource === 'Invalid Date' || formattedTarget === 'Invalid Date') {
          throw new Error('Invalid timezone selected');
      }

      return {
        [timezone]: formattedSource,
        [targetTimezone]: formattedTarget
      };
    } catch (e: any) {
      console.error("Timezone Conversion Error:", e);
      return { 'Error': e.message || 'Invalid timezone conversion' };
    }
  };

  // --- UI Rendering (remains largely the same) ---
  const panels = [
    {
      id: 'timestamp',
      title: 'Unix Timestamp Converter',
      description: 'Convert between Unix timestamps and human-readable dates',
      content: (
        <>
          <ConversionInput
            value={timestamp}
            onChange={setTimestamp}
            placeholder="Enter Unix timestamp (seconds or milliseconds)..."
            rows={1}
          />
          {/* Conditional rendering based on input validity */}
          {timestamp && !isNaN(parseInt(timestamp)) && (
            <div className="mt-4 space-y-2">
              {Object.entries(handleTimestampConversion()).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
           {timestamp && isNaN(parseInt(timestamp)) && (
             <div className="mt-4 text-red-400 text-sm">Invalid number entered.</div>
           )}
        </>
      )
    },
    {
      id: 'iso', // Changed title slightly as it handles more than just ISO
      title: 'Date String Converter',
      description: 'Convert date strings to timestamps and other formats',
      content: (
        <>
          <ConversionInput
            value={dateString}
            onChange={setDateString}
            placeholder="Enter date string (e.g., 2024-03-15, March 15 2024 14:30)..."
            rows={1}
          />
          {/* Conditional rendering based on input validity */}
          {dateString && !isNaN(new Date(dateString).getTime()) && (
            <div className="mt-4 space-y-2">
              {Object.entries(handleDateStringConversion()).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {dateString && isNaN(new Date(dateString).getTime()) && (
             <div className="mt-4 text-red-400 text-sm">Could not parse date string.</div>
           )}
        </>
      )
    },
    {
      id: 'calculator',
      title: 'Date Calculator',
      description: 'Add or subtract time from a date',
      content: (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Start Date:
              </label>
              {/* Using datetime-local which is generally well-supported */}
              <input
                type="datetime-local"
                value={calculatorDate}
                onChange={(e) => setCalculatorDate(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                // Add pattern for better mobile support if needed, though datetime-local handles format
              />
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Amount:
                </label>
                <input
                  type="number"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(e.target.value)}
                  placeholder="e.g., 5, -3"
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Unit:
                </label>
                <select
                  value={calculatorUnit}
                  onChange={(e) => setCalculatorUnit(e.target.value as any)}
                  className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>
          {/* Conditional rendering based on input validity */}
          {calculatorDate && calculatorAmount && !isNaN(new Date(calculatorDate).getTime()) && !isNaN(parseInt(calculatorAmount)) && (
            <div className="mt-4 space-y-2">
              {Object.entries(handleDateCalculation()).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
           {(calculatorDate && isNaN(new Date(calculatorDate).getTime()) || calculatorAmount && isNaN(parseInt(calculatorAmount))) && (
             <div className="mt-4 text-red-400 text-sm">Invalid start date or amount.</div>
           )}
        </>
      )
    },
    {
      id: 'timezone',
      title: 'Timezone Converter',
      description: 'Show current time in different timezones', // Description slightly adjusted
      content: (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Timezone 1:
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select timezone...</option>
                {/* Filter out potentially problematic zones if needed, but usually fine */}
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Timezone 2:
              </label>
              <select
                value={targetTimezone}
                onChange={(e) => setTargetTimezone(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select timezone...</option>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Conditional rendering */}
          {timezone && targetTimezone && (
            <div className="mt-4 space-y-2">
              {Object.entries(handleTimezoneConversion()).map(([label, value]) => (
                <div key={label}>
                  <div className="text-sm font-medium text-gray-400 mb-1">{label}:</div>
                  <div className="font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md break-words">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )
    }
  ];

  // Filtering logic remains the same
  const filteredPanels = panels.filter(panel =>
    panel.title.toLowerCase().includes(searchQuery.toLowerCase()) || // Ensure case-insensitive search
    panel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {filteredPanels.map(panel => (
        <ConversionPanel
          key={panel.id}
          title={panel.title}
          description={panel.description}
        >
          {panel.content}
        </ConversionPanel>
      ))}
      {filteredPanels.length === 0 && (
         <div className="text-gray-400 text-center py-8">No matching converters found.</div>
      )}
    </>
  );
};