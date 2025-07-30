import { convertToYaml } from '../generateYaml';

describe('convertToYaml', () => {
  it('should convert null to yaml', () => {
    expect(convertToYaml(null)).toBe('null');
  });

  it('should convert primitives to yaml', () => {
    expect(convertToYaml(123)).toBe('123');
    expect(convertToYaml(true)).toBe('true');
    expect(convertToYaml(false)).toBe('false');
    expect(convertToYaml('hello')).toBe('"hello"');
  });

  it('should convert empty array to yaml', () => {
    expect(convertToYaml([])).toBe('[]');
  });

  it('should convert empty object to yaml', () => {
    expect(convertToYaml({})).toBe('{}');
  });

  it('should convert simple array to yaml', () => {
    const input = [1, 2, 3];
    const result = convertToYaml(input);
    
    expect(result).toBe('- 1\n- 2\n- 3');
  });

  it('should convert array with mixed types to yaml', () => {
    const input = [1, 'hello', true, null];
    const result = convertToYaml(input);
    
    expect(result).toBe('- 1\n- "hello"\n- true\n- null');
  });

  it('should convert simple object to yaml', () => {
    const input = { name: 'test', value: 123 };
    const result = convertToYaml(input);
    
    expect(result).toBe('name: "test"\nvalue: 123');
  });

  it('should convert nested object to yaml with proper indentation', () => {
    const input = {
      name: 'test',
      nested: {
        value: 123,
        flag: true
      }
    };
    const result = convertToYaml(input);
    
    const expected = 'name: "test"\nnested: \n  value: 123\n  flag: true';
    expect(result).toBe(expected);
  });

  it('should convert array of objects to yaml', () => {
    const input = [
      { name: 'item1', value: 1 },
      { name: 'item2', value: 2 }
    ];
    const result = convertToYaml(input);
    
    const expected = '-   name: "item1"\n  value: 1\n-   name: "item2"\n  value: 2';
    expect(result).toBe(expected);
  });

  it('should convert object with array property to yaml', () => {
    const input = {
      name: 'test',
      items: [1, 2, 3]
    };
    const result = convertToYaml(input);
    
    const expected = 'name: "test"\nitems: \n  - 1\n  - 2\n  - 3';
    expect(result).toBe(expected);
  });

  it('should convert deeply nested structure to yaml', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            value: 'deep'
          }
        }
      }
    };
    const result = convertToYaml(input);
    
    const expected = 'level1: \n  level2: \n    level3: \n      value: "deep"';
    expect(result).toBe(expected);
  });

  it('should handle custom indentation', () => {
    const input = { name: 'test', value: 123 };
    const result = convertToYaml(input, 4);
    
    expect(result).toBe('    name: "test"\n    value: 123');
  });

  it('should convert complex mixed structure', () => {
    const input = {
      users: [
        { name: 'john', age: 30, active: true },
        { name: 'jane', age: 25, active: false }
      ],
      config: {
        debug: true,
        settings: {
          theme: 'dark',
          notifications: null
        }
      }
    };
    
    const result = convertToYaml(input);
    
    // Check that it contains expected parts
    expect(result).toContain('users:');
    expect(result).toContain('name: "john"');
    expect(result).toContain('age: 30');
    expect(result).toContain('config:');
    expect(result).toContain('debug: true');
    expect(result).toContain('theme: "dark"');
    expect(result).toContain('notifications:'); // The null appears on the next line
  });
});