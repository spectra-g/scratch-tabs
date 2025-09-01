import { 
  parse, 
  parseISO, 
  format, 
  formatDistanceToNow, 
  add, 
  sub, 
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  differenceInYears,
  differenceInMonths,
  isValid,
  getDay,
  getMonth,
  getYear,
  getHours,
  getMinutes,
  getSeconds
} from 'date-fns';
import { 
  zonedTimeToUtc, 
  utcToZonedTime, 
  format as formatTz,
  getTimezoneOffset
} from 'date-fns-tz';
import { ConversionFormats, DurationResult, TimezoneInfo, ParseResult } from '../types';

/**
 * Intelligent date parsing that handles multiple input formats
 */
export function intelligentParse(input: string): Date | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    // Strategy 1: Handle "now" and relative terms
    if (trimmed.toLowerCase() === 'now') {
      return new Date();
    }

    // Strategy 2: Unix timestamp detection (seconds or milliseconds)
    const numericInput = trimmed.replace(/[^\d]/g, '');
    if (numericInput === trimmed && numericInput.length >= 8) {
      const timestamp = parseInt(numericInput, 10);
      
      // Heuristic: if > 1e12, it's likely milliseconds; otherwise seconds
      const date = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000);
      
      if (isValid(date) && date.getFullYear() > 1970 && date.getFullYear() < 2100) {
        return date;
      }
    }

    // Strategy 3: ISO 8601 parsing
    try {
      const isoDate = parseISO(trimmed);
      if (isValid(isoDate)) {
        return isoDate;
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 4: JavaScript Date constructor (handles many formats)
    const jsDate = new Date(trimmed);
    if (isValid(jsDate) && !isNaN(jsDate.getTime())) {
      return jsDate;
    }

    // Strategy 5: Common database/log formats
    const commonFormats = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy-MM-dd HH:mm:ss.SSS',
      'yyyy/MM/dd HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss',
      'dd/MM/yyyy HH:mm:ss',
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'MMM dd, yyyy',
      'dd MMM yyyy',
      'yyyy-MM-dd\'T\'HH:mm:ss',
      'yyyy-MM-dd\'T\'HH:mm:ss.SSS'
    ];

    for (const formatString of commonFormats) {
      try {
        const parsed = parse(trimmed, formatString, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    // Strategy 6: Natural language parsing (basic implementation)
    const naturalLanguageResult = parseNaturalLanguage(trimmed);
    if (naturalLanguageResult) {
      return naturalLanguageResult;
    }

  } catch (error) {
    console.warn('Date parsing error:', error);
  }

  return null;
}

/**
 * Basic natural language date parsing
 */
function parseNaturalLanguage(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const now = new Date();

  // Handle relative terms
  if (lower === 'yesterday') {
    return sub(now, { days: 1 });
  }
  if (lower === 'tomorrow') {
    return add(now, { days: 1 });
  }

  // Handle "X ago" patterns
  const agoMatch = lower.match(/^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    
    const unitMap: Record<string, any> = {
      second: { seconds: amount },
      minute: { minutes: amount },
      hour: { hours: amount },
      day: { days: amount },
      week: { weeks: amount },
      month: { months: amount },
      year: { years: amount }
    };

    if (unitMap[unit]) {
      return sub(now, unitMap[unit]);
    }
  }

  // Handle "in X" patterns
  const inMatch = lower.match(/^in\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    
    const unitMap: Record<string, any> = {
      second: { seconds: amount },
      minute: { minutes: amount },
      hour: { hours: amount },
      day: { days: amount },
      week: { weeks: amount },
      month: { months: amount },
      year: { years: amount }
    };

    if (unitMap[unit]) {
      return add(now, unitMap[unit]);
    }
  }

  return null;
}

/**
 * Format a date into all common output formats
 */
export function formatForAllOutputs(date: Date): ConversionFormats {
  if (!isValid(date)) {
    throw new Error('Invalid date provided');
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    humanReadable: format(date, 'EEEE, MMMM d, yyyy, h:mm:ss a zzz'),
    relativeTime: formatDistanceToNow(date, { addSuffix: true }),
    iso8601: date.toISOString(),
    unixSeconds: Math.floor(date.getTime() / 1000),
    unixMilliseconds: date.getTime(),
    components: {
      year: getYear(date),
      month: getMonth(date) + 1, // date-fns uses 0-based months
      day: date.getDate(),
      hour: getHours(date),
      minute: getMinutes(date),
      second: getSeconds(date),
      dayOfWeek: dayNames[getDay(date)],
      monthName: monthNames[getMonth(date)]
    }
  };
}

/**
 * Get timezone information for multiple zones
 */
export function getTimezoneInfo(date: Date, timezones: string[]): TimezoneInfo[] {
  if (!isValid(date)) {
    return [];
  }

  return timezones.map(timezone => {
    try {
      const zonedDate = utcToZonedTime(date, timezone);
      const currentTime = utcToZonedTime(new Date(), timezone);
      
      // Get timezone offset
      const offset = getTimezoneOffset(timezone, date);
      const offsetHours = Math.floor(Math.abs(offset) / (1000 * 60 * 60));
      const offsetMinutes = Math.floor((Math.abs(offset) % (1000 * 60 * 60)) / (1000 * 60));
      const offsetSign = offset >= 0 ? '+' : '-';
      const offsetString = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

      return {
        timezone,
        currentTime: formatTz(currentTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }),
        convertedTime: formatTz(zonedDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }),
        offset: offsetString,
        isDST: isDaylightSavingTime(date, timezone)
      };
    } catch (error) {
      return {
        timezone,
        currentTime: 'Invalid timezone',
        convertedTime: 'Invalid timezone',
        offset: 'N/A',
        isDST: false
      };
    }
  });
}

