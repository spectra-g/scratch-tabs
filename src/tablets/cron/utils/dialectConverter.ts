import { CronExpression, CronDialect } from '../types';

/**
 * Converts a cron expression from one dialect to another
 */
export function convertBetweenDialects(
  expression: CronExpression,
  fromDialect: CronDialect,
  toDialect: CronDialect
): CronExpression {
  // If dialects are the same, return the original expression
  if (fromDialect === toDialect) {
    return { ...expression };
  }

  // Create a new expression object
  const newExpression: CronExpression = {
    minute: expression.minute,
    hour: expression.hour,
    dayOfMonth: expression.dayOfMonth,
    month: expression.month,
    dayOfWeek: expression.dayOfWeek,
    second: expression.second || '0',
    year: expression.year || '*',
    raw: '' // Will be set at the end
  };

  // Handle special conversions between dialects
  
  // Convert day of week format if needed
  if ((fromDialect === 'quartz' || fromDialect === 'spring') && 
      (toDialect === 'unix' || toDialect === 'crontab')) {
    // Convert ? to * for day of week in Unix
    if (newExpression.dayOfWeek === '?') {
      newExpression.dayOfWeek = '*';
    }
    // Convert ? to * for day of month in Unix
    if (newExpression.dayOfMonth === '?') {
      newExpression.dayOfMonth = '*';
    }
  }
  
  if ((fromDialect === 'unix' || fromDialect === 'crontab') && 
      (toDialect === 'quartz' || toDialect === 'spring')) {
    // In Quartz, either day-of-month or day-of-week must be '?'
    // If both are specified, set day-of-week to '?'
    if (newExpression.dayOfMonth !== '*' && newExpression.dayOfWeek !== '*') {
      newExpression.dayOfWeek = '?';
    } else if (newExpression.dayOfMonth === '*' && newExpression.dayOfWeek === '*') {
      // If both are *, set day-of-month to ?
      newExpression.dayOfMonth = '?';
    }
  }

  // Build the raw string based on the target dialect
  let rawParts: string[] = [];
  
  switch (toDialect) {
    case 'unix':
    case 'crontab':
    case 'jenkins':
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek
      ];
      break;
      
    case 'quartz':
      rawParts = [
        newExpression.second || '0',
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || '*'
      ];
      break;
      
    case 'spring':
      rawParts = [
        newExpression.second || '0',
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek
      ];
      break;
      
    case 'aws':
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || '*'
      ];
      break;
  }
  
  newExpression.raw = rawParts.join(' ');
  
  return newExpression;
}

/**
 * Normalizes a cron expression for a specific dialect
 */
export function normalizeExpression(expression: string, dialect: CronDialect): string {
  const parts = expression.trim().split(/\s+/);
  
  // Ensure the correct number of parts for the dialect
  switch (dialect) {
    case 'unix':
    case 'crontab':
    case 'jenkins':
      // 5 parts: minute hour day-of-month month day-of-week
      if (parts.length < 5) {
        // Pad with * if needed
        while (parts.length < 5) {
          parts.push('*');
        }
      } else if (parts.length > 5) {
        // Truncate if too many
        parts.splice(5);
      }
      break;
      
    case 'quartz':
      // 6 or 7 parts: second minute hour day-of-month month day-of-week [year]
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift('0');
      }
      if (parts.length < 7) {
        // Add year field if missing
        parts.push('*');
      } else if (parts.length > 7) {
        // Truncate if too many
        parts.splice(7);
      }
      break;
      
    case 'spring':
      // 6 parts: second minute hour day-of-month month day-of-week
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift('0');
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;
      
    case 'aws':
      // 6 parts: minute hour day-of-month month day-of-week year
      if (parts.length < 6) {
        // Add year field if missing
        parts.push('*');
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;
  }
  
  return parts.join(' ');
}