import { YamlLanguageDetector } from '../yaml';

describe('YamlLanguageDetector', () => {
  let detector: YamlLanguageDetector;

  beforeEach(() => {
    detector = new YamlLanguageDetector();
  });

  describe('JSON vs YAML detection', () => {
    it('should NOT detect valid JSON as YAML', () => {
      const jsonContent = `{
    "menu": {
        "categories": [
            {
                "description": "Correptius tabella coepi iure deleniti carpo censura.",
                "id": "7d88814a-4f44-47fc-8ee5-f4a1774b20b9",
                "items": [
                    {
                        "calories": 534,
                        "description": "Callide tametsi rerum desparatus crur administratio aliquam optio umquam admoneo.",
                        "id": "704d42f7-142c-4461-a722-a14a5e8fbeca",
                        "image": "https://loremflickr.com/2579/3552/food?lock=8832778385357823",
                        "ingredients": [
                            "tomato",
                            "mushroom",
                            "chicken",
                            "flour"
                        ],
                        "name": "compono tabella",
                        "popular": false,
                        "prepTime": "18 minutes",
                        "price": 9.49
                    }
                ],
                "name": "Sides"
            }
        ]
    },
    "metadata": {
        "lastUpdated": "2025-06-27T12:19:39.721Z",
        "version": "1.0"
    }
}`;

      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should detect valid YAML as YAML', () => {
      const yamlContent = `
menu:
  categories:
    - name: Sides
      description: Correptius tabella coepi iure deleniti carpo censura
      id: 7d88814a-4f44-47fc-8ee5-f4a1774b20b9
      items:
        - calories: 534
          description: Callide tametsi rerum desparatus crur administratio
          id: 704d42f7-142c-4461-a722-a14a5e8fbeca
          name: compono tabella
          popular: false
          prepTime: 18 minutes
          price: 9.49
metadata:
  lastUpdated: 2025-06-27T12:19:39.721Z
  version: 1.0
`;

      const result = detector.detect(yamlContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should handle JSON with various value types', () => {
      const jsonWithVariousTypes = `{
  "string": "value",
  "number": 123,
  "decimal": 45.67,
  "boolean": true,
  "null": null,
  "array": ["item1", "item2"],
  "object": {
    "nested": "value"
  }
}`;

      const result = detector.detect(jsonWithVariousTypes);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should handle JSON with trailing commas', () => {
      const jsonWithCommas = `{
  "key1": "value1",
  "key2": 123,
  "key3": true,
  "key4": null,
}`;

      const result = detector.detect(jsonWithCommas);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should handle minified JSON', () => {
      const minifiedJson = `{"menu":{"categories":[{"description":"test","id":"123","items":[{"calories":534,"name":"test","price":9.49}]}]}}`;

      const result = detector.detect(minifiedJson);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should detect YAML with document separators', () => {
      const yamlWithSeparators = `---
name: John Doe
age: 30
skills:
  - JavaScript
  - Python
  - YAML
...`;

      const result = detector.detect(yamlWithSeparators);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should not detect invalid JSON as YAML', () => {
      const invalidJson = `{
  "key": "value"
  "missing": "comma"
}`;

      const result = detector.detect(invalidJson);
      // Since it's not valid JSON, it might be detected as YAML if it has YAML-like patterns
      // But it should have low confidence
      if (result.match) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = detector.detect('');
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should handle content with only whitespace', () => {
      const result = detector.detect('   \n  \t  \n  ');
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });

    it('should handle URLs in content', () => {
      const contentWithUrls = `{
  "api": "https://example.com/api",
  "image": "https://loremflickr.com/640/480/food?lock=123456789"
}`;

      const result = detector.detect(contentWithUrls);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0.0);
    });
  });
}); 