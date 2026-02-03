import { autoFixJson, formatFixedJson, sanitizeJson } from '../jsonAutoFix';

describe('JSON Auto-Fix', () => {
  describe('autoFixJson', () => {
    it('should return success for already valid JSON', () => {
      const validJson = '{"name": "John", "age": 30}';
      const result = autoFixJson(validJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toBe(validJson);
    });

    it('should fix missing quotes around property names', () => {
      const invalidJson = '{name: "John", age: 30}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('"name"');
      expect(result.fixedContent).toContain('"age"');
    });

    it('should fix single quotes to double quotes', () => {
      const invalidJson = "{'name': 'John', 'age': 30}";
      const result = autoFixJson(invalidJson);

      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('"name"');
      expect(result.fixedContent).toContain('"John"');
    });

    it('should preserve single quotes inside valid double-quoted strings', () => {
      const validJson = '{"name": "John\'s car", "city": "New York"}';
      const result = autoFixJson(validJson);

      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain("John's car");
      expect(result.fixedContent).not.toContain("John\"s car");
    });

    it('should preserve single quotes in values when fixing trailing comma', () => {
      const invalidJson = '{"name": "John\'s car",}';
      const result = autoFixJson(invalidJson);

      expect(result.success).toBe(true);
      // Should remove trailing comma
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
      // Should preserve single quote in value
      expect(result.fixedContent).toContain("John's car");
      expect(result.fixedContent).not.toContain("John\"s car");
    });

    it('should convert single-quote delimiters but preserve single quotes in double-quoted values', () => {
      const mixedJson = "{'name': \"John's car\", 'city': 'New York'}";
      const result = autoFixJson(mixedJson);

      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
      // Should have converted single quote delimiters to double quotes
      expect(result.fixedContent).toContain('"name"');
      expect(result.fixedContent).toContain('"city"');
      // Should preserve single quote in the value
      expect(result.fixedContent).toContain("John's car");
    });

    it('should handle multiple single quotes in string values', () => {
      const validJson = '{"text": "It\'s John\'s and Mary\'s car"}';
      const result = autoFixJson(validJson);

      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain("It's John's and Mary's car");
      // Should not convert these single quotes to double quotes
      expect(result.fixedContent).not.toContain("It\"s");
      expect(result.fixedContent).not.toContain("Mary\"s");
    });

    it('should handle escaped single quotes in string values', () => {
      const validJson = '{"name": "John\\"s car"}';
      const result = autoFixJson(validJson);

      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should fix missing commas between properties', () => {
      const invalidJson = `{
        "name": "John"
        "age": 30
      }`;
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      // Should be valid JSON after fix
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should remove trailing commas', () => {
      const invalidJson = '{"name": "John", "age": 30,}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should fix missing closing braces', () => {
      const invalidJson = '{"name": "John", "age": 30';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should fix missing closing brackets', () => {
      const invalidJson = '["item1", "item2"';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should fix missing quotes around string values', () => {
      const invalidJson = '{"name": John, "age": 30}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
      expect(result.fixedContent).toContain('"John"');
    });

    it('should not quote boolean values', () => {
      const invalidJson = '{active: true, disabled: false}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('true');
      expect(result.fixedContent).toContain('false');
      expect(result.fixedContent).not.toContain('"true"');
      expect(result.fixedContent).not.toContain('"false"');
    });

    it('should not quote null values', () => {
      const invalidJson = '{value: null}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('null');
      expect(result.fixedContent).not.toContain('"null"');
    });

    it('should not quote numeric values', () => {
      const invalidJson = '{age: 30, score: 95.5}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('30');
      expect(result.fixedContent).toContain('95.5');
      expect(result.fixedContent).not.toContain('"30"');
      expect(result.fixedContent).not.toContain('"95.5"');
    });

    it('should convert undefined to null', () => {
      const invalidJson = '{"value": undefined}';
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(result.fixedContent).toContain('null');
      expect(result.fixedContent).not.toContain('undefined');
    });

    it('should handle complex nested structures', () => {
      const invalidJson = `{
        name: "John",
        address: {
          street: "123 Main St"
          city: "New York"
        },
        hobbies: ["reading", "coding"]
      }`;
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
    });

    it('should handle empty content', () => {
      const result = autoFixJson('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No content');
    });

    it('should handle whitespace-only content', () => {
      const result = autoFixJson('   \n  \t  ');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No content');
    });

    it('should fail gracefully for completely malformed content', () => {
      const result = autoFixJson('this is not json at all!!!');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fix the specific user example with missing comma after array', () => {
      const invalidJson = `{
  "name": "Sample JSON",
  "description": "A sample JSON object with various data types",
  "isActive": true,
  "count": 42,
  "price": 19.99,
  "tags": ["sample", "json", "data"]
  "metadata": {
    "created": "2025-08-11T20:06:08.227Z",
    "version": "1.0",
    "random": 0.2687671869007664
  }
}`;
      const result = autoFixJson(invalidJson);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.fixedContent!)).not.toThrow();
      
      // Should have fixed the missing comma after the array
      expect(result.fixedContent).toContain('"tags": ["sample", "json", "data"],');
    });
  });

  describe('formatFixedJson', () => {
    it('should format valid JSON with proper indentation', () => {
      const json = '{"name":"John","age":30}';
      const formatted = formatFixedJson(json);

      expect(formatted).toContain('  "name": "John"');
      expect(formatted).toContain('  "age": 30');
    });

    it('should return original content if parsing fails', () => {
      const invalidJson = 'invalid json';
      const result = formatFixedJson(invalidJson);

      expect(result).toBe(invalidJson);
    });

    it('should format JSON with 2 spaces indentation by default', () => {
      const json = '{"name":"John","nested":{"value":123}}';
      const formatted = formatFixedJson(json);

      expect(formatted).toContain('  "name"');
      expect(formatted).toContain('  "nested"');
      expect(formatted).toContain('    "value"');
    });

    it('should format JSON with 4 spaces indentation when specified', () => {
      const json = '{"name":"John","nested":{"value":123}}';
      const formatted = formatFixedJson(json, 4);

      // Check for 4-space indentation
      const lines = formatted.split('\n');
      expect(lines[1]).toMatch(/^    "name":/); // First level: 4 spaces
      expect(lines[2]).toMatch(/^    "nested":/); // First level: 4 spaces
      expect(lines[3]).toMatch(/^        "value":/); // Second level: 8 spaces
    });
  });

  describe('sanitizeJson', () => {
    it('should return success for already valid JSON without changes', () => {
      const validJson = '{"name": "John", "age": 30}';
      const result = sanitizeJson(validJson);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(false);
      expect(result.sanitizedContent).toBe(validJson);
    });

    it('should escape null byte characters (\\u0000)', () => {
      // Simulate content copied from Postman with literal null byte
      const jsonWithNullByte = '{"value":"Milk\u0000Butter"}';
      const result = sanitizeJson(jsonWithNullByte);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      expect(result.sanitizedContent).toContain('\\u0000');
      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });

    it('should escape multiple control characters', () => {
      const jsonWithControlChars = '{"text":"Line1\u0000Line2\u0001Line3\u001fEnd"}';
      const result = sanitizeJson(jsonWithControlChars);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      expect(result.sanitizedContent).toContain('\\u0000');
      expect(result.sanitizedContent).toContain('\\u0001');
      expect(result.sanitizedContent).toContain('\\u001f');
      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });

    it('should preserve valid whitespace characters (tab, newline, carriage return)', () => {
      // JSON with properly formatted whitespace that's already valid
      const jsonWithWhitespace = '{"text":"Line1 with spaces"}';
      const result = sanitizeJson(jsonWithWhitespace);

      expect(result.success).toBe(true);
      // No control characters, so no changes made
      expect(result.changesMade).toBe(false);
      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });

    it('should format sanitized JSON', () => {
      const compactJsonWithNullByte = '{"value":"Test\u0000Data","count":5}';
      const result = sanitizeJson(compactJsonWithNullByte);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      // Should be formatted with proper indentation
      expect(result.sanitizedContent).toContain('\n');
      expect(result.sanitizedContent).toContain('  ');
    });

    it('should handle JSON arrays with control characters', () => {
      const jsonArray = '["Item1\u0000", "Item2\u0001", "Item3"]';
      const result = sanitizeJson(jsonArray);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      expect(result.sanitizedContent).toContain('\\u0000');
      expect(result.sanitizedContent).toContain('\\u0001');
      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });

    it('should handle nested objects with control characters', () => {
      const nestedJson = '{"user":{"name":"John\u0000Doe","data":{"value":"Test\u0001Data"}}}';
      const result = sanitizeJson(nestedJson);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      expect(result.sanitizedContent).toContain('\\u0000');
      expect(result.sanitizedContent).toContain('\\u0001');
      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });

    it('should handle empty content', () => {
      const result = sanitizeJson('');

      expect(result.success).toBe(false);
      expect(result.changesMade).toBe(false);
      expect(result.error).toContain('No content');
    });

    it('should handle whitespace-only content', () => {
      const result = sanitizeJson('   \n  \t  ');

      expect(result.success).toBe(false);
      expect(result.changesMade).toBe(false);
      expect(result.error).toContain('No content');
    });

    it('should handle the Postman use case: null bytes in property values', () => {
      // Real-world scenario: API returns proper JSON, but Postman displays it
      // with actual null bytes, and user copies that
      const postmanCopyPaste = '{\n  "product": "Milk\u0000Butter",\n  "quantity": 5\n}';
      const result = sanitizeJson(postmanCopyPaste);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);
      // Should properly escape the null byte
      const parsed = JSON.parse(result.sanitizedContent!);
      expect(parsed.product).toBe("Milk\u0000Butter");
      expect(parsed.quantity).toBe(5);
    });

    it('should report failure but still sanitize if JSON is malformed', () => {
      // JSON with both syntax errors AND control characters
      const malformedJson = '{name: "Test\u0000Data"}';
      const result = sanitizeJson(malformedJson);

      // Sanitization will fix control chars but not syntax errors
      expect(result.success).toBe(false);
      expect(result.changesMade).toBe(true);
      expect(result.sanitizedContent).toContain('\\u0000');
      expect(result.error).toBeDefined();
    });

    it('should handle all C0 control characters except whitespace', () => {
      // Test all control characters from 0x00-0x1F except tab, LF, CR
      const controlChars = [
        '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07',
        '\x08', /* tab */ '\x0B', '\x0C', /* LF, CR */ '\x0E', '\x0F',
        '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17',
        '\x18', '\x19', '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F'
      ].join('');

      const jsonWithAllControlChars = `{"value":"Test${controlChars}Data"}`;
      const result = sanitizeJson(jsonWithAllControlChars);

      expect(result.success).toBe(true);
      expect(result.changesMade).toBe(true);

      // Verify all are escaped - JSON.stringify uses short escapes for some chars
      expect(result.sanitizedContent).toContain('\\u0000'); // null byte
      // \x08 becomes \b (backspace), \x0C becomes \f (form feed) in JSON.stringify
      expect(result.sanitizedContent).toMatch(/\\b|\\u0008/); // backspace
      expect(result.sanitizedContent).toContain('\\u001f'); // unit separator

      // Should not contain literal control characters
      expect(result.sanitizedContent).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);

      expect(() => JSON.parse(result.sanitizedContent!)).not.toThrow();
    });
  });
});