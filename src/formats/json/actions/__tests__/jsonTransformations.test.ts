import { 
  toCamelCase, 
  toSnakeCase, 
  toKebabCase, 
  transformKeys,
  transformJsonKeys 
} from '../jsonTransformations';

describe('String transformations', () => {
  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('snake_case')).toBe('snakeCase');
      expect(toCamelCase('multi_word_string')).toBe('multiWordString');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('kebab-case')).toBe('kebabCase');
      expect(toCamelCase('multi-word-string')).toBe('multiWordString');
    });

    it('should handle mixed separators', () => {
      expect(toCamelCase('mixed_case-string')).toBe('mixedCaseString');
    });

    it('should leave camelCase unchanged', () => {
      expect(toCamelCase('camelCase')).toBe('camelCase');
      expect(toCamelCase('alreadyCamelCase')).toBe('alreadyCamelCase');
    });

    it('should handle single words', () => {
      expect(toCamelCase('word')).toBe('word');
    });

    it('should handle empty strings', () => {
      expect(toCamelCase('')).toBe('');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('camelCase')).toBe('camel_case');
      expect(toSnakeCase('multiWordString')).toBe('multi_word_string');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('PascalCase')).toBe('pascal_case');
      expect(toSnakeCase('MultiWordString')).toBe('multi_word_string');
    });

    it('should leave snake_case unchanged', () => {
      expect(toSnakeCase('snake_case')).toBe('snake_case');
      expect(toSnakeCase('already_snake_case')).toBe('already_snake_case');
    });

    it('should handle single words', () => {
      expect(toSnakeCase('word')).toBe('word');
      expect(toSnakeCase('Word')).toBe('word');
    });

    it('should handle empty strings', () => {
      expect(toSnakeCase('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case');
      expect(toKebabCase('multiWordString')).toBe('multi-word-string');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('PascalCase')).toBe('pascal-case');
      expect(toKebabCase('MultiWordString')).toBe('multi-word-string');
    });

    it('should convert snake_case to kebab-case', () => {
      expect(toKebabCase('snake_case')).toBe('snake-case');
      expect(toKebabCase('multi_word_string')).toBe('multi-word-string');
    });

    it('should leave kebab-case unchanged', () => {
      expect(toKebabCase('kebab-case')).toBe('kebab-case');
      expect(toKebabCase('already-kebab-case')).toBe('already-kebab-case');
    });

    it('should handle single words', () => {
      expect(toKebabCase('word')).toBe('word');
      expect(toKebabCase('Word')).toBe('word');
    });

    it('should handle empty strings', () => {
      expect(toKebabCase('')).toBe('');
    });

    // Edge cases that might be problematic
    it('should handle properties already containing dashes', () => {
      expect(toKebabCase('already-has-dashes')).toBe('already-has-dashes');
      expect(toKebabCase('api-key')).toBe('api-key');
      expect(toKebabCase('user-id')).toBe('user-id');
    });

    it('should handle mixed case with existing dashes', () => {
      expect(toKebabCase('API-Key')).toBe('api-key');
      expect(toKebabCase('User-ID')).toBe('user-id');
      expect(toKebabCase('myAPI-Key')).toBe('my-api-key');
    });

    it('should handle consecutive capital letters', () => {
      expect(toKebabCase('XMLHttpRequest')).toBe('xml-http-request');
      expect(toKebabCase('HTMLParser')).toBe('html-parser');
      expect(toKebabCase('JSONData')).toBe('json-data');
    });
  });

  describe('toSnakeCase edge cases', () => {
    it('should handle properties already containing underscores', () => {
      expect(toSnakeCase('already_has_underscores')).toBe('already_has_underscores');
      expect(toSnakeCase('api_key')).toBe('api_key');
      expect(toSnakeCase('user_id')).toBe('user_id');
    });

    it('should handle mixed case with existing underscores', () => {
      expect(toSnakeCase('API_Key')).toBe('api_key');
      expect(toSnakeCase('User_ID')).toBe('user_id');
      expect(toSnakeCase('myAPI_Key')).toBe('my_api_key');
    });

    it('should handle consecutive capital letters', () => {
      expect(toSnakeCase('XMLHttpRequest')).toBe('xml_http_request');
      expect(toSnakeCase('HTMLParser')).toBe('html_parser');
      expect(toSnakeCase('JSONData')).toBe('json_data');
    });

    it('should handle kebab-case conversion', () => {
      expect(toSnakeCase('kebab-case')).toBe('kebab_case');
      expect(toSnakeCase('api-key')).toBe('api_key');
    });
  });

  describe('toCamelCase edge cases', () => {
    it('should handle multiple consecutive separators', () => {
      expect(toCamelCase('multiple--dashes')).toBe('multipleDashes');
      expect(toCamelCase('multiple__underscores')).toBe('multipleUnderscores');
      expect(toCamelCase('mixed_-separators')).toBe('mixedSeparators');
    });

    it('should handle leading and trailing separators', () => {
      expect(toCamelCase('-leading-dash')).toBe('leadingDash');
      expect(toCamelCase('_leading_underscore')).toBe('leadingUnderscore');
      expect(toCamelCase('trailing-dash-')).toBe('trailingDash');
      expect(toCamelCase('trailing_underscore_')).toBe('trailingUnderscore');
    });

    it('should preserve already camelCase properties', () => {
      expect(toCamelCase('alreadyCamelCase')).toBe('alreadyCamelCase');
      expect(toCamelCase('somePropertyName')).toBe('somePropertyName');
    });
  });
});

