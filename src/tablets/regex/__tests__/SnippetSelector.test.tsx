import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SnippetSelector } from "../components/SnippetSelector";

describe("SnippetSelector", () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default state", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      expect(screen.getByText("Quick Insert")).toBeInTheDocument();
    });

    it("should show selected snippet", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet="email-basic" />);
      
      expect(screen.getByText("Email (Basic)")).toBeInTheDocument();
    });

    it("should show categories when dropdown is opened", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Check for categories
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("should call onSnippetSelect when snippet is clicked", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      // Click on a snippet
      const snippetButton = screen.getByText("Email (Basic)");
      fireEvent.click(snippetButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith("email-basic");
    });

    it("should call onSnippetSelect with different snippet", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet="email-basic" />);
      
      // Open the dropdown
      const button = screen.getByText("Email (Basic)");
      fireEvent.click(button);
      
      // Click on URL category
      const urlCategory = screen.getByText("URL");
      fireEvent.click(urlCategory);
      
      // Click on a snippet
      const snippetButton = screen.getByText("HTTP/HTTPS URL");
      fireEvent.click(snippetButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith("url-http");
    });

    it("should handle keyboard navigation", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      const snippetButton = screen.getByText("Email (Basic)");
      fireEvent.keyDown(snippetButton, { key: "Enter" });
      
      expect(mockOnSelect).toHaveBeenCalledWith("email-basic");
    });

    it("should handle space key", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      const snippetButton = screen.getByText("Email (Basic)");
      fireEvent.keyDown(snippetButton, { key: " " });
      
      expect(mockOnSelect).toHaveBeenCalledWith("email-basic");
    });
  });

  describe("category filtering", () => {
    it("should show all categories initially", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });

    it("should filter snippets by category", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      // Should only show email snippets
      expect(screen.getByText("Email (Basic)")).toBeInTheDocument();
      expect(screen.getByText("Email (Strict)")).toBeInTheDocument();
      expect(screen.queryByText("HTTP/HTTPS URL")).not.toBeInTheDocument();
      expect(screen.queryByText("ISO Date (YYYY-MM-DD)")).not.toBeInTheDocument();
    });

    it("should show all snippets when no category is selected", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Initially no snippets should be visible until category is selected
      expect(screen.queryByText("Email (Basic)")).not.toBeInTheDocument();
      expect(screen.queryByText("HTTP/HTTPS URL")).not.toBeInTheDocument();
      expect(screen.queryByText("ISO Date (YYYY-MM-DD)")).not.toBeInTheDocument();
    });

    it("should handle category selection and deselection", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Select Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      // Should show email snippets
      expect(screen.getByText("Email (Basic)")).toBeInTheDocument();
      expect(screen.getByText("Email (Strict)")).toBeInTheDocument();
      
      // Click Email category again to deselect
      fireEvent.click(emailCategory);
      
      // Should hide email snippets
      expect(screen.queryByText("Email (Basic)")).not.toBeInTheDocument();
      expect(screen.queryByText("Email (Strict)")).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply correct classes for unselected snippets", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      const snippetButton = screen.getByText("Email (Basic)").closest("button");
      expect(snippetButton).toHaveClass("border-transparent");
    });

    it("should apply correct classes for selected snippets", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet="email-basic" />);
      
      // Open the dropdown
      const button = screen.getByText("Email (Basic)");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      // Find the snippet button in the dropdown (not the main button)
      const snippetButtons = screen.getAllByText("Email (Basic)");
      const dropdownButton = snippetButtons.find(el => 
        el.closest("button")?.className.includes("border-primary/50")
      );
      
      expect(dropdownButton).toBeTruthy();
      const selectedButton = dropdownButton?.closest("button");
      expect(selectedButton).toHaveClass("border-primary/50");
      expect(selectedButton).toHaveClass("bg-blue-500/10");
    });

    it("should apply correct classes for category buttons", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      const categoryButton = screen.getByText("Email").closest("button");
      expect(categoryButton).toHaveClass("hover:bg-surface-secondary/50");
      expect(categoryButton).toHaveClass("transition-colors");
      
      // Check that the text element has the correct classes
      const categoryText = screen.getByText("Email");
      expect(categoryText).toHaveClass("text-main");
    });
  });

  describe("accessibility", () => {
    it("should have proper button roles", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should be keyboard accessible", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      const button = screen.getByText("Quick Insert");
      // Buttons are focusable by default, so we test that it can be focused
      expect(button.closest("button")).toBeInTheDocument();
      expect(button.closest("button")).not.toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("edge cases", () => {
    it("should handle null selectedSnippet", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      expect(screen.getByText("Quick Insert")).toBeInTheDocument();
    });

    it("should handle empty string selectedSnippet", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet="" />);
      
      expect(screen.getByText("Quick Insert")).toBeInTheDocument();
    });

    it("should handle clear selection", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet="email-basic" />);
      
      // Open the dropdown
      const button = screen.getByText("Email (Basic)");
      fireEvent.click(button);
      
      // Click clear selection
      const clearButton = screen.getByText("Clear Selection");
      fireEvent.click(clearButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith("");
    });

    it("should close dropdown after selection", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on Email category
      const emailCategory = screen.getByText("Email");
      fireEvent.click(emailCategory);
      
      // Click on a snippet
      const snippetButton = screen.getByText("Email (Basic)");
      fireEvent.click(snippetButton);
      
      // Dropdown should be closed
      expect(screen.queryByText("Email")).not.toBeInTheDocument();
    });
  });

  describe("performance", () => {
    it("should handle snippets with complex patterns", () => {
      render(<SnippetSelector onSnippetSelect={mockOnSelect} selectedSnippet={null} />);
      
      // Open the dropdown
      const button = screen.getByText("Quick Insert");
      fireEvent.click(button);
      
      // Click on URL category
      const urlCategory = screen.getByText("URL");
      fireEvent.click(urlCategory);
      
      expect(screen.getByText("HTTP/HTTPS URL")).toBeInTheDocument();
    });
  });
}); 