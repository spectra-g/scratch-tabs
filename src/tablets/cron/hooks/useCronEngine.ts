import { useState, useEffect, useCallback } from 'react';
import parser from 'cron-parser';
import cronstrue from 'cronstrue';
import { format, addMonths } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { createEvents } from 'ics';
import { CronExpression, CronDialect, CronValidationError, CronExecution, TimeZone, CronPattern } from '../types';
import { detectCronDialect } from '../utils/dialectDetector';
import { validateCronExpression } from '../utils/validator';
import { convertBetweenDialects } from '../utils/dialectConverter';

export const useCronEngine = (
  initialExpression: CronExpression,
  initialDialect: CronDialect,
  initialTimezone: TimeZone,
  savedPatterns: CronPattern[]
) => {
  const [expression, setExpression] = useState<CronExpression>(initialExpression);
  const [dialect, setDialect] = useState<CronDialect>(initialDialect);
  const [timezone, setTimezone] = useState<TimeZone>(initialTimezone);
  const [humanReadable, setHumanReadable] = useState<string>('');
  const [nextExecutions, setNextExecutions] = useState<CronExecution[]>([]);
  const [validationErrors, setValidationErrors] = useState<CronValidationError[]>([]);

  // Update human-readable description and next executions when expression or dialect changes
  useEffect(() => {
    try {
      // Update human-readable description
      let description = '';
      try {
        // Use cronstrue to generate human-readable description
        const options: any = {};
        
        // Set options based on dialect
        if (dialect === 'quartz') {
          options.use24HourTimeFormat = true;
          options.verbose = true;
        }
        
        description = cronstrue.toString(expression.raw, options);
      } catch (error) {
        description = 'Invalid cron expression';
      }
      setHumanReadable(description);

      // Calculate next executions
      const executions: CronExecution[] = [];
      try {
        // Configure parser options based on dialect
        const options: parser.ParserOptions = {
          currentDate: new Date(),
          tz: timezone.name
        };

        // Handle different dialects
        if (dialect === 'quartz') {
          options.iterator = true;
          options.utc = timezone.type === 'utc';
        }

        const interval = parser.parseExpression(expression.raw, options);
        
        // Get next 20 executions
        for (let i = 0; i < 20; i++) {
          const next = interval.next();
          if (next) {
            const date = next.toDate();
            const formatted = formatInTimeZone(
              date,
              timezone.name,
              'yyyy-MM-dd HH:mm:ss'
            );
            executions.push({ date, formatted });
          }
        }
      } catch (error) {
        // Handle parsing errors
        console.error('Error parsing cron expression:', error);
      }
      
      setNextExecutions(executions);

      // Validate expression
      const errors = validateCronExpression(expression, dialect);
      setValidationErrors(errors);
      
    } catch (error) {
      console.error('Error in cron engine:', error);
    }
  }, [expression, dialect, timezone]);

  // Update expression
  const updateExpression = useCallback((newExpression: string | CronExpression) => {
    if (typeof newExpression === 'string') {
      // Parse the raw string into a structured expression
      const parts = newExpression.trim().split(/\s+/);
      
      let updatedExpression: CronExpression = {
        raw: newExpression,
        minute: '*',
        hour: '*',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '*',
        second: '0',
        year: '*'
      };
      
      // Map parts to fields based on dialect
      if (dialect === 'unix' || dialect === 'crontab') {
        // Standard 5-field cron: minute hour day-of-month month day-of-week
        if (parts.length >= 5) {
          updatedExpression.minute = parts[0];
          updatedExpression.hour = parts[1];
          updatedExpression.dayOfMonth = parts[2];
          updatedExpression.month = parts[3];
          updatedExpression.dayOfWeek = parts[4];
        }
      } else if (dialect === 'quartz') {
        // Quartz: second minute hour day-of-month month day-of-week [year]
        if (parts.length >= 6) {
          updatedExpression.second = parts[0];
          updatedExpression.minute = parts[1];
          updatedExpression.hour = parts[2];
          updatedExpression.dayOfMonth = parts[3];
          updatedExpression.month = parts[4];
          updatedExpression.dayOfWeek = parts[5];
          if (parts.length >= 7) {
            updatedExpression.year = parts[6];
          }
        }
      } else if (dialect === 'spring') {
        // Spring: second minute hour day-of-month month day-of-week
        if (parts.length >= 6) {
          updatedExpression.second = parts[0];
          updatedExpression.minute = parts[1];
          updatedExpression.hour = parts[2];
          updatedExpression.dayOfMonth = parts[3];
          updatedExpression.month = parts[4];
          updatedExpression.dayOfWeek = parts[5];
        }
      } else if (dialect === 'aws') {
        // AWS: minute hour day-of-month month day-of-week year
        if (parts.length >= 6) {
          updatedExpression.minute = parts[0];
          updatedExpression.hour = parts[1];
          updatedExpression.dayOfMonth = parts[2];
          updatedExpression.month = parts[3];
          updatedExpression.dayOfWeek = parts[4];
          updatedExpression.year = parts[5];
        }
      }
      
      setExpression(updatedExpression);
    } else {
      // Handle structured expression update
      const updatedExpression = { ...newExpression };
      
      // Reconstruct raw string based on dialect
      let rawParts: string[] = [];
      
      if (dialect === 'unix' || dialect === 'crontab') {
        rawParts = [
          updatedExpression.minute,
          updatedExpression.hour,
          updatedExpression.dayOfMonth,
          updatedExpression.month,
          updatedExpression.dayOfWeek
        ];
      } else if (dialect === 'quartz') {
        rawParts = [
          updatedExpression.second || '0',
          updatedExpression.minute,
          updatedExpression.hour,
          updatedExpression.dayOfMonth,
          updatedExpression.month,
          updatedExpression.dayOfWeek,
          updatedExpression.year || '*'
        ];
      } else if (dialect === 'spring') {
        rawParts = [
          updatedExpression.second || '0',
          updatedExpression.minute,
          updatedExpression.hour,
          updatedExpression.dayOfMonth,
          updatedExpression.month,
          updatedExpression.dayOfWeek
        ];
      } else if (dialect === 'aws') {
        rawParts = [
          updatedExpression.minute,
          updatedExpression.hour,
          updatedExpression.dayOfMonth,
          updatedExpression.month,
          updatedExpression.dayOfWeek,
          updatedExpression.year || '*'
        ];
      }
      
      updatedExpression.raw = rawParts.join(' ');
      setExpression(updatedExpression);
    }
  }, [dialect]);

  // Update dialect
  const updateDialect = useCallback((newDialect: CronDialect) => {
    if (newDialect === dialect) return;
    
    // Convert expression to new dialect
    const convertedExpression = convertBetweenDialects(expression, dialect, newDialect);
    setDialect(newDialect);
    setExpression(convertedExpression);
  }, [dialect, expression]);

  // Update timezone
  const updateTimezone = useCallback((newTimezone: TimeZone) => {
    setTimezone(newTimezone);
  }, []);

  // Detect dialect from expression
  const detectDialect = useCallback((rawExpression: string) => {
    const detectedDialect = detectCronDialect(rawExpression);
    if (detectedDialect && detectedDialect !== dialect) {
      setDialect(detectedDialect);
      return detectedDialect;
    }
    return dialect;
  }, [dialect]);

  // Save pattern
  const savePattern = useCallback((name: string, description?: string): CronPattern => {
    const newPattern: CronPattern = {
      id: Date.now().toString(),
      name,
      expression: expression.raw,
      dialect,
      description
    };
    return newPattern;
  }, [expression, dialect]);

  // Delete pattern
  const deletePattern = useCallback((id: string) => {
    // This function just returns the ID to be deleted
    // The actual deletion happens in the parent component
    return id;
  }, []);

  // Export to ICS (iCalendar)
  const exportToICS = useCallback(() => {
    if (nextExecutions.length === 0) return null;
    
    const events = nextExecutions.map(execution => ({
      start: [
        execution.date.getFullYear(),
        execution.date.getMonth() + 1,
        execution.date.getDate(),
        execution.date.getHours(),
        execution.date.getMinutes()
      ],
      duration: { minutes: 30 },
      title: `Cron Job: ${expression.raw}`,
      description: humanReadable,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'Cron Expression Builder', email: 'cron@example.com' }
    }));
    
    createEvents(events, (error, value) => {
      if (error) {
        console.error('Error creating ICS file:', error);
        return;
      }
      
      // Create and download the file
      const blob = new Blob([value], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cron-schedule-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    
    return true;
  }, [nextExecutions, expression.raw, humanReadable]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (nextExecutions.length === 0) return null;
    
    const headers = ['Date', 'Time', 'Timezone', 'Expression'];
    const rows = nextExecutions.map(execution => [
      format(execution.date, 'yyyy-MM-dd'),
      format(execution.date, 'HH:mm:ss'),
      timezone.name,
      expression.raw
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cron-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  }, [nextExecutions, expression.raw, timezone.name]);

  // Export to JSON
  const exportToJSON = useCallback(() => {
    if (nextExecutions.length === 0) return null;
    
    const data = {
      expression: expression.raw,
      dialect,
      timezone: timezone.name,
      humanReadable,
      executions: nextExecutions.map(execution => ({
        date: execution.date.toISOString(),
        formatted: execution.formatted
      }))
    };
    
    // Create and download the file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cron-schedule-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  }, [nextExecutions, expression.raw, dialect, timezone.name, humanReadable]);

  // Copy all times
  const copyAllTimes = useCallback(() => {
    if (nextExecutions.length === 0) return false;
    
    const text = nextExecutions.map(execution => execution.formatted).join('\n');
    navigator.clipboard.writeText(text);
    return true;
  }, [nextExecutions]);

  return {
    expression,
    dialect,
    timezone,
    humanReadable,
    nextExecutions,
    validationErrors,
    updateExpression,
    updateDialect,
    updateTimezone,
    detectDialect,
    savePattern,
    deletePattern,
    exportToICS,
    exportToCSV,
    exportToJSON,
    copyAllTimes
  };
};