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
  getSeconds,
  getWeek,
  getDayOfYear,
  formatRFC7231
} from 'date-fns';
import {
  toZonedTime,
  format as formatTz,
  getTimezoneOffset
} from 'date-fns-tz';
import { ConversionFormats, DurationResult, TimezoneInfo, ParseResult } from '../types';

export type DetectedFormat = 'Unix Seconds' | 'Unix Milliseconds' | 'ISO 8601' | 'SQL Datetime' | 'Natural Language' | 'Custom Format' | 'Arithmetic';

export interface IntelligentParseResult {
  date: Date | null;
  format: DetectedFormat | null;
  arithmetic?: string;
}

/**
 * Check if a value is a valid date (either Date object or valid date string)
 */
export function isValidDateValue(value: any): boolean {
  if (!value) return false;

  // If it's already a Date object, check if it's valid
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }

  // If it's a string, try to parse it as a date
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }

  return false;
}

/**
 * Convert a value to a Date object if possible
 */
export function ensureDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a valid Date object, return it
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Intelligent date parsing that handles multiple input formats and arithmetic
 */
export function intelligentParse(input: string): IntelligentParseResult {
  if (!input || typeof input !== 'string') {
    return { date: null, format: null };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { date: null, format: null };
  }

  try {
    // Strategy 0: Handle arithmetic (e.g., now + 5d)
    const arithmeticMatch = trimmed.match(/^(.+?)\s*([+-])\s*(.+)$/);
    if (arithmeticMatch) {
      const basePart = arithmeticMatch[1].trim();
      const operator = arithmeticMatch[2] as '+' | '-';
      const durationPart = arithmeticMatch[3].trim();

      const baseResult = intelligentParse(basePart);
      if (baseResult.date) {
        const duration = parseDurationString(durationPart);
        if (duration) {
          const date = performDateArithmetic(baseResult.date, operator === '+' ? 'add' : 'subtract', duration);
          return {
            date,
            format: 'Arithmetic',
            arithmetic: `${baseResult.format} ${operator} ${durationPart}`
          };
        }
      }
    }

    // Strategy 1: Handle "now" and relative terms
    if (trimmed.toLowerCase() === 'now') {
      return { date: new Date(), format: 'Natural Language' };
    }

    // Strategy 2: Unix timestamp detection (seconds or milliseconds)
    const numericInput = trimmed.replace(/[^\d]/g, '');
    if (numericInput === trimmed && numericInput.length >= 8) {
      const timestamp = parseInt(numericInput, 10);

      // Heuristic: if > 1e12, it's likely milliseconds; otherwise seconds
      const isMs = timestamp > 1e12;
      const date = isMs ? new Date(timestamp) : new Date(timestamp * 1000);

      if (isValid(date) && date.getFullYear() > 1970 && date.getFullYear() < 2100) {
        return { date, format: isMs ? 'Unix Milliseconds' : 'Unix Seconds' };
      }
    }

    // Strategy 3: ISO 8601 parsing
    try {
      const isoDate = parseISO(trimmed);
      if (isValid(isoDate) && trimmed.includes('-') && (trimmed.includes('T') || trimmed.includes('Z'))) {
        return { date: isoDate, format: 'ISO 8601' };
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 4: Common database/log formats
    const commonFormats: { fmt: string, label: DetectedFormat }[] = [
      { fmt: 'yyyy-MM-dd HH:mm:ss', label: 'SQL Datetime' },
      { fmt: 'yyyy-MM-dd HH:mm:ss.SSS', label: 'SQL Datetime' },
      { fmt: 'yyyy/MM/dd HH:mm:ss', label: 'Custom Format' },
      { fmt: 'MM/dd/yyyy HH:mm:ss', label: 'Custom Format' },
      { fmt: 'dd/MM/yyyy HH:mm:ss', label: 'Custom Format' },
      { fmt: 'yyyy-MM-dd', label: 'ISO 8601' },
      { fmt: 'MM/dd/yyyy', label: 'Custom Format' },
      { fmt: 'dd/MM/yyyy', label: 'Custom Format' },
      { fmt: 'MMM dd, yyyy', label: 'Custom Format' },
      { fmt: 'dd MMM yyyy', label: 'Custom Format' },
      { fmt: 'yyyy-MM-dd\'T\'HH:mm:ss', label: 'ISO 8601' },
      { fmt: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS', label: 'ISO 8601' }
    ];

    for (const { fmt, label } of commonFormats) {
      try {
        const parsed = parse(trimmed, fmt, new Date());
        if (isValid(parsed)) {
          return { date: parsed, format: label };
        }
      } catch {
        continue;
      }
    }

    // Strategy 5: JavaScript Date constructor (handles many formats)
    const jsDate = new Date(trimmed);
    if (isValid(jsDate) && !isNaN(jsDate.getTime())) {
      return { date: jsDate, format: 'Custom Format' };
    }

    // Strategy 6: Natural language parsing (basic implementation)
    const naturalLanguageResult = parseNaturalLanguage(trimmed);
    if (naturalLanguageResult) {
      return { date: naturalLanguageResult, format: 'Natural Language' };
    }

  } catch {
    // Silently handle parsing errors
  }

  return { date: null, format: null };
}

/**
 * Parses duration shorthand (e.g., "5d", "12h", "2w")
 */
function parseDurationString(durationStr: string): any {
  const match = durationStr.trim().match(/^(\d+)\s*([a-z]+)$/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': case 'sec': case 'second': case 'seconds': return { seconds: amount };
    case 'm': case 'min': case 'minute': case 'minutes': return { minutes: amount };
    case 'h': case 'hr': case 'hour': case 'hours': return { hours: amount };
    case 'd': case 'day': case 'days': return { days: amount };
    case 'w': case 'wk': case 'week': case 'weeks': return { weeks: amount };
    case 'mo': case 'mon': case 'month': case 'months': return { months: amount };
    case 'y': case 'yr': case 'year': case 'years': return { years: amount };
    default: return null;
  }
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
    programming: {
      javascript: `new Date("${date.toISOString()}")`,
      python: `datetime.fromisoformat("${date.toISOString()}")`,
      go: `time.Parse(time.RFC3339, "${date.toISOString()}")`
    },
    database: {
      sql: format(date, 'yyyy-MM-dd HH:mm:ss'),
      mongo: `ISODate("${date.toISOString()}")`
    },
    web: {
      cookie: formatRFC7231(date),
      rss: format(date, 'EEE, dd MMM yyyy HH:mm:ss xx') // Simple RSS format
    },
    components: {
      year: getYear(date),
      month: getMonth(date) + 1,
      day: date.getDate(),
      dayOfYear: getDayOfYear(date),
      weekNumber: getWeek(date),
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
      const zonedDate = toZonedTime(date, timezone);
      const currentTime = toZonedTime(new Date(), timezone);

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
    } catch {
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
  } catch {
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
  callback: (result: IntelligentParseResult) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (input: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      try {
        const result = intelligentParse(input);
        callback(result);
      } catch (error) {
        callback({ date: null, format: null });
      }
    }, delay);
  };
}