describe('Object transformations', () => {
  describe('transformKeys', () => {
    it('should transform object keys', () => {
      const input = { firstName: 'John', lastName: 'Doe' };
      const result = transformKeys(input, toSnakeCase);
      
      expect(result).toEqual({ first_name: 'John', last_name: 'Doe' });
    });

    it('should transform nested object keys', () => {
      const input = {
        userName: 'john',
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };
      const result = transformKeys(input, toSnakeCase);
      
      expect(result).toEqual({
        user_name: 'john',
        user_info: {
          first_name: 'John',
          last_name: 'Doe'
        }
      });
    });

    it('should transform array of objects', () => {
      const input = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' }
      ];
      const result = transformKeys(input, toSnakeCase);
      
      expect(result).toEqual([
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' }
      ]);
    });

    it('should handle primitive values', () => {
      expect(transformKeys('string', toSnakeCase)).toBe('string');
      expect(transformKeys(123, toSnakeCase)).toBe(123);
      expect(transformKeys(true, toSnakeCase)).toBe(true);
      expect(transformKeys(null, toSnakeCase)).toBe(null);
    });

    it('should handle empty objects and arrays', () => {
      expect(transformKeys({}, toSnakeCase)).toEqual({});
      expect(transformKeys([], toSnakeCase)).toEqual([]);
    });
  });

  describe('transformJsonKeys', () => {
    it('should transform JSON string keys to camelCase', () => {
      const input = '{"first_name": "John", "last_name": "Doe"}';
      const result = transformJsonKeys(input, toCamelCase);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('should transform nested JSON keys', () => {
      const input = '{"user_name": "john", "user_info": {"first_name": "John", "last_name": "Doe"}}';
      const result = transformJsonKeys(input, toCamelCase);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        userName: 'john',
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });
    });

    it('should format output with proper indentation', () => {
      const input = '{"first_name": "John", "last_name": "Doe"}';
      const result = transformJsonKeys(input, toCamelCase);
      
      expect(result).toContain('  "firstName": "John"');
      expect(result).toContain('  "lastName": "Doe"');
    });

    it('should handle arrays in JSON', () => {
      const input = '[{"first_name": "John"}, {"first_name": "Jane"}]';
      const result = transformJsonKeys(input, toCamelCase);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual([
        { firstName: 'John' },
        { firstName: 'Jane' }
      ]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => transformJsonKeys('invalid json', toCamelCase)).toThrow();
    });
  });
});