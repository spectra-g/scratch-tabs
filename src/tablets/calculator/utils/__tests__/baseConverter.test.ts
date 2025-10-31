// src/tablets/calculator/utils/__tests__/baseConverter.test.ts

import {
  isValidNumber,
  toDecimal,
  fromDecimal,
  convertBase,
  convertToAllBases,
  formatBinary,
  formatHex,
  extractCurrentNumber,
  prepareExpressionForEval,
} from "../baseConverter";

describe("baseConverter", () => {
  describe("isValidNumber", () => {
    it("should validate hexadecimal numbers", () => {
      expect(isValidNumber("1A2B", "HEX")).toBe(true);
      expect(isValidNumber("DEADBEEF", "HEX")).toBe(true);
      expect(isValidNumber("FF", "HEX")).toBe(true);
      expect(isValidNumber("-FF", "HEX")).toBe(true);
      expect(isValidNumber("0", "HEX")).toBe(true);
      expect(isValidNumber("GHI", "HEX")).toBe(false);
    });

    it("should validate decimal numbers", () => {
      expect(isValidNumber("123", "DEC")).toBe(true);
      expect(isValidNumber("-456", "DEC")).toBe(true);
      expect(isValidNumber("0", "DEC")).toBe(true);
      expect(isValidNumber("ABC", "DEC")).toBe(false);
    });

    it("should validate octal numbers", () => {
      expect(isValidNumber("777", "OCT")).toBe(true);
      expect(isValidNumber("123", "OCT")).toBe(true);
      expect(isValidNumber("-77", "OCT")).toBe(true);
      expect(isValidNumber("0", "OCT")).toBe(true);
      expect(isValidNumber("89", "OCT")).toBe(false);
    });

    it("should validate binary numbers", () => {
      expect(isValidNumber("1010", "BIN")).toBe(true);
      expect(isValidNumber("11111111", "BIN")).toBe(true);
      expect(isValidNumber("-1010", "BIN")).toBe(true);
      expect(isValidNumber("0", "BIN")).toBe(true);
      expect(isValidNumber("12", "BIN")).toBe(false);
    });
  });

  describe("toDecimal", () => {
    it("should convert hex to decimal", () => {
      expect(toDecimal("FF", "HEX")).toBe(255);
      expect(toDecimal("1A", "HEX")).toBe(26);
      expect(toDecimal("0", "HEX")).toBe(0);
      expect(toDecimal("-FF", "HEX")).toBe(-255);
    });

    it("should convert octal to decimal", () => {
      expect(toDecimal("77", "OCT")).toBe(63);
      expect(toDecimal("10", "OCT")).toBe(8);
      expect(toDecimal("0", "OCT")).toBe(0);
      expect(toDecimal("-77", "OCT")).toBe(-63);
    });

    it("should convert binary to decimal", () => {
      expect(toDecimal("1010", "BIN")).toBe(10);
      expect(toDecimal("11111111", "BIN")).toBe(255);
      expect(toDecimal("0", "BIN")).toBe(0);
      expect(toDecimal("-1010", "BIN")).toBe(-10);
    });

    it("should handle decimal input", () => {
      expect(toDecimal("123", "DEC")).toBe(123);
      expect(toDecimal("-456", "DEC")).toBe(-456);
    });

    it("should return null for invalid input", () => {
      expect(toDecimal("GHI", "HEX")).toBeNull();
      expect(toDecimal("89", "OCT")).toBeNull();
      expect(toDecimal("12", "BIN")).toBeNull();
    });

    it("should return 0 for empty string", () => {
      expect(toDecimal("", "DEC")).toBe(0);
    });
  });

  describe("fromDecimal", () => {
    it("should convert decimal to hex", () => {
      expect(fromDecimal(255, "HEX")).toBe("FF");
      expect(fromDecimal(26, "HEX")).toBe("1A");
      expect(fromDecimal(0, "HEX")).toBe("0");
      expect(fromDecimal(-255, "HEX")).toBe("-FF");
    });

    it("should convert decimal to octal", () => {
      expect(fromDecimal(63, "OCT")).toBe("77");
      expect(fromDecimal(8, "OCT")).toBe("10");
      expect(fromDecimal(0, "OCT")).toBe("0");
      expect(fromDecimal(-63, "OCT")).toBe("-77");
    });

    it("should convert decimal to binary", () => {
      expect(fromDecimal(10, "BIN")).toBe("1010");
      expect(fromDecimal(255, "BIN")).toBe("11111111");
      expect(fromDecimal(0, "BIN")).toBe("0");
      expect(fromDecimal(-10, "BIN")).toBe("-1010");
    });

    it("should handle decimal output", () => {
      expect(fromDecimal(123, "DEC")).toBe("123");
      expect(fromDecimal(-456, "DEC")).toBe("-456");
    });

    it("should handle NaN", () => {
      expect(fromDecimal(NaN, "HEX")).toBe("0");
    });
  });

  describe("convertBase", () => {
    it("should convert hex to binary", () => {
      expect(convertBase("FF", "HEX", "BIN")).toBe("11111111");
      expect(convertBase("A", "HEX", "BIN")).toBe("1010");
    });

    it("should convert binary to hex", () => {
      expect(convertBase("11111111", "BIN", "HEX")).toBe("FF");
      expect(convertBase("1010", "BIN", "HEX")).toBe("A");
    });

    it("should convert octal to hex", () => {
      expect(convertBase("77", "OCT", "HEX")).toBe("3F");
      expect(convertBase("10", "OCT", "HEX")).toBe("8");
    });

    it("should return same value if bases are equal", () => {
      expect(convertBase("FF", "HEX", "HEX")).toBe("FF");
      expect(convertBase("123", "DEC", "DEC")).toBe("123");
    });

    it("should return null for invalid input", () => {
      expect(convertBase("GHI", "HEX", "DEC")).toBeNull();
    });

    it("should return 0 for empty string", () => {
      expect(convertBase("", "HEX", "DEC")).toBe("0");
    });
  });

  describe("convertToAllBases", () => {
    it("should convert hex to all bases", () => {
      const result = convertToAllBases("FF", "HEX");
      expect(result).toEqual({
        hex: "FF",
        dec: "255",
        oct: "377",
        bin: "11111111",
      });
    });

    it("should convert decimal to all bases", () => {
      const result = convertToAllBases("10", "DEC");
      expect(result).toEqual({
        hex: "A",
        dec: "10",
        oct: "12",
        bin: "1010",
      });
    });

    it("should convert binary to all bases", () => {
      const result = convertToAllBases("1010", "BIN");
      expect(result).toEqual({
        hex: "A",
        dec: "10",
        oct: "12",
        bin: "1010",
      });
    });

    it("should convert octal to all bases", () => {
      const result = convertToAllBases("77", "OCT");
      expect(result).toEqual({
        hex: "3F",
        dec: "63",
        oct: "77",
        bin: "111111",
      });
    });

    it("should handle negative numbers", () => {
      const result = convertToAllBases("-FF", "HEX");
      expect(result).toEqual({
        hex: "-FF",
        dec: "-255",
        oct: "-377",
        bin: "-11111111",
      });
    });

    it("should return null for invalid input", () => {
      expect(convertToAllBases("GHI", "HEX")).toBeNull();
    });

    it("should handle empty string", () => {
      const result = convertToAllBases("", "DEC");
      expect(result).toEqual({
        hex: "0",
        dec: "0",
        oct: "0",
        bin: "0",
      });
    });

    it("should handle zero", () => {
      const result = convertToAllBases("0", "DEC");
      expect(result).toEqual({
        hex: "0",
        dec: "0",
        oct: "0",
        bin: "0",
      });
    });
  });

  describe("formatBinary", () => {
    it("should format binary with spaces", () => {
      expect(formatBinary("11111111")).toBe("1111 1111");
      expect(formatBinary("1010")).toBe("1010");
      expect(formatBinary("101010101010")).toBe("1010 1010 1010");
    });

    it("should pad to groups of 4", () => {
      expect(formatBinary("111")).toBe("0111");
      expect(formatBinary("11")).toBe("0011");
      expect(formatBinary("1")).toBe("0001");
    });

    it("should handle negative numbers", () => {
      expect(formatBinary("-11111111")).toBe("-1111 1111");
      expect(formatBinary("-1010")).toBe("-1010");
    });

    it("should handle zero", () => {
      expect(formatBinary("0")).toBe("0000");
    });
  });

  describe("formatHex", () => {
    it("should format hex with spaces", () => {
      expect(formatHex("DEADBEEF")).toBe("DEAD BEEF");
      expect(formatHex("FF")).toBe("FF");
      expect(formatHex("123456789")).toBe("1234 5678 9");
    });

    it("should handle negative numbers", () => {
      expect(formatHex("-DEADBEEF")).toBe("-DEAD BEEF");
      expect(formatHex("-FF")).toBe("-FF");
    });

    it("should handle single digit", () => {
      expect(formatHex("A")).toBe("A");
    });
  });

  describe("extractCurrentNumber", () => {
    it("should extract rightmost number", () => {
      expect(extractCurrentNumber("123+456")).toBe("456");
      expect(extractCurrentNumber("10*5")).toBe("5");
      expect(extractCurrentNumber("100/2")).toBe("2");
    });

    it("should handle negative numbers", () => {
      expect(extractCurrentNumber("10+-5")).toBe("-5");
      expect(extractCurrentNumber("10*-3")).toBe("-3");
    });

    it("should handle single number", () => {
      expect(extractCurrentNumber("123")).toBe("123");
      expect(extractCurrentNumber("FF")).toBe("FF");
    });

    it("should handle trailing operators", () => {
      expect(extractCurrentNumber("123+")).toBe("123");
      expect(extractCurrentNumber("10*")).toBe("10");
    });

    it("should return 0 for empty expression", () => {
      expect(extractCurrentNumber("")).toBe("0");
      expect(extractCurrentNumber("0")).toBe("0");
    });

    it("should handle hex letters", () => {
      expect(extractCurrentNumber("FF+AB")).toBe("AB");
      expect(extractCurrentNumber("DEADBEEF")).toBe("DEADBEEF");
    });

    it("should handle parentheses", () => {
      expect(extractCurrentNumber("(10+5")).toBe("5");
      expect(extractCurrentNumber("10*(2")).toBe("2");
    });
  });

  describe("prepareExpressionForEval", () => {
    describe("Decimal (DEC) mode", () => {
      it("should handle AND operation", () => {
        expect(prepareExpressionForEval("5 & 3", "DEC")).toBe("5 & 3");
        expect(prepareExpressionForEval("255 & 15", "DEC")).toBe("255 & 15");
        expect(prepareExpressionForEval("12 & 8", "DEC")).toBe("12 & 8");
      });

      it("should handle OR operation", () => {
        expect(prepareExpressionForEval("5 | 3", "DEC")).toBe("5 | 3");
        expect(prepareExpressionForEval("255 | 15", "DEC")).toBe("255 | 15");
        expect(prepareExpressionForEval("12 | 8", "DEC")).toBe("12 | 8");
      });

      it("should handle XOR operation", () => {
        expect(prepareExpressionForEval("5 ^ 3", "DEC")).toBe("bitXor(5, 3)");
        expect(prepareExpressionForEval("255 ^ 15", "DEC")).toBe("bitXor(255, 15)");
        expect(prepareExpressionForEval("12 ^ 8", "DEC")).toBe("bitXor(12, 8)");
      });

      it("should handle NOT operation", () => {
        expect(prepareExpressionForEval("~5", "DEC")).toBe("bitNot(5)");
        expect(prepareExpressionForEval("~255", "DEC")).toBe("bitNot(255)");
        expect(prepareExpressionForEval("~0", "DEC")).toBe("bitNot(0)");
      });

      it("should handle combined operations", () => {
        expect(prepareExpressionForEval("5 & 3 | 2", "DEC")).toBe("5 & 3 | 2");
        expect(prepareExpressionForEval("5 ^ 3 & 7", "DEC")).toBe("bitXor(5, 3) & 7");
        expect(prepareExpressionForEval("~5 & 3", "DEC")).toBe("bitNot(5) & 3");
      });
    });

    describe("Hexadecimal (HEX) mode", () => {
      it("should convert hex numbers and handle AND", () => {
        expect(prepareExpressionForEval("FF & A", "HEX")).toBe("255 & 10");
        expect(prepareExpressionForEval("F0 & 0F", "HEX")).toBe("240 & 15");
        expect(prepareExpressionForEval("DEAD & BEEF", "HEX")).toBe("57005 & 48879");
      });

      it("should convert hex numbers and handle OR", () => {
        expect(prepareExpressionForEval("FF | A", "HEX")).toBe("255 | 10");
        expect(prepareExpressionForEval("F0 | 0F", "HEX")).toBe("240 | 15");
        expect(prepareExpressionForEval("AB | CD", "HEX")).toBe("171 | 205");
      });

      it("should convert hex numbers and handle XOR", () => {
        expect(prepareExpressionForEval("FF ^ A", "HEX")).toBe("bitXor(255, 10)");
        expect(prepareExpressionForEval("F0 ^ 0F", "HEX")).toBe("bitXor(240, 15)");
        expect(prepareExpressionForEval("AB ^ CD", "HEX")).toBe("bitXor(171, 205)");
      });

      it("should convert hex numbers and handle NOT", () => {
        expect(prepareExpressionForEval("~FF", "HEX")).toBe("bitNot(255)");
        expect(prepareExpressionForEval("~A", "HEX")).toBe("bitNot(10)");
        expect(prepareExpressionForEval("~DEAD", "HEX")).toBe("bitNot(57005)");
      });

      it("should handle combined hex operations", () => {
        expect(prepareExpressionForEval("FF & A | 5", "HEX")).toBe("255 & 10 | 5");
        expect(prepareExpressionForEval("A ^ B & C", "HEX")).toBe("bitXor(10, 11) & 12");
      });
    });

    describe("Binary (BIN) mode", () => {
      it("should convert binary numbers and handle AND", () => {
        expect(prepareExpressionForEval("1010 & 1100", "BIN")).toBe("10 & 12");
        expect(prepareExpressionForEval("11111111 & 00001111", "BIN")).toBe("255 & 15");
        expect(prepareExpressionForEval("101 & 11", "BIN")).toBe("5 & 3");
      });

      it("should convert binary numbers and handle OR", () => {
        expect(prepareExpressionForEval("1010 | 1100", "BIN")).toBe("10 | 12");
        expect(prepareExpressionForEval("11111111 | 00001111", "BIN")).toBe("255 | 15");
        expect(prepareExpressionForEval("101 | 11", "BIN")).toBe("5 | 3");
      });

      it("should convert binary numbers and handle XOR", () => {
        expect(prepareExpressionForEval("1010 ^ 1100", "BIN")).toBe("bitXor(10, 12)");
        expect(prepareExpressionForEval("11111111 ^ 00001111", "BIN")).toBe("bitXor(255, 15)");
        expect(prepareExpressionForEval("101 ^ 11", "BIN")).toBe("bitXor(5, 3)");
      });

      it("should convert binary numbers and handle NOT", () => {
        expect(prepareExpressionForEval("~1010", "BIN")).toBe("bitNot(10)");
        expect(prepareExpressionForEval("~11111111", "BIN")).toBe("bitNot(255)");
        expect(prepareExpressionForEval("~101", "BIN")).toBe("bitNot(5)");
      });
    });

    describe("Octal (OCT) mode", () => {
      it("should convert octal numbers and handle AND", () => {
        expect(prepareExpressionForEval("77 & 17", "OCT")).toBe("63 & 15");
        expect(prepareExpressionForEval("377 & 17", "OCT")).toBe("255 & 15");
        expect(prepareExpressionForEval("12 & 10", "OCT")).toBe("10 & 8");
      });

      it("should convert octal numbers and handle OR", () => {
        expect(prepareExpressionForEval("77 | 17", "OCT")).toBe("63 | 15");
        expect(prepareExpressionForEval("377 | 17", "OCT")).toBe("255 | 15");
        expect(prepareExpressionForEval("12 | 10", "OCT")).toBe("10 | 8");
      });

      it("should convert octal numbers and handle XOR", () => {
        expect(prepareExpressionForEval("77 ^ 17", "OCT")).toBe("bitXor(63, 15)");
        expect(prepareExpressionForEval("377 ^ 17", "OCT")).toBe("bitXor(255, 15)");
        expect(prepareExpressionForEval("12 ^ 10", "OCT")).toBe("bitXor(10, 8)");
      });

      it("should convert octal numbers and handle NOT", () => {
        expect(prepareExpressionForEval("~77", "OCT")).toBe("bitNot(63)");
        expect(prepareExpressionForEval("~377", "OCT")).toBe("bitNot(255)");
        expect(prepareExpressionForEval("~12", "OCT")).toBe("bitNot(10)");
      });
    });

    describe("Edge cases", () => {
      it("should handle empty expression", () => {
        expect(prepareExpressionForEval("", "DEC")).toBe("0");
        expect(prepareExpressionForEval("0", "DEC")).toBe("0");
      });

      it("should handle single number", () => {
        expect(prepareExpressionForEval("5", "DEC")).toBe("5");
        expect(prepareExpressionForEval("FF", "HEX")).toBe("255");
        expect(prepareExpressionForEval("1010", "BIN")).toBe("10");
      });

      it("should handle parentheses with bitwise operations", () => {
        expect(prepareExpressionForEval("(5 & 3)", "DEC")).toBe("(5 & 3)");
        expect(prepareExpressionForEval("(FF & A)", "HEX")).toBe("(255 & 10)");
      });

      it("should handle multiple spaces", () => {
        expect(prepareExpressionForEval("5  &  3", "DEC")).toBe("5  &  3");
        expect(prepareExpressionForEval("5  ^  3", "DEC")).toBe("bitXor(5, 3)");
      });
    });
  });
});
