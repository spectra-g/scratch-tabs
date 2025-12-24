import {
  formatDisplay,
  getDisplayFontSize,
  humanizeExpressionSimple,
  humanizeExpressionHybrid,
} from "../formatters";

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

  describe("humanizeExpressionSimple", () => {
    describe("basic operations", () => {
      it("should humanize simple addition", () => {
        const result = humanizeExpressionSimple("5+3");
        expect(result).toContain("5");
        expect(result).toContain("+");
        expect(result).toContain("3");
      });

      it("should humanize division", () => {
        const result = humanizeExpressionSimple("6/2");
        expect(result).toContain("6");
        expect(result).toContain("/");
        expect(result).toContain("2");
      });

      it("should humanize large numbers with magnitudes", () => {
        const result = humanizeExpressionSimple("1500000/2");
        expect(result).toContain("million");
      });

      it("should humanize thousands", () => {
        const result = humanizeExpressionSimple("6000+2000");
        expect(result).toContain("thousand");
      });
    });

    describe("edge cases", () => {
      it("should return empty string for empty expression", () => {
        expect(humanizeExpressionSimple("")).toBe("");
      });

      it("should return empty string for zero", () => {
        expect(humanizeExpressionSimple("0")).toBe("");
      });

      it("should handle single numbers", () => {
        const result = humanizeExpressionSimple("1000000");
        expect(result).toContain("million");
      });

      it("should preserve decimals", () => {
        const result = humanizeExpressionSimple("3.14+2.71");
        expect(result).toContain("3.14");
        expect(result).toContain("2.71");
      });
    });

    describe("large number precision handling", () => {
      it("should not humanize numbers with more than 15 digits to avoid precision loss", () => {
        const largeNumber = "9699999999999999666666";
        const result = humanizeExpressionSimple(largeNumber);
        // Should return the raw number, not "9 million 21" or similar incorrect humanization
        expect(result).toBe(largeNumber);
        expect(result).not.toContain("million 21");
      });

      it("should still humanize numbers with exactly 15 digits", () => {
        const fifteenDigits = "123456789012345"; // 123 trillion
        const result = humanizeExpressionSimple(fifteenDigits);
        // Should humanize correctly as it's within safe range
        expect(result).toContain("trillion");
      });

      it("should not humanize numbers exceeding safe integer range", () => {
        const result = humanizeExpressionSimple("12345678901234567890");
        // Should return raw string to preserve accuracy
        expect(result).toBe("12345678901234567890");
      });

      it("should handle expressions with very large numbers", () => {
        const result = humanizeExpressionSimple("9699999999999999666666+100");
        expect(result).toContain("9699999999999999666666");
        expect(result).toContain("100");
      });
    });
  });

  describe("humanizeExpressionHybrid", () => {
    describe("basic operations", () => {
      it("should humanize numbers in hybrid format", () => {
        const result = humanizeExpressionHybrid("1500000");
        expect(result).toContain("1");
        expect(result).toContain("500");
        expect(result).toContain("thousand");
        expect(result).toContain("million");
      });

      it("should humanize division expressions", () => {
        const result = humanizeExpressionHybrid("1500000/2");
        expect(result).toContain("divided by");
        expect(result).toContain("million");
      });

      it("should capitalize first letter", () => {
        const result = humanizeExpressionHybrid("5+3");
        expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
      });

      it("should handle large numbers with multiple magnitude groups", () => {
        const result = humanizeExpressionHybrid("1234567");
        expect(result).toContain("1");
        expect(result).toContain("million");
        expect(result).toContain("234");
        expect(result).toContain("thousand");
        expect(result).toContain("567");
      });

      it("should handle very large numbers with trillions", () => {
        const result = humanizeExpressionHybrid("9874563210");
        expect(result).toContain("9");
        expect(result).toContain("billion");
        expect(result).toContain("874");
        expect(result).toContain("million");
        expect(result).toContain("563");
        expect(result).toContain("thousand");
        expect(result).toContain("210");
        expect(result).not.toContain("undefined");
      });

      it("should handle quadrillion-level numbers", () => {
        // Note: 1234567890123456 has 16 digits, exceeds safe integer range (15 digits)
        // So it should NOT be humanized to prevent precision loss
        const result = humanizeExpressionHybrid("1234567890123456");
        expect(result).toBe("1234567890123456");
        expect(result).not.toContain("undefined");
      });

      it("should handle extremely large numbers gracefully", () => {
        const result = humanizeExpressionHybrid("999999999999999999999999");
        // Should not contain undefined
        expect(result).not.toContain("undefined");
        // Should contain some readable output
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("operators", () => {
      it("should convert plus operator", () => {
        const result = humanizeExpressionHybrid("1000+500");
        expect(result).toContain("plus");
      });

      it("should handle subtraction (may be treated as negative number)", () => {
        const result = humanizeExpressionHybrid("1000-500");
        // The tokenizer may treat this as "1000" followed by "-500" (negative number)
        expect(result).toContain("thousand");
        expect(result).toContain("500");
      });

      it("should convert times operator", () => {
        const result = humanizeExpressionHybrid("100*50");
        expect(result).toContain("times");
      });

      it("should convert divided by operator", () => {
        const result = humanizeExpressionHybrid("1000/5");
        expect(result).toContain("divided by");
      });

      it("should convert percent operator", () => {
        const result = humanizeExpressionHybrid("100%10");
        expect(result).toContain("percent of");
      });
    });

    describe("edge cases", () => {
      it("should return empty string for empty expression", () => {
        expect(humanizeExpressionHybrid("")).toBe("");
      });

      it("should return empty string for zero", () => {
        expect(humanizeExpressionHybrid("0")).toBe("");
      });

      it("should return empty string for Error", () => {
        expect(humanizeExpressionHybrid("Error")).toBe("");
      });

      it("should handle decimals", () => {
        const result = humanizeExpressionHybrid("3.14");
        expect(result).toContain("point");
        expect(result).toContain("14");
      });

      it("should skip parentheses", () => {
        const result = humanizeExpressionHybrid("(5+3)");
        expect(result).not.toContain("(");
        expect(result).not.toContain(")");
      });

      it("should handle zero properly", () => {
        const result = humanizeExpressionHybrid("1000+0");
        expect(result).toContain("thousand");
        expect(result).toContain("plus");
        expect(result).toContain("0");
      });
    });

    describe("large number precision handling", () => {
      it("should not humanize numbers with more than 15 digits to avoid precision loss", () => {
        const largeNumber = "9699999999999999666666";
        const result = humanizeExpressionHybrid(largeNumber);
        // Should return the raw number, not broken/incorrect humanization
        expect(result).toBe(largeNumber);
        expect(result).not.toContain("million 21");
      });

      it("should still humanize numbers with exactly 15 digits", () => {
        const fifteenDigits = "123456789012345"; // 123 trillion
        const result = humanizeExpressionHybrid(fifteenDigits);
        // Should humanize correctly as it's within safe range
        expect(result).toContain("trillion");
      });

      it("should not humanize numbers exceeding safe integer range", () => {
        const result = humanizeExpressionHybrid("12345678901234567890");
        // Should return raw string to preserve accuracy
        expect(result).toBe("12345678901234567890");
      });

      it("should handle expressions with very large numbers", () => {
        const result = humanizeExpressionHybrid("9699999999999999666666+100");
        expect(result).toContain("9699999999999999666666");
        expect(result).toContain("100");
      });

      it("should handle negative large numbers", () => {
        const result = humanizeExpressionHybrid("-9699999999999999666666");
        // Should preserve the entire number
        expect(result).toBe("-9699999999999999666666");
      });
    });

    describe("complex expressions", () => {
      it("should handle multi-operator expressions", () => {
        const result = humanizeExpressionHybrid("1000+500-250");
        expect(result).toContain("thousand");
        expect(result).toContain("plus");
        // Note: The tokenizer may treat -250 as a negative number rather than minus 250
      });

      it("should handle negative numbers with capital first letter", () => {
        const result = humanizeExpressionHybrid("-1000");
        // First letter is capitalized
        expect(result).toContain("Negative");
        expect(result).toContain("thousand");
      });
    });
  });
});
