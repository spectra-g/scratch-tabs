import React, { useState, useEffect } from 'react';
import { Clock } from '../../../components/Icons';

export const LiveHeader: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const epochSeconds = Math.floor(currentTime.getTime() / 1000);
  const utcTime = currentTime.toISOString();

  // Get local time with timezone offset
  const offsetMinutes = currentTime.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;

  // Create local time by subtracting the timezone offset
  const localTime = new Date(currentTime.getTime() - offsetMinutes * 60000);
  const localTimeISO = `${localTime.toISOString().slice(0, -1)}${offsetString}`;

  return (
    <div className="bg-surface-secondary border-b border-base px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock size={20} className="text-secondary" />
            <span className="text-lg font-semibold text-main">Live System Time</span>
          </div>

          <div className="flex items-center space-x-8">
            <div className="text-center">
              <div className="text-xs text-secondary uppercase tracking-wide">Epoch (s)</div>
              <div className="text-sm font-mono text-main">{epochSeconds}</div>
            </div>

            <div className="text-center">
              <div className="text-xs text-secondary uppercase tracking-wide">UTC Time</div>
              <div className="text-sm font-mono text-main">{utcTime}</div>
            </div>

            <div className="text-center">
              <div className="text-xs text-secondary uppercase tracking-wide">Local Time</div>
              <div className="text-sm font-mono text-main">{localTimeISO}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};