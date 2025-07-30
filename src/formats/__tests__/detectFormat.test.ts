import { detectFormat, getPotentialFormatMatches } from '../index';

describe('Format Detection', () => {
  describe('detectFormat function', () => {
    test('detects regular JSON object', () => {
      const content = '{"name": "John", "age": 30}';
      const result = detectFormat(content);
      
      console.log('Regular JSON detection result:', result);
      expect(result).toBe('json');
    });

    test('detects regular JSON array', () => {
      const content = '[{"name": "John"}, {"name": "Jane"}]';
      const result = detectFormat(content);
      
      console.log('JSON array detection result:', result);
      expect(result).toBe('json');
    });

    test('detects stringified JSON object - the failing case', () => {
      const content = '"{\\\"name\\\":\\\"John Doe\\\",\\\"age\\\":30,\\\"isStudent\\\":false,\\\"courses\\\":[{\\\"id\\\":1,\\\"name\\\":\\\"History\\\"},{\\\"id\\\":2,\\\"name\\\":\\\"Math\\\"}]}"';
      
      console.log('Testing stringified JSON:', content);
      const result = detectFormat(content);
      const matches = getPotentialFormatMatches(content, 5);
      
      console.log('Stringified JSON detection result:', result);
      console.log('All potential matches:', matches);
      expect(result).toBe('json');
    });

    test('detects simple stringified JSON', () => {
      const content = '"{\\\"name\\\":\\\"test\\\",\\\"value\\\":123}"';
      
      console.log('Testing simple stringified JSON:', content);
      const result = detectFormat(content);
      const matches = getPotentialFormatMatches(content, 5);
      
      console.log('Simple stringified JSON detection result:', result);
      console.log('Simple stringified JSON potential matches:', matches);
      expect(result).toBe('json');
    });

//     test('correctly identifies CSV content', () => {
//       const content = 'name,age,city\nJohn,30,New York\nJane,25,Boston';
//       const result = detectFormat(content);
//
//       console.log('CSV detection result:', result);
//       expect(result).toBe('csv');
//     });
  });
});