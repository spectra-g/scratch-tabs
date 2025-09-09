import {
  intelligentParse,
  formatForAllOutputs,
  performDateArithmetic,
  calculateDuration,
  simulateCrossPlatformParsing,
  getPopularTimezones,
  isValidTimezone
} from '../utils/dateUtils';

describe('dateUtils', () => {
  describe('intelligentParse', () => {
    it('should parse "now" as current time', () => {
      const result = intelligentParse('now');
      expect(result).toBeInstanceOf(Date);
      expect(Math.abs(result!.getTime() - Date.now())).toBeLessThan(1000);
    });

    it('should parse unix timestamps in seconds', () => {
      const timestamp = 1672531200; // 2023-01-01 00:00:00 UTC
      const result = intelligentParse(timestamp.toString());
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(timestamp * 1000);
    });

    it('should parse unix timestamps in milliseconds', () => {
      const timestamp = 1672531200000; // 2023-01-01 00:00:00 UTC
      const result = intelligentParse(timestamp.toString());
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(timestamp);
    });

    it('should parse ISO 8601 dates', () => {
      const isoString = '2023-01-01T12:00:00Z';
      const result = intelligentParse(isoString);
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should parse common database formats', () => {
      const dbFormat = '2023-01-01 12:00:00';
      const result = intelligentParse(dbFormat);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2023);
      expect(result!.getMonth()).toBe(0); // January is 0
      expect(result!.getDate()).toBe(1);
    });

    it('should parse natural language - yesterday', () => {
      const result = intelligentParse('yesterday');
      expect(result).toBeInstanceOf(Date);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if it's approximately yesterday (within same day)
      expect(result!.getDate()).toBe(yesterday.getDate());
    });

    it('should parse natural language - "3 days ago"', () => {
      const result = intelligentParse('3 days ago');
      expect(result).toBeInstanceOf(Date);
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      expect(result!.getDate()).toBe(threeDaysAgo.getDate());
    });

    it('should return null for invalid input', () => {
      expect(intelligentParse('invalid date')).toBeNull();
      expect(intelligentParse('')).toBeNull();
      expect(intelligentParse('abc123')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(intelligentParse(null as any)).toBeNull();
      expect(intelligentParse(undefined as any)).toBeNull();
      expect(intelligentParse('   ')).toBeNull();
    });
  });

  describe('formatForAllOutputs', () => {
    const testDate = new Date('2023-01-01T12:00:00Z');

    it('should format date into all required formats', () => {
      const result = formatForAllOutputs(testDate);
      
      expect(result).toHaveProperty('humanReadable');
      expect(result).toHaveProperty('relativeTime');
      expect(result).toHaveProperty('iso8601');
      expect(result).toHaveProperty('unixSeconds');
      expect(result).toHaveProperty('unixMilliseconds');
      expect(result).toHaveProperty('components');
    });

    it('should provide correct unix timestamps', () => {
      const result = formatForAllOutputs(testDate);
      
      expect(result.unixSeconds).toBe(1672574400);
      expect(result.unixMilliseconds).toBe(1672574400000);
    });

    it('should provide correct ISO 8601 format', () => {
      const result = formatForAllOutputs(testDate);
      expect(result.iso8601).toBe('2023-01-01T12:00:00.000Z');
    });

    it('should provide correct date components', () => {
      const result = formatForAllOutputs(testDate);
      
      expect(result.components.year).toBe(2023);
      expect(result.components.month).toBe(1);
      expect(result.components.day).toBe(1);
      expect(result.components.hour).toBe(12);
      expect(result.components.minute).toBe(0);
      expect(result.components.second).toBe(0);
      expect(result.components.dayOfWeek).toBe('Sunday');
      expect(result.components.monthName).toBe('January');
    });

    it('should throw error for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(() => formatForAllOutputs(invalidDate)).toThrow('Invalid date provided');
    });
  });

  describe('performDateArithmetic', () => {
    const baseDate = new Date('2023-01-01T12:00:00Z');

    it('should add time correctly', () => {
      const result = performDateArithmetic(baseDate, 'add', { days: 5, hours: 3 });
      expect(result.getDate()).toBe(6); // January 6th
      expect(result.getHours()).toBe(15); // 15:00 UTC
    });

    it('should subtract time correctly', () => {
      const result = performDateArithmetic(baseDate, 'subtract', { days: 1, hours: 2 });
      expect(result.getDate()).toBe(31); // December 31st
      expect(result.getHours()).toBe(10); // 10:00 UTC
    });

    it('should handle complex durations', () => {
      const result = performDateArithmetic(baseDate, 'add', {
        years: 1,
        months: 2,
        weeks: 1,
        days: 3,
        hours: 4,
        minutes: 30,
        seconds: 45
      });
      
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // March (0-based)
    });

    it('should throw error for invalid base date', () => {
      const invalidDate = new Date('invalid');
      expect(() => performDateArithmetic(invalidDate, 'add', { days: 1 }))
        .toThrow('Invalid base date');
    });
  });

  describe('calculateDuration', () => {
    const startDate = new Date('2023-01-01T00:00:00Z');
    const endDate = new Date('2023-01-05T12:30:45Z');

    it('should calculate duration correctly', () => {
      const result = calculateDuration(startDate, endDate);
      
      expect(result.totalDays).toBe(4);
      expect(result.totalHours).toBe(108); // 4 days * 24 + 12 hours
      expect(result.days).toBe(4);
      expect(result.hours).toBe(12);
      expect(result.minutes).toBe(30);
      expect(result.seconds).toBe(45);
    });

    it('should handle negative durations', () => {
      const result = calculateDuration(endDate, startDate);
      expect(result.totalDays).toBe(-4);
    });

    it('should throw error for invalid dates', () => {
      const invalidDate = new Date('invalid');
      expect(() => calculateDuration(invalidDate, endDate))
        .toThrow('Invalid dates provided');
    });
  });

  describe('simulateCrossPlatformParsing', () => {
    it('should simulate JavaScript parsing', () => {
      const results = simulateCrossPlatformParsing('2023-01-01T12:00:00Z');
      const jsResult = results.find(r => r.language === 'JavaScript');
      
      expect(jsResult).toBeDefined();
      expect(jsResult!.success).toBe(true);
      expect(jsResult!.code).toContain('new Date(');
    });

    it('should simulate Python parsing for valid ISO format', () => {
      const results = simulateCrossPlatformParsing('2023-01-01T12:00:00');
      const pythonResult = results.find(r => r.language === 'Python');
      
      expect(pythonResult).toBeDefined();
      expect(pythonResult!.code).toContain('datetime.fromisoformat(');
    });

    it('should show errors for invalid formats', () => {
      const results = simulateCrossPlatformParsing('invalid date');
      
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should return results for all supported languages', () => {
      const results = simulateCrossPlatformParsing('2023-01-01T12:00:00Z');
      const languages = results.map(r => r.language);
      
      expect(languages).toContain('JavaScript');
      expect(languages).toContain('Python');
      expect(languages).toContain('Java');
      expect(languages).toContain('Go');
      expect(languages).toContain('C#');
    });
  });

  describe('timezone utilities', () => {
    it('should provide popular timezones', () => {
      const timezones = getPopularTimezones();
      expect(timezones).toContain('UTC');
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('Europe/London');
      expect(timezones.length).toBeGreaterThan(10);
    });

    it('should validate timezone strings', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });
});