/**
 * Simple DST detection
 */
function isDaylightSavingTime(date: Date, timezone: string): boolean {
  try {
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    
    const janOffset = getTimezoneOffset(timezone, january);
    const julOffset = getTimezoneOffset(timezone, july);
    const currentOffset = getTimezoneOffset(timezone, date);
    
    const stdOffset = Math.max(janOffset, julOffset);
    return currentOffset < stdOffset;
  } catch {
    return false;
  }
}

/**
 * Perform date arithmetic
 */
export function performDateArithmetic(
  baseDate: Date,
  operation: 'add' | 'subtract',
  duration: {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
  }
): Date {
  if (!isValid(baseDate)) {
    throw new Error('Invalid base date');
  }

  const fn = operation === 'add' ? add : sub;
  return fn(baseDate, duration);
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(startDate: Date, endDate: Date): DurationResult {
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid dates provided');
  }

  const years = differenceInYears(endDate, startDate);
  const months = differenceInMonths(endDate, startDate) % 12;
  const days = differenceInDays(endDate, startDate) % 365;
  const hours = differenceInHours(endDate, startDate) % 24;
  const minutes = differenceInMinutes(endDate, startDate) % 60;
  const seconds = differenceInSeconds(endDate, startDate) % 60;

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays: differenceInDays(endDate, startDate),
    totalHours: differenceInHours(endDate, startDate),
    totalMinutes: differenceInMinutes(endDate, startDate),
    totalSeconds: differenceInSeconds(endDate, startDate)
  };
}

/**
 * Cross-platform parsing simulation
 */
export function simulateCrossPlatformParsing(dateString: string): ParseResult[] {
  const results: ParseResult[] = [];

  // JavaScript
  try {
    const jsDate = new Date(dateString);
    results.push({
      language: 'JavaScript',
      success: isValid(jsDate) && !isNaN(jsDate.getTime()),
      result: isValid(jsDate) ? jsDate.toISOString() : undefined,
      error: isValid(jsDate) ? undefined : 'Invalid Date',
      code: `new Date("${dateString}")`
    });
  } catch (error) {
    results.push({
      language: 'JavaScript',
      success: false,
      error: 'Invalid Date',
      code: `new Date("${dateString}")`
    });
  }

  // Python datetime.fromisoformat
  const pythonResult = simulatePythonParsing(dateString);
  results.push(pythonResult);

  // Java Instant.parse
  const javaResult = simulateJavaParsing(dateString);
  results.push(javaResult);

  // Go time.Parse
  const goResult = simulateGoParsing(dateString);
  results.push(goResult);

  // C# DateTime.Parse
  const csharpResult = simulateCSharpParsing(dateString);
  results.push(csharpResult);

  return results;
}

function simulatePythonParsing(dateString: string): ParseResult {
  // Python's fromisoformat is strict about ISO 8601 format
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  
  if (iso8601Pattern.test(dateString)) {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return {
          language: 'Python',
          success: true,
          result: format(date, 'yyyy-MM-dd HH:mm:ss'),
          code: `datetime.fromisoformat("${dateString}")`
        };
      }
    } catch {
      // Fall through to error
    }
  }

  return {
    language: 'Python',
    success: false,
    error: 'Invalid isoformat string',
    code: `datetime.fromisoformat("${dateString}")`
  };
}

function simulateJavaParsing(dateString: string): ParseResult {
  // Java Instant.parse expects strict ISO 8601 with timezone
  const strictIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  
  if (strictIsoPattern.test(dateString)) {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return {
          language: 'Java',
          success: true,
          result: date.toISOString(),
          code: `Instant.parse("${dateString}")`
        };
      }
    } catch {
      // Fall through to error
    }
  }

  return {
    language: 'Java',
    success: false,
    error: 'DateTimeParseException: Text cannot be parsed to an Instant',
    code: `Instant.parse("${dateString}")`
  };
}

function simulateGoParsing(dateString: string): ParseResult {
  // Go's time.Parse with RFC3339 layout
  const rfc3339Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  
  if (rfc3339Pattern.test(dateString)) {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return {
          language: 'Go',
          success: true,
          result: date.toISOString(),
          code: `time.Parse(time.RFC3339, "${dateString}")`
        };
      }
    } catch {
      // Fall through to error
    }
  }

  return {
    language: 'Go',
    success: false,
    error: 'parsing time: cannot parse as RFC3339',
    code: `time.Parse(time.RFC3339, "${dateString}")`
  };
}

function simulateCSharpParsing(dateString: string): ParseResult {
  // C# DateTime.Parse is more flexible
  try {
    const date = new Date(dateString);
    if (isValid(date) && !isNaN(date.getTime())) {
      return {
        language: 'C#',
        success: true,
        result: format(date, 'yyyy-MM-dd HH:mm:ss'),
        code: `DateTime.Parse("${dateString}")`
      };
    }
  } catch {
    // Fall through to error
  }

  return {
    language: 'C#',
    success: false,
    error: 'FormatException: String was not recognized as a valid DateTime',
    code: `DateTime.Parse("${dateString}")`
  };
}

/**
 * Get popular timezone list
 */
export function getPopularTimezones(): string[] {
  return [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format date for specific timezone display
 */
export function formatForTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return 'Invalid timezone';
  }
}

/**
 * Get current time in timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  return formatForTimezone(new Date(), timezone);
}

/**
 * Debounced parsing function
 */
export function createDebouncedParser(
  callback: (result: Date | null, error: string | null) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (input: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      try {
        const result = intelligentParse(input);
        if (result) {
          callback(result, null);
        } else {
          callback(null, 'Unable to parse date/time');
        }
      } catch (error) {
        callback(null, error instanceof Error ? error.message : 'Parsing error');
      }
    }, delay);
  };
}