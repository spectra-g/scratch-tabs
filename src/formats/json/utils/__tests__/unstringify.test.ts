import { unstringifyJson } from '../unstringify';

describe('unstringifyJson', () => {
  it('should unstringify a valid stringified JSON object', () => {
    const input = '"{\\\"name\\\":\\\"test\\\",\\\"value\\\":123}"';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual({ name: 'test', value: 123 });
  });

  it('should unstringify a valid stringified JSON array', () => {
    const input = '"[1,2,3]"';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual([1, 2, 3]);
  });

  it('should handle already parsed JSON object', () => {
    const input = '{"name":"test","value":123}';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual({ name: 'test', value: 123 });
  });

  it('should handle already parsed JSON array', () => {
    const input = '[1,2,3]';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual([1, 2, 3]);
  });

  it('should format the output with proper indentation', () => {
    const input = '"{\\\"name\\\":\\\"test\\\",\\\"nested\\\":{\\\"value\\\":123}}"';
    const result = unstringifyJson(input);
    
    expect(result).toContain('  "name": "test"');
    expect(result).toContain('  "nested": {');
    expect(result).toContain('    "value": 123');
  });

  it('should handle missing opening quote', () => {
    const input = '{\\\"name\\\":\\\"test\\\"}"';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual({ name: 'test' });
  });

  it('should handle missing closing quote', () => {
    const input = '"{\\\"name\\\":\\\"test\\\"}"'.slice(0, -1); // Remove last quote
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual({ name: 'test' });
  });

  it('should throw error for invalid JSON', () => {
    expect(() => unstringifyJson('invalid json')).toThrow('Input is not valid JSON or stringified JSON.');
  });

  it('should throw error for string that is not stringified JSON', () => {
    expect(() => unstringifyJson('"just a regular string"')).toThrow('Input is not valid JSON or stringified JSON.');
  });

  it('should handle nested stringified JSON', () => {
    const input = '"{\\\"data\\\":\\\"{\\\\\\\"nested\\\\\\\":true}\\\"}"';
    const result = unstringifyJson(input);
    const parsed = JSON.parse(result);
    
    expect(parsed).toEqual({ data: '{"nested":true}' });
  });

  it('should handle primitive values', () => {
    const numberInput = '123';
    const numberResult = unstringifyJson(numberInput);
    expect(JSON.parse(numberResult)).toBe(123);

    const boolInput = 'true';
    const boolResult = unstringifyJson(boolInput);
    expect(JSON.parse(boolResult)).toBe(true);

    const nullInput = 'null';
    const nullResult = unstringifyJson(nullInput);
    expect(JSON.parse(nullResult)).toBe(null);
  });
});