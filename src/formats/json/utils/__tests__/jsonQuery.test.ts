import { extractData } from "../jsonQuery";

describe("jsonQuery - extractData", () => {
  describe("Path Navigation", () => {
    test("should extract from simple array with dot notation", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "name",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["Alice", "Bob", "Charlie"]);
    });

    test("should extract nested properties", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, profile: { firstName: "Alice", lastName: "Smith" } },
          { id: 2, profile: { firstName: "Bob", lastName: "Jones" } },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "profile.firstName",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["Alice", "Bob"]);
    });

    test("should handle array indexing in path", () => {
      const jsonString = JSON.stringify({
        data: {
          items: [
            { tags: ["a", "b", "c"] },
            { tags: ["x", "y", "z"] },
          ],
        },
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "data.items",
        propertyToExtract: "tags[0]",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["a", "x"]);
    });

    test("should handle complex nested array paths", () => {
      const jsonString = JSON.stringify({
        response: {
          data: {
            users: [
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
            ],
          },
        },
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "response.data.users",
        propertyToExtract: "id",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 2]);
    });

    test("should filter out undefined values when property doesn't exist", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, name: "Alice" },
          { id: 2 }, // Missing name
          { id: 3, name: "Charlie" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "name",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["Alice", "Charlie"]);
    });
  });

  describe("Condition Evaluation", () => {
    test("should filter with equality operator ==", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, status: "active" },
          { id: 2, status: "inactive" },
          { id: 3, status: "active" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "status == active",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });

    test("should filter with inequality operator !=", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, status: "active" },
          { id: 2, status: "inactive" },
          { id: 3, status: "active" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "status != active",
      });

      expect(error).toBeNull();
      expect(results).toEqual([2]);
    });

    test("should filter with greater than operator >", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, age: 25 },
          { id: 2, age: 17 },
          { id: 3, age: 30 },
          { id: 4, age: 18 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "age > 18",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });

    test("should filter with greater than or equal operator >=", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, age: 25 },
          { id: 2, age: 17 },
          { id: 3, age: 30 },
          { id: 4, age: 18 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "age >= 18",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3, 4]);
    });

    test("should filter with less than operator <", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, score: 50 },
          { id: 2, score: 75 },
          { id: 3, score: 90 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "score < 80",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 2]);
    });

    test("should filter with less than or equal operator <=", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, score: 50 },
          { id: 2, score: 75 },
          { id: 3, score: 90 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "score <= 75",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 2]);
    });

    test("should handle boolean values in conditions", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, verified: true },
          { id: 2, verified: false },
          { id: 3, verified: true },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "verified == true",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });

    test("should handle string values with quotes in conditions", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, role: "admin" },
          { id: 2, role: "user" },
          { id: 3, role: "admin" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "role == 'admin'",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });

    test("should handle nested property in condition", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, profile: { age: 25 } },
          { id: 2, profile: { age: 17 } },
          { id: 3, profile: { age: 30 } },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "profile.age >= 18",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });

    test("should return all items when condition is empty", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "name",
        condition: "",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["Alice", "Bob"]);
    });

    test("should filter out items where condition property doesn't exist", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, age: 25 },
          { id: 2 }, // Missing age
          { id: 3, age: 30 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "age >= 18",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 3]);
    });
  });

  describe("Error Handling", () => {
    test("should return error for invalid JSON", () => {
      const { results, error } = extractData("invalid json", {
        arrayPath: "users",
        propertyToExtract: "name",
      });

      expect(error).toBeTruthy();
      expect(error).toContain("Unexpected token");
      expect(results).toEqual([]);
    });

    test("should return error when arrayPath doesn't lead to an array", () => {
      const jsonString = JSON.stringify({
        user: { id: 1, name: "Alice" },
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "user",
        propertyToExtract: "name",
      });

      expect(error).toBe('Path "user" does not lead to an array.');
      expect(results).toEqual([]);
    });

    test("should return empty results when arrayPath doesn't exist", () => {
      const jsonString = JSON.stringify({
        data: [],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "nonexistent",
        propertyToExtract: "name",
      });

      expect(error).toBe('Path "nonexistent" does not lead to an array.');
      expect(results).toEqual([]);
    });

    test("should return empty results when required fields are missing", () => {
      const jsonString = JSON.stringify({
        users: [{ id: 1 }],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "",
        propertyToExtract: "name",
      });

      expect(error).toBeNull();
      expect(results).toEqual([]);
    });

    test("should return empty results when propertyToExtract is empty", () => {
      const jsonString = JSON.stringify({
        users: [{ id: 1 }],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "",
      });

      expect(error).toBeNull();
      expect(results).toEqual([]);
    });

    test("should skip non-object items in array", () => {
      const jsonString = JSON.stringify({
        items: [
          { id: 1, name: "Alice" },
          "string item",
          { id: 2, name: "Bob" },
          null,
          { id: 3, name: "Charlie" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "items",
        propertyToExtract: "name",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["Alice", "Bob", "Charlie"]);
    });
  });

  describe("Complex Real-World Scenarios", () => {
    test("should extract user emails from API response", () => {
      const jsonString = JSON.stringify({
        status: "success",
        data: {
          users: [
            { id: 1, email: "alice@example.com", active: true },
            { id: 2, email: "bob@example.com", active: false },
            { id: 3, email: "charlie@example.com", active: true },
          ],
        },
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "data.users",
        propertyToExtract: "email",
        condition: "active == true",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["alice@example.com", "charlie@example.com"]);
    });

    test("should extract product IDs with price filter", () => {
      const jsonString = JSON.stringify({
        products: [
          { id: "P1", name: "Product 1", price: 29.99 },
          { id: "P2", name: "Product 2", price: 49.99 },
          { id: "P3", name: "Product 3", price: 19.99 },
          { id: "P4", name: "Product 4", price: 99.99 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "products",
        propertyToExtract: "id",
        condition: "price < 50",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["P1", "P2", "P3"]);
    });

    test("should extract deeply nested data", () => {
      const jsonString = JSON.stringify({
        company: {
          departments: [
            {
              name: "Engineering",
              employees: [
                { id: 1, details: { salary: 100000 } },
                { id: 2, details: { salary: 120000 } },
              ],
            },
          ],
        },
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "company.departments[0].employees",
        propertyToExtract: "details.salary",
        condition: "details.salary >= 110000",
      });

      expect(error).toBeNull();
      expect(results).toEqual([120000]);
    });

    test("should extract mixed type values", () => {
      const jsonString = JSON.stringify({
        items: [
          { id: 1, value: "string" },
          { id: 2, value: 42 },
          { id: 3, value: true },
          { id: 4, value: { nested: "object" } },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "items",
        propertyToExtract: "value",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["string", 42, true, { nested: "object" }]);
    });

    test("should handle empty array", () => {
      const jsonString = JSON.stringify({
        users: [],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "name",
      });

      expect(error).toBeNull();
      expect(results).toEqual([]);
    });

    test("should handle GitHub API response structure", () => {
      const jsonString = JSON.stringify({
        total_count: 3,
        items: [
          { id: 1, name: "repo1", stargazers_count: 150, fork: false },
          { id: 2, name: "repo2", stargazers_count: 50, fork: true },
          { id: 3, name: "repo3", stargazers_count: 200, fork: false },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "items",
        propertyToExtract: "name",
        condition: "fork == false",
      });

      expect(error).toBeNull();
      expect(results).toEqual(["repo1", "repo3"]);
    });
  });

  describe("Edge Cases", () => {
    test("should handle array at root level", () => {
      const jsonString = JSON.stringify([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);

      // Since the root is already an array, we use empty string for arrayPath
      const { results, error } = extractData(jsonString, {
        arrayPath: "",
        propertyToExtract: "name",
      });

      // This should fail because arrayPath is required
      expect(error).toBeNull();
      expect(results).toEqual([]);
    });

    test("should handle whitespace in condition", () => {
      const jsonString = JSON.stringify({
        users: [
          { id: 1, age: 25 },
          { id: 2, age: 30 },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "users",
        propertyToExtract: "id",
        condition: "  age  >=  25  ",
      });

      expect(error).toBeNull();
      expect(results).toEqual([1, 2]);
    });

    test("should handle numeric strings in conditions", () => {
      const jsonString = JSON.stringify({
        items: [
          { id: 1, code: "100" },
          { id: 2, code: "200" },
          { id: 3, code: "50" },
        ],
      });

      const { results, error } = extractData(jsonString, {
        arrayPath: "items",
        propertyToExtract: "id",
        condition: "code == 100",
      });

      // This tests type coercion - "100" == 100 should be true
      expect(error).toBeNull();
      expect(results).toEqual([1]);
    });
  });
});
