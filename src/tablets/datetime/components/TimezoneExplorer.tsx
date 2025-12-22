import React, { useState, useEffect } from 'react';
import { Plus, X, Globe, Clock } from '../../../components/Icons';
import { TimezoneInfo } from '../types';
import { getTimezoneInfo, getPopularTimezones, isValidTimezone, getCurrentTimeInTimezone, isValidDateValue, ensureDate } from '../utils/dateUtils';

interface TimezoneExplorerProps {
  parsedDate: Date | null;
  selectedTimezones: string[];
  onTimezonesChange: (timezones: string[]) => void;
}

export const TimezoneExplorer: React.FC<TimezoneExplorerProps> = ({
  parsedDate,
  selectedTimezones,
  onTimezonesChange
}) => {
  const [newTimezone, setNewTimezone] = useState('');
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo[]>([]);
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  const popularTimezones = getPopularTimezones();
  const suggestions = popularTimezones.filter(tz =>
    !selectedTimezones.includes(tz) &&
    tz.toLowerCase().includes(newTimezone.toLowerCase())
  );

  // Update timezone info when date or timezones change
  useEffect(() => {
    if (isValidDateValue(parsedDate) && selectedTimezones.length > 0) {
      const validDate = ensureDate(parsedDate);
      if (validDate) {
        const info = getTimezoneInfo(validDate, selectedTimezones);
        setTimezoneInfo(info);
      } else {
        setTimezoneInfo([]);
      }
    } else {
      setTimezoneInfo([]);
    }
  }, [parsedDate, selectedTimezones]);

  // Update current times every second
  useEffect(() => {
    const updateCurrentTimes = () => {
      const times: Record<string, string> = {};
      selectedTimezones.forEach(timezone => {
        times[timezone] = getCurrentTimeInTimezone(timezone);
      });
      setCurrentTimes(times);
    };

    updateCurrentTimes();
    const interval = setInterval(updateCurrentTimes, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezones]);

  const addTimezone = (timezone: string) => {
    if (timezone && isValidTimezone(timezone) && !selectedTimezones.includes(timezone)) {
      onTimezonesChange([...selectedTimezones, timezone]);
      setNewTimezone('');
      setShowSuggestions(false);
    }
  };

  const removeTimezone = (timezone: string) => {
    onTimezonesChange(selectedTimezones.filter(tz => tz !== timezone));
  };

  const handleInputChange = (value: string) => {
    setNewTimezone(value);
    setShowSuggestions(value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTimezone) {
      addTimezone(newTimezone);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="bg-surface-secondary rounded-lg overflow-hidden border border-base">
      <div className="bg-surface-highlight/50 px-4 py-3 border-b border-base">
        <h3 className="text-lg font-semibold text-main flex items-center">
          <Globe size={18} className="mr-2" />
          Timezone Explorer
        </h3>
      </div>

      {/* Add timezone input */}
      <div className="p-4 border-b border-base">
        <div className="relative">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newTimezone}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(newTimezone.length > 0)}
                placeholder="Add timezone (e.g., America/New_York)"
                className="input-themed w-full px-3 py-2 text-main placeholder-secondary"
              />

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary border border-base rounded-md shadow-lg z-10 max-h-48 overflow-y-auto custom-scrollbar">
                  {suggestions.slice(0, 8).map(timezone => (
                    <button
                      key={timezone}
                      onClick={() => addTimezone(timezone)}
                      className="w-full text-left px-3 py-2 hover:bg-element-hover text-main text-sm"
                    >
                      {timezone}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => addTimezone(newTimezone)}
              disabled={!newTimezone || !isValidTimezone(newTimezone)}
              className="px-4 py-2 bg-primary hover:opacity-90 disabled:bg-element-disabled disabled:text-muted disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Timezone list */}
      {selectedTimezones.length > 0 && (
        <div className="divide-y divide-base">
          {selectedTimezones.map((timezone) => {
            const info = timezoneInfo.find(tz => tz.timezone === timezone);
            const currentTime = currentTimes[timezone];

            return (
              <div key={timezone} className="p-4 hover:bg-surface-highlight/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-main">{timezone}</h4>
                    {info?.isDST && (
                      <span className="px-2 py-1 bg-warning-subtle text-warning text-xs rounded border border-warning/30">
                        DST
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeTimezone(timezone)}
                    className="p-1 hover:bg-element-hover rounded transition-colors text-secondary hover:text-danger"
                    title="Remove timezone"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {info ? (
                    <div>
                      <div className="text-secondary mb-1">Your Date/Time</div>
                      <div className="text-main font-mono text-base flex items-center">
                        <Clock size={16} className="mr-2 text-primary" />
                        {info.convertedTime}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-secondary mb-1">Your Date/Time</div>
                      <div className="text-muted font-mono text-base flex items-center">
                        <Clock size={16} className="mr-2 text-muted" />
                        Enter a date above to see conversion
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-secondary mb-1">Current Time (Live)</div>
                    <div className="text-main font-mono text-sm flex items-center">
                      <Clock size={14} className="mr-2 text-success" />
                      {currentTime || 'Loading...'}
                    </div>
                  </div>
                </div>

                {info && (
                  <div className="mt-2 text-xs text-muted">
                    Offset: {info.offset}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedTimezones.length === 0 && (
        <div className="p-6 text-center">
          <Globe size={32} className="mx-auto text-muted mb-2" />
          <p className="text-secondary">Add timezones to compare times</p>
          <p className="text-muted text-sm mt-1">
            {isValidDateValue(parsedDate)
              ? "See your entered date/time across different timezones"
              : "Perfect for scheduling international meetings"
            }
          </p>
        </div>
      )}
    </div>
  );
};