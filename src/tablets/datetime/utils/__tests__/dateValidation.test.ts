import { isValidDateValue, ensureDate } from '../dateUtils';

describe('Date Validation Utilities', () => {
  describe('isValidDateValue', () => {
    test('should return true for valid Date objects', () => {
      const validDate = new Date('2036-12-05T20:35:12.000Z');
      expect(isValidDateValue(validDate)).toBe(true);
    });

    test('should return false for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(isValidDateValue(invalidDate)).toBe(false);
    });

    test('should return true for valid date strings', () => {
      expect(isValidDateValue('2036-12-05T20:35:12.000Z')).toBe(true);
      expect(isValidDateValue('2023-01-01')).toBe(true);
    });

    test('should return false for invalid date strings', () => {
      expect(isValidDateValue('invalid date')).toBe(false);
      expect(isValidDateValue('2023-13-45')).toBe(false);
    });

    test('should return false for null/undefined/empty values', () => {
      expect(isValidDateValue(null)).toBe(false);
      expect(isValidDateValue(undefined)).toBe(false);
      expect(isValidDateValue('')).toBe(false);
    });

    test('should return false for non-date types', () => {
      expect(isValidDateValue(123)).toBe(false);
      expect(isValidDateValue({})).toBe(false);
      expect(isValidDateValue([])).toBe(false);
    });
  });

  describe('ensureDate', () => {
    test('should return Date object unchanged if valid', () => {
      const validDate = new Date('2036-12-05T20:35:12.000Z');
      const result = ensureDate(validDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(validDate.getTime());
    });

    test('should convert valid date strings to Date objects', () => {
      const result = ensureDate('2036-12-05T20:35:12.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2036-12-05T20:35:12.000Z');
    });

    test('should return null for invalid inputs', () => {
      expect(ensureDate('invalid date')).toBeNull();
      expect(ensureDate(null)).toBeNull();
      expect(ensureDate(undefined)).toBeNull();
      expect(ensureDate(123)).toBeNull();
    });

    test('should return null for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(ensureDate(invalidDate)).toBeNull();
    });
  });
});

// Test the specific scenario from the error
describe('Real-world scenario', () => {
  test('should handle serialized date strings from state', () => {
    // This is what we're getting from the state
    const serializedDateString = "2036-12-05T20:35:12.000Z";
    
    expect(isValidDateValue(serializedDateString)).toBe(true);
    
    const convertedDate = ensureDate(serializedDateString);
    expect(convertedDate).toBeInstanceOf(Date);
    expect(convertedDate.toISOString()).toBe(serializedDateString);
  });
});