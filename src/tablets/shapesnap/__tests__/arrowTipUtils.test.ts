import {
  cycleArrowTip,
  getDefaultArrowTip,
  isValidArrowTipStyle,
  ARROW_TIP_STYLES,
} from "../utils/arrowTipUtils";
import { ArrowTipStyle } from "../types";

describe("arrowTipUtils", () => {
  describe("ARROW_TIP_STYLES", () => {
    it("should contain all expected arrow tip styles", () => {
      const expectedStyles: ArrowTipStyle[] = [
        "none",
        "simple",
        "filled-triangle",
        "outline-triangle",
        "filled-circle",
        "outline-circle",
        "filled-diamond",
        "outline-diamond",
        "cross-circle",
        "dot",
        "arrowhead",
        "double-line",
      ];

      expect(ARROW_TIP_STYLES).toEqual(expectedStyles);
    });

    it("should have no duplicate styles", () => {
      const uniqueStyles = new Set(ARROW_TIP_STYLES);
      expect(uniqueStyles.size).toBe(ARROW_TIP_STYLES.length);
    });
  });

  describe("cycleArrowTip", () => {
    it("should return simple when no current tip is provided", () => {
      const result = cycleArrowTip(undefined);
      expect(result).toBe("simple");
    });

    it("should cycle through styles in order", () => {
      expect(cycleArrowTip("none")).toBe("simple");
      expect(cycleArrowTip("simple")).toBe("filled-triangle");
      expect(cycleArrowTip("filled-triangle")).toBe("outline-triangle");
      expect(cycleArrowTip("outline-triangle")).toBe("filled-circle");
    });

    it("should wrap around to the beginning when reaching the end", () => {
      expect(cycleArrowTip("double-line")).toBe("none");
    });

    it("should handle all valid arrow tip styles", () => {
      ARROW_TIP_STYLES.forEach((style, index) => {
        const nextIndex = (index + 1) % ARROW_TIP_STYLES.length;
        const expectedNext = ARROW_TIP_STYLES[nextIndex];
        expect(cycleArrowTip(style)).toBe(expectedNext);
      });
    });
  });

  describe("getDefaultArrowTip", () => {
    it("should return simple as the default arrow tip", () => {
      const result = getDefaultArrowTip();
      expect(result).toBe("simple");
    });
  });

  describe("isValidArrowTipStyle", () => {
    it("should return true for valid arrow tip styles", () => {
      ARROW_TIP_STYLES.forEach((style) => {
        expect(isValidArrowTipStyle(style)).toBe(true);
      });
    });

    it("should return false for invalid styles", () => {
      const invalidStyles = [
        "invalid-style",
        "arrow",
        "triangle",
        "circle",
        "",
        "NONE",
        "Simple",
      ];

      invalidStyles.forEach((style) => {
        expect(isValidArrowTipStyle(style)).toBe(false);
      });
    });

    it("should work as a type guard", () => {
      const testStyle = "simple";

      if (isValidArrowTipStyle(testStyle)) {
        // TypeScript should know this is ArrowTipStyle here
        const arrowTip: ArrowTipStyle = testStyle;
        expect(arrowTip).toBe("simple");
      } else {
        fail("Type guard should have passed for valid style");
      }
    });
  });
});
