import {
  compareStructures,
  ComparisonOptions,
} from "../jsonStructureComparison";

describe("JSON Structure Comparison", () => {
  describe("Basic Type Comparisons", () => {
    test("should match identical primitive values", () => {
      const result = compareStructures('"hello"', '"world"');
      expect(result.matches).toBe(true);
      expect(result.diffList).toHaveLength(0);
    });

    test("should detect type mismatches", () => {
      const result = compareStructures('"hello"', "123");
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(1);
      expect(result.diffList[0].type).toBe("TYPE_MISMATCH");
      expect(result.diffList[0].leftValueType).toBe("string");
      expect(result.diffList[0].rightValueType).toBe("number");
    });

    test("should handle null values correctly", () => {
      const result = compareStructures("null", '"hello"');
      expect(result.matches).toBe(false);
      expect(result.diffList[0].type).toBe("TYPE_MISMATCH");
      expect(result.diffList[0].leftValueType).toBe("null");
      expect(result.diffList[0].rightValueType).toBe("string");
    });
  });

  describe("Object Comparisons", () => {
    test("should match identical object structures", () => {
      const source = '{"name": "John", "age": 30}';
      const target = '{"name": "Jane", "age": 25}';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(true);
    });

    test("should detect missing keys in target", () => {
      const source = '{"name": "John", "age": 30, "city": "NYC"}';
      const target = '{"name": "Jane", "age": 25}';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(1);
      expect(result.diffList[0].type).toBe("MISSING_KEY_RIGHT");
      expect(result.diffList[0].path).toBe("/city");
    });

    test("should detect missing keys in source", () => {
      const source = '{"name": "John", "age": 30}';
      const target = '{"name": "Jane", "age": 25, "city": "NYC"}';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(1);
      expect(result.diffList[0].type).toBe("MISSING_KEY_LEFT");
      expect(result.diffList[0].path).toBe("/city");
    });

    test("should handle nested object differences", () => {
      const source = '{"user": {"name": "John", "address": {"city": "NYC"}}}';
      const target = '{"user": {"name": "Jane"}}';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(1);
      expect(result.diffList[0].type).toBe("MISSING_KEY_RIGHT");
      expect(result.diffList[0].path).toBe("/user/address");
    });
  });

  describe("Array Comparisons", () => {
    test("should match identical array structures", () => {
      const source = '[{"name": "John"}, {"name": "Jane"}]';
      const target = '[{"name": "Bob"}, {"name": "Alice"}]';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(true);
    });

    test("should detect array length differences when strict mode is enabled", () => {
      const source = '[{"name": "John"}, {"name": "Jane"}]';
      const target = '[{"name": "Bob"}]';
      const result = compareStructures(source, target, {
        strictArrayLength: true,
      });
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(1);
      expect(result.diffList[0].type).toBe("ARRAY_LENGTH_MISMATCH");
    });

    test("should not detect array length differences when strict mode is disabled", () => {
      const source = '[{"name": "John"}, {"name": "Jane"}]';
      const target = '[{"name": "Bob"}]';
      const result = compareStructures(source, target, {
        strictArrayLength: false,
      });
      expect(result.matches).toBe(false); // Still false because of missing 'name' key in second element
      expect(
        result.diffList.some((diff) => diff.type === "ARRAY_LENGTH_MISMATCH"),
      ).toBe(false);
    });

    test("should detect polymorphic arrays", () => {
      const source =
        '[{"type": "user", "name": "John"}, {"type": "admin", "permissions": ["read", "write"]}]';
      const target =
        '[{"type": "user", "name": "Jane"}, {"type": "admin", "permissions": ["read"]}]';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(
        result.diffList.some((diff) => diff.type === "POLYMORPHIC_ARRAY"),
      ).toBe(true);
    });

    test("should handle array element differences", () => {
      const source =
        '[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]';
      const target = '[{"name": "Bob"}, {"name": "Alice"}]';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(2); // Two missing 'age' keys
      expect(
        result.diffList.every((diff) => diff.type === "MISSING_KEY_RIGHT"),
      ).toBe(true);
    });
  });

  describe("Case Sensitivity", () => {
    test("should be case sensitive by default", () => {
      const source = '{"Name": "John", "Age": 30}';
      const target = '{"name": "John", "age": 30}';
      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList).toHaveLength(4); // 2 missing in each direction
    });

    test("should be case insensitive when configured", () => {
      const source = '{"Name": "John", "Age": 30}';
      const target = '{"name": "John", "age": 30}';
      const result = compareStructures(source, target, {
        caseSensitiveKeys: false,
      });
      expect(result.matches).toBe(true);
    });
  });

  describe("Array Sample Count", () => {
    test("should respect array sample count setting", () => {
      const source =
        '[{"name": "John"}, {"name": "Jane"}, {"name": "Bob"}, {"name": "Alice"}]';
      const target =
        '[{"name": "John"}, {"name": "Jane"}, {"name": "Bob"}, {"name": "Alice", "age": 30}]';
      const result = compareStructures(source, target, { arraySampleCount: 2 });
      expect(result.matches).toBe(true); // Only first 2 elements are compared
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle mixed object and array structures", () => {
      const source = `{
        "users": [
          {"name": "John", "roles": ["admin", "user"]},
          {"name": "Jane", "roles": ["user"]}
        ],
        "settings": {
          "theme": "dark",
          "notifications": true
        }
      }`;

      const target = `{
        "users": [
          {"name": "Bob", "roles": ["admin"]},
          {"name": "Alice", "roles": ["user", "moderator"]}
        ],
        "settings": {
          "theme": "light"
        }
      }`;

      const result = compareStructures(source, target);
      expect(result.matches).toBe(false);
      expect(result.diffList.length).toBeGreaterThan(0);
    });

    test("should provide accurate summary statistics", () => {
      const source = '{"name": "John", "age": 30, "city": "NYC"}';
      const target = '{"name": "Jane", "country": "USA"}';
      const result = compareStructures(source, target);

      expect(result.summary.totalDifferences).toBe(3);
      expect(result.summary.missingKeysLeft).toBe(1); // country
      expect(result.summary.missingKeysRight).toBe(2); // age, city
      expect(result.summary.typeMismatches).toBe(0);
    });
  });

  describe("Error Handling", () => {
    test("should throw error for invalid JSON", () => {
      expect(() => {
        compareStructures('{"invalid": json}', '{"valid": "json"}');
      }).toThrow("Invalid JSON A");
    });

    test("should throw error for invalid target JSON", () => {
      expect(() => {
        compareStructures('{"valid": "json"}', '{"invalid": json}');
      }).toThrow("Invalid JSON B");
    });
  });

  describe("Diff Tree Structure", () => {
    test("should generate correct diff tree", () => {
      const source = '{"user": {"name": "John", "age": 30}}';
      const target = '{"user": {"name": "Jane"}}';
      const result = compareStructures(source, target);

      expect(result.diffTree).toBeDefined();
      expect(result.diffTree.path).toBe("/");
      expect(result.diffTree.hasDiff).toBe(true);
      expect(result.diffTree.children).toBeDefined();
      expect(result.diffTree.children!.length).toBe(1);

      const userNode = result.diffTree.children![0];
      expect(userNode.path).toBe("/user");
      expect(userNode.hasDiff).toBe(true);
      expect(userNode.children).toBeDefined();
      expect(userNode.children!.length).toBe(2); // name and age

      const ageNode = userNode.children!.find(
        (child) => child.path === "/user/age",
      );
      expect(ageNode).toBeDefined();
      expect(ageNode!.path).toBe("/user/age");
      expect(ageNode!.hasDiff).toBe(true);
      expect(ageNode!.diffType).toBe("MISSING_KEY_RIGHT");
    });
  });
});
