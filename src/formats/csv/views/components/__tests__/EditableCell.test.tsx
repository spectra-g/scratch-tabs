import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditableCell } from "../EditableCell";

describe("EditableCell", () => {
  const mockOnSelect = jest.fn();
  const mockOnStartEdit = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnEditingChange = jest.fn();
  const mockOnRightClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    value: "Test Value",
    isSelected: false,
    isValid: true,
    startEditing: false,
    onSelect: mockOnSelect,
    onStartEdit: mockOnStartEdit,
    onChange: mockOnChange,
    onEditingChange: mockOnEditingChange,
  };

  describe("Basic Rendering", () => {
    it("should render cell value", () => {
      render(<EditableCell {...defaultProps} />);
      
      expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("should render empty cell placeholder", () => {
      render(<EditableCell {...defaultProps} value="" />);
      
      expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("should show invalid cell styling", () => {
      render(<EditableCell {...defaultProps} isValid={false} error="Invalid value" />);
      
      const cell = screen.getByTitle("Invalid value");
      expect(cell).toHaveClass("bg-red-900/20");
    });
  });

  describe("Search Highlighting", () => {
    it("should highlight search terms when cell is a search match", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="John Doe"
          isSearchMatch={true}
          searchQuery="John"
        />
      );

      // Should have search match styling
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-yellow-500/20", "ring-1", "ring-yellow-400");

      // Should highlight the search term
      const highlightedText = screen.getByText("John");
      expect(highlightedText.tagName).toBe("MARK");
      expect(highlightedText).toHaveClass("bg-yellow-400", "text-black");
    });

    it("should show active search match styling", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="Test Value"
          isSearchMatch={true}
          isActiveSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should have active search match styling (orange)
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-orange-500/40", "ring-2", "ring-orange-400");
    });

    it("should not highlight when not a search match", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="Test Value"
          isSearchMatch={false}
          searchQuery="Other"
        />
      );

      // Should not have search highlighting
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).not.toHaveClass("bg-yellow-500/20");
      expect(cell).not.toHaveClass("bg-orange-500/40");
    });

    it("should handle case-insensitive highlighting", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="JOHN doe"
          isSearchMatch={true}
          searchQuery="john"
        />
      );

      // Should highlight "JOHN" even though query is lowercase
      const highlightedText = screen.getByText("JOHN");
      expect(highlightedText.tagName).toBe("MARK");
    });

    it("should highlight multiple occurrences", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="test test test"
          isSearchMatch={true}
          searchQuery="test"
        />
      );

      // Should highlight all occurrences of "test"
      const highlightedElements = screen.getAllByText("test");
      expect(highlightedElements).toHaveLength(3);
      highlightedElements.forEach(element => {
        expect(element.tagName).toBe("MARK");
      });
    });
  });

  describe("Interaction", () => {
    it("should call onSelect when clicked", () => {
      render(<EditableCell {...defaultProps} />);
      
      const cell = screen.getByTitle(/click to select/i);
      fireEvent.click(cell);
      
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it("should call onRightClick when right-clicked", () => {
      render(<EditableCell {...defaultProps} onRightClick={mockOnRightClick} />);
      
      const cell = screen.getByTitle(/click to select/i);
      fireEvent.contextMenu(cell);
      
      expect(mockOnRightClick).toHaveBeenCalledTimes(1);
    });

    it("should show hover actions on mouse enter", () => {
      render(<EditableCell {...defaultProps} />);
      
      const cell = screen.getByTitle(/click to select/i);
      fireEvent.mouseEnter(cell);
      
      // Edit and copy buttons should become visible
      expect(screen.getByTitle("Edit cell")).toBeInTheDocument();
      expect(screen.getByTitle("Copy cell value")).toBeInTheDocument();
    });
  });

  describe("Selected State", () => {
    it("should show selected styling when isSelected is true", () => {
      render(<EditableCell {...defaultProps} isSelected={true} />);
      
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-blue-900/30", "ring-1", "ring-blue-500");
    });

    it("should prioritize selected styling over search match styling", () => {
      render(
        <EditableCell
          {...defaultProps}
          isSelected={true}
          isSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should show selected styling, not search styling
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-blue-900/30", "ring-1", "ring-blue-500");
      expect(cell).not.toHaveClass("bg-yellow-500/20");
    });
  });

  describe("Editing Mode", () => {
    it("should enter editing mode when startEditing is true", () => {
      const { rerender } = render(<EditableCell {...defaultProps} />);
      
      // Initially not in editing mode
      expect(screen.queryByDisplayValue("Test Value")).not.toBeInTheDocument();
      
      // Enter editing mode
      rerender(<EditableCell {...defaultProps} startEditing={true} />);
      
      // Should show input field
      expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
      expect(mockOnEditingChange).toHaveBeenCalledWith(true);
    });

    it("should not show search highlighting while editing", () => {
      render(
        <EditableCell
          {...defaultProps}
          startEditing={true}
          isSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should show input field, not highlighted text
      expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
      expect(screen.queryByText("Test", { selector: "mark" })).not.toBeInTheDocument();
    });
  });
});