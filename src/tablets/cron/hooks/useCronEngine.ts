import { useState, useEffect, useCallback, useMemo } from 'react';
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
  expression: CronExpression,
  dialect: CronDialect,
  timezone: TimeZone,
  savedPatterns: CronPattern[]
) => {
  const [humanReadable, setHumanReadable] = useState<string>('');
  const [nextExecutions, setNextExecutions] = useState<CronExecution[]>([]);
  const [validationErrors, setValidationErrors] = useState<CronValidationError[]>([]);

  // Calculate human-readable description and next executions when expression, dialect, or timezone changes
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

  // Create expression from raw string
  const createExpression = useCallback((rawExpression: string, currentDialect: CronDialect): CronExpression => {
    const parts = rawExpression.trim().split(/\s+/);
    
    let updatedExpression: CronExpression = {
      raw: rawExpression,
      minute: '*',
      hour: '*',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
      second: '0',
      year: '*'
    };
    
    // Map parts to fields based on dialect
    if (currentDialect === 'unix' || currentDialect === 'crontab') {
      // Standard 5-field cron: minute hour day-of-month month day-of-week
      if (parts.length >= 5) {
        updatedExpression.minute = parts[0];
        updatedExpression.hour = parts[1];
        updatedExpression.dayOfMonth = parts[2];
        updatedExpression.month = parts[3];
        updatedExpression.dayOfWeek = parts[4];
      }
    } else if (currentDialect === 'quartz') {
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
    } else if (currentDialect === 'spring') {
      // Spring: second minute hour day-of-month month day-of-week
      if (parts.length >= 6) {
        updatedExpression.second = parts[0];
        updatedExpression.minute = parts[1];
        updatedExpression.hour = parts[2];
        updatedExpression.dayOfMonth = parts[3];
        updatedExpression.month = parts[4];
        updatedExpression.dayOfWeek = parts[5];
      }
    } else if (currentDialect === 'aws') {
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
    
    return updatedExpression;
  }, []);

  // Create raw string from expression
  const createRawExpression = useCallback((expr: CronExpression, currentDialect: CronDialect): string => {
    let rawParts: string[] = [];
    
    if (currentDialect === 'unix' || currentDialect === 'crontab') {
      rawParts = [
        expr.minute,
        expr.hour,
        expr.dayOfMonth,
        expr.month,
        expr.dayOfWeek
      ];
    } else if (currentDialect === 'quartz') {
      rawParts = [
        expr.second || '0',
        expr.minute,
        expr.hour,
        expr.dayOfMonth,
        expr.month,
        expr.dayOfWeek,
        expr.year || '*'
      ];
    } else if (currentDialect === 'spring') {
      rawParts = [
        expr.second || '0',
        expr.minute,
        expr.hour,
        expr.dayOfMonth,
        expr.month,
        expr.dayOfWeek
      ];
    } else if (currentDialect === 'aws') {
      rawParts = [
        expr.minute,
        expr.hour,
        expr.dayOfMonth,
        expr.month,
        expr.dayOfWeek,
        expr.year || '*'
      ];
    }
    
    return rawParts.join(' ');
  }, []);

  // Update expression (returns new expression, doesn't mutate)
  const updateExpression = useCallback((newExpression: string | CronExpression) => {
    if (typeof newExpression === 'string') {
      return createExpression(newExpression, dialect);
    } else {
      // Handle structured expression update
      const updatedExpression = { ...newExpression };
      updatedExpression.raw = createRawExpression(updatedExpression, dialect);
      return updatedExpression;
    }
  }, [dialect, createExpression, createRawExpression]);

  // Update dialect (returns converted expression)
  const updateDialect = useCallback((newDialect: CronDialect) => {
    if (newDialect === dialect) return expression;
    
    // Convert expression to new dialect
    return convertBetweenDialects(expression, dialect, newDialect);
  }, [dialect, expression]);

  // Detect dialect from expression
  const detectDialect = useCallback((rawExpression: string) => {
    const detectedDialect = detectCronDialect(rawExpression);
    return detectedDialect || dialect;
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
    
    try {
      const events = nextExecutions.map(execution => ({
        start: [
          execution.date.getFullYear(),
          execution.date.getMonth() + 1,
          execution.date.getDate(),
          execution.date.getHours(),
          execution.date.getMinutes()
        ] as [number, number, number, number, number],
        duration: { minutes: 30 },
        title: `Cron Job: ${expression.raw}`,
        description: humanReadable,
        status: 'CONFIRMED' as const,
        busyStatus: 'BUSY' as const,
        organizer: { name: 'Cron Expression Builder', email: 'cron@example.com' }
      }));
      
      // Use the createEvents function with proper typing
      const result = createEvents(events as any);
      
      if (result.error || !result.value) {
        console.error('Error creating ICS file:', result.error);
        return false;
      }
      
      // Create and download the file
      const blob = new Blob([result.value], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cron-schedule-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting to ICS:', error);
      return false;
    }
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
    humanReadable,
    nextExecutions,
    validationErrors,
    updateExpression,
    updateDialect,
    detectDialect,
    savePattern,
    deletePattern,
    exportToICS,
    exportToCSV,
    exportToJSON,
    copyAllTimes
  };
};