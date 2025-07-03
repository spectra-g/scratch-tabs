import { CronDialect } from '../types';

/**
 * Detects the most likely cron dialect based on the expression format
 */
export function detectCronDialect(expression: string): CronDialect | null {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const parts = expression.trim().split(/\s+/);
  
  // Check number of fields
  switch (parts.length) {
    case 5:
      // Standard Unix cron: minute hour day-of-month month day-of-week
      return 'unix';
      
    case 6:
      // Could be Spring (with seconds) or AWS (with year)
      // Check for special characters to distinguish
      if (parts.some(part => part.includes('?'))) {
        // ? is a special character in Quartz/Spring
        return 'spring';
      }
      
      // Check if the last field looks like a year (4 digits or *)
      const lastField = parts[5];
      if (lastField === '*' || /^\d{4}$/.test(lastField) || /^\d{4}-\d{4}$/.test(lastField)) {
        return 'aws';
      }
      
      // Default to Spring if we can't determine
      return 'spring';
      
    case 7:
      // Quartz with year: second minute hour day-of-month month day-of-week year
      return 'quartz';
      
    default:
      // If we can't determine, return null
      return null;
  }
}

/**
 * Checks if an expression is valid for a specific dialect
 */
export function isValidForDialect(expression: string, dialect: CronDialect): boolean {
  if (!expression) return false;
  
  const parts = expression.trim().split(/\s+/);
  
  // Check number of fields
  switch (dialect) {
    case 'unix':
    case 'crontab':
      return parts.length === 5;
      
    case 'quartz':
      return parts.length === 6 || parts.length === 7;
      
    case 'spring':
      return parts.length === 6;
      
    case 'aws':
      return parts.length === 6;
      
    case 'jenkins':
      return parts.length === 5;
      
    default:
      return false;
  }
}

/**
 * Gets the expected number of fields for a dialect
 */
export function getFieldCountForDialect(dialect: CronDialect): number {
  switch (dialect) {
    case 'unix':
    case 'crontab':
    case 'jenkins':
      return 5;
      
    case 'quartz':
      return 7; // Can be 6 or 7, but we'll use 7 as the full form
      
    case 'spring':
    case 'aws':
      return 6;
      
    default:
      return 5;
  }
}

/**
 * Gets the field names for a dialect
 */
export function getFieldNamesForDialect(dialect: CronDialect): string[] {
  switch (dialect) {
    case 'unix':
    case 'crontab':
    case 'jenkins':
      return ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
      
    case 'quartz':
      return ['Second', 'Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week', 'Year'];
      
    case 'spring':
      return ['Second', 'Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
      
    case 'aws':
      return ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week', 'Year'];
      
    default:
      return ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
  }
}