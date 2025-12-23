import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExplanationView } from "../components/ExplanationView";
import { RegexExplanation } from "../types";

describe("ExplanationView", () => {
  const mockExplanations: RegexExplanation[] = [
    {
      type: "literal",
      value: "a",
      description: "Literal character 'a'",
      start: 0,
      end: 1,
    },
    {
      type: "quantifier",
      value: "+",
      description: "One or more of the preceding element",
      start: 1,
      end: 2,
    },
    {
      type: "character-class",
      value: "[abc]",
      description: "Any character from the set a, b, or c",
      start: 2,
      end: 6,
    },
    {
      type: "group",
      value: "(test)",
      description: "Capturing group",
      start: 6,
      end: 12,
    },
    {
      type: "anchor",
      value: "^",
      description: "Start of string or line",
      start: 12,
      end: 13,
    },
    {
      type: "escape",
      value: "\\d",
      description: "Any digit character",
      start: 13,
      end: 15,
    },
    {
      type: "assertion",
      value: "(?=test)",
      description: "Positive lookahead assertion",
      start: 15,
      end: 22,
    },
  ];

  describe("rendering", () => {
    it("should render with explanations", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      expect(screen.getByText("Pattern Explanation")).toBeInTheDocument();
      expect(screen.getByText("Literal character 'a'")).toBeInTheDocument();
      expect(screen.getByText("One or more of the preceding element")).toBeInTheDocument();
      expect(screen.getByText("Any character from the set a, b, or c")).toBeInTheDocument();
    });

    it("should render with no explanations", () => {
      render(<ExplanationView explanation={[]} pattern="" />);

      expect(screen.getByText("Pattern Explanation")).toBeInTheDocument();
      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("No pattern to explain");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should render explanation tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Use getAllByText since the text appears in multiple places
      const literalTokens = screen.getAllByText("a");
      expect(literalTokens.length).toBeGreaterThan(0);

      const quantifierTokens = screen.getAllByText("+");
      expect(quantifierTokens.length).toBeGreaterThan(0);

      const charClassTokens = screen.getAllByText("[abc]");
      expect(charClassTokens.length).toBeGreaterThan(0);

      const groupTokens = screen.getAllByText("(test)");
      expect(groupTokens.length).toBeGreaterThan(0);

      const anchorTokens = screen.getAllByText("^");
      expect(anchorTokens.length).toBeGreaterThan(0);

      const escapeTokens = screen.getAllByText("\\d");
      expect(escapeTokens.length).toBeGreaterThan(0);

      const assertionTokens = screen.getAllByText("(?=test)");
      expect(assertionTokens.length).toBeGreaterThan(0);
    });

    it("should render explanation descriptions", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      expect(screen.getByText("Literal character 'a'")).toBeInTheDocument();
      expect(screen.getByText("One or more of the preceding element")).toBeInTheDocument();
      expect(screen.getByText("Any character from the set a, b, or c")).toBeInTheDocument();
      expect(screen.getByText("Capturing group")).toBeInTheDocument();
      expect(screen.getByText("Start of string or line")).toBeInTheDocument();
      expect(screen.getByText("Any digit character")).toBeInTheDocument();
      expect(screen.getByText("Positive lookahead assertion")).toBeInTheDocument();
    });
  });

  describe("token highlighting", () => {
    it("should highlight literal tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for literal tokens
      const literalTokens = screen.getAllByText("a");
      const patternBreakdownToken = literalTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-surface-secondary/20");
      expect(patternBreakdownToken).toHaveClass("text-secondary");
    });

    it("should highlight quantifier tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for quantifier tokens
      const quantifierTokens = screen.getAllByText("+");
      const patternBreakdownToken = quantifierTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-green-500/20");
      expect(patternBreakdownToken).toHaveClass("text-green-300");
    });

    it("should highlight character class tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for character class tokens
      const charClassTokens = screen.getAllByText("[abc]");
      const patternBreakdownToken = charClassTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-yellow-500/20");
      expect(patternBreakdownToken).toHaveClass("text-yellow-300");
    });

    it("should highlight group tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for group tokens
      const groupTokens = screen.getAllByText("(test)");
      const patternBreakdownToken = groupTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-primary/20");
      expect(patternBreakdownToken).toHaveClass("text-primary");
    });

    it("should highlight anchor tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for anchor tokens
      const anchorTokens = screen.getAllByText("^");
      const patternBreakdownToken = anchorTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-red-500/20");
      expect(patternBreakdownToken).toHaveClass("text-red-300");
    });

    it("should highlight escape tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for escape tokens
      const escapeTokens = screen.getAllByText("\\d");
      const patternBreakdownToken = escapeTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-indigo-500/20");
      expect(patternBreakdownToken).toHaveClass("text-indigo-300");
    });

    it("should highlight assertion tokens", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Get the first element (pattern breakdown) for assertion tokens
      const assertionTokens = screen.getAllByText("(?=test)");
      const patternBreakdownToken = assertionTokens[0]; // First one is in pattern breakdown
      expect(patternBreakdownToken).toHaveClass("bg-purple-500/20");
      expect(patternBreakdownToken).toHaveClass("text-purple-300");
    });
  });

  describe("layout and structure", () => {
    it("should render explanation items in order", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      const explanationItems = screen.getAllByText(/Literal|One or more|Any character|Capturing|Start of|Any digit|Positive lookahead/);
      expect(explanationItems).toHaveLength(7);
    });

    it("should render token and description pairs", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Check that each token has its corresponding description
      const literalTokens = screen.getAllByText("a");
      expect(literalTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Literal character 'a'")).toBeInTheDocument();

      const quantifierTokens = screen.getAllByText("+");
      expect(quantifierTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("One or more of the preceding element")).toBeInTheDocument();

      const charClassTokens = screen.getAllByText("[abc]");
      expect(charClassTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Any character from the set a, b, or c")).toBeInTheDocument();

      const groupTokens = screen.getAllByText("(test)");
      expect(groupTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Capturing group")).toBeInTheDocument();

      const anchorTokens = screen.getAllByText("^");
      expect(anchorTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Start of string or line")).toBeInTheDocument();

      const escapeTokens = screen.getAllByText("\\d");
      expect(escapeTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Any digit character")).toBeInTheDocument();

      const assertionTokens = screen.getAllByText("(?=test)");
      expect(assertionTokens.length).toBeGreaterThan(0);
      expect(screen.getByText("Positive lookahead assertion")).toBeInTheDocument();
    });

    it("should handle single explanation", () => {
      const singleExplanation: RegexExplanation[] = [
        {
          type: "literal",
          value: "test",
          description: "Literal string 'test'",
          start: 0,
          end: 3,
        },
      ];

      render(<ExplanationView explanation={singleExplanation} pattern="test" />);

      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("test");
      expect(elements.length).toBeGreaterThan(0);
      expect(screen.getByText("Literal string 'test'")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty explanations array", () => {
      render(<ExplanationView explanation={[]} pattern="" />);

      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("No pattern to explain");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should handle explanations with empty values", () => {
      const emptyValueExplanations: RegexExplanation[] = [
        {
          type: "literal",
          value: "",
          description: "Empty literal",
          start: 0,
          end: 0,
        },
      ];

      render(<ExplanationView explanation={emptyValueExplanations} pattern="" />);

      expect(screen.getByText("Empty literal")).toBeInTheDocument();
    });

    it("should handle explanations with special characters", () => {
      const specialCharExplanations: RegexExplanation[] = [
        {
          type: "literal",
          value: "\\[\\]\\{\\}\\(\\)",
          description: "Escaped special characters",
          start: 0,
          end: 11,
        },
      ];

      render(<ExplanationView explanation={specialCharExplanations} pattern="\\[\\]\\{\\}\\(\\)" />);

      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("\\[\\]\\{\\}\\(\\)");
      expect(elements.length).toBeGreaterThan(0);
      expect(screen.getByText("Escaped special characters")).toBeInTheDocument();
    });

    it("should handle explanations with unicode characters", () => {
      const unicodeExplanations: RegexExplanation[] = [
        {
          type: "literal",
          value: "test😀",
          description: "Unicode literal",
          start: 0,
          end: 5,
        },
      ];

      render(<ExplanationView explanation={unicodeExplanations} pattern="test\u{1F600}" />);

      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("test😀");
      expect(elements.length).toBeGreaterThan(0);
      expect(screen.getByText("Unicode literal")).toBeInTheDocument();
    });

    it("should handle very long explanations", () => {
      const longDescription = "A".repeat(200);
      const longExplanations: RegexExplanation[] = [
        {
          type: "literal",
          value: "test",
          description: longDescription,
          start: 0,
          end: 3,
        },
      ];

      render(<ExplanationView explanation={longExplanations} pattern="test" />);

      // Use getAllByText since the text appears in multiple places
      const elements = screen.getAllByText("test");
      expect(elements.length).toBeGreaterThan(0);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("should handle explanations with long values", () => {
      const longValue = "a".repeat(100);
      const longValueExplanations: RegexExplanation[] = [
        {
          type: "literal",
          value: longValue,
          description: "Long literal",
          start: 0,
          end: 100,
        },
      ];

      render(<ExplanationView explanation={longValueExplanations} pattern={longValue} />);

      const longValueElements = screen.getAllByText(longValue);
      expect(longValueElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Long literal")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply correct container classes", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      const header = screen.getByText("Pattern Explanation");
      expect(header).toHaveClass("text-sm");
      expect(header).toHaveClass("font-medium");
      expect(header).toHaveClass("text-secondary");
    });

    it("should apply correct explanation item classes", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Check for the detailed breakdown container classes
      const detailedBreakdown = screen.getByText("Detailed Breakdown:").closest("div");
      const explanationItems = detailedBreakdown?.querySelectorAll('[class*="bg-surface-raised/30"]');

      if (explanationItems) {
        explanationItems.forEach((item) => {
          expect(item).toHaveClass("bg-surface-raised/30");
          expect(item).toHaveClass("border");
          expect(item).toHaveClass("border-base/50");
        });
      }
    });
  });

  describe("accessibility", () => {
    it("should have proper semantic structure", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Check that the explanation header is present
      expect(screen.getByText("Pattern Explanation")).toBeInTheDocument();
    });

    it("should have proper text contrast", () => {
      render(<ExplanationView explanation={mockExplanations} pattern="a+[abc](test)^\\d(?=test)" />);

      // Check that descriptions are readable
      const descriptions = screen.getAllByText(/Literal|One or more|Any character/);
      descriptions.forEach(description => {
        expect(description).toHaveClass("text-main");
      });
    });
  });

  describe("performance", () => {
    it("should handle large number of explanations", () => {
      const manyExplanations: RegexExplanation[] = [];
      const longPattern = "a".repeat(100);

      for (let i = 0; i < 100; i++) {
        manyExplanations.push({
          type: "literal",
          value: `token${i}`,
          description: `Description ${i}`,
          start: i,
          end: i + 1,
        });
      }

      render(<ExplanationView explanation={manyExplanations} pattern={longPattern} />);

      const token0Elements = screen.getAllByText("token0");
      expect(token0Elements.length).toBeGreaterThan(0);
      expect(screen.getByText("Description 0")).toBeInTheDocument();

      const token99Elements = screen.getAllByText("token99");
      expect(token99Elements.length).toBeGreaterThan(0);
      expect(screen.getByText("Description 99")).toBeInTheDocument();
    });

    it("should handle complex regex explanations", () => {
      const complexExplanations: RegexExplanation[] = [
        {
          type: "anchor",
          value: "^",
          description: "Start of string or line",
          start: 0,
          end: 1,
        },
        {
          type: "group",
          value: "(?<name>\\w+)",
          description: "Named capturing group",
          start: 1,
          end: 12,
        },
        {
          type: "literal",
          value: "@",
          description: "Literal character '@'",
          start: 12,
          end: 13,
        },
        {
          type: "group",
          value: "(\\w+)",
          description: "Capturing group",
          start: 13,
          end: 18,
        },
        {
          type: "literal",
          value: "\\.",
          description: "Literal character '.'",
          start: 18,
          end: 20,
        },
        {
          type: "character-class",
          value: "[a-z]{2,}",
          description: "Character class with quantifier",
          start: 20,
          end: 27,
        },
        {
          type: "anchor",
          value: "$",
          description: "End of string or line",
          start: 27,
          end: 28,
        },
      ];

      render(<ExplanationView explanation={complexExplanations} pattern="^(?<name>\\w+)@(\\w+)\\.\\.[a-z]{2,}$" />);

      const caretElements = screen.getAllByText("^");
      expect(caretElements.length).toBeGreaterThan(0);

      const nameGroupElements = screen.getAllByText("(?<name>\\w+)");
      expect(nameGroupElements.length).toBeGreaterThan(0);

      const atElements = screen.getAllByText("@");
      expect(atElements.length).toBeGreaterThan(0);

      const wordGroupElements = screen.getAllByText("(\\w+)");
      expect(wordGroupElements.length).toBeGreaterThan(0);

      const dotElements = screen.getAllByText("\\.");
      expect(dotElements.length).toBeGreaterThan(0);

      const charClassElements = screen.getAllByText("[a-z]{2,}");
      expect(charClassElements.length).toBeGreaterThan(0);

      const dollarElements = screen.getAllByText("$");
      expect(dollarElements.length).toBeGreaterThan(0);
    });
  });
}); 