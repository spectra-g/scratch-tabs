import { autoFixJson, formatFixedJson } from '../jsonAutoFix';

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
  });
});