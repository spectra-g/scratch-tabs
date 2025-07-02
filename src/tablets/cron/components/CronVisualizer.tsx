import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { CronDialect, TimeZone } from '../types';
import parser from 'cron-parser';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface CronVisualizerProps {
  expression: string;
  dialect: CronDialect;
  timezone: TimeZone;
  onClose: () => void;
}

export const CronVisualizer: React.FC<CronVisualizerProps> = ({
  expression,
  dialect,
  timezone,
  onClose
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [executionDates, setExecutionDates] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  // Calculate execution dates for the current month
  useEffect(() => {
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      // Configure parser options based on dialect
      const options: parser.ParserOptions = {
        currentDate: start,
        endDate: end,
        tz: timezone.name
      };
      
      // Handle different dialects
      if (dialect === 'quartz') {
        options.iterator = true;
        options.utc = timezone.type === 'utc';
      }
      
      const interval = parser.parseExpression(expression, options);
      const dates: Date[] = [];
      
      let next;
      try {
        while ((next = interval.next()) && next.toDate() <= end) {
          dates.push(next.toDate());
        }
      } catch (e) {
        // Reached the end of the interval
      }
      
      setExecutionDates(dates);
    } catch (error) {
      console.error('Error parsing cron expression for visualization:', error);
      setExecutionDates([]);
    }
  }, [expression, dialect, timezone, currentMonth]);
  
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Generate calendar days
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  // Get day of week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  
  // Create empty cells for days before the first day of the month
  const emptyCells = Array.from({ length: firstDayOfWeek }, (_, i) => (
    <div key={`empty-${i}`} className="h-10 bg-gray-800/50"></div>
  ));
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-3xl w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <Calendar size={20} className="text-blue-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-200">Cron Visualizer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-medium text-gray-200">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'month'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'week'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'day'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Day
              </button>
            </div>
          </div>
          
          {viewMode === 'month' && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {emptyCells}
                {days.map((day) => {
                  const execsOnDay = executionDates.filter(exec => isSameDay(exec, day));
                  const hasExecutions = execsOnDay.length > 0;
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-20 p-1 rounded ${
                        hasExecutions
                          ? 'bg-blue-900/20 border border-blue-500/30'
                          : 'bg-gray-800/50 border border-gray-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-300">
                          {format(day, 'd')}
                        </span>
                        {hasExecutions && (
                          <span className="text-xs bg-blue-500/30 text-blue-300 px-1.5 rounded-full">
                            {execsOnDay.length}
                          </span>
                        )}
                      </div>
                      
                      {hasExecutions && (
                        <div className="mt-1 space-y-1 overflow-y-auto max-h-14 custom-scrollbar">
                          {execsOnDay.slice(0, 3).map((exec, i) => (
                            <div key={i} className="text-xs text-blue-400 truncate">
                              {format(exec, 'HH:mm:ss')}
                            </div>
                          ))}
                          {execsOnDay.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{execsOnDay.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {viewMode === 'week' && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="space-y-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
                  const execsOnDay = executionDates.filter(exec => exec.getDay() === i);
                  
                  return (
                    <div key={day} className="flex items-start">
                      <div className="w-24 text-sm font-medium text-gray-300 py-1">{day}</div>
                      <div className="flex-1 ml-2">
                        {execsOnDay.length === 0 ? (
                          <div className="text-xs text-gray-500 py-1">No executions</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {execsOnDay.slice(0, 10).map((exec, j) => (
                              <div key={j} className="text-xs bg-blue-900/20 border border-blue-500/30 rounded px-2 py-1 text-blue-400">
                                {format(exec, 'HH:mm:ss')}
                              </div>
                            ))}
                            {execsOnDay.length > 10 && (
                              <div className="text-xs text-gray-400 py-1">
                                +{execsOnDay.length - 10} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {viewMode === 'day' && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="space-y-2">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i;
                  const execsInHour = executionDates.filter(exec => exec.getHours() === hour);
                  
                  return (
                    <div key={hour} className="flex items-start">
                      <div className="w-16 text-sm font-medium text-gray-300 py-1">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1 ml-2">
                        {execsInHour.length === 0 ? (
                          <div className="text-xs text-gray-500 py-1">No executions</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {execsInHour.slice(0, 10).map((exec, j) => (
                              <div key={j} className="text-xs bg-blue-900/20 border border-blue-500/30 rounded px-2 py-1 text-blue-400">
                                {format(exec, 'HH:mm:ss')} - {format(exec, 'dd MMM')}
                              </div>
                            ))}
                            {execsInHour.length > 10 && (
                              <div className="text-xs text-gray-400 py-1">
                                +{execsInHour.length - 10} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-700/50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                <span className="font-medium">Total executions:</span>{' '}
                <span className="text-blue-400">{executionDates.length}</span> in {format(currentMonth, 'MMMM yyyy')}
              </div>
              <div className="text-xs text-gray-400">
                Timezone: {timezone.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};