import { REGEX_SNIPPETS, getSnippetsByCategory, getSnippetById } from "../utils/snippets";
import { RegexSnippet } from "../types";

describe("snippets", () => {
  describe("REGEX_SNIPPETS", () => {
    it("should have valid snippet structure", () => {
      expect(REGEX_SNIPPETS).toBeInstanceOf(Array);
      expect(REGEX_SNIPPETS.length).toBeGreaterThan(0);

      REGEX_SNIPPETS.forEach((snippet) => {
        expect(snippet).toHaveProperty("id");
        expect(snippet).toHaveProperty("name");
        expect(snippet).toHaveProperty("pattern");
        expect(snippet).toHaveProperty("description");
        expect(snippet).toHaveProperty("category");
        expect(typeof snippet.id).toBe("string");
        expect(typeof snippet.name).toBe("string");
        expect(typeof snippet.pattern).toBe("string");
        expect(typeof snippet.description).toBe("string");
        expect(typeof snippet.category).toBe("string");
      });
    });

    it("should have unique IDs", () => {
      const ids = REGEX_SNIPPETS.map((snippet) => snippet.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid regex patterns", () => {
      REGEX_SNIPPETS.forEach((snippet) => {
        expect(() => new RegExp(snippet.pattern)).not.toThrow();
      });
    });

    it("should contain expected categories", () => {
      const categories = REGEX_SNIPPETS.map((snippet) => snippet.category);
      const uniqueCategories = new Set(categories);
      
      expect(uniqueCategories).toContain("Email");
      expect(uniqueCategories).toContain("URL");
      expect(uniqueCategories).toContain("Date");
      expect(uniqueCategories).toContain("Phone");
      expect(uniqueCategories).toContain("Text");
      expect(uniqueCategories).toContain("Numbers");
      expect(uniqueCategories).toContain("Code");
    });

    it("should have email snippets", () => {
      const emailSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Email"
      );
      expect(emailSnippets.length).toBeGreaterThan(0);
      
      const basicEmail = emailSnippets.find(
        (snippet) => snippet.id === "email-basic"
      );
      expect(basicEmail).toBeDefined();
      expect(basicEmail?.name).toBe("Email (Basic)");
      
      const strictEmail = emailSnippets.find(
        (snippet) => snippet.id === "email-strict"
      );
      expect(strictEmail).toBeDefined();
      expect(strictEmail?.name).toBe("Email (Strict)");
    });

    it("should have URL snippets", () => {
      const urlSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "URL"
      );
      expect(urlSnippets.length).toBeGreaterThan(0);
      
      const httpUrl = urlSnippets.find(
        (snippet) => snippet.id === "url-http"
      );
      expect(httpUrl).toBeDefined();
      expect(httpUrl?.name).toBe("HTTP/HTTPS URL");
    });

    it("should have date snippets with named groups", () => {
      const dateSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Date"
      );
      expect(dateSnippets.length).toBeGreaterThan(0);
      
      const isoDate = dateSnippets.find(
        (snippet) => snippet.id === "date-iso"
      );
      expect(isoDate).toBeDefined();
      expect(isoDate?.name).toBe("ISO Date (YYYY-MM-DD)");
      expect(isoDate?.pattern).toContain("?<year>");
      expect(isoDate?.pattern).toContain("?<month>");
      expect(isoDate?.pattern).toContain("?<day>");
    });

    it("should have phone number snippets", () => {
      const phoneSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Phone"
      );
      expect(phoneSnippets.length).toBeGreaterThan(0);
      
      const usPhone = phoneSnippets.find(
        (snippet) => snippet.id === "phone-us"
      );
      expect(usPhone).toBeDefined();
      expect(usPhone?.name).toBe("US Phone Number");
      expect(usPhone?.pattern).toContain("?<area>");
      expect(usPhone?.pattern).toContain("?<exchange>");
      expect(usPhone?.pattern).toContain("?<number>");
    });

    it("should have text snippets", () => {
      const textSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Text"
      );
      expect(textSnippets.length).toBeGreaterThan(0);
      
      const wordBoundary = textSnippets.find(
        (snippet) => snippet.id === "word-boundary"
      );
      expect(wordBoundary).toBeDefined();
      expect(wordBoundary?.name).toBe("Whole Words");
    });

    it("should have number snippets", () => {
      const numberSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Numbers"
      );
      expect(numberSnippets.length).toBeGreaterThan(0);
      
      const integer = numberSnippets.find(
        (snippet) => snippet.id === "integer"
      );
      expect(integer).toBeDefined();
      expect(integer?.name).toBe("Integer");
      
      const decimal = numberSnippets.find(
        (snippet) => snippet.id === "decimal"
      );
      expect(decimal).toBeDefined();
      expect(decimal?.name).toBe("Decimal Number");
    });

    it("should have code snippets", () => {
      const codeSnippets = REGEX_SNIPPETS.filter(
        (snippet) => snippet.category === "Code"
      );
      expect(codeSnippets.length).toBeGreaterThan(0);
      
      const hexColor = codeSnippets.find(
        (snippet) => snippet.id === "hex-color"
      );
      expect(hexColor).toBeDefined();
      expect(hexColor?.name).toBe("Hex Color");
      expect(hexColor?.pattern).toContain("?<color>");
      
      const ipAddress = codeSnippets.find(
        (snippet) => snippet.id === "ip-address"
      );
      expect(ipAddress).toBeDefined();
      expect(ipAddress?.name).toBe("IP Address");
      expect(ipAddress?.pattern).toContain("?<ip>");
    });
  });

  describe("getSnippetsByCategory", () => {
    it("should group snippets by category", () => {
      const grouped = getSnippetsByCategory();
      
      expect(typeof grouped).toBe("object");
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
      
      // Check that all categories are present
      const categories = ["Email", "URL", "Date", "Phone", "Text", "Numbers", "Code"];
      categories.forEach((category) => {
        expect(grouped[category]).toBeDefined();
        expect(Array.isArray(grouped[category])).toBe(true);
        expect(grouped[category].length).toBeGreaterThan(0);
      });
    });

    it("should have correct structure for each category", () => {
      const grouped = getSnippetsByCategory();
      
      Object.entries(grouped).forEach(([category, snippets]) => {
        expect(Array.isArray(snippets)).toBe(true);
        snippets.forEach((snippet) => {
          expect(snippet.category).toBe(category);
          expect(snippet).toHaveProperty("id");
          expect(snippet).toHaveProperty("name");
          expect(snippet).toHaveProperty("pattern");
          expect(snippet).toHaveProperty("description");
        });
      });
    });

    it("should include all snippets", () => {
      const grouped = getSnippetsByCategory();
      const totalSnippets = Object.values(grouped).reduce(
        (sum, snippets) => sum + snippets.length,
        0
      );
      expect(totalSnippets).toBe(REGEX_SNIPPETS.length);
    });

    it("should not have duplicate snippets", () => {
      const grouped = getSnippetsByCategory();
      
      Object.values(grouped).forEach((snippets) => {
        const ids = snippets.map((snippet) => snippet.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      });
    });
  });

  describe("getSnippetById", () => {
    it("should return snippet for valid ID", () => {
      const snippet = getSnippetById("email-basic");
      expect(snippet).toBeDefined();
      expect(snippet?.id).toBe("email-basic");
      expect(snippet?.name).toBe("Email (Basic)");
      expect(snippet?.category).toBe("Email");
    });

    it("should return undefined for invalid ID", () => {
      const snippet = getSnippetById("nonexistent-id");
      expect(snippet).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const snippet = getSnippetById("");
      expect(snippet).toBeUndefined();
    });

    it("should return all snippets by their IDs", () => {
      REGEX_SNIPPETS.forEach((expectedSnippet) => {
        const snippet = getSnippetById(expectedSnippet.id);
        expect(snippet).toEqual(expectedSnippet);
      });
    });

    it("should handle case-sensitive IDs", () => {
      const snippet = getSnippetById("EMAIL-BASIC");
      expect(snippet).toBeUndefined();
    });
  });

  describe("snippet validation", () => {
    it("should have non-empty patterns", () => {
      REGEX_SNIPPETS.forEach((snippet) => {
        expect(snippet.pattern.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty names", () => {
      REGEX_SNIPPETS.forEach((snippet) => {
        expect(snippet.name.length).toBeGreaterThan(0);
      });
    });

    it("should have non-empty descriptions", () => {
      REGEX_SNIPPETS.forEach((snippet) => {
        expect(snippet.description.length).toBeGreaterThan(0);
      });
    });

    it("should have valid regex patterns that can be compiled", () => {
      REGEX_SNIPPETS.forEach((snippet) => {
        expect(() => {
          new RegExp(snippet.pattern);
        }).not.toThrow();
      });
    });

    it("should have patterns that work with common test cases", () => {
      // Test email patterns
      const emailBasic = getSnippetById("email-basic");
      expect(emailBasic).toBeDefined();
      if (emailBasic) {
        const regex = new RegExp(emailBasic.pattern);
        expect(regex.test("test@example.com")).toBe(true);
        expect(regex.test("invalid-email")).toBe(false);
      }

      // Test URL pattern
      const urlHttp = getSnippetById("url-http");
      expect(urlHttp).toBeDefined();
      if (urlHttp) {
        const regex = new RegExp(urlHttp.pattern);
        expect(regex.test("https://example.com")).toBe(true);
        expect(regex.test("http://test.org/path")).toBe(true);
        expect(regex.test("not-a-url")).toBe(false);
      }

      // Test date pattern
      const dateIso = getSnippetById("date-iso");
      expect(dateIso).toBeDefined();
      if (dateIso) {
        const regex = new RegExp(dateIso.pattern);
        expect(regex.test("2024-03-15")).toBe(true);
        expect(regex.test("2024-13-15")).toBe(false); // Invalid month
      }

      // Test phone pattern
      const phoneUs = getSnippetById("phone-us");
      expect(phoneUs).toBeDefined();
      if (phoneUs) {
        const regex = new RegExp(phoneUs.pattern);
        expect(regex.test("(555) 123-4567")).toBe(true);
        expect(regex.test("555-123-4567")).toBe(true);
        expect(regex.test("555.123.4567")).toBe(true);
      }

      // Test hex color pattern
      const hexColor = getSnippetById("hex-color");
      expect(hexColor).toBeDefined();
      if (hexColor) {
        const regex = new RegExp(hexColor.pattern);
        expect(regex.test("#ff0000")).toBe(true);
        expect(regex.test("#f00")).toBe(true);
        expect(regex.test("#invalid")).toBe(false);
      }

      // Test IP address pattern
      const ipAddress = getSnippetById("ip-address");
      expect(ipAddress).toBeDefined();
      if (ipAddress) {
        const regex = new RegExp(ipAddress.pattern);
        expect(regex.test("192.168.1.1")).toBe(true);
        expect(regex.test("256.256.256.256")).toBe(false); // Invalid IP
      }
    });
  });
}); 