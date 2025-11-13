/**
 * Unit tests for Array Diff Preparation Utilities
 *
 * Tests the smart sorting and normalization functions that prepare
 * arrays for visual comparison in the diff viewer.
 */

import {
  deepSortKeys,
  prepareArrayForDiff,
  prepareArrayPairForDiff,
} from "../arrayDiffPreparation";

describe("arrayDiffPreparation", () => {
  describe("deepSortKeys", () => {
    it("should return primitives unchanged", () => {
      expect(deepSortKeys(42)).toBe(42);
      expect(deepSortKeys("hello")).toBe("hello");
      expect(deepSortKeys(true)).toBe(true);
      expect(deepSortKeys(null)).toBe(null);
    });

    it("should sort object keys alphabetically", () => {
      const input = { z: 1, a: 2, m: 3 };
      const result = deepSortKeys(input);
      expect(Object.keys(result)).toEqual(["a", "m", "z"]);
      expect(result).toEqual({ a: 2, m: 3, z: 1 });
    });

    it("should recursively sort nested object keys", () => {
      const input = {
        z: { y: 1, x: 2 },
        a: { c: 3, b: 4 },
      };
      const result = deepSortKeys(input);
      expect(Object.keys(result)).toEqual(["a", "z"]);
      expect(Object.keys(result.a)).toEqual(["b", "c"]);
      expect(Object.keys(result.z)).toEqual(["x", "y"]);
    });

    it("should sort keys in objects within arrays", () => {
      const input = [{ z: 1, a: 2 }, { y: 3, b: 4 }];
      const result = deepSortKeys(input);
      expect(Object.keys(result[0])).toEqual(["a", "z"]);
      expect(Object.keys(result[1])).toEqual(["b", "y"]);
    });

    it("should handle deeply nested structures", () => {
      const input = {
        z: {
          y: [{ c: 1, a: 2 }, { d: 3, b: 4 }],
          x: { f: 5, e: 6 },
        },
      };
      const result = deepSortKeys(input);
      expect(Object.keys(result.z)).toEqual(["x", "y"]);
      expect(Object.keys(result.z.x)).toEqual(["e", "f"]);
      expect(Object.keys(result.z.y[0])).toEqual(["a", "c"]);
      expect(Object.keys(result.z.y[1])).toEqual(["b", "d"]);
    });

    it("should preserve array order while sorting object keys", () => {
      const input = [
        { name: "First", order: 1 },
        { name: "Second", order: 2 },
      ];
      const result = deepSortKeys(input);
      expect(result[0].name).toBe("First");
      expect(result[1].name).toBe("Second");
    });

    it("should handle empty objects and arrays", () => {
      expect(deepSortKeys({})).toEqual({});
      expect(deepSortKeys([])).toEqual([]);
    });
  });

  describe("prepareArrayForDiff", () => {
    it("should throw error for non-array input", () => {
      expect(() => prepareArrayForDiff({ not: "array" } as any)).toThrow(
        "prepareArrayForDiff expects an array as input",
      );
      expect(() => prepareArrayForDiff("string" as any)).toThrow(
        "prepareArrayForDiff expects an array as input",
      );
    });

    it("should format empty array as JSON", () => {
      const result = prepareArrayForDiff([]);
      expect(result).toBe("[]");
    });

    it("should format simple primitive array", () => {
      const input = [3, 1, 2];
      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual([1, 2, 3]); // Sorted
    });

    it("should sort array elements by their canonical string representation", () => {
      const input = [
        { name: "Charlie", age: 30 },
        { name: "Alice", age: 25 },
        { name: "Bob", age: 35 },
      ];
      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);
      // Should be sorted by full canonical representation (keys sorted, then compared)
      // After key sorting: {"age":25,"name":"Alice"}, {"age":30,"name":"Charlie"}, {"age":35,"name":"Bob"}
      // Alphabetically: Alice < Charlie < Bob (by "age" field first)
      expect(parsed[0].name).toBe("Alice");
      expect(parsed[1].name).toBe("Charlie");
      expect(parsed[2].name).toBe("Bob");
    });

    it("should normalize objects with different key orders", () => {
      const input1 = [{ name: "Alice", age: 25 }];
      const input2 = [{ age: 25, name: "Alice" }];

      const result1 = prepareArrayForDiff(input1);
      const result2 = prepareArrayForDiff(input2);

      // Both should produce identical output after normalization
      expect(result1).toBe(result2);
    });

    it("should normalize arrays with same content in different order", () => {
      const input1 = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const input2 = [
        { name: "Bob", id: 2 },
        { name: "Alice", id: 1 },
      ];

      const result1 = prepareArrayForDiff(input1);
      const result2 = prepareArrayForDiff(input2);

      // Should be equal after normalization
      expect(result1).toBe(result2);
    });

    it("should handle nested arrays", () => {
      const input = [
        { tags: ["z", "a", "m"] },
        { tags: ["b", "y", "c"] },
      ];
      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(Array.isArray(parsed[0].tags)).toBe(true);
    });

    it("should handle mixed types in array", () => {
      const input = [
        { type: "object", value: 1 },
        "string",
        42,
        null,
        true,
      ];
      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);

      // Should successfully parse and sort by type
      expect(parsed).toHaveLength(5);
      expect(parsed).toContain("string");
      expect(parsed).toContain(42);
      expect(parsed).toContain(null);
      expect(parsed).toContain(true);
    });

    it("should produce formatted JSON with 2-space indentation", () => {
      const input = [{ a: 1 }];
      const result = prepareArrayForDiff(input);
      expect(result).toContain("  "); // Should have indentation
      expect(result).toContain("\n"); // Should have line breaks
    });

    it("should handle arrays with duplicate elements", () => {
      const input = [
        { id: 1, name: "Alice" },
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);

      // Should preserve duplicates
      expect(parsed).toHaveLength(3);
      expect(parsed.filter((item: any) => item.name === "Alice")).toHaveLength(
        2,
      );
    });

    it("should handle complex nested structures", () => {
      const input = [
        {
          user: {
            profile: { name: "Alice", age: 25 },
            settings: { theme: "dark", notifications: true },
          },
          posts: [
            { title: "Post 1", likes: 10 },
            { title: "Post 2", likes: 5 },
          ],
        },
      ];

      const result = prepareArrayForDiff(input);
      const parsed = JSON.parse(result);

      // Should successfully process complex nesting
      expect(parsed[0].user.profile.name).toBe("Alice");
      expect(parsed[0].posts).toHaveLength(2);

      // Keys should be sorted
      const userKeys = Object.keys(parsed[0].user);
      expect(userKeys).toEqual(["profile", "settings"]); // Alphabetically sorted
    });
  });

  describe("prepareArrayPairForDiff", () => {
    it("should return error if left value is not an array", () => {
      const result = prepareArrayPairForDiff({ not: "array" }, []);
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Left value is not an array");
      }
    });

    it("should return error if right value is not an array", () => {
      const result = prepareArrayPairForDiff([], "not array");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Right value is not an array");
      }
    });

    it("should successfully prepare valid array pair", () => {
      const left = [{ name: "Alice", age: 25 }];
      const right = [{ age: 25, name: "Alice" }];

      const result = prepareArrayPairForDiff(left, right);

      expect("error" in result).toBe(false);
      if ("leftContent" in result) {
        expect(result.leftContent).toBeTruthy();
        expect(result.rightContent).toBeTruthy();
        expect(typeof result.leftContent).toBe("string");
        expect(typeof result.rightContent).toBe("string");
      }
    });

    it("should produce identical output for equivalent arrays", () => {
      const left = [
        { name: "Bob", id: 2 },
        { name: "Alice", id: 1 },
      ];
      const right = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      const result = prepareArrayPairForDiff(left, right);

      if ("leftContent" in result) {
        // After normalization, both should be identical
        expect(result.leftContent).toBe(result.rightContent);
      } else {
        fail("Expected successful preparation");
      }
    });

    it("should produce different output for different arrays", () => {
      const left = [{ name: "Alice", age: 25 }];
      const right = [{ name: "Bob", age: 30 }];

      const result = prepareArrayPairForDiff(left, right);

      if ("leftContent" in result) {
        expect(result.leftContent).not.toBe(result.rightContent);
      } else {
        fail("Expected successful preparation");
      }
    });

    it("should handle empty arrays", () => {
      const result = prepareArrayPairForDiff([], []);

      expect("error" in result).toBe(false);
      if ("leftContent" in result) {
        expect(result.leftContent).toBe("[]");
        expect(result.rightContent).toBe("[]");
      }
    });

    it("should handle arrays of different lengths", () => {
      const left = [1, 2, 3];
      const right = [1, 2, 3, 4, 5];

      const result = prepareArrayPairForDiff(left, right);

      expect("error" in result).toBe(false);
      if ("leftContent" in result) {
        const leftParsed = JSON.parse(result.leftContent);
        const rightParsed = JSON.parse(result.rightContent);
        expect(leftParsed).toHaveLength(3);
        expect(rightParsed).toHaveLength(5);
      }
    });
  });

  describe("Integration: Full normalization workflow", () => {
    it("should make equivalent arrays with different orderings comparable", () => {
      // Real-world scenario: API responses with different ordering
      const apiResponse1 = [
        {
          id: 123,
          user: { lastName: "Doe", firstName: "John" },
          metadata: { createdAt: "2024-01-01", updatedAt: "2024-01-02" },
        },
        {
          id: 456,
          user: { lastName: "Smith", firstName: "Jane" },
          metadata: { createdAt: "2024-01-03", updatedAt: "2024-01-04" },
        },
      ];

      const apiResponse2 = [
        {
          metadata: { updatedAt: "2024-01-04", createdAt: "2024-01-03" },
          user: { firstName: "Jane", lastName: "Smith" },
          id: 456,
        },
        {
          metadata: { updatedAt: "2024-01-02", createdAt: "2024-01-01" },
          user: { firstName: "John", lastName: "Doe" },
          id: 123,
        },
      ];

      const result1 = prepareArrayForDiff(apiResponse1);
      const result2 = prepareArrayForDiff(apiResponse2);

      // After normalization, should be identical
      expect(result1).toBe(result2);
    });

    it("should detect actual differences even with different ordering", () => {
      const arr1 = [
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ];

      const arr2 = [
        { age: 31, name: "Bob" }, // Different age!
        { age: 25, name: "Alice" },
      ];

      const result1 = prepareArrayForDiff(arr1);
      const result2 = prepareArrayForDiff(arr2);

      // Should be different because of age mismatch
      expect(result1).not.toBe(result2);
    });
  });
});
