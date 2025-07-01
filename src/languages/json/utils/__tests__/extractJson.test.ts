import { extractJsonFromText } from '../extractJson';

describe('extractJsonFromText', () => {
  test('extracts single JSON object', () => {
    const text = 'Some text {"name": "John", "age": 30} more text';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('{"name": "John", "age": 30}');
    expect(result[0].isStringified).toBe(false);
    expect(result[0].start).toBe(10);
  });

  test('extracts multiple JSON objects', () => {
    const text = 'First {"a": 1} then [1,2,3] finally {"b": 2}';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(3);
    expect(result[0].content).toBe('{"a": 1}');
    expect(result[1].content).toBe('[1,2,3]');
    expect(result[2].content).toBe('{"b": 2}');
  });

  test('extracts stringified JSON', () => {
    const text = 'Response: "{\\"name\\": \\"John\\", \\"age\\": 30}"';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].isStringified).toBe(true);
    expect(result[0].content).toContain('"name": "John"');
    expect(result[0].content).toContain('"age": 30');
  });

  test('extracts nested JSON objects', () => {
    const text = 'Data: {"user": {"name": "John", "details": {"age": 30}}}';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('{"user": {"name": "John", "details": {"age": 30}}}');
  });

  test('handles malformed JSON gracefully', () => {
    const text = 'Bad JSON: {name: John, age: } Good JSON: {"valid": true}';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('{"valid": true}');
  });

  test('extracts arrays', () => {
    const text = 'Array data: [{"id": 1}, {"id": 2}]';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('[{"id": 1}, {"id": 2}]');
  });

  test('returns empty array when no JSON found', () => {
    const text = 'Just some regular text without any JSON';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(0);
  });

  test('handles empty string', () => {
    const result = extractJsonFromText('');
    expect(result).toHaveLength(0);
  });

  test('avoids overlapping extracts', () => {
    const text = 'Text with {"outer": {"inner": "value"}} and separate {"key": "value"}';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('{"outer": {"inner": "value"}}');
    expect(result[1].content).toBe('{"key": "value"}');
  });

  test('handles JSON with escape sequences', () => {
    const text = 'JSON: {"message": "Hello\\nWorld\\t!"}';
    const result = extractJsonFromText(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('{"message": "Hello\\nWorld\\t!"}');
  });
}); 