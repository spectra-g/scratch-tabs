// Mock the random number generator to make theme selection deterministic
jest.mock("../json", () => {
  const originalModule = jest.requireActual("../json");
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
jest.mock("@faker-js/faker", () => ({
  faker: {
    string: {
      uuid: jest.fn(() => "mock-uuid"),
      alphanumeric: jest.fn(() => "mock-sku"),
    },
    person: {
      firstName: jest.fn(() => "John"),
      lastName: jest.fn(() => "Doe"),
      fullName: jest.fn(() => "John Doe"),
      jobTitle: jest.fn(() => "Developer"),
      jobArea: jest.fn(() => "IT"),
      bio: jest.fn(() => "A mock bio."),
    },
    internet: {
      email: jest.fn(() => "john.doe@example.com"),
      url: jest.fn(() => "https://example.com"),
      username: jest.fn(() => "johndoe"),
    },
    image: {
      avatar: jest.fn(() => "https://example.com/avatar.png"),
      url: jest.fn(() => "https://example.com/image.png"),
      urlLoremFlickr: jest.fn(() => "https://example.com/food.png"),
    },
    location: {
      streetAddress: jest.fn(() => "123 Main St"),
      city: jest.fn(() => "Anytown"),
      state: jest.fn(() => "CA"),
      country: jest.fn(() => "USA"),
      zipCode: jest.fn(() => "12345"),
      latitude: jest.fn(() => 40.7128),
      longitude: jest.fn(() => -74.006),
      timeZone: jest.fn(() => "America/New_York"),
    },
    phone: {
      number: jest.fn(() => "555-123-4567"),
    },
    company: {
      name: jest.fn(() => "Mock Inc."),
      catchPhrase: jest.fn(() => "Making mocks great again."),
    },
    helpers: {
      arrayElement: jest.fn((arr) => arr[0]),
      arrayElements: jest.fn((arr, count) =>
        arr.slice(0, (count as { min: number; max: number })?.min ?? 1),
      ),
      slugify: jest.fn((str) => str.toLowerCase().replace(/\s+/g, "-")),
    },
    datatype: {
      boolean: jest.fn(() => true),
    },
    number: {
      int: jest.fn(() => 42),
      float: jest.fn(() => 123.45),
    },
    date: {
      past: jest.fn(() => new Date("2023-01-01T00:00:00.000Z")),
      future: jest.fn(() => new Date("2025-01-01T00:00:00.000Z")),
      recent: jest.fn(() => new Date("2024-01-01T00:00:00.000Z")),
      soon: jest.fn(() => new Date("2024-02-01T00:00:00.000Z")),
    },
    commerce: {
      department: jest.fn(() => "Electronics"),
      productName: jest.fn(() => "Mock Product"),
      productDescription: jest.fn(() => "A great mock product."),
      price: jest.fn(() => "99.99"),
    },
    finance: {
      currencyCode: jest.fn(() => "USD"),
    },
    lorem: {
      sentence: jest.fn(() => "Lorem ipsum dolor sit amet."),
      paragraph: jest.fn(
        () => "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      ),
      paragraphs: jest.fn(
        () => "Lorem ipsum dolor sit amet.\nConsectetur adipiscing elit.",
      ),
      words: jest.fn(() => "mock words"),
    },
    color: {
      human: jest.fn(() => "blue"),
      rgb: jest.fn(() => "#ffffff"),
    },
  },
}));

jest.mock("../json/validation", () => ({
  registerJsonValidationProvider: jest.fn(),
}));

jest.mock("../json/StatusItem", () => ({
  JsonStatusItem: () => "JsonStatusItem",
}));

jest.mock("../json/JsonOptionsMenu", () => ({
  JsonOptionsMenu: () => "JsonOptionsMenu",
}));

import { JsonFormatDetector } from "../json";
import { registerJsonValidationProvider } from "../json/validation";

describe("JsonFormatDetector", () => {
  let detector: JsonFormatDetector;
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
    detector = new JsonFormatDetector();
    (registerJsonValidationProvider as jest.Mock).mockClear();
  });

  describe("Sample Content", () => {
    test("should provide valid random fallback sample content", () => {
      const sample = detector.sampleContent();
      let parsed;
      expect(() => {
        parsed = JSON.parse(sample);
      }).not.toThrow();
      
      // Should be valid JSON with some common structure
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
      
      // Should contain a timestamp (all themes have this)
      expect(sample).toMatch(/"timestamp"|"generated"|"updated"|"lastLogin"/);
    });

    test("should generate valid random fallback content", () => {
      const sample = detector.sampleContent();
      
      // Should be valid JSON
      expect(() => JSON.parse(sample)).not.toThrow();
      
      // Should contain timestamp indicating fresh generation
      expect(sample).toMatch(/"timestamp"|"generated"|"updated"|"lastLogin"/);
      
      // Should be one of the expected fallback themes
      const parsed = JSON.parse(sample);
      const hasUsersTheme = 'users' in parsed;
      const hasProductTheme = 'product' in parsed;
      const hasVersionTheme = 'version' in parsed;
      const hasAnalyticsTheme = 'analytics' in parsed;
      const hasProfileTheme = 'profile' in parsed;
      
      expect(hasUsersTheme || hasProductTheme || hasVersionTheme || hasAnalyticsTheme || hasProfileTheme).toBe(true);
    });

    test("should preload a dynamic sample and return it on next call", async () => {
      // Clear any existing preloaded sample
      const fallbackSample = detector.sampleContent();
      expect(() => JSON.parse(fallbackSample)).not.toThrow();

      await new Promise((res) => setTimeout(res, 100));

      const dynamicSample = detector.sampleContent();
      expect(dynamicSample).toContain('"id": "mock-uuid"');
      let parsed;
      expect(() => {
        parsed = JSON.parse(dynamicSample);
      }).not.toThrow();

      expect(parsed.users).toBeDefined();
      expect(Array.isArray(parsed.users)).toBe(true);
      expect(parsed.users.length).toBeGreaterThan(0);
      expect(parsed.users[0].name.first).toBe("John");
    });
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("json");
      expect(detector.name).toBe("JSON");
      expect(detector.extensions).toEqual([
        "json",
        "jsonc",
        "geojson",
        "tfstate",
        "topojson",
        "jsonl",
      ]);
      expect(detector.priority).toBe(7);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("json");
    });
  });

  describe("Detection Logic", () => {
    test("should detect valid JSON object with high confidence", () => {
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

    test("should detect valid JSON array with high confidence", () => {
      const validJsonArray = `[
        { "id": 1, "item": "one" },
        { "id": 2, "item": "two" }
      ]`;
      const result = detector.detect(validJsonArray);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect partial JSON object while typing", () => {
      const partialJson = `{
        "name": "Test",
        "value": 123,
        "active": t`;
      const result = detector.detect(partialJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    test("should detect partial JSON array while typing", () => {
      const partialJson = `[
        { "id": 1, "item": "one" },
        { "id": 2, `;
      const result = detector.detect(partialJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    test("should have reduced confidence for invalid JSON (e.g., trailing comma)", () => {
      const invalidJson = `{ "key": "value", }`;
      const result = detector.detect(invalidJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test("should have reduced confidence for JSON with comments (JSONC)", () => {
      const jsonc = `{
        // This is a comment
        "key": "value"
      }`;
      const result = detector.detect(jsonc);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      // FIX: Single characters are too short to be definitively JSON.
      expect(detector.detect("{").match).toBe(false);
      expect(detector.detect("{}").match).toBe(true);
      expect(detector.detect("[]").match).toBe(true);
    });

    test("should reject non-JSON structured text (like YAML)", () => {
      const yamlContent = `
key: value
list:
  - item1
  - item2
      `;
      const result = detector.detect(yamlContent);
      expect(result.match).toBe(false);
    });

    test("should reject plain text", () => {
      const text =
        "This is just a regular sentence that does not look like JSON.";
      const result = detector.detect(text);
      expect(result.match).toBe(false);
    });

    test("should reject code-like content", () => {
      const jsCode =
        'const x = { "key": "value" }; function test() { return x; }';
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject HTML/XML content", () => {
      const html = "<div><p>Hello</p></div>";
      const result = detector.detect(html);
      expect(result.match).toBe(false);
    });

    test("should reject if it does not start with {, [, or \"", () => {
      const text = ' key: "value" }';
      const result = detector.detect(text);
      expect(result.match).toBe(false);
    });

    test("should detect escaped JSON string with very high confidence", () => {
      const escapedJson = '"{\\"name\\":\\"John Doe\\",\\"age\\":30,\\"isStudent\\":false,\\"courses\\":[{\\"id\\":1,\\"name\\":\\"History\\"},{\\"id\\":2,\\"name\\":\\"Math\\"}]}"';
      const result = detector.detect(escapedJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    test("should detect simple escaped JSON string", () => {
      const escapedJson = '"{\\"key\\":\\"value\\"}"';
      const result = detector.detect(escapedJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect escaped JSON array", () => {
      const escapedJson = '"[1,2,3,\\"test\\"]"';
      const result = detector.detect(escapedJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect escaped JSON with nested objects", () => {
      const escapedJson = '"{\\"user\\":{\\"name\\":\\"John\\",\\"age\\":30}}"';
      const result = detector.detect(escapedJson);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    test("should reject invalid escaped JSON string", () => {
      const invalidEscapedJson = '"{\\"key\\":\\"value\\""'; // Missing closing brace
      const result = detector.detect(invalidEscapedJson);
      expect(result.match).toBe(false);
    });

    test("should reject non-JSON string content", () => {
      const nonJsonString = '"This is just a regular string"';
      const result = detector.detect(nonJsonString);
      expect(result.match).toBe(false);
    });
  });

  describe("UI Components", () => {
    test("should return a status item component", () => {
      const StatusItem = detector.getStatusItem!();
      expect(StatusItem).toBeDefined();
      expect(typeof StatusItem).toBe("function");
    });

    test("should return an options menu component", () => {
      const OptionsMenu = detector.getOptionsMenu!();
      expect(OptionsMenu).toBeDefined();
      expect(typeof OptionsMenu).toBe("function");
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {},
        editor: {},
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
      expect(registerJsonValidationProvider).toHaveBeenCalledWith(mockMonaco);
      expect(registerJsonValidationProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe("JSON Detection Accuracy", () => {
    test("should correctly identify JSON content as JSON, not C++", async () => {
      // Load the large JSON file
      const fs = require("fs");
      const path = require("path");
      const jsonFilePath = path.join(process.cwd(), "large-json.json");

      if (!fs.existsSync(jsonFilePath)) {
        console.warn("large-json.json not found, skipping test");
        return;
      }

      const content = fs.readFileSync(jsonFilePath, "utf8");
      console.log(`Testing JSON detection on ${content.length} character file`);

      // Sample the content to first 100 lines (same as the language detection system)
      const lines = content.split("\n");
      const sampledContent = lines.slice(0, 100).join("\n");
      console.log(`Using sampled content: ${sampledContent.length} characters`);

      // Get language detection results using the detector directly
      const result = detector.detect(sampledContent);
      console.log("Detection result:", JSON.stringify(result, null, 2));

      // JSON should be detected with high confidence
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should handle JSON with nested objects and arrays correctly", () => {
      const jsonContent = `{
        ":items": {
          "root": {
            ":items": {
              "accordion_1480775697": {
                ":items": {
                  "par": {
                    ":items": {
                      "contentfragment_8950": {
                        ":items": {},
                        ":itemsOrder": [],
                        ":type": "waitrosegroceriescms/components/content/contentfragment",
                        "columnClassNames": "aem-GridColumn--default--12 aem-GridColumn--offset--default--0",
                        "componentId": "_content_waitrosegroceriescms_en_help-information_customer-service"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`;

      const result = detector.detect(jsonContent);
      console.log("Small JSON test result:", JSON.stringify(result, null, 2));

      // Should detect as JSON
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect JSON with dot notation properties as JSON, not R", () => {
      const jsonContent = `{"service.id":"SRVC100118663","destination.port":"10000","sky.provider_territory":null,"url.scheme":"https","service.uuid":"2c2dd7c5-71b6-548b-9d27-b7e5ea839a35","uid":"0f06ab0f-3b60-3894bc8997c5","path":"/opensso/helpforum/idp","sky.top_tenant":"sky-identity","sky.device.platform":null,"url.query":"SAMLRequest=...&RelayState=...&_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%2B_ts=1754644512305sd23qwdwd3w3d%","sky.request_id":"a827a2d7-6b4b-4f6b-8441-26d4e4811e46","http.request.method":"GET","sky.provider":null,"payload":{"httpStatus":200,"elapsedTime":107},"source.ip":"2.216.60.60","logger_name":"skyid.web.filter.LoggingFilter","http.response.status_code":"200","error.code":null,"user_agent.original":"id-gauge/1.0.0 (sky-id-rango-api-tests-java)","http.request.referrer":null,"timeLogged":"2025-08-08T09:15:12.429089Z","method":"GET","level":"INFO","ip_address":"2.216.60.60","message":"request processed","destination.ip":"10.70.107.21","event.duration":107,"country_code":"GB","sky.device.type":null,"@timestamp":"2025-08-08T09:15:12.429105Z","url.path":"/opensso/helpforum/idp","source.port":"39074","service":null,"url.domain":"sky-id-rango-int.dev.ce.eu-central-1-aws.npottdc.sky","http_status":"200","territory":null,"index":"sky_identity_int_app","host":"http-inputs-sky.splunkcloud.com","application":"rango","namespace":"sky-id-rango-signin-int","appname":"rango-signin","service.name":"rango-signin","podname":"rango-signin-968dc7d69-mlhsb","region":"sky-eucentral1-int","service.environment":"sky-eucentral1-int"}`;
      
      const result = detector.detect(jsonContent);
      console.log('JSON detector result for JSON with dots:', {
        match: result.match,
        confidence: result.confidence,
        matchedDefinitive: result.matchedDefinitive
      });
      
      // Should detect as JSON with high confidence since it's valid JSON
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
    });
  });
});
