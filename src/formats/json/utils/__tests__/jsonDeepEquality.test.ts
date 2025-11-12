/**
 * Unit tests for JSON Deep Equality Checker
 */

import { compareJsonEquality, EqualityResult } from "../jsonDeepEquality";

describe("jsonDeepEquality", () => {
  describe("Basic equality", () => {
    it("should return equal for identical primitives", () => {
      const result = compareJsonEquality(42, 42);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for identical strings", () => {
      const result = compareJsonEquality('"hello"', '"hello"');
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for null values", () => {
      const result = compareJsonEquality(null, null);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for identical booleans", () => {
      const result = compareJsonEquality(true, true);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  describe("Object equality", () => {
    it("should return equal for empty objects", () => {
      const result = compareJsonEquality({}, {});
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for objects with same properties (order-insensitive)", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for nested objects with same structure", () => {
      const obj1 = { user: { name: "John", age: 30 } };
      const obj2 = { user: { age: 30, name: "John" } };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect missing keys in target", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1 };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("MISSING_KEY_RIGHT");
      expect(result.differences[0].path).toBe("/b");
    });

    it("should detect missing keys in source", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1, b: 2 };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("MISSING_KEY_LEFT");
      expect(result.differences[0].path).toBe("/b");
    });

    it("should detect value mismatches", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("VALUE_MISMATCH");
      expect(result.differences[0].path).toBe("/b");
    });
  });

  describe("Array equality (order-insensitive by default)", () => {
    it("should return equal for empty arrays", () => {
      const result = compareJsonEquality([], []);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for arrays with same elements in different order", () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [5, 3, 1, 4, 2];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should return equal for arrays of objects in different order", () => {
      const arr1 = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const arr2 = [
        { id: 2, name: "Bob" },
        { id: 1, name: "Alice" },
      ];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle duplicate values correctly", () => {
      const arr1 = [1, 2, 2, 3];
      const arr2 = [2, 1, 3, 2];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect different array contents", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 4];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("ARRAY_CONTENT_MISMATCH");
    });

    it("should detect different array lengths", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].type).toBe("ARRAY_CONTENT_MISMATCH");
    });

    it("should provide intelligent reporting for array differences", () => {
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 6, 7];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].message).toContain("3 item(s) matched");
      expect(result.differences[0].message).toContain("2 missing from target");
      expect(result.differences[0].message).toContain("2 extra in target");
    });

    it("should report only missing items", () => {
      const arr1 = [1, 2, 3, 4];
      const arr2 = [1, 2];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].message).toContain("2 item(s) matched");
      expect(result.differences[0].message).toContain("2 missing from target");
      expect(result.differences[0].message).not.toContain("extra in target");
    });

    it("should report only extra items", () => {
      const arr1 = [1, 2];
      const arr2 = [1, 2, 3, 4];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].message).toContain("2 item(s) matched");
      expect(result.differences[0].message).toContain("2 extra in target");
      expect(result.differences[0].message).not.toContain("missing from target");
    });
  });

  describe("Array equality (order-sensitive)", () => {
    it("should return not equal for arrays with different order when ignoreArrayOrder is false", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [3, 2, 1];
      const result = compareJsonEquality(arr1, arr2, { ignoreArrayOrder: false });
      expect(result.isEqual).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("should return equal for arrays with same order when ignoreArrayOrder is false", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const result = compareJsonEquality(arr1, arr2, { ignoreArrayOrder: false });
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect length mismatch in order-sensitive mode", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];
      const result = compareJsonEquality(arr1, arr2, { ignoreArrayOrder: false });
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].type).toBe("ARRAY_LENGTH_MISMATCH");
    });
  });

  describe("Type mismatches", () => {
    it("should detect string vs number mismatch", () => {
      // Use JSON strings to ensure proper parsing
      const result = compareJsonEquality('"hello"', 42);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].type).toBe("TYPE_MISMATCH");
    });

    it("should detect object vs array mismatch", () => {
      const result = compareJsonEquality({}, []);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].type).toBe("TYPE_MISMATCH");
    });

    it("should detect null vs object mismatch", () => {
      const result = compareJsonEquality(null, {});
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].type).toBe("TYPE_MISMATCH");
    });

    it("should detect boolean vs number mismatch", () => {
      const result = compareJsonEquality(true, 1);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].type).toBe("TYPE_MISMATCH");
    });
  });

  describe("Complex nested structures", () => {
    it("should handle deeply nested objects", () => {
      const obj1 = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 42,
              },
            },
          },
        },
      };
      const obj2 = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 42,
              },
            },
          },
        },
      };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect differences in deeply nested objects", () => {
      const obj1 = {
        users: [
          { id: 1, profile: { name: "Alice", age: 30 } },
          { id: 2, profile: { name: "Bob", age: 25 } },
        ],
      };
      const obj2 = {
        users: [
          { id: 1, profile: { name: "Alice", age: 31 } },
          { id: 2, profile: { name: "Bob", age: 25 } },
        ],
      };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("should handle mixed arrays and objects", () => {
      const obj1 = {
        data: [
          { items: [1, 2, 3] },
          { items: [4, 5, 6] },
        ],
      };
      const obj2 = {
        data: [
          { items: [6, 5, 4] },
          { items: [3, 2, 1] },
        ],
      };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(true); // Arrays are order-insensitive by default
      expect(result.differences).toHaveLength(0);
    });
  });

  describe("String JSON parsing", () => {
    it("should parse and compare JSON strings", () => {
      const json1 = '{"a": 1, "b": 2}';
      const json2 = '{"b": 2, "a": 1}';
      const result = compareJsonEquality(json1, json2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should throw error for invalid source JSON", () => {
      expect(() => {
        compareJsonEquality("{invalid}", "{}");
      }).toThrow("Invalid Source JSON");
    });

    it("should throw error for invalid target JSON", () => {
      expect(() => {
        compareJsonEquality("{}", "{invalid}");
      }).toThrow("Invalid Target JSON");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty strings", () => {
      const result = compareJsonEquality('""', '""');
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle large numbers", () => {
      const result = compareJsonEquality(9007199254740991, 9007199254740991);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle special characters in strings", () => {
      const result = compareJsonEquality(
        '{"key": "value with \\"quotes\\" and \\n newlines"}',
        '{"key": "value with \\"quotes\\" and \\n newlines"}'
      );
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle arrays with null values", () => {
      const arr1 = [1, null, 3];
      const arr2 = [null, 3, 1];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should handle objects with null values", () => {
      const obj1 = { a: null, b: 2 };
      const obj2 = { b: 2, a: null };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  describe("Difference reporting", () => {
    it("should report correct paths for nested differences", () => {
      const obj1 = { user: { profile: { age: 30 } } };
      const obj2 = { user: { profile: { age: 31 } } };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.differences[0].path).toBe("/user.profile.age");
    });

    it("should include values in difference details", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };
      const result = compareJsonEquality(obj1, obj2);
      expect(result.differences[0].leftValue).toBe(1);
      expect(result.differences[0].rightValue).toBe(2);
    });

    it("should provide clear messages for each difference type", () => {
      const obj1 = { a: 1, b: "string" };
      const obj2 = { a: 1, b: 42, c: true };
      const result = compareJsonEquality(obj1, obj2);

      const typeMismatch = result.differences.find((d) => d.type === "TYPE_MISMATCH");
      expect(typeMismatch).toBeDefined();
      expect(typeMismatch?.message).toContain("Type mismatch");

      const missingKey = result.differences.find((d) => d.type === "MISSING_KEY_LEFT");
      expect(missingKey).toBeDefined();
      expect(missingKey?.message).toContain("missing in Source");
    });
  });

  describe("Real-world scenarios", () => {
    it("should compare API response structures correctly", () => {
      const response1 = {
        status: "success",
        data: {
          users: [
            { id: 1, name: "Alice", roles: ["admin", "user"] },
            { id: 2, name: "Bob", roles: ["user"] },
          ],
          total: 2,
        },
      };
      const response2 = {
        data: {
          total: 2,
          users: [
            { name: "Bob", id: 2, roles: ["user"] },
            { roles: ["admin", "user"], name: "Alice", id: 1 },
          ],
        },
        status: "success",
      };
      const result = compareJsonEquality(response1, response2);
      expect(result.isEqual).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("should detect schema changes in API responses", () => {
      const oldSchema = {
        user: {
          id: 1,
          firstName: "John",
          lastName: "Doe",
        },
      };
      const newSchema = {
        user: {
          id: 1,
          fullName: "John Doe",
        },
      };
      const result = compareJsonEquality(oldSchema, newSchema);
      expect(result.isEqual).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it("should handle complex array differences in real data", () => {
      const oldData = {
        products: [
          { id: 1, name: "Widget A" },
          { id: 2, name: "Widget B" },
          { id: 3, name: "Widget C" },
        ],
      };
      const newData = {
        products: [
          { id: 1, name: "Widget A" },
          { id: 4, name: "Widget D" },
          { id: 5, name: "Widget E" },
        ],
      };
      const result = compareJsonEquality(oldData, newData);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].message).toContain("1 item(s) matched");
      expect(result.differences[0].message).toContain("2 missing from target");
      expect(result.differences[0].message).toContain("2 extra in target");
    });

    it("should handle arrays with completely different items", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [4, 5, 6];
      const result = compareJsonEquality(arr1, arr2);
      expect(result.isEqual).toBe(false);
      expect(result.differences[0].message).toContain("3 missing from target");
      expect(result.differences[0].message).toContain("3 extra in target");
      expect(result.differences[0].message).not.toContain("matched");
    });
  });
});
