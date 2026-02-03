import {
  generateDocPaths,
  generateDocumentationJson,
  createDefaultConfig,
  getNextMode,
  getModeDisplay,
  DocExportMode,
} from "../documentationGenerator";

describe("documentationGenerator", () => {
  describe("generateDocPaths", () => {
    it("should extract paths from a simple object", () => {
      const json = {
        name: "John",
        age: 30,
      };

      const paths = generateDocPaths(json);
      expect(paths).toEqual(["age", "name"]);
    });

    it("should extract paths from nested objects", () => {
      const json = {
        user: {
          profile: {
            name: "John",
            email: "john@example.com",
          },
          id: 123,
        },
      };

      const paths = generateDocPaths(json);
      expect(paths).toContain("user");
      expect(paths).toContain("user.profile");
      expect(paths).toContain("user.profile.name");
      expect(paths).toContain("user.profile.email");
      expect(paths).toContain("user.id");
    });

    it("should handle arrays with representative paths", () => {
      const json = {
        users: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
        ],
      };

      const paths = generateDocPaths(json);
      expect(paths).toContain("users");
      expect(paths).toContain("users[0]");
      expect(paths).toContain("users[0].name");
      expect(paths).toContain("users[0].age");
    });

    it("should handle deeply nested structures", () => {
      const json = {
        data: {
          items: [
            {
              details: {
                tags: ["a", "b"],
              },
            },
          ],
        },
      };

      const paths = generateDocPaths(json);
      expect(paths).toContain("data");
      expect(paths).toContain("data.items");
      expect(paths).toContain("data.items[0]");
      expect(paths).toContain("data.items[0].details");
      expect(paths).toContain("data.items[0].details.tags");
      expect(paths).toContain("data.items[0].details.tags[0]");
    });

    it("should handle null values", () => {
      const json = {
        name: "John",
        nickname: null,
      };

      const paths = generateDocPaths(json);
      expect(paths).toContain("name");
      expect(paths).toContain("nickname");
    });

    it("should return empty array for empty object", () => {
      const paths = generateDocPaths({});
      expect(paths).toEqual([]);
    });

    it("should sort paths alphabetically", () => {
      const json = {
        zebra: 1,
        apple: 2,
        mango: 3,
      };

      const paths = generateDocPaths(json);
      expect(paths).toEqual(["apple", "mango", "zebra"]);
    });
  });

  describe("generateDocumentationJson", () => {
    describe("keep mode", () => {
      it("should preserve original values", () => {
        const json = {
          name: "John",
          age: 30,
          active: true,
        };

        const config = {
          name: "keep" as DocExportMode,
          age: "keep" as DocExportMode,
          active: "keep" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual(json);
      });
    });

    describe("mask-value mode", () => {
      it("should mask string values as '...'", () => {
        const json = { name: "John Doe" };
        const config = { name: "mask-value" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ name: "..." });
      });

      it("should mask number values as 0", () => {
        const json = { age: 30, price: 99.99 };
        const config = {
          age: "mask-value" as DocExportMode,
          price: "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ age: 0, price: 0 });
      });

      it("should mask boolean values as false", () => {
        const json = { active: true, verified: false };
        const config = {
          active: "mask-value" as DocExportMode,
          verified: "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ active: false, verified: false });
      });

      it("should keep null as null", () => {
        const json = { data: null };
        const config = { data: "mask-value" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ data: null });
      });
    });

    describe("mask-type mode", () => {
      it("should mask string values as '<string>'", () => {
        const json = { name: "John Doe" };
        const config = { name: "mask-type" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ name: "<string>" });
      });

      it("should mask number values as '<number>'", () => {
        const json = { age: 30 };
        const config = { age: "mask-type" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ age: "<number>" });
      });

      it("should mask boolean values as '<boolean>'", () => {
        const json = { active: true };
        const config = { active: "mask-type" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ active: "<boolean>" });
      });

      it("should mask null as '<null>'", () => {
        const json = { data: null };
        const config = { data: "mask-type" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ data: "<null>" });
      });
    });

    describe("remove mode", () => {
      it("should remove keys from objects", () => {
        const json = {
          name: "John",
          password: "secret123",
          email: "john@example.com",
        };

        const config = {
          name: "keep" as DocExportMode,
          password: "remove" as DocExportMode,
          email: "keep" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({
          name: "John",
          email: "john@example.com",
        });
        expect((result as Record<string, unknown>).password).toBeUndefined();
      });

      it("should remove nested keys", () => {
        const json = {
          user: {
            name: "John",
            credentials: {
              password: "secret",
              apiKey: "key123",
            },
          },
        };

        const config = {
          "user.credentials.password": "remove" as DocExportMode,
          "user.credentials.apiKey": "remove" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          user: { name: string; credentials: Record<string, unknown> };
        };
        expect(result.user.name).toBe("John");
        expect(result.user.credentials).toEqual({});
      });
    });

    describe("mixed modes", () => {
      it("should apply different modes to different paths", () => {
        const json = {
          id: 12345,
          name: "John Doe",
          email: "john@example.com",
          password: "secret123",
          age: 30,
        };

        const config = {
          id: "mask-value" as DocExportMode,
          name: "keep" as DocExportMode,
          email: "mask-type" as DocExportMode,
          password: "remove" as DocExportMode,
          age: "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({
          id: 0,
          name: "John Doe",
          email: "<string>",
          age: 0,
        });
      });
    });

    describe("arrays", () => {
      it("should apply masks to all array elements", () => {
        const json = {
          users: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
          ],
        };

        const config = {
          "users[0].name": "mask-value" as DocExportMode,
          "users[0].age": "mask-type" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          users: Array<{ name: string; age: string }>;
        };

        // Both array elements should have masking applied
        expect(result.users[0].name).toBe("...");
        expect(result.users[0].age).toBe("<number>");
        expect(result.users[1].name).toBe("...");
        expect(result.users[1].age).toBe("<number>");
      });

      it("should handle removing from arrays", () => {
        const json = {
          items: [
            { public: "data", secret: "hidden" },
            { public: "data2", secret: "hidden2" },
          ],
        };

        const config = {
          "items[0].secret": "remove" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          items: Array<{ public: string }>;
        };

        expect(result.items[0]).toEqual({ public: "data" });
        expect(result.items[1]).toEqual({ public: "data2" });
      });
    });

    describe("masking objects", () => {
      it("should replace object with placeholder for mask-value", () => {
        const json = {
          user: {
            name: "John",
            age: 30,
          },
        };

        const config = {
          user: "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ user: { "...": "..." } });
      });

      it("should replace object with type string for mask-type", () => {
        const json = {
          user: {
            name: "John",
            age: 30,
          },
        };

        const config = {
          user: "mask-type" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ user: "<object>" });
      });

      it("should replace nested object with placeholder", () => {
        const json = {
          data: {
            user: {
              profile: {
                name: "John",
              },
            },
          },
        };

        const config = {
          "data.user.profile": "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({
          data: {
            user: {
              profile: { "...": "..." },
            },
          },
        });
      });
    });

    describe("masking arrays", () => {
      it("should replace array with placeholder for mask-value", () => {
        const json = {
          tags: ["javascript", "typescript", "react"],
        };

        const config = {
          tags: "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ tags: ["..."] });
      });

      it("should replace array with type string for mask-type", () => {
        const json = {
          users: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
          ],
        };

        const config = {
          users: "mask-type" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ users: "<array>" });
      });
    });

    describe("keep-one mode", () => {
      it("should keep only first item in array", () => {
        const json = {
          users: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
            { name: "Bob", age: 35 },
          ],
        };

        const config = {
          users: "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          users: Array<{ name: string; age: number }>;
        };

        expect(result.users).toHaveLength(1);
        expect(result.users[0]).toEqual({ name: "John", age: 30 });
      });

      it("should handle empty arrays", () => {
        const json = {
          tags: [] as string[],
        };

        const config = {
          tags: "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ tags: [] });
      });

      it("should keep first item with nested structure", () => {
        const json = {
          items: [
            { id: 1, details: { name: "Item 1", price: 10 } },
            { id: 2, details: { name: "Item 2", price: 20 } },
            { id: 3, details: { name: "Item 3", price: 30 } },
          ],
        };

        const config = {
          items: "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          items: Array<{ id: number; details: { name: string; price: number } }>;
        };

        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({
          id: 1,
          details: { name: "Item 1", price: 10 },
        });
      });

      it("should apply keep-one to nested arrays", () => {
        const json = {
          data: {
            items: [
              { tags: ["a", "b", "c"] },
              { tags: ["d", "e", "f"] },
            ],
          },
        };

        const config = {
          "data.items": "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          data: { items: Array<{ tags: string[] }> };
        };

        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0]).toEqual({ tags: ["a", "b", "c"] });
      });

      it("should allow masking child properties while using keep-one on array", () => {
        const json = {
          users: [
            { name: "John", password: "secret1" },
            { name: "Jane", password: "secret2" },
          ],
        };

        const config = {
          users: "keep-one" as DocExportMode,
          "users[0].password": "mask-value" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          users: Array<{ name: string; password: string }>;
        };

        expect(result.users).toHaveLength(1);
        expect(result.users[0].name).toBe("John");
        expect(result.users[0].password).toBe("...");
      });

      it("should handle primitive arrays", () => {
        const json = {
          tags: ["javascript", "typescript", "react", "vue"],
        };

        const config = {
          tags: "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          tags: string[];
        };

        expect(result.tags).toHaveLength(1);
        expect(result.tags[0]).toBe("javascript");
      });

      it("should handle single-item arrays", () => {
        const json = {
          items: [{ id: 1 }],
        };

        const config = {
          items: "keep-one" as DocExportMode,
        };

        const result = generateDocumentationJson(json, config) as {
          items: Array<{ id: number }>;
        };

        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({ id: 1 });
      });
    });

    describe("edge cases", () => {
      it("should handle empty object", () => {
        const result = generateDocumentationJson({}, {});
        expect(result).toEqual({});
      });

      it("should handle empty array", () => {
        const result = generateDocumentationJson([], {});
        expect(result).toEqual([]);
      });

      it("should handle primitive at root", () => {
        expect(generateDocumentationJson("hello", {})).toBe("hello");
        expect(generateDocumentationJson(42, {})).toBe(42);
        expect(generateDocumentationJson(true, {})).toBe(true);
        expect(generateDocumentationJson(null, {})).toBe(null);
      });

      it("should default to 'keep' for unconfigured paths", () => {
        const json = { name: "John", unconfigured: "value" };
        const config = { name: "mask-value" as DocExportMode };

        const result = generateDocumentationJson(json, config);
        expect(result).toEqual({ name: "...", unconfigured: "value" });
      });
    });
  });

  describe("createDefaultConfig", () => {
    it("should create config with all paths set to keep", () => {
      const paths = ["name", "age", "user.email"];
      const config = createDefaultConfig(paths);

      expect(config).toEqual({
        name: "keep",
        age: "keep",
        "user.email": "keep",
      });
    });
  });

  describe("getNextMode", () => {
    it("should cycle through modes correctly", () => {
      expect(getNextMode("keep")).toBe("keep-one");
      expect(getNextMode("keep-one")).toBe("mask-value");
      expect(getNextMode("mask-value")).toBe("mask-type");
      expect(getNextMode("mask-type")).toBe("remove");
      expect(getNextMode("remove")).toBe("keep");
    });
  });

  describe("getModeDisplay", () => {
    it("should return correct display for keep", () => {
      const display = getModeDisplay("keep");
      expect(display.label).toBe("Keep");
      expect(display.colorClass).toContain("success");
    });

    it("should return correct display for keep-one", () => {
      const display = getModeDisplay("keep-one");
      expect(display.label).toBe("Keep 1");
      expect(display.colorClass).toContain("success");
    });

    it("should return correct display for mask-value", () => {
      const display = getModeDisplay("mask-value");
      expect(display.label).toBe("Mask");
      expect(display.colorClass).toContain("warning");
    });

    it("should return correct display for mask-type", () => {
      const display = getModeDisplay("mask-type");
      expect(display.label).toBe("Type");
      expect(display.colorClass).toContain("info");
    });

    it("should return correct display for remove", () => {
      const display = getModeDisplay("remove");
      expect(display.label).toBe("Remove");
      expect(display.colorClass).toContain("danger");
    });
  });
});
