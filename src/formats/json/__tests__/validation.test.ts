// Test the validateJson function in isolation
function validateJson(content: string): { isValid: boolean; error?: string } {
  if (!content.trim()) {
    return { isValid: true };
  }

  try {
    JSON.parse(content);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

describe('validateJson', () => {
  it('should return valid for empty content', () => {
    const result = validateJson('');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for whitespace-only content', () => {
    const result = validateJson('   \n\t  ');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for valid JSON object', () => {
    const result = validateJson('{"name": "test", "value": 123}');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for valid JSON array', () => {
    const result = validateJson('[1, 2, 3, "test"]');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for valid JSON primitives', () => {
    expect(validateJson('null').isValid).toBe(true);
    expect(validateJson('true').isValid).toBe(true);
    expect(validateJson('false').isValid).toBe(true);
    expect(validateJson('123').isValid).toBe(true);
    expect(validateJson('"string"').isValid).toBe(true);
  });

  it('should return invalid for malformed JSON', () => {
    const result = validateJson('{"name": "test",}');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  it('should return invalid for unclosed braces', () => {
    const result = validateJson('{"name": "test"');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return invalid for single quotes', () => {
    const result = validateJson("{'name': 'test'}");
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return invalid for unquoted keys', () => {
    const result = validateJson('{name: "test"}');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle Error objects', () => {
    // This is a bit tricky to test directly since JSON.parse throws SyntaxError
    const result = validateJson('invalid json');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });
});