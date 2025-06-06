// Mock the random number generator to make theme selection deterministic
const mockRandomInt = jest.fn(() => 0); // Always returns 0, selecting the 'user' theme
jest.mock('../json', () => {
  const originalModule = jest.requireActual('../json');
  return {
    ...originalModule,
    // This requires a bit of a trick to mock a non-exported function.
    // We can't do it directly. Instead, we mock a dependency of the function.
    // In this case, we'll mock the randomInt call inside generateThemeBasedJson
    // by mocking Math.random which it depends on.
  };
});
global.Math.random = () => 0; // Force randomInt(0, 5) to be 0

// Mock external dependencies at the top level
jest.mock('@faker-js/faker', () => ({
  faker: {
    string: {
      uuid: jest.fn(() => 'mock-uuid'),
      alphanumeric: jest.fn(() => 'mock-sku'),
    },
    person: {
      firstName: jest.fn(() => 'John'),
      lastName: jest.fn(() => 'Doe'),
      fullName: jest.fn(() => 'John Doe'),
      jobTitle: jest.fn(() => 'Developer'),
      jobArea: jest.fn(() => 'IT'),
      bio: jest.fn(() => 'A mock bio.'),
    },
    internet: {
      email: jest.fn(() => 'john.doe@example.com'),
      url: jest.fn(() => 'https://example.com'),
      username: jest.fn(() => 'johndoe'),
    },
    image: {
      avatar: jest.fn(() => 'https://example.com/avatar.png'),
      url: jest.fn(() => 'https://example.com/image.png'),
      urlLoremFlickr: jest.fn(() => 'https://example.com/food.png'),
    },
    location: {
      streetAddress: jest.fn(() => '123 Main St'),
      city: jest.fn(() => 'Anytown'),
      state: jest.fn(() => 'CA'),
      country: jest.fn(() => 'USA'),
      zipCode: jest.fn(() => '12345'),
      latitude: jest.fn(() => 40.7128),
      longitude: jest.fn(() => -74.0060),
      timeZone: jest.fn(() => 'America/New_York'),
    },
    phone: {
      number: jest.fn(() => '555-123-4567'),
    },
    company: {
      name: jest.fn(() => 'Mock Inc.'),
      catchPhrase: jest.fn(() => 'Making mocks great again.'),
    },
    helpers: {
      arrayElement: jest.fn(arr => arr[0]),
      arrayElements: jest.fn((arr, count) => arr.slice(0, (count as { min: number, max: number })?.min ?? 1)),
      slugify: jest.fn(str => str.toLowerCase().replace(/\s+/g, '-')),
    },
    datatype: {
      boolean: jest.fn(() => true),
    },
    number: {
      int: jest.fn(() => 42),
      float: jest.fn(() => 123.45),
    },
    date: {
      past: jest.fn(() => new Date('2023-01-01T00:00:00.000Z')),
      future: jest.fn(() => new Date('2025-01-01T00:00:00.000Z')),
      recent: jest.fn(() => new Date('2024-01-01T00:00:00.000Z')),
      soon: jest.fn(() => new Date('2024-02-01T00:00:00.000Z')),
    },
    commerce: {
      department: jest.fn(() => 'Electronics'),
      productName: jest.fn(() => 'Mock Product'),
      productDescription: jest.fn(() => 'A great mock product.'),
      price: jest.fn(() => '99.99'),
    },
    finance: {
      currencyCode: jest.fn(() => 'USD'),
    },
    lorem: {
      sentence: jest.fn(() => 'Lorem ipsum dolor sit amet.'),
      paragraph: jest.fn(() => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
      paragraphs: jest.fn(() => 'Lorem ipsum dolor sit amet.\nConsectetur adipiscing elit.'),
      words: jest.fn(() => 'mock words'),
    },
    color: {
      human: jest.fn(() => 'blue'),
      rgb: jest.fn(() => '#ffffff'),
    }
  },
}));

jest.mock('../json/validation', () => ({
  registerJsonValidationProvider: jest.fn(),
}));

jest.mock('../json/StatusItem', () => ({
  JsonStatusItem: () => 'JsonStatusItem',
}));

jest.mock('../json/JsonOptionsMenu', () => ({
  JsonOptionsMenu: () => 'JsonOptionsMenu',
}));

import { JsonLanguageDetector } from '../json';
import { registerJsonValidationProvider } from '../json/validation';

describe('JsonLanguageDetector', () => {
  let detector: JsonLanguageDetector;
  let originalMathRandom: any;

  beforeAll(() => {
    originalMathRandom = Math.random;
    // Force Math.random to be deterministic for theme selection
    Math.random = () => 0.1; // Will always pick the first theme ('user')
  });

  afterAll(() => {
    Math.random = originalMathRandom; // Restore original Math.random
  });

  beforeEach(() => {
    detector = new JsonLanguageDetector();
    (registerJsonValidationProvider as jest.Mock).mockClear();
  });

  describe('Sample Content', () => {
    test('should provide valid fallback sample content', () => {
      const sample = detector.sampleContent();
      expect(sample).toContain('"name": "Sample JSON"');
      let parsed;
      expect(() => { parsed = JSON.parse(sample) }).not.toThrow();
      expect(parsed).toHaveProperty('isActive', true);
    });

    test('should preload a dynamic sample and return it on next call', async () => {
      const fallbackSample = detector.sampleContent();
      expect(fallbackSample).toContain('"name": "Sample JSON"');

      await new Promise(res => setTimeout(res, 100));

      const dynamicSample = detector.sampleContent();
      expect(dynamicSample).toContain('"id": "mock-uuid"');
      let parsed;
      expect(() => { parsed = JSON.parse(dynamicSample) }).not.toThrow();

      expect(parsed.users).toBeDefined();
      expect(Array.isArray(parsed.users)).toBe(true);
      expect(parsed.users.length).toBeGreaterThan(0);
      expect(parsed.users[0].name.first).toBe('John');
    });
  });

  describe('Basic Properties', () => {
    test('should have correct basic properties', () => {
      expect(detector.id).toBe('json');
      expect(detector.name).toBe('JSON');
      expect(detector.extensions).toEqual(['json', 'jsonc', 'geojson', 'tfstate', 'topojson', 'jsonl']);
      expect(detector.priority).toBe(7);
    });

    test('should return correct file extension', () => {
      expect(detector.getFileExtension()).toBe('json');
    });
  });

  describe('Detection Logic', () => {
    test('should detect valid JSON object with high confidence', () => {
      const validJson = `{
        "name": "Test",
        "value": 123,
        "active": true,
        "tags": ["a", "b"],
        "nested": { "key": "value" }
      }`;
      const result = detector.detect(validJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should detect valid JSON array with high confidence', () => {
      const validJsonArray = `[
        { "id": 1, "item": "one" },
        { "id": 2, "item": "two" }
      ]`;
      const result = detector.detect(validJsonArray);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should detect partial JSON object while typing', () => {
      const partialJson = `{
        "name": "Test",
        "value": 123,
        "active": t`;
      const result = detector.detect(partialJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    test('should detect partial JSON array while typing', () => {
      const partialJson = `[
        { "id": 1, "item": "one" },
        { "id": 2, `;
      const result = detector.detect(partialJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    test('should have reduced confidence for invalid JSON (e.g., trailing comma)', () => {
      const invalidJson = `{ "key": "value", }`;
      const result = detector.detect(invalidJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test('should have reduced confidence for JSON with comments (JSONC)', () => {
      const jsonc = `{
        // This is a comment
        "key": "value"
      }`;
      const result = detector.detect(jsonc);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test('should handle empty or very short content', () => {
      expect(detector.detect('').match).toBe(false);
      expect(detector.detect('   ').match).toBe(false);
      // FIX: Single characters are too short to be definitively JSON.
      expect(detector.detect('{').match).toBe(false);
      expect(detector.detect('{}').match).toBe(true);
      expect(detector.detect('[]').match).toBe(true);
    });

    test('should reject non-JSON structured text (like YAML)', () => {
      const yamlContent = `
key: value
list:
  - item1
  - item2
      `;
      const result = detector.detect(yamlContent);
      expect(result.match).toBe(false);
    });

    test('should reject plain text', () => {
      const text = 'This is just a regular sentence that does not look like JSON.';
      const result = detector.detect(text);
      expect(result.match).toBe(false);
    });

    test('should reject code-like content', () => {
      const jsCode = 'const x = { "key": "value" }; function test() { return x; }';
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test('should reject HTML/XML content', () => {
      const html = '<div><p>Hello</p></div>';
      const result = detector.detect(html);
      expect(result.match).toBe(false);
    });

    test('should reject if it does not start with { or [', () => {
      const text = ' "key": "value" }';
      const result = detector.detect(text);
      expect(result.match).toBe(false);
    });
  });

  describe('UI Components', () => {
    test('should return a status item component', () => {
      const StatusItem = detector.getStatusItem!();
      expect(StatusItem).toBeDefined();
      expect(typeof StatusItem).toBe('function');
    });

    test('should return an options menu component', () => {
      const OptionsMenu = detector.getOptionsMenu!();
      expect(OptionsMenu).toBeDefined();
      expect(typeof OptionsMenu).toBe('function');
    });
  });

  describe('Monaco Provider Registration', () => {
    test('should register monaco provider without errors', () => {
      const mockMonaco = {
        languages: {},
        editor: {}
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
      expect(registerJsonValidationProvider).toHaveBeenCalledWith(mockMonaco);
      expect(registerJsonValidationProvider).toHaveBeenCalledTimes(1);
    });
  });
});
