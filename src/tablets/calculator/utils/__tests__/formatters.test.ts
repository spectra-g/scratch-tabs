import { formatDisplay, getDisplayFontSize } from "../formatters";

describe("formatters", () => {
  describe("formatDisplay", () => {
    it("should format numbers with precision", () => {
      expect(formatDisplay(3.141592653589793)).toBe("3.1415926535898");
    });

    it("should format integers correctly", () => {
      expect(formatDisplay(42)).toBe("42");
    });

    it("should format large numbers", () => {
      expect(formatDisplay(1000000)).toBe("1000000");
    });

    it("should handle string values", () => {
      expect(formatDisplay("test")).toBe("test");
    });

    it("should handle null values", () => {
      expect(formatDisplay(null)).toBe("null");
    });

    it("should handle undefined values", () => {
      expect(formatDisplay(undefined)).toBe("undefined");
    });
  });

  describe("getDisplayFontSize", () => {
    it("should return text-3xl for short strings", () => {
      expect(getDisplayFontSize("123")).toBe("text-3xl");
    });

    it("should return text-2xl for medium strings", () => {
      expect(getDisplayFontSize("12345678901234567")).toBe("text-2xl");
    });

    it("should return text-xl for long strings", () => {
      expect(getDisplayFontSize("12345678901234567890123456789")).toBe("text-xl");
    });

    it("should handle empty strings", () => {
      expect(getDisplayFontSize("")).toBe("text-3xl");
    });

    it("should handle null/undefined strings", () => {
      expect(getDisplayFontSize(null as any)).toBe("text-3xl");
      expect(getDisplayFontSize(undefined as any)).toBe("text-3xl");
    });
  });
});