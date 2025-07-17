import { describe, it, expect } from "@jest/globals";
import { converters, getConverter, getConverterIds } from "../../converters";
import { RequestConverter } from "../../types";

describe("Converter Registry", () => {
  describe("converters array", () => {
    it("should contain all expected converters", () => {
      expect(converters).toHaveLength(3);
      
      const converterIds = converters.map((c: RequestConverter) => c.id);
      expect(converterIds).toContain("curl");
      expect(converterIds).toContain("http");
      expect(converterIds).toContain("postman");
    });

    it("should have valid converter objects", () => {
      converters.forEach((converter: RequestConverter) => {
        expect(converter).toHaveProperty("id");
        expect(converter).toHaveProperty("name");
        expect(converter).toHaveProperty("convert");
        expect(typeof converter.convert).toBe("function");
      });
    });
  });

  describe("getConverter", () => {
    it("should return converter by ID", () => {
      const curlConverter = getConverter("curl");
      expect(curlConverter).toBeDefined();
      expect(curlConverter?.id).toBe("curl");
      expect(curlConverter?.name).toBe("cURL");
    });

    it("should return undefined for non-existent converter", () => {
      const converter = getConverter("nonexistent");
      expect(converter).toBeUndefined();
    });

    it("should return all registered converters", () => {
      const curl = getConverter("curl");
      const http = getConverter("http");
      const postman = getConverter("postman");

      expect(curl).toBeDefined();
      expect(http).toBeDefined();
      expect(postman).toBeDefined();
    });
  });

  describe("getConverterIds", () => {
    it("should return all converter IDs", () => {
      const ids = getConverterIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain("curl");
      expect(ids).toContain("http");
      expect(ids).toContain("postman");
    });

    it("should return IDs in the same order as converters array", () => {
      const ids = getConverterIds();
      const expectedIds = converters.map((c: RequestConverter) => c.id);
      expect(ids).toEqual(expectedIds);
    });
  });
}); 