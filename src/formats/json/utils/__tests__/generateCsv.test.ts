/**
 * Unit tests for World-Class CSV Export
 */

import { convertToCsv, CsvOptions } from "../generateCsv";

describe("generateCsv", () => {
  describe("Basic functionality", () => {
    it("should convert simple flat object", () => {
      const json = { name: "Alice", age: 30 };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toBe("age,name\n30,Alice");
    });

    it("should convert array of flat objects", () => {
      const json = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ];
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("age,name");
      expect(result.csv).toContain("30,Alice");
      expect(result.csv).toContain("25,Bob");
    });

    it("should handle JSON string input", () => {
      const jsonString = '{"name":"Alice","age":30}';
      const result = convertToCsv(jsonString);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("Alice");
    });

    it("should handle empty array", () => {
      const json: any[] = [];
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toBe("");
    });
  });

  describe("Nested object flattening", () => {
    it("should flatten nested objects", () => {
      const json = {
        user: {
          name: "Alice",
          profile: {
            age: 30,
            city: "NYC",
          },
        },
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("user.name");
      expect(result.csv).toContain("user.profile.age");
      expect(result.csv).toContain("user.profile.city");
      expect(result.csv).toContain("Alice");
      expect(result.csv).toContain("30");
      expect(result.csv).toContain("NYC");
    });

    it("should handle deeply nested objects", () => {
      const json = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("level1.level2.level3.value");
      expect(result.csv).toContain("deep");
    });
  });

  describe("Array expansion - expandFirst strategy (default)", () => {
    it("should expand first array into multiple rows", () => {
      const json = {
        name: "Alice",
        hobbies: ["reading", "gaming", "cooking"],
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      expect(lines).toHaveLength(4); // Header + 3 data rows
      expect(result.csv).toContain("reading");
      expect(result.csv).toContain("gaming");
      expect(result.csv).toContain("cooking");
      // Each row should have Alice duplicated
      const aliceCount = (result.csv.match(/Alice/g) || []).length;
      expect(aliceCount).toBe(3);
    });

    it("should expand array of objects", () => {
      const json = {
        company: "Acme",
        employees: [
          { name: "Alice", role: "Dev" },
          { name: "Bob", role: "Designer" },
        ],
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("company");
      expect(result.csv).toContain("employees.name");
      expect(result.csv).toContain("employees.role");
      expect(result.csv).toContain("Acme,Alice,Dev");
      expect(result.csv).toContain("Acme,Bob,Designer");
    });

    it("should stringify second array when expandFirst is used", () => {
      const json = {
        name: "Alice",
        hobbies: ["reading", "gaming"],
        skills: ["JS", "Python"],
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      // hobbies should be expanded (first array)
      expect(result.csv).toContain("reading");
      expect(result.csv).toContain("gaming");
      // skills should be stringified (second array) - will be CSV-escaped
      expect(result.csv).toContain("JS");
      expect(result.csv).toContain("Python");
      // Check that skills column exists and contains stringified array
      expect(result.csv).toMatch(/skills/);
    });
  });

  describe("Array expansion - expandAll strategy", () => {
    it("should expand all arrays creating Cartesian product", () => {
      const json = {
        name: "Alice",
        hobbies: ["reading", "gaming"],
        skills: ["JS", "Python"],
      };
      const options: CsvOptions = {
        delimiter: ",",
        includeHeaders: true,
        arrayExpansion: "expandAll",
      };
      const result = convertToCsv(json, options);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      // Header + (2 hobbies × 2 skills) = 5 rows
      expect(lines).toHaveLength(5);
      // Check Cartesian product (columns are alphabetically sorted)
      expect(result.csv).toContain("reading,Alice,JS");
      expect(result.csv).toContain("reading,Alice,Python");
      expect(result.csv).toContain("gaming,Alice,JS");
      expect(result.csv).toContain("gaming,Alice,Python");
    });

    it("should handle empty arrays in expandAll mode", () => {
      const json = {
        name: "Alice",
        hobbies: [],
      };
      const options: CsvOptions = {
        delimiter: ",",
        includeHeaders: true,
        arrayExpansion: "expandAll",
      };
      const result = convertToCsv(json, options);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("Alice");
    });
  });

  describe("Array expansion - stringify strategy", () => {
    it("should stringify all arrays", () => {
      const json = {
        name: "Alice",
        hobbies: ["reading", "gaming"],
        skills: ["JS", "Python"],
      };
      const options: CsvOptions = {
        delimiter: ",",
        includeHeaders: true,
        arrayExpansion: "stringify",
      };
      const result = convertToCsv(json, options);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      expect(lines).toHaveLength(2); // Header + 1 data row
      // Arrays are stringified (and then CSV-escaped with doubled quotes)
      expect(result.csv).toContain("reading");
      expect(result.csv).toContain("gaming");
      expect(result.csv).toContain("JS");
      expect(result.csv).toContain("Python");
      // Verify columns exist
      expect(result.csv).toContain("hobbies");
      expect(result.csv).toContain("skills");
    });
  });

  describe("Delimiter options", () => {
    it("should use comma delimiter by default", () => {
      const json = { a: 1, b: 2 };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("a,b");
    });

    it("should use tab delimiter when specified", () => {
      const json = { a: 1, b: 2 };
      const options: CsvOptions = {
        delimiter: "\t",
        includeHeaders: true,
        arrayExpansion: "expandFirst",
      };
      const result = convertToCsv(json, options);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("a\tb");
    });
  });

  describe("Header options", () => {
    it("should include headers by default", () => {
      const json = { name: "Alice", age: 30 };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      expect(lines[0]).toContain("age");
      expect(lines[0]).toContain("name");
    });

    it("should exclude headers when specified", () => {
      const json = { name: "Alice", age: 30 };
      const options: CsvOptions = {
        delimiter: ",",
        includeHeaders: false,
        arrayExpansion: "expandFirst",
      };
      const result = convertToCsv(json, options);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      expect(lines[0]).not.toContain("age");
      expect(lines[0]).not.toContain("name");
      expect(lines[0]).toContain("30");
      expect(lines[0]).toContain("Alice");
    });
  });

  describe("CSV escaping", () => {
    it("should escape values containing delimiter", () => {
      const json = { name: "Alice, Bob" };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain('"Alice, Bob"');
    });

    it("should escape values containing quotes", () => {
      const json = { message: 'She said "Hello"' };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain('"She said ""Hello"""');
    });

    it("should escape values containing newlines", () => {
      const json = { text: "Line 1\nLine 2" };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain('"Line 1\nLine 2"');
    });

    it("should handle null and undefined values", () => {
      const json = { a: null, b: undefined, c: "value" };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      const lines = result.csv.split("\n");
      // null and undefined should be empty strings
      expect(lines[1]).toMatch(/^,,value$|^,value,$/);
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle API response with nested arrays", () => {
      const json = {
        users: [
          {
            id: 1,
            name: "Alice",
            address: { city: "NYC", zip: "10001" },
            tags: ["premium", "active"],
          },
          {
            id: 2,
            name: "Bob",
            address: { city: "LA", zip: "90001" },
            tags: ["trial"],
          },
        ],
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("users.address.city");
      expect(result.csv).toContain("users.address.zip");
      expect(result.csv).toContain("users.id");
      expect(result.csv).toContain("users.name");
      expect(result.csv).toContain("NYC");
      expect(result.csv).toContain("LA");
    });

    it("should handle e-commerce product data", () => {
      const json = [
        {
          product: "Laptop",
          price: 999,
          specs: { ram: "16GB", storage: "512GB" },
          reviews: [
            { rating: 5, comment: "Great!" },
            { rating: 4, comment: "Good" },
          ],
        },
      ];
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      // Nested object should be flattened
      expect(result.csv).toContain("specs.ram");
      expect(result.csv).toContain("specs.storage");
      // First array (reviews) should be expanded
      const lines = result.csv.split("\n");
      expect(lines.length).toBeGreaterThan(2); // Multiple rows due to reviews expansion
    });
  });

  describe("Error handling", () => {
    it("should handle invalid JSON string", () => {
      const invalidJson = "{invalid}";
      const result = convertToCsv(invalidJson);
      expect(result.csv).toBe("");
      expect(result.error).toContain("Conversion failed");
    });

    it("should handle errors gracefully", () => {
      // Pass a truly invalid value that will cause an error
      const result = convertToCsv("{not valid json}" as any);
      expect(result.csv).toBe("");
      expect(result.error).toBeTruthy();
      expect(result.error).toContain("Conversion failed");
    });
  });

  describe("Edge cases", () => {
    it("should handle object with only arrays", () => {
      const json = {
        list1: [1, 2, 3],
        list2: ["a", "b"],
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      // First array should be expanded, second stringified
      const lines = result.csv.split("\n");
      expect(lines.length).toBeGreaterThan(2);
    });

    it("should handle mixed primitive types", () => {
      const json = {
        str: "text",
        num: 42,
        bool: true,
        nul: null,
      };
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("text");
      expect(result.csv).toContain("42");
      expect(result.csv).toContain("true");
    });

    it("should handle array of primitives at root", () => {
      const json = [1, 2, 3];
      const result = convertToCsv(json);
      expect(result.error).toBeNull();
      expect(result.csv).toContain("value");
      expect(result.csv).toContain("1");
      expect(result.csv).toContain("2");
      expect(result.csv).toContain("3");
    });
  });
});
