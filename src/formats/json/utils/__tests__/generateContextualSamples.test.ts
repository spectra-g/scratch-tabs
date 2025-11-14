import { generateContextualSamples, SampleQuery } from '../generateContextualSamples';

describe('generateContextualSamples', () => {
  describe('Array of objects', () => {
    it('should generate samples for simple array of objects', () => {
      const json = JSON.stringify([
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 },
      ]);

      const samples = generateContextualSamples(json);

      expect(samples.length).toBeGreaterThan(0);
      expect(samples.length).toBeLessThanOrEqual(7);

      // Should have "Get first item"
      expect(samples.some((s) => s.query === '[0]')).toBe(true);

      // Should project first property (id)
      expect(samples.some((s) => s.query === '[*].id')).toBe(true);

      // Should have a filter example (id is numeric, should be first numeric property)
      expect(samples.some((s) => s.query.includes('[?id'))).toBe(true);

      // Should have array length
      expect(samples.some((s) => s.query === 'length(@)')).toBe(true);
    });

    it('should handle properties with special characters', () => {
      const json = JSON.stringify([
        { 'first-name': 'John', 'user id': 1 },
      ]);

      const samples = generateContextualSamples(json);

      // Properties with special chars should be quoted
      expect(samples.some((s) => s.query.includes('"first-name"'))).toBe(true);
    });

    it('should handle boolean properties in filters', () => {
      const json = JSON.stringify([
        { active: true, name: 'John' },
        { active: false, name: 'Jane' },
      ]);

      const samples = generateContextualSamples(json);

      // Should have boolean filter (active is first property with boolean value)
      expect(samples.some((s) => s.query.includes('[?active==`true`]'))).toBe(true);
    });

    it('should handle string properties in filters', () => {
      const json = JSON.stringify([
        { status: 'active', name: 'John' },
        { status: 'inactive', name: 'Jane' },
      ]);

      const samples = generateContextualSamples(json);

      // Should have string filter (status is first property with string value)
      expect(samples.some((s) => s.query.includes('[?status=='))).toBe(true);
    });

    it('should generate multi-field projection for objects with 2+ fields', () => {
      const json = JSON.stringify([
        { id: 1, name: 'John', age: 30 },
      ]);

      const samples = generateContextualSamples(json);

      // Should have projection with first two fields
      expect(samples.some((s) => s.query.includes('[*].{'))).toBe(true);
    });

    it('should handle empty array', () => {
      const json = JSON.stringify([]);

      const samples = generateContextualSamples(json);

      // Should return generic samples
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should handle array of primitives', () => {
      const json = JSON.stringify([1, 2, 3, 4, 5]);

      const samples = generateContextualSamples(json);

      // Should have basic array operations
      expect(samples.some((s) => s.query === '[0]')).toBe(true);
      expect(samples.some((s) => s.query === 'length(@)')).toBe(true);
    });
  });

  describe('Object (not array)', () => {
    it('should generate samples for simple object', () => {
      const json = JSON.stringify({
        name: 'John',
        age: 30,
      });

      const samples = generateContextualSamples(json);

      expect(samples.length).toBeGreaterThan(0);

      // Should access first property
      expect(samples.some((s) => s.query === 'name')).toBe(true);

      // Should have keys() query
      expect(samples.some((s) => s.query === 'keys(@)')).toBe(true);
    });

    it('should handle object with nested array', () => {
      const json = JSON.stringify({
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
      });

      const samples = generateContextualSamples(json);

      // Should have query for nested array
      expect(samples.some((s) => s.query === 'users[*]')).toBe(true);

      // Should have projection from nested array
      expect(samples.some((s) => s.query === 'users[*].id')).toBe(true);
    });

    it('should handle object with property names containing special chars', () => {
      const json = JSON.stringify({
        'first-name': 'John',
        'last name': 'Doe',
      });

      const samples = generateContextualSamples(json);

      // Property with dash should be quoted
      expect(samples.some((s) => s.query.includes('"first-name"'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      const samples = generateContextualSamples(invalidJson);

      // Should return generic samples as fallback
      expect(samples.length).toBeGreaterThan(0);
      expect(samples.some((s) => s.query === '[0]')).toBe(true);
    });

    it('should handle null', () => {
      const json = JSON.stringify(null);

      const samples = generateContextualSamples(json);

      // Should return generic samples
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should handle primitive value', () => {
      const json = JSON.stringify(42);

      const samples = generateContextualSamples(json);

      // Should return generic samples
      expect(samples.length).toBeGreaterThan(0);
    });

    it('should limit samples to maximum of 7', () => {
      const json = JSON.stringify([
        {
          field1: 1,
          field2: 'test',
          field3: true,
          field4: 'value',
          field5: 10,
          field6: false,
          field7: 'data',
          field8: 100,
        },
      ]);

      const samples = generateContextualSamples(json);

      expect(samples.length).toBeLessThanOrEqual(7);
    });

    it('should truncate very long property names', () => {
      const longPropName = 'a'.repeat(100);
      const json = JSON.stringify({
        [longPropName]: 'value',
      });

      const samples = generateContextualSamples(json);

      // Should truncate property name
      const sample = samples.find((s) => s.query.includes('a'));
      expect(sample).toBeDefined();
      expect(sample!.query.length).toBeLessThan(100);
    });
  });

  describe('Sample structure', () => {
    it('should return samples with required properties', () => {
      const json = JSON.stringify([{ name: 'John' }]);

      const samples = generateContextualSamples(json);

      samples.forEach((sample: SampleQuery) => {
        expect(sample).toHaveProperty('label');
        expect(sample).toHaveProperty('query');
        expect(sample).toHaveProperty('description');
        expect(typeof sample.label).toBe('string');
        expect(typeof sample.query).toBe('string');
        expect(typeof sample.description).toBe('string');
        expect(sample.label.length).toBeGreaterThan(0);
        expect(sample.query.length).toBeGreaterThan(0);
        expect(sample.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Generic samples fallback', () => {
    it('should return generic samples for unparseable content', () => {
      const samples = generateContextualSamples('not json at all');

      expect(samples.length).toBe(7);
      expect(samples.some((s) => s.label === 'Get first item')).toBe(true);
      expect(samples.some((s) => s.label === 'Get all names')).toBe(true);
      expect(samples.some((s) => s.label === 'Array length')).toBe(true);
    });
  });
});
