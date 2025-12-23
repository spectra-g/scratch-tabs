import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RegexEditor } from "../components/RegexEditor";
import { RegexError } from "../types";

describe("RegexEditor", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default props", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      expect(screen.getByPlaceholderText("Enter regex pattern...")).toBeInTheDocument();
      expect(screen.getAllByText("/")).toHaveLength(2);
    });

    it("should display the current value", () => {
      const testValue = "test\\d+";
      render(<RegexEditor value={testValue} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveValue(testValue);
    });

    it("should render with error styling when error is provided", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 5,
      };
      
      render(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveClass("border-red-500/50");
    });

    it("should render without error styling when no error", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).not.toHaveClass("border-red-500/50");
      expect(input).toHaveClass("border-base/50");
    });

    it("should render error indicator when error has position", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 3,
      };
      
      const { container } = render(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      
      // Check for the error indicator div with the specific style
      const errorIndicator = container.querySelector('[style*="margin-left"]');
      expect(errorIndicator).toBeInTheDocument();
    });

    it("should not render error indicator when error has no position", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
      };
      
      render(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      
      const errorIndicator = document.querySelector('[style*="marginLeft"]');
      expect(errorIndicator).not.toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("should call onChange when user types", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      fireEvent.change(input, { target: { value: "new value" } });
      
      expect(mockOnChange).toHaveBeenCalledWith("new value");
    });

    it("should call onChange with empty string when user clears input", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      fireEvent.change(input, { target: { value: "" } });
      
      expect(mockOnChange).toHaveBeenCalledWith("");
    });

    it("should handle special regex characters", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      const specialChars = "\\d+\\w*[abc]";
      fireEvent.change(input, { target: { value: specialChars } });
      
      expect(mockOnChange).toHaveBeenCalledWith(specialChars);
    });

    it("should handle unicode characters", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      const unicodeChars = "test\u{1F600}";
      fireEvent.change(input, { target: { value: unicodeChars } });
      
      expect(mockOnChange).toHaveBeenCalledWith(unicodeChars);
    });

    it("should handle focus and blur events", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      
      // Test focus
      fireEvent.focus(input);
      expect(input).toHaveClass("border-primary/50");
      
      // Test blur
      fireEvent.blur(input);
      expect(input).toHaveClass("border-base/50");
    });

    it("should maintain focus styling when error is present", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 0,
      };
      
      render(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      fireEvent.focus(input);
      
      expect(input).toHaveClass("focus:border-red-500/70");
    });
  });

  describe("accessibility", () => {
    it("should have proper input attributes", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("spellCheck", "false");
    });

    it("should be keyboard accessible", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveAttribute("type", "text");
    });
  });

  describe("error handling", () => {
    it("should handle null error", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} error={null} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).not.toHaveClass("border-red-500/50");
    });

    it("should handle undefined error", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} error={undefined} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).not.toHaveClass("border-red-500/50");
    });

    it("should handle error with position at start", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 0,
      };
      
      const { container } = render(<RegexEditor value="[test" onChange={mockOnChange} error={error} />);
      
      const errorIndicator = container.querySelector('[style*="margin-left"]');
      expect(errorIndicator).toBeInTheDocument();
    });

    it("should handle error with position at end", () => {
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 4,
      };
      
      const { container } = render(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      
      const errorIndicator = container.querySelector('[style*="margin-left"]');
      expect(errorIndicator).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply correct classes for different states", () => {
      const { rerender } = render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      
      // Default state
      expect(input).toHaveClass("border-base/50");
      expect(input).toHaveClass("hover:border-base/50");
      
      // Focused state
      fireEvent.focus(input);
      expect(input).toHaveClass("border-primary/50");
      
      // Error state
      const error: RegexError = {
        message: "Invalid regex pattern",
        position: 0,
      };
      rerender(<RegexEditor value="test[" onChange={mockOnChange} error={error} />);
      expect(input).toHaveClass("border-red-500/50");
    });

    it("should have proper font styling", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveClass("font-mono");
      expect(input).toHaveClass("text-sm");
    });

    it("should have proper background styling", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveClass("bg-canvas/50");
    });
  });

  describe("edge cases", () => {
    it("should handle very long patterns", () => {
      const longPattern = "a".repeat(1000);
      render(<RegexEditor value={longPattern} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveValue(longPattern);
    });

    it("should handle patterns with newlines", () => {
      const patternWithNewlines = "test\npattern";
      render(<RegexEditor value={patternWithNewlines} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      // The input value removes newlines completely
      expect(input).toHaveValue("testpattern");
    });

    it("should handle patterns with tabs", () => {
      const patternWithTabs = "test\tpattern";
      render(<RegexEditor value={patternWithTabs} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveValue(patternWithTabs);
    });

    it("should handle empty string value", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveValue("");
    });

    it("should handle null value", () => {
      render(<RegexEditor value={null as any} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText("Enter regex pattern...");
      expect(input).toHaveValue("");
    });
  });

  describe("copy functionality", () => {
    beforeEach(() => {
      // Mock the clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(),
        },
      });
    });

    it("should show copy button when there is a value", () => {
      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const copyButton = screen.getByTitle("Copy regex pattern");
      expect(copyButton).toBeInTheDocument();
    });

    it("should not show copy button when there is no value", () => {
      render(<RegexEditor value="" onChange={mockOnChange} />);
      
      const copyButton = screen.queryByTitle("Copy regex pattern");
      expect(copyButton).not.toBeInTheDocument();
    });

    it("should copy pattern to clipboard when clicked", async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<RegexEditor value="test[0-9]+" onChange={mockOnChange} />);
      
      const copyButton = screen.getByTitle("Copy regex pattern");
      await act(async () => {
        fireEvent.click(copyButton);
      });
      
      expect(mockWriteText).toHaveBeenCalledWith("test[0-9]+");
    });

    it("should show check icon after copying", async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const copyButton = screen.getByTitle("Copy regex pattern");
      await act(async () => {
        fireEvent.click(copyButton);
      });
      
      // Should show check icon
      await waitFor(() => {
        expect(screen.getByTestId("check")).toBeInTheDocument();
      });
    });

    it("should handle clipboard error gracefully", async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error("Clipboard error"));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      
      render(<RegexEditor value="test" onChange={mockOnChange} />);
      
      const copyButton = screen.getByTitle("Copy regex pattern");
      await act(async () => {
        fireEvent.click(copyButton);
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Failed to copy:", expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
}); 