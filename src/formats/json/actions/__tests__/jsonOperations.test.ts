import {
  formatJson,
  minifyJson,
  sortJsonKeys,
  flattenJson,
  unflattenJson,
  removeEmptyValues,
  removeComments,
  stringifyJson,
  unstringifyJsonContent
} from '../jsonOperations';

describe('JSON Operations', () => {
  describe('formatJson', () => {
    it('should format minified JSON with proper indentation', () => {
      const input = '{"name":"test","value":123}';
      const result = formatJson(input);
      
      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should format already formatted JSON', () => {
      const input = '{\n  "name": "test",\n  "value": 123\n}';
      const result = formatJson(input);
      
      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => formatJson('invalid json')).toThrow();
    });
  });

  describe('minifyJson', () => {
    it('should minify formatted JSON', () => {
      const input = '{\n  "name": "test",\n  "value": 123\n}';
      const result = minifyJson(input);
      
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should minify already minified JSON', () => {
      const input = '{"name":"test","value":123}';
      const result = minifyJson(input);
      
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => minifyJson('invalid json')).toThrow();
    });
  });

  describe('sortJsonKeys', () => {
    it('should sort object keys alphabetically', () => {
      const input = '{"zebra": 1, "apple": 2, "banana": 3}';
      const result = sortJsonKeys(input);
      const parsed = JSON.parse(result);
      
      expect(Object.keys(parsed)).toEqual(['apple', 'banana', 'zebra']);
    });

    it('should sort nested object keys', () => {
      const input = '{"zebra": {"delta": 1, "alpha": 2}, "apple": 3}';
      const result = sortJsonKeys(input);
      const parsed = JSON.parse(result);
      
      expect(Object.keys(parsed)).toEqual(['apple', 'zebra']);
      expect(Object.keys(parsed.zebra)).toEqual(['alpha', 'delta']);
    });

    it('should handle arrays by sorting their object elements', () => {
      const input = '[{"zebra": 1, "apple": 2}, {"delta": 3, "beta": 4}]';
      const result = sortJsonKeys(input);
      const parsed = JSON.parse(result);
      
      expect(Object.keys(parsed[0])).toEqual(['apple', 'zebra']);
      expect(Object.keys(parsed[1])).toEqual(['beta', 'delta']);
    });

    it('should handle null values', () => {
      const input = '{"zebra": null, "apple": 2}';
      const result = sortJsonKeys(input);
      const parsed = JSON.parse(result);
      
      expect(Object.keys(parsed)).toEqual(['apple', 'zebra']);
      expect(parsed.zebra).toBe(null);
    });
  });

  describe('flattenJson', () => {
    it('should flatten nested object', () => {
      const input = '{"user": {"name": "John", "age": 30}, "active": true}';
      const result = flattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        'user.name': 'John',
        'user.age': 30,
        'active': true
      });
    });

    it('should flatten deeply nested object', () => {
      const input = '{"level1": {"level2": {"level3": {"value": "deep"}}}}';
      const result = flattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        'level1.level2.level3.value': 'deep'
      });
    });

    it('should preserve arrays in flattened object', () => {
      const input = '{"user": {"tags": ["admin", "user"]}, "count": 2}';
      const result = flattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        'user.tags': ['admin', 'user'],
        'count': 2
      });
    });

    it('should throw error for non-object input', () => {
      expect(() => flattenJson('[1, 2, 3]')).toThrow('Flatten requires a JSON object.');
      expect(() => flattenJson('"string"')).toThrow('Flatten requires a JSON object.');
      expect(() => flattenJson('123')).toThrow('Flatten requires a JSON object.');
    });
  });

  describe('unflattenJson', () => {
    it('should unflatten flat object', () => {
      const input = '{"user.name": "John", "user.age": 30, "active": true}';
      const result = unflattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        user: { name: 'John', age: 30 },
        active: true
      });
    });

    it('should unflatten deeply nested flat object', () => {
      const input = '{"level1.level2.level3.value": "deep"}';
      const result = unflattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        level1: { level2: { level3: { value: 'deep' } } }
      });
    });

    it('should handle mixed flat and non-flat keys', () => {
      const input = '{"user.name": "John", "tags": ["admin"], "config.debug": true}';
      const result = unflattenJson(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        user: { name: 'John' },
        tags: ['admin'],
        config: { debug: true }
      });
    });

    it('should throw error for non-object input', () => {
      expect(() => unflattenJson('[1, 2, 3]')).toThrow('Unflatten requires a flat JSON object.');
    });
  });

  describe('removeEmptyValues', () => {
    it('should remove null values', () => {
      const input = '{"name": "John", "age": null, "active": true}';
      const result = removeEmptyValues(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ name: 'John', active: true });
    });

    it('should remove undefined values and empty strings', () => {
      const input = '{"name": "John", "nickname": "", "active": true}';
      const result = removeEmptyValues(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ name: 'John', active: true });
    });

    it('should remove empty objects and arrays', () => {
      const input = '{"name": "John", "metadata": {}, "tags": [], "active": true}';
      const result = removeEmptyValues(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ name: 'John', active: true });
    });

    it('should recursively remove empty values from nested objects', () => {
      const input = '{"user": {"name": "John", "temp": null}, "config": {"debug": true}}';
      const result = removeEmptyValues(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        user: { name: 'John' },
        config: { debug: true }
      });
    });

    it('should handle arrays by filtering out empty values', () => {
      const input = '[{"name": "John"}, {"name": null}, {"active": true}]';
      const result = removeEmptyValues(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual([{ name: 'John' }, { active: true }]);
    });
  });

  describe('removeComments', () => {
    it('should remove single-line comments', () => {
      const input = '{\n  "name": "test", // this is a comment\n  "value": 123\n}';
      const result = removeComments(input);
      
      expect(result).not.toContain('// this is a comment');
      expect(result).toContain('"name": "test"');
    });

    it('should remove multi-line comments', () => {
      const input = '{\n  "name": "test", /* multi\n line comment */\n  "value": 123\n}';
      const result = removeComments(input);
      
      expect(result).not.toContain('/* multi');
      expect(result).not.toContain('line comment */');
      expect(result).toContain('"name": "test"');
    });

    it('should handle mixed comment types', () => {
      const input = '{\n  "name": "test", // single line\n  /* multi line */\n  "value": 123\n}';
      const result = removeComments(input);
      
      expect(result).not.toContain('// single line');
      expect(result).not.toContain('/* multi line */');
    });

    it('should preserve strings that look like comments', () => {
      const input = '{"comment": "This // is not a comment", "url": "https://example.com"}';
      const result = removeComments(input);
      
      expect(result).toContain('This // is not a comment');
      expect(result).toContain('https://example.com');
    });
  });

  describe('stringifyJson', () => {
    it('should stringify valid JSON', () => {
      const input = '{"name": "test", "value": 123}';
      const result = stringifyJson(input);
      
      expect(result).toBe('"{\\\"name\\\": \\\"test\\\", \\\"value\\\": 123}"');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => stringifyJson('invalid json')).toThrow('Cannot stringify invalid JSON');
    });

    it('should handle already stringified JSON', () => {
      const input = '{"already": "valid"}';
      const result = stringifyJson(input);
      
      expect(typeof JSON.parse(result)).toBe('string');
    });
  });

  describe('unstringifyJsonContent', () => {
    it('should unstringify JSON content', () => {
      const input = '"{\\\"name\\\": \\\"test\\\"}"';
      const result = unstringifyJsonContent(input);
      
      expect(result).toContain('"name": "test"');
    });

    it('should handle complex stringified JSON', () => {
      const input = '"{\\\"user\\\": {\\\"name\\\": \\\"John\\\", \\\"age\\\": 30}}"';
      const result = unstringifyJsonContent(input);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ user: { name: 'John', age: 30 } });
    });
  });
});