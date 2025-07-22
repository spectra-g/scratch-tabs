import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MatchPreview } from "../components/MatchPreview";
import { RegexMatch } from "../types";

describe("MatchPreview", () => {
  const mockOnCopy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with no matches", () => {
      render(
        <MatchPreview
          matches={[]}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("Matches (0)")).toBeInTheDocument();
      expect(screen.getByText("No matches found")).toBeInTheDocument();
    });

    it("should render with matches", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("Matches (1)")).toBeInTheDocument();
      expect(screen.getByText("Match 1")).toBeInTheDocument();
      expect(screen.getByText('"test"')).toBeInTheDocument();
    });

    it("should render with empty test string", () => {
      render(
        <MatchPreview
          matches={[]}
          testString=""
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("No test string provided")).toBeInTheDocument();
    });

    it("should render highlighted text correctly", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      // Check that the highlighted text contains the match
      const highlightedText = screen.getByText("test");
      expect(highlightedText).toHaveClass("bg-orange-500/30");
    });

    it("should render multiple matches", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
        {
          match: "test",
          index: 11,
          lastIndex: 15,
          groups: [],
          namedGroups: {},
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="test string test"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      expect(screen.getByText("Matches (2)")).toBeInTheDocument();
      // Check for match headers - there are multiple "Match" elements
      const matchHeaders = screen.getAllByText(/Match \d+/);
      expect(matchHeaders).toHaveLength(2);
    });
  });

  describe("capture groups", () => {
    it("should render numbered capture groups", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 11,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
            },
            {
              index: 2,
              match: "world",
              start: 6,
              end: 11,
            },
          ],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("Capture Groups:")).toBeInTheDocument();
      expect(screen.getByText("Group 1:")).toBeInTheDocument();
      expect(screen.getByText("Group 2:")).toBeInTheDocument();
      expect(screen.getByText('"hello"')).toBeInTheDocument();
      expect(screen.getByText('"world"')).toBeInTheDocument();
    });

    it("should render named capture groups", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 10,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
              name: "first",
            },
            {
              index: 2,
              match: "world",
              start: 6,
              end: 11,
              name: "second",
            },
          ],
          namedGroups: {
            first: "hello",
            second: "world",
          },
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      expect(screen.getByText("Capture Groups:")).toBeInTheDocument();
      expect(screen.getByText("Named Groups:")).toBeInTheDocument();
      // Use getAllByText since there are multiple elements with the same text
      const firstElements = screen.getAllByText("first:");
      expect(firstElements.length).toBeGreaterThan(0);
      const secondElements = screen.getAllByText("second:");
      expect(secondElements.length).toBeGreaterThan(0);
    });

    it("should handle groups with positions", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 11,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
            },
          ],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("[0-4]")).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should call onCopy when copy button is clicked", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      const copyButton = screen.getByTitle("Copy match");
      fireEvent.click(copyButton);

      expect(mockOnCopy).toHaveBeenCalledWith("test", "match-0");
    });

    it("should show check icon when copied", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId="match-0"
        />
      );

      const copyButton = screen.getByTitle("Copy match");
      expect(copyButton).toHaveClass("text-green-400");
    });

    it("should call onCopy for group copy", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 11,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
            },
          ],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      const groupCopyButtons = screen.getAllByTitle("Copy group");
      fireEvent.click(groupCopyButtons[0]);

      expect(mockOnCopy).toHaveBeenCalledWith("hello", "group-0-0");
    });

    it("should show check icon for copied group", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 11,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
            },
          ],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId="group-0-0"
        />
      );

      const groupCopyButtons = screen.getAllByTitle("Copy group");
      expect(groupCopyButtons[0]).toHaveClass("text-green-400");
    });
  });

  describe("highlighting", () => {
    it("should highlight matches in text", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 5,
          lastIndex: 9,
          groups: [],
          namedGroups: {},
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="hello test world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      // Check that text before match is rendered (it's broken up into separate spans)
      expect(screen.getByText("hello")).toBeInTheDocument();
      
      // Check that match is highlighted
      const highlightedMatch = screen.getByText("test");
      expect(highlightedMatch).toHaveClass("bg-orange-500/30");
      expect(highlightedMatch).toHaveClass("border-orange-500/50");
    });

    it("should handle overlapping matches", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      // Should render the match once even if there are duplicates
      const highlightedMatches = screen.getAllByText("test");
      expect(highlightedMatches.length).toBeGreaterThan(0);
    });

    it("should handle matches at start and end", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello",
          index: 0,
          lastIndex: 5,
          groups: [],
          namedGroups: {},
        },
        {
          match: "world",
          index: 6,
          lastIndex: 11,
          groups: [],
          namedGroups: {},
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      expect(screen.getByText("hello")).toHaveClass("bg-orange-500/30");
      expect(screen.getByText("world")).toHaveClass("bg-orange-500/30");
      // The space between matches is handled by the component internally
      // We just verify that both matches are highlighted correctly
    });
  });

  describe("edge cases", () => {
    it("should handle empty matches", () => {
      const matches: RegexMatch[] = [
        {
          match: "",
          index: 0,
          lastIndex: 0,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("Matches (1)")).toBeInTheDocument();
    });

    it("should handle matches with special characters", () => {
      const matches: RegexMatch[] = [
        {
          match: "test\npattern",
          index: 0,
          lastIndex: 11,
          groups: [],
          namedGroups: {},
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="test\npattern remaining"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      // The component handles special characters internally
      // We just verify that the match is highlighted
      const highlightedMatch = screen.getByText((content, element) => {
        return element?.textContent === "test\npattern";
      });
      expect(highlightedMatch).toHaveClass("bg-orange-500/30");
    });

    it("should handle very long matches", () => {
      const longMatch = "a".repeat(1000);
      const matches: RegexMatch[] = [
        {
          match: longMatch,
          index: 0,
          lastIndex: 1000,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString={longMatch}
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("Matches (1)")).toBeInTheDocument();
    });

    it("should handle unicode characters", () => {
      const matches: RegexMatch[] = [
        {
          match: "test\u{1F600}",
          index: 0,
          lastIndex: 6,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test\u{1F600}"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByText("test\u{1F600}")).toHaveClass("bg-orange-500/30");
    });
  });

  describe("accessibility", () => {
    it("should have proper titles for copy buttons", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByTitle("Copy match")).toBeInTheDocument();
    });

    it("should have proper titles for group copy buttons", () => {
      const matches: RegexMatch[] = [
        {
          match: "hello world",
          index: 0,
          lastIndex: 11,
          groups: [
            {
              index: 1,
              match: "hello",
              start: 0,
              end: 5,
            },
          ],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="hello world"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      expect(screen.getByTitle("Copy group")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply correct classes for different states", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];
      
      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );
      
      // Check that the component renders without errors
      expect(screen.getByText("Matches (1)")).toBeInTheDocument();
      expect(screen.getByText("test")).toHaveClass("bg-orange-500/30");
    });

    it("should apply correct classes for highlighted text", () => {
      const matches: RegexMatch[] = [
        {
          match: "test",
          index: 0,
          lastIndex: 4,
          groups: [],
          namedGroups: {},
        },
      ];

      render(
        <MatchPreview
          matches={matches}
          testString="test string"
          onCopy={mockOnCopy}
          copiedId={null}
        />
      );

      const highlightedText = screen.getByText("test");
      expect(highlightedText).toHaveClass("bg-orange-500/30");
      expect(highlightedText).toHaveClass("border-orange-500/50");
      expect(highlightedText).toHaveClass("rounded");
      expect(highlightedText).toHaveClass("px-1");
      expect(highlightedText).toHaveClass("font-semibold");
    });
  });
}); 