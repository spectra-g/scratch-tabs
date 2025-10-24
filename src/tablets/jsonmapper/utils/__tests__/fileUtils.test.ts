import { describe, it, expect } from "@jest/globals";
import JSZip from "jszip";
import { BatchProcessingOptions } from "../../types";

/**
 * Converts a simple wildcard pattern to a regular expression
 * (Extracted from fileUtils.ts for testing)
 */
function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regexPattern = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexPattern}$`, "i");
}

/**
 * Applies filename transformation rule
 * (Extracted from fileUtils.ts for testing)
 */
function transformFilename(
  filename: string,
  rule?: BatchProcessingOptions["filenameRule"],
): string {
  if (!rule) return filename;

  const pathParts = filename.split("/");
  const basename = pathParts[pathParts.length - 1];
  const directory = pathParts.slice(0, -1).join("/");

  const lastDotIndex = basename.lastIndexOf(".");
  const name = lastDotIndex > 0 ? basename.substring(0, lastDotIndex) : basename;
  const extension = lastDotIndex > 0 ? basename.substring(lastDotIndex) : "";

  let newBasename: string;

  switch (rule.type) {
    case "prefix":
      newBasename = rule.value + basename;
      break;
    case "suffix":
      newBasename = name + rule.value + extension;
      break;
    case "replace":
      if (rule.search) {
        newBasename = basename.replace(
          new RegExp(rule.search, "g"),
          rule.value,
        );
      } else {
        newBasename = basename;
      }
      break;
    default:
      newBasename = basename;
  }

  return directory ? `${directory}/${newBasename}` : newBasename;
}

describe("wildcardToRegex", () => {
  it("should convert simple wildcard to regex", () => {
    const regex = wildcardToRegex("*.json");
    expect(regex.test("test.json")).toBe(true);
    expect(regex.test("test.txt")).toBe(false);
  });

  it("should handle prefix wildcard", () => {
    const regex = wildcardToRegex("custsearch*.json");
    expect(regex.test("custsearch_data.json")).toBe(true);
    expect(regex.test("custsearch123.json")).toBe(true);
    expect(regex.test("customer_data.json")).toBe(false);
  });

  it("should handle suffix wildcard", () => {
    const regex = wildcardToRegex("*_data.json");
    expect(regex.test("customer_data.json")).toBe(true);
    expect(regex.test("product_data.json")).toBe(true);
    expect(regex.test("data.json")).toBe(false);
  });

  it("should handle middle wildcard", () => {
    const regex = wildcardToRegex("data_*_report.json");
    expect(regex.test("data_sales_report.json")).toBe(true);
    expect(regex.test("data_customer_report.json")).toBe(true);
    expect(regex.test("data_report.json")).toBe(false);
  });

  it("should be case insensitive", () => {
    const regex = wildcardToRegex("TEST*.json");
    expect(regex.test("test_file.json")).toBe(true);
    expect(regex.test("TEST_file.json")).toBe(true);
    expect(regex.test("TeSt_file.json")).toBe(true);
  });

  it("should escape special regex characters", () => {
    const regex = wildcardToRegex("file[1].json");
    expect(regex.test("file[1].json")).toBe(true);
    expect(regex.test("file1.json")).toBe(false);
  });

  it("should handle multiple wildcards", () => {
    const regex = wildcardToRegex("*_*_*.json");
    expect(regex.test("a_b_c.json")).toBe(true);
    expect(regex.test("customer_sales_report.json")).toBe(true);
    expect(regex.test("a_b.json")).toBe(false);
  });
});

describe("transformFilename", () => {
  describe("prefix transformation", () => {
    it("should add prefix to filename", () => {
      const result = transformFilename("test.json", {
        type: "prefix",
        value: "transformed_",
      });
      expect(result).toBe("transformed_test.json");
    });

    it("should add prefix to filename with path", () => {
      const result = transformFilename("folder/test.json", {
        type: "prefix",
        value: "new_",
      });
      expect(result).toBe("folder/new_test.json");
    });

    it("should add prefix to filename without extension", () => {
      const result = transformFilename("readme", {
        type: "prefix",
        value: "old_",
      });
      expect(result).toBe("old_readme");
    });
  });

  describe("suffix transformation", () => {
    it("should add suffix before extension", () => {
      const result = transformFilename("test.json", {
        type: "suffix",
        value: "_transformed",
      });
      expect(result).toBe("test_transformed.json");
    });

    it("should add suffix with path", () => {
      const result = transformFilename("data/test.json", {
        type: "suffix",
        value: "_v2",
      });
      expect(result).toBe("data/test_v2.json");
    });

    it("should add suffix to filename without extension", () => {
      const result = transformFilename("readme", {
        type: "suffix",
        value: "_old",
      });
      expect(result).toBe("readme_old");
    });

    it("should handle multiple dots in filename", () => {
      const result = transformFilename("file.backup.json", {
        type: "suffix",
        value: "_new",
      });
      expect(result).toBe("file.backup_new.json");
    });
  });

  describe("replace transformation", () => {
    it("should replace text in filename", () => {
      const result = transformFilename("custsearch_data.json", {
        type: "replace",
        search: "custsearch",
        value: "products",
      });
      expect(result).toBe("products_data.json");
    });

    it("should replace multiple occurrences", () => {
      const result = transformFilename("test_test_file.json", {
        type: "replace",
        search: "test",
        value: "prod",
      });
      expect(result).toBe("prod_prod_file.json");
    });

    it("should replace with path", () => {
      const result = transformFilename("folder/custsearch_data.json", {
        type: "replace",
        search: "custsearch",
        value: "products",
      });
      expect(result).toBe("folder/products_data.json");
    });

    it("should handle no match", () => {
      const result = transformFilename("test.json", {
        type: "replace",
        search: "notfound",
        value: "replacement",
      });
      expect(result).toBe("test.json");
    });

    it("should return original if search is missing", () => {
      const result = transformFilename("test.json", {
        type: "replace",
        value: "replacement",
      });
      expect(result).toBe("test.json");
    });
  });

  describe("no transformation", () => {
    it("should return original filename if no rule provided", () => {
      const result = transformFilename("test.json");
      expect(result).toBe("test.json");
    });

    it("should handle nested paths", () => {
      const result = transformFilename("a/b/c/test.json");
      expect(result).toBe("a/b/c/test.json");
    });
  });

  describe("edge cases", () => {
    it("should handle empty filename transformation", () => {
      const result = transformFilename("", {
        type: "prefix",
        value: "test_",
      });
      expect(result).toBe("test_");
    });

    it("should handle deeply nested paths", () => {
      const result = transformFilename("a/b/c/d/e/test.json", {
        type: "suffix",
        value: "_new",
      });
      expect(result).toBe("a/b/c/d/e/test_new.json");
    });

    it("should preserve path separators", () => {
      const result = transformFilename("folder1/folder2/file.json", {
        type: "replace",
        search: "file",
        value: "document",
      });
      expect(result).toBe("folder1/folder2/document.json");
    });
  });
});
